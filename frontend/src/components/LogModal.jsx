import React from 'react';

export default function LogModal({ isOpen, title, logs, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="log-modal-overlay" onClick={onClose}>
      <div className="log-modal" onClick={e => e.stopPropagation()}>
        <div className="log-modal-header">
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>📜 {title}</h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              color: '#fff', 
              border: '1px solid var(--glass-border)',
              padding: '0.4rem 1rem',
              borderRadius: '8px'
            }}
          >
            Close
          </button>
        </div>
        <div className="log-content">
          {logs || 'Loading logs...'}
        </div>
      </div>
    </div>
  );
}
