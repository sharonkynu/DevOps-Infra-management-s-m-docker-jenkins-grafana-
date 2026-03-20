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
    <div className="panel grafana-panel">
      <div className="grafana-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>📊 Grafana</h2>
          {!isEditing ? (
            <code style={{ background: 'var(--bg-color)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
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
            />
          )}
        </div>
        
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}
        >
          {isEditing ? '💾 Save URL' : '⚙️ Change Source'}
        </button>
      </div>
      <div className="iframe-container">
        <iframe 
          src={grafanaUrl} 
          width="100%" 
          height="100%" 
          frameBorder="0"
          title="Grafana Dashboard"
        ></iframe>
      </div>
    </div>
  );
}
