import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(ROOT, '.env') });
const LOCAL_USERS_FILE = path.join(ROOT, 'UserData', 'auth_users.json');

// Password hashing using PBKDF2 with salt
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch (_) {
    return false;
  }
}

class DatabaseAdapter {
  constructor() {
    this.supabase = null;
    this.isSupabaseConnected = false;
    this.localUsers = [];
    this.init();
  }

  init() {
    this.initLocalStore();
    return this.initSupabase();
  }

  initLocalStore() {
    const userDir = path.join(ROOT, 'UserData');
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    if (fs.existsSync(LOCAL_USERS_FILE)) {
      try {
        this.localUsers = JSON.parse(fs.readFileSync(LOCAL_USERS_FILE, 'utf8'));
      } catch (err) {
        console.error('[DB] Error parsing auth_users.json, resetting:', err);
        this.localUsers = [];
      }
    }

    // Default admin user if empty
    if (!this.localUsers || this.localUsers.length === 0) {
      const defaultUser = process.env.DASHBOARD_USERNAME || 'admin';
      const defaultPass = process.env.DASHBOARD_PASSWORD || 'admin123';
      const defaultEmail = process.env.NOTIFICATION_EMAIL || 'admin@leetcoder.local';

      this.localUsers = [
        {
          id: crypto.randomUUID(),
          username: defaultUser,
          email: defaultEmail,
          password_hash: hashPassword(defaultPass),
          auth_provider: 'local',
          google_id: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      this.saveLocalStore();
      console.log(`[DB] Local database initialized with default user: "${defaultUser}" (password: "${defaultPass}")`);
    }
  }

  saveLocalStore() {
    try {
      const userDir = path.join(ROOT, 'UserData');
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(this.localUsers, null, 2), 'utf8');
    } catch (e) {
      console.error('[DB] Failed to save auth_users.json:', e);
    }
  }

  async initSupabase() {
    const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
    const supabaseKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY || 
      process.env.SUPABASE_KEY || 
      process.env.SUPABASE_ANON_KEY || ''
    ).trim();

    if (!supabaseUrl || !supabaseKey) {
      console.log('[DB] No SUPABASE_URL / SUPABASE_KEY found in .env. Using local persistent database.');
      return;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });

      // Test connection by querying app_users
      const { data, error } = await this.supabase
        .from('app_users')
        .select('id')
        .limit(1);

      if (error) {
        console.warn(`[DB] Supabase reachable but 'app_users' table check returned: ${error.message}. Please run the SQL schema in your Supabase SQL Editor.`);
        this.isSupabaseConnected = false;
      } else {
        this.isSupabaseConnected = true;
        console.log(`[DB] Successfully connected to Supabase Database at ${supabaseUrl}!`);
      }
    } catch (err) {
      console.warn('[DB] Could not initialize Supabase connection:', err.message);
      this.isSupabaseConnected = false;
    }
  }

  getStatus() {
    return {
      provider: this.isSupabaseConnected ? 'supabase' : 'local',
      isSupabaseConnected: this.isSupabaseConnected,
      supabaseUrl: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/^(https?:\/\/[^.]+).*/, '$1***') : null,
      totalUsers: this.localUsers.length
    };
  }

  // ─── Query Operations ────────────────────────────────────────────────────────

  async findByUsername(username) {
    if (!username) return null;
    const clean = username.trim().toLowerCase();

    // 1. Try Supabase if connected
    if (this.isSupabaseConnected) {
      try {
        const { data, error } = await this.supabase
          .from('app_users')
          .select('*')
          .ilike('username', clean)
          .maybeSingle();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase findByUsername query error, checking local fallback:', err.message);
      }
    }

    // 2. Local fallback
    return this.localUsers.find(u => u.username && u.username.toLowerCase() === clean) || null;
  }

  async findByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();

    // 1. Try Supabase
    if (this.isSupabaseConnected) {
      try {
        const { data, error } = await this.supabase
          .from('app_users')
          .select('*')
          .ilike('email', clean)
          .maybeSingle();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase findByEmail error:', err.message);
      }
    }

    // 2. Local fallback
    return this.localUsers.find(u => u.email && u.email.toLowerCase() === clean) || null;
  }

  async findByGoogleId(googleId) {
    if (!googleId) return null;

    // 1. Try Supabase
    if (this.isSupabaseConnected) {
      try {
        const { data, error } = await this.supabase
          .from('app_users')
          .select('*')
          .eq('google_id', String(googleId))
          .maybeSingle();

        if (data && !error) return data;
      } catch (err) {
        console.warn('[DB] Supabase findByGoogleId error:', err.message);
      }
    }

    // 2. Local fallback
    return this.localUsers.find(u => u.google_id && String(u.google_id) === String(googleId)) || null;
  }

  // ─── Write Operations ────────────────────────────────────────────────────────

  async createUser({ username, email, password, authProvider = 'local', googleId = null, avatarUrl = null }) {
    const newUser = {
      id: crypto.randomUUID(),
      username: username ? username.trim() : (email ? email.split('@')[0] : 'user_' + Date.now().toString(36)),
      email: email ? email.trim().toLowerCase() : null,
      password_hash: password ? hashPassword(password) : null,
      auth_provider: authProvider,
      google_id: googleId ? String(googleId) : null,
      avatar_url: avatarUrl || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save to Supabase if connected
    if (this.isSupabaseConnected) {
      try {
        const { data, error } = await this.supabase
          .from('app_users')
          .insert([newUser])
          .select()
          .single();

        if (!error && data) {
          console.log(`[DB] User "${newUser.username}" created in Supabase database.`);
          return data;
        }
        console.warn('[DB] Supabase insert failed, saving to local store:', error?.message);
      } catch (err) {
        console.warn('[DB] Supabase createUser error:', err.message);
      }
    }

    // Save to local store
    this.localUsers.push(newUser);
    this.saveLocalStore();
    console.log(`[DB] User "${newUser.username}" saved in local database.`);
    return newUser;
  }

  async updatePassword(username, newPassword) {
    const newHash = hashPassword(newPassword);

    // 1. Update in Supabase
    if (this.isSupabaseConnected) {
      try {
        await this.supabase
          .from('app_users')
          .update({ password_hash: newHash, updated_at: new Date().toISOString() })
          .ilike('username', username.trim());
      } catch (e) {
        console.warn('[DB] Supabase updatePassword error:', e.message);
      }
    }

    // 2. Update local
    const u = this.localUsers.find(x => x.username && x.username.toLowerCase() === username.trim().toLowerCase());
    if (u) {
      u.password_hash = newHash;
      u.updated_at = new Date().toISOString();
      this.saveLocalStore();
    }
    return true;
  }

  async updateCredentials(oldUsername, newUsername, newPassword) {
    const cleanOld = oldUsername.trim().toLowerCase();
    const cleanNew = newUsername ? newUsername.trim() : null;

    const updates = { updated_at: new Date().toISOString() };
    if (cleanNew) updates.username = cleanNew;
    if (newPassword && newPassword.trim()) {
      updates.password_hash = hashPassword(newPassword.trim());
    }

    if (this.isSupabaseConnected) {
      try {
        await this.supabase
          .from('app_users')
          .update(updates)
          .ilike('username', cleanOld);
      } catch (e) {
        console.warn('[DB] Supabase updateCredentials error:', e.message);
      }
    }

    const u = this.localUsers.find(x => x.username && x.username.toLowerCase() === cleanOld);
    if (u) {
      if (cleanNew) u.username = cleanNew;
      if (updates.password_hash) u.password_hash = updates.password_hash;
      u.updated_at = new Date().toISOString();
      this.saveLocalStore();
    }
    return true;
  }

  async verifyCredentials(username, password) {
    const user = await this.findByUsername(username);
    if (!user) return null;
    if (!user.password_hash) return null; // e.g. Google-only account

    const isValid = verifyPassword(password, user.password_hash);
    return isValid ? user : null;
  }
}

export const dbAdapter = new DatabaseAdapter();

