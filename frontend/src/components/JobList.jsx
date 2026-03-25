import React, { useState, useEffect } from 'react';
import ConfirmationModal from './ConfirmationModal';
import LogModal from './LogModal';

export default function JobList({ apiBase }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
  const [branches, setBranches] = useState({});
  const [loadingAction, setLoadingAction] = useState({});
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onAllow: null });
  const [logModal, setLogModal] = useState({ isOpen: false, title: '', content: '' });

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
    const interval = setInterval(fetchJobs, 10000);
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
    // Skip modal for immediate feedback as requested by user
    executeTrigger(name, url, paramsStr);
  };

  const executeTrigger = async (name, url, paramsStr) => {
    try {
      setLoadingAction(prev => ({ ...prev, [name]: 'triggering' }));
      let fetchUrl = `${apiBase}/jenkins/build/${name}?url=${encodeURIComponent(url)}`;
      if (paramsStr) fetchUrl += `&params=${encodeURIComponent(paramsStr)}`;
      
      const res = await fetch(fetchUrl, { method: 'POST' });
      if (!res.ok) {
        setLoadingAction(prev => ({ ...prev, [name]: null }));
      } else {
        setBranches(prev => ({ ...prev, [name]: '' }));
        setLoadingAction(prev => ({ ...prev, [name]: 'building' }));
        fetchJobs();
        setTimeout(() => setLoadingAction(prev => ({ ...prev, [name]: null })), 6000);
      }
    } catch (e) {
      setLoadingAction(prev => ({ ...prev, [name]: null }));
    }
  };

  const stopBuild = (name, url, buildNum) => {
    if (!buildNum) return;
    setModal({
      isOpen: true,
      title: 'Abort Active Sequence',
      message: `FORCE STOP build #${buildNum} for [${name}]?`,
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
      if (res.ok) {
        setLoadingAction(prev => ({ ...prev, [name]: 'stopped' }));
        fetchJobs();
        setTimeout(() => setLoadingAction(prev => ({ ...prev, [name]: null })), 4000);
      } else {
        setLoadingAction(prev => ({ ...prev, [name]: null }));
      }
    } catch (e) {
      setLoadingAction(prev => ({ ...prev, [name]: null }));
    }
  };

  const viewLogs = async (name, url) => {
    setLogModal({ isOpen: true, title: `Pipeline Logs: ${name}`, content: 'Acquiring logs...' });
    try {
      const res = await fetch(`${apiBase}/jenkins/logs?url=${encodeURIComponent(url)}`);
      const text = res.ok ? await res.text() : "No active or stored logs found for this sequence.";
      setLogModal(prev => ({ ...prev, content: text }));
    } catch (e) {
      setLogModal(prev => ({ ...prev, content: "Channel error: " + e.message }));
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'SUCCESS': return '#10b981';
      case 'FAILURE': return '#f43f5e';
      case 'RUNNING': return '#3b82f6';
      case 'ABORTED': return '#94a3b8';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>🏗️ Jenkins Pipelines</h2>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {jobs.length} SEQUENCES TOTAL
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          SYNCHRONIZING WITH JENKINS MASTER...
        </div>
      ) : (
        <div style={{ padding: '1rem' }}>
          {Object.entries(groupedJobs).map(([folder, folderJobs]) => {
            const isExpanded = expandedFolders[folder];
            const runningCount = folderJobs.filter(j => j.status === 'RUNNING').length;

            return (
              <div key={folder} style={{ marginBottom: '0.75rem' }}>
                <button 
                  onClick={() => toggleFolder(folder)}
                  style={{ 
                    width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', 
                    padding: '1rem 1.25rem', background: isExpanded ? 'var(--highlight)' : 'transparent', 
                    border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: '12px', textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '1.2rem', filter: isExpanded ? 'none' : 'grayscale(1)', opacity: isExpanded ? 1 : 0.6 }}>
                    {isExpanded ? '📂' : '📁'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{folder}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {folderJobs.length} Pipelines
                    </div>
                  </div>
                  {runningCount > 0 && (
                    <span className="pulse" style={{ 
                      background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', 
                      fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', 
                      borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                      {runningCount} ACTIVE
                    </span>
                  )}
                  <span style={{ opacity: 0.3, color: 'var(--text-main)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
                </button>
                
                {isExpanded && (
                    <div style={{ 
                      marginTop: '0.5rem', marginLeft: '0.5rem', paddingLeft: '1.5rem', 
                      borderLeft: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' 
                    }}>
                      {folderJobs.map((job, idx) => {
                        const statusColor = getStatusColor(job.status);
                        const isRunning = job.status === 'RUNNING' || loadingAction[job.name] === 'building';
                        
                        return (
                          <div key={job?.url || idx} className="list-item" style={{ 
                            margin: 0, padding: '1rem 1.25rem', background: 'var(--highlight)', 
                            border: '1px solid var(--glass-border)', borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1 }}>
                              <div style={{ position: 'relative' }}>
                                <div style={{ 
                                    width: '12px', height: '12px', borderRadius: '50%', 
                                    background: statusColor, 
                                    boxShadow: isRunning ? `0 0 15px ${statusColor}` : 'none',
                                    animation: isRunning ? 'pulse 1.5s infinite' : 'none'
                                 }} />
                               {isRunning && (
                                 <div className="spin" style={{ 
                                   position: 'absolute', top: '-6px', left: '-6px', 
                                   width: '24px', height: '24px', border: `2px solid ${statusColor}44`,
                                   borderTopColor: statusColor, borderRadius: '50%',
                                   animation: 'spin 1s linear infinite'
                                 }} />
                               )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', letterSpacing: '0.02em' }}>{job.name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                  Build #{job.lastBuild || '--'}
                                </span>
                                <span style={{ 
                                  fontSize: '0.65rem', color: '#fff', background: statusColor, 
                                  padding: '0.1rem 0.5rem', borderRadius: '4px', fontWeight: 900,
                                  textTransform: 'uppercase', letterSpacing: '0.05em'
                                }}>
                                  {job.status || 'UNKNOWN'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                                branch:
                              </span>
                              <input 
                                type="text" 
                                placeholder="main"
                                value={branches[job.name] || ''}
                                onChange={e => setBranches(prev => ({ ...prev, [job.name]: e.target.value }))}
                                style={{ 
                                  background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', 
                                  color: 'var(--text-main)', padding: '0.5rem 0.75rem 0.5rem 3.5rem', borderRadius: '8px', 
                                  width: '140px', fontSize: '0.8rem', fontWeight: 600, outline: 'none'
                                }}
                              />
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                onClick={() => viewLogs(job.name, job.url)} 
                                style={{ 
                                  background: 'transparent', color: 'var(--text-muted)', 
                                  border: '1px solid var(--glass-border)', padding: '0.5rem 1rem', 
                                  fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px',
                                  transition: 'all 0.2s ease'
                                }}
                                className="hover-bright"
                              >
                                LOGS
                              </button>

                              {!isRunning ? (
                                <button 
                                  onClick={() => triggerBuild(job.name, job.url, branches[job.name])}
                                  disabled={loadingAction[job.name] === 'triggering'}
                                  style={{ 
                                    padding: '0.5rem 1.5rem', fontSize: '0.8rem', minWidth: '120px', 
                                    borderRadius: '8px', fontWeight: 900, background: 'var(--accent-primary)',
                                    color: '#fff', border: 'none', cursor: 'pointer',
                                    boxShadow: '0 4px 12px var(--accent-primary-glow)',
                                    display: 'flex', gap: '0.6rem', alignItems: 'center', justifyContent: 'center'
                                  }}
                                >
                                  {loadingAction[job.name] === 'triggering' ? (
                                    <>
                                      <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                        <path d="M12 2a10 10 0 0 1 10 10" />
                                      </svg>
                                      WAIT...
                                    </>
                                  ) : 'RUN BUILD'}
                                </button>
                              ) : (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button 
                                    disabled
                                    style={{ 
                                      padding: '0.5rem 1rem', fontSize: '0.8rem', minWidth: '100px', 
                                      borderRadius: '8px', fontWeight: 900, background: 'rgba(59, 130, 246, 0.1)',
                                      color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)',
                                      cursor: 'default', display: 'flex', gap: '0.5rem', alignItems: 'center'
                                    }}
                                  >
                                    <div className="spin" style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2.5px solid transparent', borderTopColor: 'currentColor' }} />
                                    RUNNING
                                  </button>
                                  <button 
                                    onClick={() => stopBuild(job.name, job.url, job.lastBuild)}
                                    disabled={loadingAction[job.name] === 'stopping'}
                                    style={{ 
                                        background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', 
                                        border: '1px solid rgba(244, 63, 94, 0.35)', padding: '0.5rem 1.25rem', 
                                        fontSize: '0.75rem', fontWeight: 900, borderRadius: '8px', letterSpacing: '0.04em',
                                        cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center'
                                    }}
                                    className="hover-danger"
                                  >
                                    {loadingAction[job.name] === 'stopping' ? (
                                      <>
                                        <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                          <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                                          <path d="M12 2a10 10 0 0 1 10 10" />
                                        </svg>
                                        WAIT
                                      </>
                                    ) : 'STOP'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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

      <LogModal 
        isOpen={logModal.isOpen}
        title={logModal.title}
        logs={logModal.content}
        onClose={() => setLogModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
