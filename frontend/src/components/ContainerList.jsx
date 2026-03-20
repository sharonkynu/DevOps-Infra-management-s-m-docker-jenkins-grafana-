import React, { useState, useEffect } from 'react';
import ConfirmationModal from './ConfirmationModal';

export default function ContainerList({ apiBase }) {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState({});
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onAllow: null });

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

  const restartContainer = (id) => {
    setModal({
      isOpen: true,
      title: 'Confirm Container Restart',
      message: `Instruct Docker Engine to RESTART container [${id.substring(0, 12)}]?`,
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
    try {
      const res = await fetch(`${apiBase}/containers/logs/${id}`);
      if (!res.ok) {
        alert("Failed to fetch logs");
        return;
      }
      const text = await res.text();
      const logWindow = window.open("", "_blank");
      logWindow.document.write(`<title>Logs: ${name}</title><pre style="background:#111;color:#eee;padding:1rem;margin:0;min-height:100vh;font-family:monospace;white-space:pre-wrap;word-wrap:break-word;">${text.replace(/</g, "&lt;")}</pre>`);
    } catch (e) {
      alert("Error fetching logs: " + e.message);
    }
  };

  return (
    <div className="panel">
      <h2>🐳 Docker Containers</h2>
      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading containers...</p>
      ) : containers.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No containers found.</p>
      ) : (
        <div>
          {containers.map(c => {
            const name = c?.Names?.[0]?.replace('/', '') || 'Unknown Container';
            const project = c?.Labels?.['com.docker.compose.project'] || 'Standalone';
            const isRunning = c?.State === 'running';
            
            return (
              <div key={c.Id} className="list-item">
                <div className="item-details">
                  <p style={{ fontSize: '0.75rem', marginBottom: '0.2rem', color: '#10b981' }}>
                    📦 {project}
                  </p>
                  <h4>
                    {name}
                    <span className={`badge ${isRunning ? 'success' : 'danger'}`}>
                      {c?.State || 'unknown'}
                    </span>
                  </h4>
                  <p>{c?.Image || 'Unknown Image'} • {c?.Status || 'Unknown Status'}</p>
                </div>
                <div>
                  <button 
                    onClick={() => viewLogs(c.Id, name)}
                    title="View Logs"
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', marginRight: '0.5rem' }}
                  >
                    Logs
                  </button>
                  <button 
                    onClick={() => restartContainer(c.Id)}
                    title="Restart Container"
                    disabled={loadingAction[c.Id] === 'restarting'}
                    style={
                      loadingAction[c.Id] === 'restarting' ? { opacity: 0.7, cursor: 'not-allowed' } : 
                      loadingAction[c.Id] === 'restarted' ? { background: 'var(--text-main)', color: 'var(--bg-color)'} : {}
                    }
                  >
                    {loadingAction[c.Id] === 'restarting' ? <><span className="spin">🔄</span> Restarting...</> : 
                     loadingAction[c.Id] === 'restarted' ? '✅ Restarted' : 'Restart'}
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
    </div>
  );
}
