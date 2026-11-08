import React, { useState, useEffect } from 'react';

export default function TwoFactorModal({ isOpen, onClose, token, user, onStatusChange }) {
  const [setupData, setSetupData] = useState(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      setConfirmCode('');
      setDisablePassword('');
      setDisableCode('');
      if (!user.twoFactorEnabled) {
        initiateSetup();
      }
    }
  }, [isOpen, user.twoFactorEnabled]);

  const initiateSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/setup-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to initialize 2FA setup.');
      } else {
        setSetupData(data);
      }
    } catch (err) {
      setError('Error initiating 2FA setup: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm2FA = async (e) => {
    e.preventDefault();
    setError('');
    if (!setupData?.secret || confirmCode.length !== 6) {
      setError('Please enter the 6-digit code from Google Authenticator.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/confirm-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          secret: setupData.secret,
          code: confirmCode.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid verification code. Check clock & app.');
      } else {
        setSuccessMsg('🎉 Google Authenticator 2FA successfully activated!');
        onStatusChange(data.user);
        setTimeout(() => {
          onClose();
        }, 1600);
      }
    } catch (err) {
      setError('Error confirming 2FA: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setError('');
    if (!disablePassword || disableCode.length !== 6) {
      setError('Please enter your password and current 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/disable-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to disable 2FA.');
      } else {
        setSuccessMsg('2FA has been disabled.');
        onStatusChange(data.user);
        setTimeout(() => {
          onClose();
        }, 1600);
      }
    } catch (err) {
      setError('Error disabling 2FA: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#1e1e1e',
        border: '1px solid #383838',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid #2e2e2e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#242424'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
              Google Authenticator (2FA)
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#888',
              fontSize: '18px',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '22px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(255, 55, 95, 0.12)',
              border: '1px solid rgba(255, 55, 95, 0.3)',
              borderRadius: '6px',
              color: '#ff4d6d',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(0, 184, 163, 0.12)',
              border: '1px solid rgba(0, 184, 163, 0.3)',
              borderRadius: '6px',
              color: '#00b8a3',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {successMsg}
            </div>
          )}

          {!user.twoFactorEnabled ? (
            /* ─── Enable 2FA Flow ─── */
            <div>
              <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '14px', lineHeight: 1.5 }}>
                1. Open <strong>Google Authenticator</strong> on your mobile phone, tap <strong>+</strong>, and scan this QR code:
              </p>

              {setupData?.qrCode ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  padding: '10px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  width: 'fit-content',
                  margin: '0 auto 16px auto'
                }}>
                  <img
                    src={setupData.qrCode}
                    alt="2FA QR Code"
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                  {loading ? 'Generating setup QR code...' : 'Ready'}
                </div>
              )}

              {/* Secret Key manual entry option */}
              <div style={{
                background: '#141414',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #2f2f2f',
                marginBottom: '18px'
              }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                  Can't scan? Enter key manually:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <code style={{ fontSize: '12px', color: '#ffa116', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {setupData?.secret || '...'}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    style={{
                      background: '#333',
                      color: '#ddd',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {copied ? 'Copied! ✓' : 'Copy Key'}
                  </button>
                </div>
              </div>

              {/* Confirmation Step */}
              <form onSubmit={handleConfirm2FA}>
                <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px' }}>
                  2. Enter the 6-digit code shown in Google Authenticator:
                </p>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      letterSpacing: '0.3rem',
                      fontSize: '18px',
                      fontWeight: 700,
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading || confirmCode.length !== 6}
                    style={{
                      background: confirmCode.length === 6 ? '#00b8a3' : '#444',
                      color: '#fff',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}
                  >
                    {loading ? 'Activating...' : 'Activate 2FA'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ─── 2FA Already Active / Disable Flow ─── */
            <div>
              <div style={{
                textAlign: 'center',
                padding: '16px',
                backgroundColor: 'rgba(0, 184, 163, 0.1)',
                border: '1px solid rgba(0, 184, 163, 0.3)',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '6px' }}>🛡️</div>
                <h4 style={{ color: '#00b8a3', fontSize: '15px', fontWeight: 700 }}>
                  Google Authenticator is Active
                </h4>
                <p style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
                  Your account is protected with Two-Factor Authentication. Every login requires your phone verification code.
                </p>
              </div>

              {/* Disable 2FA Form */}
              <div style={{
                borderTop: '1px solid #2f2f2f',
                paddingTop: '16px'
              }}>
                <h5 style={{ fontSize: '13px', color: '#ff4d6d', marginBottom: '10px', fontWeight: 600 }}>
                  Disable Two-Factor Authentication
                </h5>
                <form onSubmit={handleDisable2FA}>
                  <div style={{ marginBottom: '10px' }}>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="6-digit code"
                      maxLength={6}
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, ''))}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        letterSpacing: '0.2rem',
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={loading || !disablePassword || disableCode.length !== 6}
                      style={{
                        background: '#e11d48',
                        color: '#fff',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      {loading ? 'Disabling...' : 'Disable 2FA'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

