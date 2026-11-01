import React, { useState, useEffect } from 'react';

export default function SolutionsBrowser() {
  const [solutions, setSolutions] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [activeCode, setActiveCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSolutions = async (q = '', p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/solutions?q=${encodeURIComponent(q)}&page=${p}&limit=15`);
      const data = await res.json();
      if (data.success) {
        setSolutions(data.solutions);
        setTotal(data.total);
        setPage(data.page);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolutions(search, 1);
  }, [search]);

  const viewCode = async (slug, type = 'java') => {
    try {
      setSelectedSlug(slug);
      const res = await fetch(`/api/solutions/${slug}/code?type=${type}`);
      const data = await res.json();
      if (data.success) {
        setActiveCode(data);
      } else {
        setActiveCode({ code: 'No code found.' });
      }
    } catch (e) {
      setActiveCode({ code: `Error loading code: ${e.message}` });
    }
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Saved & Scraped Solutions Browser</h3>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Total Available: {total}
        </span>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Filter by slug or problem name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedSlug ? '1fr 1fr' : '1fr', gap: '16px' }}>
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid var(--border-color)',
          borderRadius: '6px'
        }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading solutions...</div>
          ) : solutions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No solutions saved yet. Run Mode 2 (Scraper) or solve problems in Java to populate!
            </div>
          ) : (
            solutions.map((item) => (
              <div
                key={item.slug}
                onClick={() => viewCode(item.slug, item.hasJava ? 'java' : 'scraped')}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: selectedSlug === item.slug ? 'var(--bg-tertiary)' : 'transparent',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.slug}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Language: <span style={{ color: 'var(--accent-orange)' }}>{item.language}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {item.hasJava && (
                    <span style={{ fontSize: '10px', background: '#0a84ff33', color: '#64d2ff', padding: '2px 6px', borderRadius: '4px' }}>
                      Java
                    </span>
                  )}
                  {item.hasScraped && (
                    <span style={{ fontSize: '10px', background: '#30d15833', color: '#30d158', padding: '2px 6px', borderRadius: '4px' }}>
                      Scraped
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {selectedSlug && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '400px',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            background: '#121212',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              background: '#1e1e1e',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-orange)' }}>
                {selectedSlug} ({activeCode?.language || 'code'})
              </span>
              <button
                onClick={() => setSelectedSlug(null)}
                style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '12px' }}
              >
                Close
              </button>
            </div>
            <pre style={{
              flex: 1,
              padding: '12px',
              overflow: 'auto',
              fontSize: '12px',
              fontFamily: 'Consolas, Monaco, monospace',
              color: '#d4d4d4'
            }}>
              {activeCode?.code || 'Loading...'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

