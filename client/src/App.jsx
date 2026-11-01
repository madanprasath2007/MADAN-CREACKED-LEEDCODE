import React, { useState, useEffect } from 'react';
import StatsBar from './components/StatsBar.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import LogStream from './components/LogStream.jsx';
import SolutionsBrowser from './components/SolutionsBrowser.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [botStatus, setBotStatus] = useState({ running: false, mode: null });
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ solvedCount: 0, totalProblems: 0 });

  // Fetch initial stats and status
  const loadStats = () => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats({ solvedCount: data.solvedCount, totalProblems: data.totalProblems });
        }
      })
      .catch(console.error);
  };

  const loadStatus = () => {
    fetch('/api/bot/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBotStatus({ running: data.running, mode: data.mode });
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadStats();
    loadStatus();

    // Setup WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
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

      ws.onclose = () => {
        // Reconnect after 3s
        setTimeout(connectWs, 3000);
      };
    };

    connectWs();

    return () => {
      if (ws) ws.close();
    };
  }, []);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'var(--accent-orange)',
            color: '#000',
            fontWeight: 900,
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            LC
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.3px' }}>
            Leetcoder <span style={{ color: 'var(--accent-orange)', fontSize: '13px', fontWeight: 500 }}>Dashboard</span>
          </h1>
        </div>

        <nav style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'dashboard', label: 'Dashboard & Console' },
            { id: 'solutions', label: 'Solutions Archive' },
            { id: 'settings', label: 'Settings' }
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

        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
}
