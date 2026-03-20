import React, { useState } from 'react';

export default function LoginPage({ onLogin, apiBase }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('kynu_token', data.token);
        onLogin();
      } else {
        setError('Incorrect username or password');
      }
    } catch(err) {
      setError('Backend control engine unreachable!');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-color)' }}>
      <div className="panel" style={{ width: '420px', textAlign: 'center', padding: '3rem', borderRadius: '16px' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.2rem', fontWeight: '800' }}>DevOps <span style={{ fontWeight: '300', color: 'var(--text-muted)' }}>Systems</span></h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem', letterSpacing: '0.05em' }}>AUTHENTICATION REQUIRED</p>
        
        {error && <p style={{ color: '#ef4444', marginBottom: '1.5rem', background: 'rgba(239,68,68,0.1)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)' }}>{error}</p>}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <input 
            type="text" 
            placeholder="Username" 
            className="grafana-input"
            style={{ width: '100%', padding: '1rem', background: 'var(--bg-color)' }}
            value={username} onChange={e=>setUsername(e.target.value)}
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="grafana-input"
            style={{ width: '100%', padding: '1rem', background: 'var(--bg-color)' }}
            value={password} onChange={e=>setPassword(e.target.value)} 
            required
          />
          <button type="submit" disabled={loading} style={{ padding: '1rem', fontSize: '1.1rem', marginTop: '0.5rem', background: 'var(--text-main)', color: 'var(--bg-color)' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
