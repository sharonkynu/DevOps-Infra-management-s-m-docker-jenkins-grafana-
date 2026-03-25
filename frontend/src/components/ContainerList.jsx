import React, { useState, useEffect } from 'react';
import ConfirmationModal from './ConfirmationModal';
import LogModal from './LogModal';

export default function ContainerList({ apiBase }) {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState({});
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onAllow: null });
  const [logModal, setLogModal] = useState({ isOpen: false, title: '', content: '' });

  const fetchContainers = async () => {
    try {
      const res = await fetch(`${apiBase}/containers`);
      const data = await res.json();
      setContainers(data || []);
    } catch (e) {
      console.error("Failed to fetch containers", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 5000);
    return () => clearInterval(interval);
  }, [apiBase]);

  const restartContainer = (id, name) => {
    setModal({
      isOpen: true,
      title: 'Confirm Container Restart',
      message: `Instruct Docker Engine to RESTART container [${name}]?`,
      onAllow: async () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        await executeRestart(id);
      },
      onDeny: () => setModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const executeRestart = async (id) => {
    try {
      setLoadingAction(prev => ({ ...prev, [id]: 'restarting' }));
      await fetch(`${apiBase}/containers/restart/${id}`, { method: 'POST' });
      setLoadingAction(prev => ({ ...prev, [id]: 'restarted' }));
      fetchContainers();
      setTimeout(() => {
        setLoadingAction(prev => ({ ...prev, [id]: null }));
      }, 3000);
    } catch (e) {
      console.error("Failed to restart container", e);
      setLoadingAction(prev => ({ ...prev, [id]: null }));
    }
  };

  const viewLogs = async (id, name) => {
    setLogModal({ isOpen: true, title: `Logs: ${name}`, content: 'Fetching logs...' });
    try {
      const res = await fetch(`${apiBase}/containers/logs/${id}`);
      if (!res.ok) {
        setLogModal(prev => ({ ...prev, content: "Failed to fetch logs" }));
        return;
      }
      const text = await res.text();
      setLogModal(prev => ({ ...prev, content: text }));
    } catch (e) {
      setLogModal(prev => ({ ...prev, content: "Error fetching logs: " + e.message }));
    }
  };

  return (
    <div className="panel">
      <h2>🐳 Docker Containers</h2>
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading infrastructure components...</p>
      ) : containers.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No containers found on the host.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
          {containers.map(c => {
            const name = c?.Names?.[0]?.replace('/', '') || 'Unknown';
            const project = c?.Labels?.['com.docker.compose.project'] || 'Standalone';
            const isRunning = c?.State === 'running';
            
            return (
              <div key={c.Id} className="list-item">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    {project.toUpperCase()}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{name}</span>
                    <span className={`badge ${isRunning ? 'success' : 'danger'}`}>
                      {c?.State || 'unknown'}
                    </span>
                  </div>
                  <p style={{ opacity: 0.6 }}>{c?.Status || 'Unknown Status'}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    onClick={() => viewLogs(c.Id, name)}
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--glass-border)' }}
                  >
                    View Logs
                  </button>
                  <button 
                    onClick={() => restartContainer(c.Id, name)}
                    disabled={loadingAction[c.Id] === 'restarting'}
                  >
                    {loadingAction[c.Id] === 'restarting' ? <span className="spin">🔄</span> : 
                     loadingAction[c.Id] === 'restarted' ? '✓' : 'Restart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        onAllow={modal.onAllow}
        onDeny={modal.onDeny}
      />

      <LogModal 
        isOpen={logModal.isOpen}
        title={logModal.title}
        logs={logModal.content}
        onClose={() => setLogModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
