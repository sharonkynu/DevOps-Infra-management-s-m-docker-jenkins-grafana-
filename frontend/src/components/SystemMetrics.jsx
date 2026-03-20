import React, { useState, useEffect } from 'react';

export default function SystemMetrics({ apiBase }) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${apiBase}/system/metrics`);
        const data = await res.json();
        setMetrics(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 1000); // UI poll 1s
    return () => clearInterval(interval);
  }, [apiBase]);

  if (!metrics) return <div className="panel" style={{ textAlign: 'center' }}><h2>Loading Machine Status...</h2></div>;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getGradient = (percent, color) => `conic-gradient(${color} ${percent}%, var(--panel-bg) ${percent}%)`;

  const MetricCircle = ({ title, percent, color }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '180px' }}>
      <div style={{ 
        position: 'relative', width: '130px', height: '130px', 
        borderRadius: '50%', background: getGradient(percent, color),
        display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}>
        <div style={{ 
          width: '105px', height: '105px', background: 'var(--panel-bg)', 
          borderRadius: '50%', display: 'flex', justifyContent: 'center', 
          alignItems: 'center', fontSize: '1.4rem', fontWeight: '800', border: '1px solid var(--border-color)'
        }}>
          {percent.toFixed(1)}%
        </div>
      </div>
      <h3 style={{ margin: 0 }}>{title}</h3>
    </div>
  );

  return (
    <div className="panel" style={{ textAlign: 'center' }}>
      <h2 style={{ marginBottom: '3rem', fontSize: '1.4rem' }}>🖥️ Server Telemetry</h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '3rem' }}>
        <MetricCircle title="CPU Usage" percent={metrics.cpu} color="#ef4444" />
        
        <div>
          <MetricCircle title="RAM Usage" percent={metrics.ram} color="#3b82f6" />
          <p style={{ marginTop: '0.8rem', color: 'var(--text-muted)' }}>Total: {formatBytes(metrics.ramTotal)}</p>
        </div>
        
        <div>
          <MetricCircle title="Disk Space" percent={metrics.disk} color="#10b981" />
          <p style={{ marginTop: '0.8rem', color: 'var(--text-muted)' }}>Total: {formatBytes(metrics.diskTotal)}</p>
        </div>

        <div style={{ 
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem', 
          background: 'var(--bg-color)', padding: '2rem', borderRadius: '12px', 
          border: '1px solid var(--border-color)', minWidth: '220px', flex: 1
        }}>
          <h3 style={{ marginBottom: '0.5rem' }}>🌐 Network Activity</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Transmission</span>
            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem' }}>↑ {formatBytes(metrics.netSent)}/s</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
            <span style={{ color: 'var(--text-muted)' }}>Reception</span>
            <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.1rem' }}>↓ {formatBytes(metrics.netRecv)}/s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
