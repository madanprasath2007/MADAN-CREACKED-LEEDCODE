import React, { useRef, useEffect } from 'react';

export default function LogStream({ logs, onClear }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getColor = (level) => {
    switch (level) {
      case 'error': return '#ff453a';
      case 'warn': return '#ffd60a';
      case 'system': return '#64d2ff';
      default: return '#30d158';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#121212',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        backgroundColor: '#1e1e1e',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#30d158',
            boxShadow: '0 0 8px #30d158'
          }} />
          <span style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Live Bot Console Logs
          </span>
          <span style={{ fontSize: '12px', background: '#333', padding: '2px 8px', borderRadius: '12px' }}>
            {logs.length}
          </span>
        </div>
        <button
          onClick={onClear}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
          onMouseEnter={e => e.target.style.color = 'var(--text-main)'}
          onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
        >
          Clear Console
        </button>
      </div>

      <div style={{
        flex: 1,
        padding: '12px',
        overflowY: 'auto',
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        fontSize: '12.5px',
        lineHeight: '1.6'
      }}>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px', fontStyle: 'italic' }}>
            No logs yet. Select a mode and click "Start Bot" to see real-time output.
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '4px', wordBreak: 'break-all' }}>
              <span style={{ color: '#555', userSelect: 'none', flexShrink: 0 }}>
                {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '--:--:--'}
              </span>
              <span style={{ color: getColor(log.level), fontWeight: log.level === 'error' ? 600 : 400 }}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

