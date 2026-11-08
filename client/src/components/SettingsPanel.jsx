import React, { useState, useEffect } from 'react';

const SUPPORTED_LANGS = [
  'java', 'cpp', 'python3', 'python', 'javascript', 'typescript',
  'c', 'csharp', 'golang', 'rust', 'swift', 'kotlin', 'scala', 'ruby', 'php'
];

const SUPABASE_SQL_SCRIPT = `-- ==============================================================================
-- Leetcoder App Database Schema for Supabase (PostgreSQL)
-- Copy and run this script in your Supabase project's SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Create app_users table
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  auth_provider TEXT DEFAULT 'local', -- 'local' or 'google'
  google_id TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow full access
DROP POLICY IF EXISTS "Allow full access" ON public.app_users;
CREATE POLICY "Allow full access" ON public.app_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Insert default admin user if table is empty (Default password: admin123)
INSERT INTO public.app_users (username, email, password_hash, auth_provider)
VALUES (
  'admin',
  'admin@leetcoder.local',
  '43182f715a52b1c726bc8707ef20cb9d:bb3c1707cc8c73ae36d7c53be418399b49be96ac00aef6aeb56baef69fe6c734ccf5841d864a21bd3fb3db6e9c7e7fb963a0d595481051547dddeac3bfebe15f',
  'local'
)
ON CONFLICT (username) DO NOTHING;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_google_id ON public.app_users(google_id);`;

export default function SettingsPanel({ user, onOpen2FAModal, onUserUpdated }) {
  const [settings, setSettings] = useState({
    USER_EMAIL: '',
    PREFERRED_LANGUAGE: 'java',
    GOOGLE_CHROME_EXECUTABLE_PATH: '',
    SMTP_HOST: '',
    SMTP_PORT: '',
    SMTP_USER: '',
    NOTIFICATION_EMAIL: '',
    SUPABASE_URL: '',
    SUPABASE_KEY: '',
    GOOGLE_CLIENT_ID: ''
  });
  const [dbStatus, setDbStatus] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Security Credentials State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState(user?.username || 'admin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMsg, setSecurityMsg] = useState('');
  const [securitySaving, setSecuritySaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSettings(prev => ({ ...prev, ...data.settings }));
          if (data.dbStatus) setDbStatus(data.dbStatus);
        }
      })
      .catch(console.error);
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('✅ Configuration saved successfully to .env!');
        if (data.dbStatus) setDbStatus(data.dbStatus);
      } else {
        setStatusMsg(`❌ Failed: ${data.error}`);
      }
    } catch (err) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    setSecurityMsg('');

    if (newPassword && newPassword !== confirmPassword) {
      setSecurityMsg('Error: New password and confirmation do not match.');
      return;
    }

    setSecuritySaving(true);
    try {
      const res = await fetch('/api/auth/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername.trim(),
          newPassword: newPassword ? newPassword : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setSecurityMsg('✅ Credentials updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (onUserUpdated && data.user) {
          onUserUpdated(data.user);
        }
      } else {
        setSecurityMsg(`Error: ${data.error || 'Failed to update credentials'}`);
      }
    } catch (err) {
      setSecurityMsg(`Error: ${err.message}`);
    } finally {
      setSecuritySaving(false);
    }
  };

  const isSupabaseActive = dbStatus?.provider === 'supabase' && dbStatus?.isSupabaseConnected;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ─── Card 1: Supabase Database & Google OAuth (SSO) ─── */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚡ Supabase Database & Google Sign-In</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Persist your user accounts in a free cloud PostgreSQL database (Supabase) and enable 1-click Google OAuth login.
            </p>
          </div>

          {/* Database Live Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: isSupabaseActive ? 'rgba(0, 184, 163, 0.15)' : 'rgba(255, 161, 22, 0.15)',
            color: isSupabaseActive ? '#00b8a3' : 'var(--accent-orange)',
            border: `1px solid ${isSupabaseActive ? 'rgba(0, 184, 163, 0.4)' : 'rgba(255, 161, 22, 0.4)'}`
          }}>
            <span style={{ fontSize: '10px' }}>{isSupabaseActive ? '🟢' : '💾'}</span>
            <span>{isSupabaseActive ? 'Connected to Supabase PostgreSQL' : 'Using Local Persistent Database'}</span>
          </div>
        </div>

        {/* Supabase & Google Form Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              Supabase Project URL (SUPABASE_URL):
            </label>
            <input
              type="text"
              value={settings.SUPABASE_URL || ''}
              onChange={e => setSettings({ ...settings, SUPABASE_URL: e.target.value })}
              placeholder="https://your-project.supabase.co"
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: '#777', marginTop: '4px', display: 'block' }}>
              Found in Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project URL
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              Supabase API Key (SUPABASE_KEY / Anon or Service Role):
            </label>
            <input
              type="password"
              value={settings.SUPABASE_KEY || ''}
              onChange={e => setSettings({ ...settings, SUPABASE_KEY: e.target.value })}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: '#777', marginTop: '4px', display: 'block' }}>
              Found in Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project API keys
            </span>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              Google OAuth Client ID (GOOGLE_CLIENT_ID):
            </label>
            <input
              type="text"
              value={settings.GOOGLE_CLIENT_ID || ''}
              onChange={e => setSettings({ ...settings, GOOGLE_CLIENT_ID: e.target.value })}
              placeholder="1234567890-abcdefg.apps.googleusercontent.com"
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: '#777', marginTop: '4px', display: 'block' }}>
              From Google Cloud Console &rarr; APIs & Services &rarr; Credentials &rarr; OAuth 2.0 Client ID (Web Application).
            </span>
          </div>
        </div>

        {/* Schema SQL Helper */}
        <div style={{ marginTop: '18px', borderTop: '1px solid #333', paddingTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#aaa' }}>
              Need to create the <code>app_users</code> table in your Supabase project?
            </span>
            <button
              type="button"
              onClick={() => setShowSqlSchema(!showSqlSchema)}
              style={{
                background: '#252525',
                border: '1px solid #444',
                color: '#ddd',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {showSqlSchema ? 'Hide SQL Script ▲' : 'View Supabase SQL Schema ▼'}
            </button>
          </div>

          {showSqlSchema && (
            <div style={{ marginTop: '12px', background: '#111', border: '1px solid #333', borderRadius: '6px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#888' }}>
                  Paste this into Supabase Dashboard &rarr; <strong>SQL Editor</strong> &rarr; Run:
                </span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  style={{
                    background: copiedSql ? '#00b8a3' : 'var(--accent-orange)',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {copiedSql ? '✓ Copied!' : 'Copy SQL to Clipboard'}
                </button>
              </div>
              <pre style={{
                fontSize: '11px',
                color: '#00b8a3',
                fontFamily: 'monospace',
                overflowX: 'auto',
                maxHeight: '180px',
                margin: 0
              }}>
                {SUPABASE_SQL_SCRIPT}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* ─── Card 2: Account Security & Credentials ─── */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
              🛡️ Account Security & Login Credentials
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Update your username, password, or configure optional 2-Factor Authentication.
            </p>
          </div>

          {/* 2FA Trigger Button */}
          {onOpen2FAModal && (
            <button
              type="button"
              onClick={onOpen2FAModal}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '13px',
                background: user?.twoFactorEnabled ? 'rgba(0,184,163,0.15)' : 'var(--accent-orange)',
                color: user?.twoFactorEnabled ? '#00b8a3' : '#000',
                border: `1px solid ${user?.twoFactorEnabled ? 'rgba(0,184,163,0.4)' : 'transparent'}`
              }}
            >
              {user?.twoFactorEnabled ? '🛡️ Manage 2FA' : '⚡ 2FA (Optional)'}
            </button>
          )}
        </div>

        {securityMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '13px',
            background: securityMsg.includes('✅') ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)',
            color: securityMsg.includes('✅') ? '#30d158' : '#ff453a',
            border: `1px solid ${securityMsg.includes('✅') ? '#30d15844' : '#ff453a44'}`
          }}>
            {securityMsg}
          </div>
        )}

        {/* Change Username / Password Form */}
        <form onSubmit={handleUpdateSecurity} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', borderTop: '1px solid #333', paddingTop: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Dashboard Username:
            </label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Current Password (required to save):
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              New Password (optional):
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep existing"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Confirm New Password:
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <button
              type="submit"
              disabled={securitySaving}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#333',
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                border: '1px solid #444',
                cursor: securitySaving ? 'not-allowed' : 'pointer'
              }}
            >
              {securitySaving ? 'Updating...' : 'Update Login Credentials'}
            </button>
          </div>
        </form>
      </div>

      {/* ─── Card 3: Environment (.env) & Automation Configuration ─── */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          ⚙️ Automation & Solver Configuration (.env)
        </h3>
        
        {statusMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '13px',
            background: statusMsg.includes('✅') ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)',
            color: statusMsg.includes('✅') ? '#30d158' : '#ff453a',
            border: `1px solid ${statusMsg.includes('✅') ? '#30d15844' : '#ff453a44'}`
          }}>
            {statusMsg}
          </div>
        )}

        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Profile Identifier / Directory Name (USER_EMAIL):
            </label>
            <input
              type="text"
              value={settings.USER_EMAIL || ''}
              onChange={e => setSettings({ ...settings, USER_EMAIL: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Preferred Solution Language (PREFERRED_LANGUAGE):
            </label>
            <select
              value={settings.PREFERRED_LANGUAGE || 'java'}
              onChange={e => setSettings({ ...settings, PREFERRED_LANGUAGE: e.target.value })}
              style={{ width: '100%' }}
            >
              {SUPPORTED_LANGS.map(lang => (
                <option key={lang} value={lang}>{lang.toUpperCase()}</option>
              ))}
            </select>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              When set to 'java', Leetcoder automatically fetches verified Java solutions from doocs/leetcode online if not cached.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Google Chrome Executable Path:
            </label>
            <input
              type="text"
              value={settings.GOOGLE_CHROME_EXECUTABLE_PATH || ''}
              onChange={e => setSettings({ ...settings, GOOGLE_CHROME_EXECUTABLE_PATH: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Notification Email (Destination for Execution Reports):
            </label>
            <input
              type="email"
              value={settings.NOTIFICATION_EMAIL || ''}
              onChange={e => setSettings({ ...settings, NOTIFICATION_EMAIL: e.target.value })}
              placeholder="e.g. madanprasath2007@gmail.com"
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: '8px',
              padding: '10px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent-orange)',
              color: '#000',
              fontWeight: 700,
              fontSize: '14px',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save All Settings to .env'}
          </button>
        </form>
      </div>
    </div>
  );
}
