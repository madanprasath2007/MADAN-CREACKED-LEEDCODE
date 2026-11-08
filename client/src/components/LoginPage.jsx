import React, { useState, useEffect, useRef } from 'react';

export default function LoginPage({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authConfig, setAuthConfig] = useState({ googleClientId: '', database: null });
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);

  const googleBtnRef = useRef(null);

  // Fetch backend auth config (Google Client ID & Database status)
  useEffect(() => {
    fetch('/api/auth/config')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAuthConfig({
            googleClientId: data.googleClientId || '',
            database: data.database || null
          });
        }
      })
      .catch(console.error);
  }, []);

  // Initialize Google Sign-In button if Google Identity Services SDK is loaded and Client ID is set
  useEffect(() => {
    if (!authConfig.googleClientId) return;

    const initGoogleGsi = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: authConfig.googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'filled_black',
              size: 'large',
              width: 370,
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left'
            });
          }
        } catch (e) {
          console.warn('Google GSI init warning:', e);
        }
      }
    };

    // If script already loaded
    if (window.google?.accounts?.id) {
      initGoogleGsi();
    } else {
      // Retry in 500ms
      const timer = setTimeout(initGoogleGsi, 500);
      return () => clearTimeout(timer);
    }
  }, [authConfig.googleClientId]);

  // Handler when user signs in with Google
  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Google sign-in failed.');
        setLoading(false);
        return;
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError('Google Sign-In connection error: ' + err.message);
      setLoading(false);
    }
  };

  // Submit Password Login or Signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const payload = isSignUp
      ? { username: username.trim(), email: email.trim(), password }
      : { username: username.trim(), password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Authentication failed.');
        setLoading(false);
        return;
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError('Server connection error: ' + err.message);
      setLoading(false);
    }
  };

  const isSupabaseActive = authConfig.database?.provider === 'supabase';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #262626 0%, #121212 100%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '430px',
        background: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: '12px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '28px 24px 18px',
          textAlign: 'center',
          borderBottom: '1px solid #2a2a2a'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 12px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ffa116 0%, #ff6b00 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 4px 16px rgba(255, 161, 22, 0.35)'
          }}>
            ⚡
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
            LeetCoder Suite
          </h2>
          <p style={{ fontSize: '13px', color: '#888' }}>
            {isSignUp ? 'Create your account' : 'Sign in to access your automation dashboard'}
          </p>

          {/* Database Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '8px',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            background: isSupabaseActive ? 'rgba(0, 184, 163, 0.12)' : 'rgba(255, 255, 255, 0.05)',
            color: isSupabaseActive ? '#00b8a3' : '#888',
            border: `1px solid ${isSupabaseActive ? 'rgba(0, 184, 163, 0.3)' : '#333'}`
          }}>
            <span>{isSupabaseActive ? '🟢' : '💾'}</span>
            <span>Database: {isSupabaseActive ? 'Supabase (PostgreSQL)' : 'Local Database'}</span>
          </div>
        </div>

        {/* Tab Toggle: Sign In vs Sign Up */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #2a2a2a',
          background: '#191919'
        }}>
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '13px',
              fontWeight: 600,
              background: !isSignUp ? '#1e1e1e' : 'transparent',
              color: !isSignUp ? '#ffa116' : '#888',
              borderBottom: !isSignUp ? '2px solid #ffa116' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '13px',
              fontWeight: 600,
              background: isSignUp ? '#1e1e1e' : 'transparent',
              color: isSignUp ? '#ffa116' : '#888',
              borderBottom: isSignUp ? '2px solid #ffa116' : 'none'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            margin: '16px 24px 0',
            padding: '10px 14px',
            background: 'rgba(255, 55, 95, 0.12)',
            border: '1px solid rgba(255, 55, 95, 0.3)',
            borderRadius: '6px',
            color: '#ff4d6d',
            fontSize: '13px',
            lineHeight: 1.4
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ padding: '24px' }}>
          {/* ─── Google Sign-In Button Section ─── */}
          <div style={{ marginBottom: '20px' }}>
            {authConfig.googleClientId ? (
              <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} />
            ) : (
              <button
                type="button"
                onClick={() => setShowGoogleHelp(true)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#242424',
                  border: '1px solid #3c3c3c',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                {/* Google "G" SVG Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}

            {/* Google OAuth setup help dialog */}
            {showGoogleHelp && (
              <div style={{
                marginTop: '12px',
                padding: '12px 14px',
                background: 'rgba(66, 133, 244, 0.08)',
                border: '1px solid rgba(66, 133, 244, 0.25)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#aaa',
                lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 600, color: '#4285F4', marginBottom: '4px' }}>
                  ℹ️ Google Sign-In Setup:
                </div>
                To enable 1-click Google Sign-In, add your <code>GOOGLE_CLIENT_ID</code> in <code>.env</code> (from Google Cloud Console &rarr; Credentials &rarr; OAuth 2.0 Client IDs).
                <div style={{ marginTop: '8px', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => setShowGoogleHelp(false)}
                    style={{ background: 'transparent', color: '#4285F4', textDecoration: 'underline', fontSize: '11px' }}
                  >
                    Got it, close
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '18px 0',
            color: '#666',
            fontSize: '11px',
            textTransform: 'uppercase'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#2c2c2c' }} />
            <span style={{ padding: '0 10px' }}>or continue with password</span>
            <div style={{ flex: 1, height: '1px', background: '#2c2c2c' }} />
          </div>

          {/* ─── Username & Password Form ─── */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 600 }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#141414',
                  border: '1px solid #383838',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            {isSignUp && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 600 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#141414',
                    border: '1px solid #383838',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px', fontWeight: 600 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    background: '#141414',
                    border: '1px solid #383838',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    color: '#888',
                    fontSize: '14px',
                    padding: '4px 6px'
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#444' : 'linear-gradient(135deg, #ffa116 0%, #ff8000 100%)',
                color: '#000',
                fontWeight: 700,
                fontSize: '14px',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(255, 161, 22, 0.25)',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account ➔' : 'Sign In ➔')}
            </button>

            {!isSignUp && (
              <div style={{
                marginTop: '16px',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '6px',
                border: '1px dashed #333',
                fontSize: '11px',
                color: '#777',
                lineHeight: 1.5,
                textAlign: 'center'
              }}>
                💡 Default Credentials:<br/>
                Username: <strong style={{ color: '#aaa' }}>admin</strong> &nbsp;|&nbsp; Password: <strong style={{ color: '#aaa' }}>admin123</strong>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
