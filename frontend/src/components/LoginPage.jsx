import React, { useState } from 'react';

const styles = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#0a0a0a',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  /* Very subtle animated grid background */
  bgGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
    WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '400px',
    background: '#111',
    border: '1px solid #333',
    borderRadius: '16px',
    padding: '3rem 2.5rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
    animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    margin: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  logoRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '0.5rem',
  },
  logoIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: '#fff',
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    boxShadow: '0 0 15px rgba(255,255,255,0.2)',
  },
  logoTextContainer: {
    textAlign: 'center',
  },
  logoTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    letterSpacing: '-0.04em',
    color: '#fff',
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: '0.75rem',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: '#888',
    marginTop: '0.3rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  fieldWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#ccc',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    padding: '0.85rem 1rem',
    background: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  inputFocus: {
    borderColor: '#fff',
    boxShadow: '0 0 0 1px #fff',
  },
  submitBtn: {
    width: '100%',
    padding: '0.9rem',
    background: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    marginTop: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    color: '#ff4444',
    background: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid rgba(255, 68, 68, 0.2)',
    borderRadius: '6px',
    padding: '0.75rem',
    fontSize: '0.85rem',
    fontWeight: 500,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#555',
    marginTop: '1rem',
  }
};

export default function LoginPage({ onLogin, apiBase }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [hoverBtn, setHoverBtn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('kynu_token', data.token);
        onLogin();
      } else {
        setError('Incorrect credentials');
      }
    } catch {
      setError('System unreachable');
    }
    setLoading(false);
  };

  const getInputStyle = (field) => ({
    ...styles.input,
    ...(focusedField === field ? styles.inputFocus : {}),
    ...(error ? { borderColor: '#522' } : {})
  });

  return (
    <div style={styles.page}>
      <div style={styles.bgGrid} />

      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>⬛</div>
          <div style={styles.logoTextContainer}>
            <div style={styles.logoTitle}>DEVOPS SYSTEM</div>
            <div style={styles.logoSub}>Restricted Access</div>
          </div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.fieldGroup}>
          <div style={styles.fieldWrapper}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              style={getInputStyle('username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              required
              autoComplete="username"
            />
          </div>
          <div style={styles.fieldWrapper}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              style={getInputStyle('password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            onMouseEnter={() => setHoverBtn(true)}
            onMouseLeave={() => setHoverBtn(false)}
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              transform: hoverBtn && !loading ? 'translateY(-2px)' : 'none',
              boxShadow: hoverBtn && !loading ? '0 8px 20px rgba(255,255,255,0.15)' : 'none',
            }}
          >
            {loading ? (
              <span className="spin" style={{ display: 'inline-block', marginRight: '8px' }}>⟳</span>
            ) : null}
            {loading ? 'AUTHENTICATING' : 'SIGN IN'}
          </button>
        </form>

        <div style={styles.footer}>
          Secure connection established
        </div>
      </div>
    </div>
  );
}

