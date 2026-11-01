import React from 'react';

export default function StatsBar({ stats }) {
  const solved = stats.solvedCount || 0;
  const total = stats.totalProblems || 2517;
  const pct = total > 0 ? Math.min(100, Math.round((solved / total) * 100)) : 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '20px'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
          Solved Progress
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-green)' }}>
            {solved}
          </span>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            / {total} problems
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '6px',
          background: 'var(--bg-tertiary)',
          borderRadius: '3px',
          overflow: 'hidden',
          marginTop: '4px'
        }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--accent-green)',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      <div style={{
        background: 'var(--bg-secondary)',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '6px'
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
          Completion Rate
        </span>
        <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-orange)' }}>
          {pct}%
        </span>
      </div>

      <div style={{
        background: 'var(--bg-secondary)',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '6px'
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
          Queued Local Problems
        </span>
        <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-blue)' }}>
          {total}
        </span>
      </div>
    </div>
  );
}

