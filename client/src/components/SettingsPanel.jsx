import React, { useState, useEffect } from 'react';

const SUPPORTED_LANGS = [
  'java', 'cpp', 'python3', 'python', 'javascript', 'typescript',
  'c', 'csharp', 'golang', 'rust', 'swift', 'kotlin', 'scala', 'ruby', 'php'
];

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    USER_EMAIL: '',
    PREFERRED_LANGUAGE: 'java',
    GOOGLE_CHROME_EXECUTABLE_PATH: ''
  });
  const [statusMsg, setStatusMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = async (e) => {
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
        setStatusMsg('Settings saved successfully to .env!');
      } else {
        setStatusMsg(`Failed: ${data.error}`);
      }
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '20px'
    }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Configuration (.env Settings)</h3>
      
      {statusMsg && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '13px',
          background: statusMsg.includes('success') ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 69, 58, 0.15)',
          color: statusMsg.includes('success') ? '#30d158' : '#ff453a',
          border: `1px solid ${statusMsg.includes('success') ? '#30d15844' : '#ff453a44'}`
        }}>
          {statusMsg}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Profile Identifier / Directory Name (USER_EMAIL):
          </label>
          <input
            type="text"
            value={settings.USER_EMAIL || ''}
            onChange={e => setSettings({ ...settings, USER_EMAIL: e.target.value })}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Preferred Solution Language (PREFERRED_LANGUAGE):
          </label>
          <select
            value={settings.PREFERRED_LANGUAGE || 'java'}
            onChange={e => setSettings({ ...settings, PREFERRED_LANGUAGE: e.target.value })}
            style={{ width: '100%', boxSizing: 'border-box' }}
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
            style={{ width: '100%', boxSizing: 'border-box' }}
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
          {saving ? 'Saving...' : 'Save Settings to .env'}
        </button>
      </form>
    </div>
  );
}

