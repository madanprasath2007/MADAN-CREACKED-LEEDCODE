import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dbAdapter } from './database/dbAdapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });
const CONFIG_FILE = path.join(ROOT, 'UserData', 'auth_config.json');

// JWT Secret Key Manager
function getJwtSecret() {
  const userDir = path.join(ROOT, 'UserData');
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

  let secret = process.env.JWT_SECRET;
  if (!secret) {
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        if (cfg.jwtSecret) return cfg.jwtSecret;
      } catch (_) {}
    }
    secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ jwtSecret: secret }, null, 2), 'utf8');
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();

// Lightweight JWT-style signed token generator
export function createToken(payload, secret = JWT_SECRET, expiresInSeconds = 7 * 24 * 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const iat = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, exp, iat })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token, secret = JWT_SECRET) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  try {
    const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch (_) {
    return null;
  }
}

// Google OAuth verification
export async function verifyGoogleToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing Google ID token.');
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || 'Failed to verify Google token.');
  }

  // Optional: Check audience if GOOGLE_CLIENT_ID is set in .env
  const configuredClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  if (configuredClientId && data.aud !== configuredClientId) {
    throw new Error('Google token client ID mismatch.');
  }

  return {
    googleId: data.sub,
    email: data.email,
    name: data.name || data.given_name || (data.email ? data.email.split('@')[0] : 'Google User'),
    picture: data.picture || null,
    emailVerified: data.email_verified === 'true' || data.email_verified === true
  };
}

class AuthService {
  getJwtSecret() {
    return JWT_SECRET;
  }

  async loginWithPassword(username, password) {
    const user = await dbAdapter.verifyCredentials(username, password);
    if (!user) return null;

    const token = createToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      authProvider: user.auth_provider || 'local'
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        authProvider: user.auth_provider || 'local',
        avatarUrl: user.avatar_url || null
      }
    };
  }

  async loginWithGoogle(idToken) {
    const profile = await verifyGoogleToken(idToken);

    // 1. Check if user already exists with this googleId
    let user = await dbAdapter.findByGoogleId(profile.googleId);

    // 2. If not, check if user exists by email
    if (!user && profile.email) {
      user = await dbAdapter.findByEmail(profile.email);
    }

    // 3. If still not found, create new user in Supabase / Local database
    if (!user) {
      user = await dbAdapter.createUser({
        username: profile.name,
        email: profile.email,
        authProvider: 'google',
        googleId: profile.googleId,
        avatarUrl: profile.picture
      });
    }

    const token = createToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      authProvider: 'google'
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        authProvider: 'google',
        avatarUrl: profile.picture || user.avatar_url
      }
    };
  }

  async registerUser({ username, email, password }) {
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    const existingUser = await dbAdapter.findByUsername(username);
    if (existingUser) {
      throw new Error(`Username "${username}" is already taken.`);
    }

    if (email) {
      const existingEmail = await dbAdapter.findByEmail(email);
      if (existingEmail) {
        throw new Error(`Email "${email}" is already registered.`);
      }
    }

    const newUser = await dbAdapter.createUser({
      username,
      email,
      password,
      authProvider: 'local'
    });

    const token = createToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      authProvider: 'local'
    });

    return {
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        authProvider: 'local',
        avatarUrl: null
      }
    };
  }

  async getUser(username) {
    const user = await dbAdapter.findByUsername(username);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      authProvider: user.auth_provider || 'local',
      avatarUrl: user.avatar_url || null
    };
  }
}

export const authService = new AuthService();

// Express Middleware for protecting API endpoints
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }

  const payload = verifyToken(token, JWT_SECRET);
  if (!payload || !payload.username) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid token. Please log in again.' });
  }

  req.user = payload;
  next();
}
