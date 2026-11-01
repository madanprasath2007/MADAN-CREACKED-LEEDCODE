import React, { useState } from 'react';

const MODES = [
  { id: 'L', label: 'Login to LeetCode', desc: 'Opens Chrome for manual session auth' },
  { id: '1', label: 'Solve All Queued', desc: 'Solves all problems in local ./problems/' },
  { id: '2', label: 'Scrape Solved Solutions', desc: 'Fetches accepted submissions via GraphQL' },
  { id: '3', label: 'Solve Daily Challenge', desc: 'Solves today\'s active coding challenge' },
  { id: '4', label: 'Solve Specific Problems', desc: 'Custom problem number, slug, range, or file' },
];

export default function ControlPanel({ botStatus, onStart, onStop }) {
  const [selectedMode, setSelectedMode] = useState('1');
  const [customInput, setCustomInput] = useState('');

  const isRunning = botStatus.running;

  const handleStart = () => {
    onStart(selectedMode, customInput);
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Bot Control & Launch Panel</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isRunning ? 'var(--accent-green)' : '#888'
          }} />
          <span style={{ fontSize: '13px', color: isRunning ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {isRunning ? `Running (Mode ${botStatus.mode})` : 'Idle / Stopped'}
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
        marginBottom: '16px'
      }}>
        {MODES.map((m) => {
          const active = selectedMode === m.id;
          return (
            <div
              key={m.id}
              onClick={() => !isRunning && setSelectedMode(m.id)}
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${active ? 'var(--accent-orange)' : 'var(--border-color)'}`,
                background: active ? 'rgba(255, 161, 22, 0.1)' : 'var(--bg-tertiary)',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                opacity: isRunning && !active ? 0.6 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{
                  background: active ? 'var(--accent-orange)' : '#444',
                  color: active ? '#000' : '#fff',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '11px',
                  padding: '2px 6px'
                }}>
                  {m.id}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  {m.label}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {m.desc}
              </p>
            </div>
          );
        })}
      </div>

      {selectedMode === '4' && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Mode 4 Target (problem numbers, slugs, ranges like <code>1-5</code>, or file path):
          </label>
          <input
            type="text"
            disabled={isRunning}
            placeholder="e.g. 1, 15, two-sum, 1-10"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleStart}
          disabled={isRunning}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '6px',
            backgroundColor: isRunning ? '#3a3a3a' : 'var(--accent-orange)',
            color: isRunning ? '#777' : '#000',
            fontWeight: 700,
            fontSize: '14px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          {isRunning ? 'Bot is Currently Running...' : `Start Bot (Mode ${selectedMode})`}
        </button>

        {isRunning && (
          <button
            onClick={onStop}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent-red)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px'
            }}
          >
            Force Stop Bot
          </button>
        )}
      </div>
    </div>
  );
}

