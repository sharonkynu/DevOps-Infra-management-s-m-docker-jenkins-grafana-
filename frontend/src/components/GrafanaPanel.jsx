import React, { useState } from 'react';

export default function GrafanaPanel() {
  const currentHost = window.location.hostname;
  const [grafanaUrl, setGrafanaUrl] = useState(`http://${currentHost}:3001/`);
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(grafanaUrl);

  const handleSave = () => {
    setGrafanaUrl(tempUrl);
    setIsEditing(false);
  };

  return (
    <div className="panel grafana-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', padding: '1.5rem', marginBottom: '0' }}>
      <div className="grafana-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>📊 Grafana Dashboard</h2>
          {!isEditing ? (
            <code style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {grafanaUrl.split('?')[0]}
            </code>
          ) : (
            <input 
              type="text" 
              value={tempUrl} 
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="Enter Grafana URL..."
              className="grafana-input"
              style={{ width: '400px', margin: 0 }}
              autoFocus
            />
          )}
        </div>
        
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem', borderRadius: '8px' }}
        >
          {isEditing ? '💾 Save Configuration' : '⚙️ Configure Source'}
        </button>
      </div>
      
      <div className="iframe-container" style={{ flexGrow: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: '#000', position: 'relative' }}>
        <iframe 
          src={grafanaUrl} 
          style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }}
          title="Grafana Dashboard"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}
