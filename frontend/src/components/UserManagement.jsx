import React, { useState, useEffect } from 'react';

export default function UserManagement({ apiBase }) {
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${apiBase}/auth/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [apiBase]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setError('');
    const res = await fetch(`${apiBase}/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername, password: newPassword })
    });
    if (res.ok) {
      setNewUsername('');
      setNewPassword('');
      fetchUsers();
    } else {
      const txt = await res.text();
      setError(txt);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to completely delete this user?")) return;
    const res = await fetch(`${apiBase}/auth/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchUsers();
    } else {
      const txt = await res.text();
      alert(`Failed to delete: ${txt}`);
    }
  };

  return (
    <div className="panel" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h2>👥 User Management</h2>
      
      {error && <p style={{ color: 'var(--error)', marginBottom: '1.5rem', background: 'rgba(255,100,100,0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>{error}</p>}
      
      <div style={{ marginBottom: '3rem', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>PROVISION NEW ACCOUNT</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Username" 
            className="grafana-input" 
            style={{ flex: 1, minWidth: '200px', background: 'rgba(0,0,0,0.3)' }}
            value={newUsername} 
            onChange={e=>setNewUsername(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="grafana-input" 
            style={{ flex: 1, minWidth: '200px', background: 'rgba(0,0,0,0.3)' }}
            value={newPassword} 
            onChange={e=>setNewPassword(e.target.value)} 
          />
          <button type="submit">Provision User</button>
        </form>
      </div>

      <h3 style={{ marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>ACTIVE ACCOUNTS ({users.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {users.map(u => (
          <div key={u.id} className="list-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: '1px solid var(--glass-border)' }}>
                👤
              </div>
              <div>
                <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>{u.username}</span>
                {u.username === 'admin' && (
                  <span className="badge" style={{ marginLeft: '1rem' }}>SYSTEM ADMIN</span>
                )}
              </div>
            </div>
            {u.username !== 'admin' && (
              <button 
                onClick={() => handleDelete(u.id)}
                style={{ background: 'rgba(255,100,100,0.1)', color: 'var(--error)', border: '1px solid var(--glass-border)', padding: '0.6rem 1.25rem' }}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
