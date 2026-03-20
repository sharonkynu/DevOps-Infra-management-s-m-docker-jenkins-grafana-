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
    <div className="panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <span style={{ fontSize: '1.8rem' }}>👥</span> User Management
      </h2>
      
      {error && <p style={{ color: '#ef4444', marginBottom: '1.5rem', background: 'rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)'}}>{error}</p>}
      
      <div style={{ marginBottom: '3rem', background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}>CREATE NEW USER</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Username" 
            className="grafana-input" 
            style={{ flex: 1, minWidth: '200px' }}
            value={newUsername} 
            onChange={e=>setNewUsername(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="grafana-input" 
            style={{ flex: 1, minWidth: '200px' }}
            value={newPassword} 
            onChange={e=>setNewPassword(e.target.value)} 
          />
          <button type="submit" style={{ padding: '0.65rem 2rem', fontWeight: '800' }}>Provision User</button>
        </form>
      </div>

      <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}>ACTIVE ACCOUNTS ({users.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {users.map(u => (
          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', transition: 'border-color 0.2s' }} className="user-card-hover">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--panel-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: '1px solid var(--border-color)' }}>
                👤
              </div>
              <span style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-main)' }}>{u.username}</span>
              {u.username === 'admin' && (
                <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.65rem', padding: '0.3rem 0.6rem', borderRadius: '99px', fontWeight: '800', letterSpacing: '0.05em' }}>
                  SUPERADMIN
                </span>
              )}
            </div>
            {u.username !== 'admin' && (
              <button 
                onClick={() => handleDelete(u.id)}
                title="Revoke Access"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '0.6rem 1.5rem', borderRadius: '8px' }}
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
