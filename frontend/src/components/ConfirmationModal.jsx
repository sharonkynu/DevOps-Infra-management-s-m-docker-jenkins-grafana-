import React from 'react';

export default function ConfirmationModal({ isOpen, title, message, onAllow, onDeny }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>{message}</p>
        
        <div className="modal-actions">
          <button className="btn-deny" onClick={onDeny}>Deny</button>
          <button className="btn-allow" onClick={onAllow}>Allow</button>
        </div>
      </div>
    </div>
  );
}
