import React, { useState, useEffect } from 'react';
import ConfirmationModal from './ConfirmationModal';

export default function JobList({ apiBase }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
  const [branches, setBranches] = useState({});
  const [loadingAction, setLoadingAction] = useState({});
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onAllow: null });

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${apiBase}/jenkins/jobs`);
      const data = await res.json();
      setJobs(data || []);
    } catch (e) {
      console.error("Failed to fetch jobs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, [apiBase]);

  useEffect(() => {
    if (jobs.length > 0 && !hasAutoExpanded) {
      const defaultExpanded = {};
      const hasRoot = jobs.some(j => !j.folder);
      if (hasRoot) defaultExpanded['Root'] = true;
      setExpandedFolders(defaultExpanded);
      setHasAutoExpanded(true);
    }
  }, [jobs, hasAutoExpanded]);

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const groupedJobs = jobs.reduce((acc, job) => {
    const f = job.folder || 'Root';
    if (!acc[f]) acc[f] = [];
    acc[f].push(job);
    return acc;
  }, {});

  const triggerBuild = (name, url, paramsStr) => {
    setModal({
      isOpen: true,
      title: 'Confirm Build Trigger',
      message: `Are you sure you want to trigger a new build for "${name}"?`,
      onAllow: async () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        await executeTrigger(name, url, paramsStr);
      },
      onDeny: () => setModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const executeTrigger = async (name, url, paramsStr) => {
    try {
      setLoadingAction(prev => ({ ...prev, [name]: 'triggering' }));
      let fetchUrl = `${apiBase}/jenkins/build/${name}?url=${encodeURIComponent(url)}`;
      if (paramsStr) fetchUrl += `&params=${encodeURIComponent(paramsStr)}`;
      
      const res = await fetch(fetchUrl, { method: 'POST' });
      if (!res.ok) {
        const errText = await res.text();
        alert(`Jenkins rejected the build for ${name}!\nReason: ${errText}`);
        setLoadingAction(prev => ({ ...prev, [name]: null }));
      } else {
        setBranches(prev => ({ ...prev, [name]: '' }));
        setLoadingAction(prev => ({ ...prev, [name]: 'building' }));
        fetchJobs();
        setTimeout(() => setLoadingAction(prev => ({ ...prev, [name]: null })), 4000);
      }
    } catch (e) {
      alert("Error triggering build: " + e.message);
      setLoadingAction(prev => ({ ...prev, [name]: null }));
    }
  };

  const stopBuild = (name, url, buildNum) => {
    if (!buildNum) return alert('No active build to stop!');
    setModal({
      isOpen: true,
      title: 'Confirm Force Stop',
      message: `Are you sure you want to FORCE ABORT active build #${buildNum} for "${name}"?`,
      onAllow: async () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        await executeStop(name, url, buildNum);
      },
      onDeny: () => setModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const executeStop = async (name, url, buildNum) => {
    try {
      setLoadingAction(prev => ({ ...prev, [name]: 'stopping' }));
      const res = await fetch(`${apiBase}/jenkins/stop?url=${encodeURIComponent(url)}&build=${buildNum}`, { method: 'POST' });
      if (!res.ok) {
        const errText = await res.text();
        alert(`Failed to stop build ${name}!\nReason: ${errText}`);
        setLoadingAction(prev => ({ ...prev, [name]: null }));
      } else {
        setLoadingAction(prev => ({ ...prev, [name]: 'stopped' }));
        fetchJobs();
        setTimeout(() => setLoadingAction(prev => ({ ...prev, [name]: null })), 4000);
      }
    } catch (e) {
      alert("Error stopping build: " + e.message);
      setLoadingAction(prev => ({ ...prev, [name]: null }));
    }
  };

  const viewLogs = async (url) => {
    try {
      const res = await fetch(`${apiBase}/jenkins/logs?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const errText = await res.text();
        alert(`Failed to fetch logs!\nReason: ${errText}\n(This usually means the job has never been built before)`);
        return;
      }
      const text = await res.text();
      const logWindow = window.open("", "_blank");
      logWindow.document.write(`<title>Jenkins Logs</title><pre style="background:#111;color:#eee;padding:1rem;margin:0;min-height:100vh;font-family:monospace;white-space:pre-wrap;word-wrap:break-word;">${text.replace(/</g, "&lt;")}</pre>`);
    } catch (e) {
      alert("Error fetching logs: " + e.message);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'SUCCESS': return 'success';
      case 'FAILURE': return 'danger';
      case 'RUNNING': return 'info';
      case 'UNKNOWN':
      case 'NO_BUILDS': return 'stopped';
      default: return 'warning';
    }
  };

  return (
    <div className="panel">
      <h2>🏗️ Jenkins Pipelines</h2>
      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No jobs found.</p>
      ) : (
        <div className="folder-list">
          {Object.entries(groupedJobs).map(([folder, folderJobs]) => {
            const isExpanded = expandedFolders[folder];

            return (
              <div key={folder} className={`folder-container ${isExpanded ? 'expanded' : ''}`}>
                <button 
                  className="folder-header" 
                  onClick={() => toggleFolder(folder)}
                >
                  <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
                  <span className="folder-name">{folder}</span>
                  <span className="folder-count">({folderJobs.length})</span>
                </button>
                
                {isExpanded && (
                  <div className="folder-contents">
                    {folderJobs.map((job, idx) => (
                      <div key={job?.url || idx} className="list-item">
                        <div className="item-details">
                          <h4>
                            {job.name}
                            <span className={`badge ${getStatusBadge(job.status)}`}>
                              {job.status}
                            </span>
                          </h4>
                          <p>Last Build: #{job.lastBuild || '--'}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          <input 
                            type="text" 
                            placeholder="Params (branch=dev)"
                            value={branches[job.name] || ''}
                            onChange={e => setBranches(prev => ({ ...prev, [job.name]: e.target.value }))}
                            style={{ 
                              background: 'var(--bg-color)', 
                              border: '1px solid var(--border-color)', 
                              color: 'var(--text-main)', 
                              padding: '0.4rem 0.6rem', 
                              borderRadius: '6px', 
                              width: '140px', 
                              outline: 'none',
                              fontSize: '0.8rem'
                            }}
                          />
                          <button 
                            onClick={() => viewLogs(job.url)}
                            title="View Logs"
                            style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                          >
                            Logs
                          </button>
                          <button 
                            onClick={() => triggerBuild(job.name, job.url, branches[job.name])}
                            title="Trigger Build"
                            disabled={loadingAction[job.name] === 'triggering'}
                            style={loadingAction[job.name] === 'building' ? { background: 'var(--text-main)', color: 'var(--bg-color)'} : {}}
                          >
                            {loadingAction[job.name] === 'triggering' ? <><span className="spin">🔄</span> Starting...</> : 
                             loadingAction[job.name] === 'building' ? '✅ Building' : 'Trigger'}
                          </button>
                          <button 
                            onClick={() => stopBuild(job.name, job.url, job.lastBuild)}
                            title="Stop Build"
                            disabled={loadingAction[job.name] === 'stopping'}
                            style={
                              loadingAction[job.name] === 'stopping' ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' } : 
                              loadingAction[job.name] === 'stopped' ? { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444' } : 
                              { background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444' }
                            }
                          >
                            {loadingAction[job.name] === 'stopping' ? <><span className="spin">🔄</span> Stopping...</> : 
                             loadingAction[job.name] === 'stopped' ? '🛑 Stopped' : 'Stop'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
