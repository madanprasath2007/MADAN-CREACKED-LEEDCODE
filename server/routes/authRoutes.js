import express from 'express';
import { authService, requireAuth } from '../auth.js';
import { dbAdapter } from '../database/dbAdapter.js';

const router = express.Router();

/**
 * GET /api/auth/config
 * Returns public auth configuration: Google Client ID and database connection status
 */
router.get('/config', (req, res) => {
  const dbStatus = dbAdapter.getStatus();
  res.json({
    success: true,
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    database: dbStatus
  });
});

/**
 * POST /api/auth/login
 * Standard Username & Password login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const result = await authService.loginWithPassword(username, password);
    if (!result) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Login error: ' + err.message });
  }
});

/**
 * POST /api/auth/register
 * New User Signup (creates user in Supabase / Local database)
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const result = await authService.registerUser({ username, email, password });
    res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/google
 * Sign in with Google (OAuth ID Token verification)
 */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Missing Google credential token.' });
    }

    const result = await authService.loginWithGoogle(credential);
    res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Google sign-in failed: ' + err.message });
  }
});

/**
 * GET /api/auth/me
 * Protected: Get current user profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await authService.getUser(req.user.username);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    res.json({
      success: true,
      user
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/change-credentials
 * Protected: Update username or password
 */
router.post('/change-credentials', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newUsername, newPassword } = req.body;
    const currentUsername = req.user.username;

    const isValid = await dbAdapter.verifyCredentials(currentUsername, currentPassword);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }

    await dbAdapter.updateCredentials(currentUsername, newUsername, newPassword);
    const updatedUser = await authService.getUser(newUsername || currentUsername);

    res.json({
      success: true,
      message: 'Credentials updated successfully.',
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
