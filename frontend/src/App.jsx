import React, { useState, useEffect } from 'react';
import ContainerList from './components/ContainerList';
import JobList from './components/JobList';
import SystemMetrics from './components/SystemMetrics';
import LoginPage from './components/LoginPage';
import UserManagement from './components/UserManagement';
import GrafanaPanel from './components/GrafanaPanel';
import './index.css';

const API_BASE = `http://${window.location.hostname}:8889`;

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  if (!config) config = {};
  if (!config.headers) config.headers = {};

  const token = localStorage.getItem('kynu_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await originalFetch(resource, config);
  if (response.status === 401) {
    localStorage.removeItem('kynu_token');
    window.location.reload();
  }
  return response;
};

const NAV_TABS = [
  { id: 'overview', label: 'Overview',     icon: '◈' },
  { id: 'docker',   label: 'Docker',       icon: '◉' },
  { id: 'jenkins',  label: 'Jenkins',      icon: '◆' },
  { id: 'grafana',  label: 'Grafana',      icon: '◎' },
  { id: 'users',    label: 'System Users', icon: '◇' },
];

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState('dark');
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('kynu_token'));

  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const handleLogout = () => {
    localStorage.removeItem('kynu_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} apiBase={API_BASE} />;
  }

  return (
    <div className="app-container">
      <header>
        <div className="header-title">
          <h1>DevOps <span>Systems</span></h1>
          <p>DevOps Automated Infrastructure</p>
        </div>

        <div className="header-controls">
          <nav className="header-nav" aria-label="Main navigation">
            {NAV_TABS.map(tab => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <span aria-hidden="true">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '◐ Light Mode' : '◑ Dark Mode'}
          </button>

          <button className="logout-btn" onClick={handleLogout} aria-label="Logout">
            ⏏ Logout
          </button>
        </div>
      </header>

      <div className="page-content fade-in">
        {activeTab === 'overview' && <SystemMetrics apiBase={API_BASE} />}
        {activeTab === 'docker'   && <ContainerList apiBase={API_BASE} />}
        {activeTab === 'jenkins'  && <JobList apiBase={API_BASE} />}
        {activeTab === 'grafana'  && <GrafanaPanel />}
        {activeTab === 'users'    && <UserManagement apiBase={API_BASE} />}
      </div>
    </div>
  );
}

export default App;
