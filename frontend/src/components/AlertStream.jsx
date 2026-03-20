import React, { useState, useEffect, useRef } from 'react';

export default function AlertStream({ logs }) {
  const streamEndRef = useRef(null);

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="panel">
      <h2>⚡ Live Events</h2>
      <div className="alert-stream">
        {logs.length === 0 ? (
          <div style={{ color: '#64748b' }}>Waiting for events...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="log-entry">
              <span className="log-time">[{log.time}]</span>
              <span className={`log-type-${log.type}`}>
                {log.text}
              </span>
            </div>
          ))
        )}
        <div ref={streamEndRef} />
      </div>
    </div>
  );
}
