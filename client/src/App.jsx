import React, { useState, useEffect, useCallback } from 'react';
import StatsBar from './components/StatsBar.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import LogStream from './components/LogStream.jsx';
import SolutionsBrowser from './components/SolutionsBrowser.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import LoginPage from './components/LoginPage.jsx';
import { getStoredToken, setStoredToken, clearStoredToken } from './authHelper.js';

export default function App() {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState({ username: 'admin', authProvider: 'local' });
  const [isAuthChecking, setIsAuthChecking] = useState(Boolean(getStoredToken()));

  const [activeTab, setActiveTab] = useState('dashboard');
  const [botStatus, setBotStatus] = useState({ running: false, mode: null });
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ solvedCount: 0, totalProblems: 0 });

  // Verify stored session token on mount
  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      clearStoredToken();
    };

    window.addEventListener('auth_expired', handleAuthExpired);

    const stored = getStoredToken();
    if (stored) {
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setUser(data.user);
            setToken(stored);
          } else {
            handleAuthExpired();
          }
        })
        .catch(() => handleAuthExpired())
        .finally(() => setIsAuthChecking(false));
    } else {
      setIsAuthChecking(false);
    }

    return () => {
      window.removeEventListener('auth_expired', handleAuthExpired);
    };
  }, []);

  const handleLoginSuccess = (newToken, newUser) => {
    setStoredToken(newToken);
    setToken(newToken);
    if (newUser) setUser(newUser);
  };

  const handleLogout = () => {
    clearStoredToken();
    setToken(null);
    setBotStatus({ running: false, mode: null });
  };

  // Fetch stats and bot status
  const loadStats = useCallback(() => {
    if (!token) return;
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats({ solvedCount: data.solvedCount, totalProblems: data.totalProblems });
        }
      })
      .catch(console.error);
  }, [token]);

  const loadStatus = useCallback(() => {
    if (!token) return;
    fetch('/api/bot/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBotStatus({ running: data.running, mode: data.mode });
        }
      })
      .catch(console.error);
  }, [token]);

  // WebSocket Connection for authenticated user
  useEffect(() => {
    if (!token) return;

    loadStats();
    loadStatus();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
    let ws;

    const connectWs = () => {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'log') {
            setLogs(prev => [...prev, payload]);
          } else if (payload.type === 'status') {
            setBotStatus({ running: payload.running, mode: payload.mode });
          } else if (payload.type === 'bot_started') {
            setBotStatus({ running: true, mode: payload.mode });
          } else if (payload.type === 'bot_stopped') {
            setBotStatus({ running: false, mode: null });
            loadStats();
          }
        } catch (_) {}
      };

      ws.onclose = (event) => {
        if (event.code !== 4001) {
          // Reconnect after 3s unless unauthorized
          setTimeout(connectWs, 3000);
        }
      };
    };

    connectWs();

    return () => {
      if (ws) ws.close();
    };
  }, [token, loadStats, loadStatus]);

  const handleStartBot = async (mode, input) => {
    try {
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, input })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Failed to start bot');
      }
    } catch (e) {
      alert(`Error starting bot: ${e.message}`);
    }
  };

  const handleStopBot = async () => {
    try {
      await fetch('/api/bot/stop', { method: 'POST' });
    } catch (e) {
      alert(`Error stopping bot: ${e.message}`);
    }
  };

  // Loading state while checking token on cold start
  if (isAuthChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#141414',
        color: '#ffa116',
        fontSize: '18px',
        fontWeight: 600
      }}>
        ⚡ Initializing LeetCoder Dashboard...
      </div>
    );
  }

  // Not authenticated -> Show Login Page with Google Connection
  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top Navbar */}
      <header style={{
        background: '#181818',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
        flexShrink: 0
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'var(--accent-orange)',
            color: '#000',
            fontWeight: 900,
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '14px',
            letterSpacing: '0.5px'
          }}>
            MC
          </div>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px', margin: 0 }}>
              MADAN <span style={{ color: 'var(--accent-orange)' }}>CRACKED LEETCODE</span>
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>by Madan Prasath</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'dashboard', label: 'Dashboard & Console' },
            { id: 'solutions', label: 'Solutions Archive' },
            { id: 'settings', label: 'Settings & Supabase' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                background: activeTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-orange)' : 'var(--text-muted)',
                border: activeTab === tab.id ? '1px solid var(--border-color)' : '1px solid transparent'
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* User Profile Pill & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* User Info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            background: '#242424',
            borderRadius: '20px',
            border: '1px solid #383838'
          }}>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                style={{ width: '22px', height: '22px', borderRadius: '50%' }}
              />
            ) : (
              <span style={{ fontSize: '14px' }}>
                {user?.authProvider === 'google' ? '🌐' : '👤'}
              </span>
            )}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
              {user?.username || 'admin'}
            </span>
            {user?.authProvider === 'google' && (
              <span style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.2)',
                color: '#4285F4',
                fontWeight: 700
              }}>
                Google
              </span>
            )}
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            title="Sign out of dashboard"
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              background: '#222',
              color: '#bbb',
              border: '1px solid #383838'
            }}
          >
            Sign Out ↪
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '650px' }}>
            <StatsBar stats={stats} />
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 1.2fr', gap: '20px', flex: 1, minHeight: 0 }}>
              <div style={{ overflowY: 'auto' }}>
                <ControlPanel
                  botStatus={botStatus}
                  onStart={handleStartBot}
                  onStop={handleStopBot}
                />
              </div>
              <div style={{ height: '100%', minHeight: '400px' }}>
                <LogStream
                  logs={logs}
                  onClear={() => setLogs([])}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'solutions' && <SolutionsBrowser />}

        {activeTab === 'settings' && (
          <SettingsPanel
            user={user}
            onUserUpdated={(u) => setUser(u)}
          />
        )}
      </main>
    </div>
  );
}
