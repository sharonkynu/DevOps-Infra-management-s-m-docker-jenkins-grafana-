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
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, [apiBase]);

  if (!metrics) return (
    <div className="panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
      <div className="spin" style={{ marginRight: '1rem' }}>⚙️</div>
      <div style={{ color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>SYNCHRONIZING TELEMETRY...</div>
    </div>
  );

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const ramPct = metrics.ramTotal > 0 ? (metrics.ramUsed / metrics.ramTotal) * 100 : 0;
  const diskPct = metrics.diskTotal > 0 ? (metrics.diskUsed / metrics.diskTotal) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="panel fade-in" style={{ padding: '2.5rem', animationDelay: '0.1s' }}>
        <h2 style={{ marginBottom: '2.5rem', letterSpacing: '0.05em', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 800 }}>📊 RESOURCE UTILIZATION</h2>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '3rem' }}>
          <CircularGauge 
            label="CPU LOAD" 
            value={metrics.cpu} 
            color="#3b82f6" 
            size={180}
          />
          <CircularGauge 
            label="RAM UTILIZED" 
            value={ramPct} 
            color="#8b5cf6" 
            size={180}
            subtext={`${formatBytes(metrics.ramUsed)} / ${formatBytes(metrics.ramTotal)}`}
          />
          <CircularGauge 
            label="DISK STORAGE" 
            value={diskPct} 
            color="#10b981" 
            size={180}
            subtext={`${formatBytes(metrics.diskUsed)} / ${formatBytes(metrics.diskTotal)}`}
          />
        </div>
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        <div className="panel fade-in" style={{ padding: '2rem', animationDelay: '0.2s' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-main)' }}>
            <span style={{ fontSize: '1.5rem' }}>🖥️</span> System Specifications
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <SpecRow label="Operating System" value={metrics.os} />
            <SpecRow label="Serial Number" value={metrics.serial} />
            <SpecRow label="Primary Interface" value={metrics.interface} />
            <SpecRow label="IPv4 Address" value={metrics.ip} />
            <SpecRow label="Physical MAC" value={metrics.mac} />
          </div>
        </div>

        <div className="panel fade-in" style={{ padding: '2rem', animationDelay: '0.3s' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-main)' }}>
            <span style={{ fontSize: '1.5rem' }}>🌐</span> Network Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <NetworkItem label="Transmission Rate (TX)" value={`${formatBytes(metrics.netSent)}/s`} icon="↑" color="#ef4444" />
            <NetworkItem label="Reception Rate (RX)" value={`${formatBytes(metrics.netRecv)}/s`} icon="↓" color="#10b981" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CircularGauge({ label, value, color, size, subtext }) {
  const radius = (size / 2) - 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const isCritical = value > 90;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', minWidth: '220px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <defs>
            <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color + 'dd'} />
            </linearGradient>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="glass-shine" x1="0%" y1="0%" x2="50%" y2="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Background Track */}
          <circle 
            cx={size/2} cy={size/2} r={radius} 
            fill="none" 
            stroke="var(--glass-border)" 
            strokeWidth="18" 
            style={{ opacity: 0.1 }}
          />
          {/* Progress Bar (Pulse Effect) */}
          <circle 
            cx={size/2} cy={size/2} r={radius} 
            fill="none" 
            stroke={isCritical ? 'var(--error)' : `url(#grad-${label})`} 
            strokeWidth="18" 
            strokeDasharray={circumference} 
            strokeDashoffset={offset}
            strokeLinecap="round"
            filter={isCritical ? 'none' : `url(#glow-${label})`}
            style={{ 
              transition: 'stroke-dashoffset 2.5s cubic-bezier(0.19, 1, 0.22, 1)', 
              filter: `drop-shadow(0 0 15px ${isCritical ? 'var(--error)' : color}66)` 
            }}
          />
          {/* Subtle Inner Orbit Link */}
          <circle 
            cx={size/2} cy={size/2} r={radius - 12} 
            fill="none" 
            stroke={color} 
            strokeWidth="1.5" 
            strokeDasharray="4, 10"
            style={{ opacity: 0.15, animation: 'spin 12s linear infinite' }}
          />
          {/* Glass Specular Highlight */}
          <circle 
            cx={size/2} cy={size/2} r={radius} 
            fill="none" 
            stroke="url(#glass-shine)" 
            strokeWidth="2" 
            style={{ opacity: 0.4 }}
          />
        </svg>
        <div style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          background: `radial-gradient(circle at 50% 50%, ${color}05, transparent 70%)`
        }}>
          <span style={{ 
            fontSize: '3.5rem', 
            fontWeight: 950, 
            color: isCritical ? 'var(--error)' : 'var(--text-main)', 
            letterSpacing: '-0.08em',
            textShadow: isCritical ? '0 0 30px var(--error)77' : `0 0 40px ${color}33`
          }}>
            {Math.round(value)}%
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ 
          color: isCritical ? 'var(--error)' : 'var(--text-muted)', 
          fontWeight: 850, 
          fontSize: '0.82rem', 
          textTransform: 'uppercase', 
          letterSpacing: '0.22em',
          opacity: 0.95
        }}>{label}</p>
        {subtext && <p style={{ 
          fontSize: '0.72rem', 
          color: 'var(--text-muted)', 
          marginTop: '0.6rem', 
          fontWeight: 600, 
          opacity: 0.7,
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '0.02em'
        }}>{subtext}</p>}
      </div>
    </div>
  );
}

function SpecRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>{label}</span>
      <span style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{value || 'N/A'}</span>
    </div>
  );
}

function NetworkItem({ label, value, icon, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)', transition: 'transform 0.2s ease' }}>
      <div style={{ 
        width: '48px', height: '48px', borderRadius: '12px', background: `${color}15`, color: color, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900,
        boxShadow: `0 0 15px ${color}10`
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ color: 'var(--text-main)', fontSize: '1.35rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
      </div>
    </div>
  );
}
