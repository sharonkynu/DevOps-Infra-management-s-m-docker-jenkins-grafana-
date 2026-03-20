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

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState('dark');
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('kynu_token'));

  // Apply theme class to body
  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

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
          <div className="header-nav">
            <button 
              className={activeTab === 'overview' ? 'active' : ''} 
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={activeTab === 'docker' ? 'active' : ''} 
              onClick={() => setActiveTab('docker')}
            >
              Docker
            </button>
            <button 
              className={activeTab === 'jenkins' ? 'active' : ''} 
              onClick={() => setActiveTab('jenkins')}
            >
              Jenkins
            </button>
            <button 
              className={activeTab === 'grafana' ? 'active' : ''} 
              onClick={() => setActiveTab('grafana')}
            >
              Grafana
            </button>
            <button 
              className={activeTab === 'users' ? 'active' : ''} 
              onClick={() => setActiveTab('users')}
            >
              System Users
            </button>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? '◐ Light Mode' : '◑ Dark Mode'}
          </button>
          <button className="theme-toggle" onClick={handleLogout} style={{ border: '1px solid #ef4444', color: '#ef4444' }}>
            ⏏ Logout
          </button>
        </div>
      </header>

      <div className="page-content">
        {activeTab === 'overview' && <SystemMetrics apiBase={API_BASE} />}
        {activeTab === 'docker' && <ContainerList apiBase={API_BASE} />}
        {activeTab === 'jenkins' && <JobList apiBase={API_BASE} />}
        {activeTab === 'grafana' && <GrafanaPanel />}
        {activeTab === 'users' && <UserManagement apiBase={API_BASE} />}
      </div>
    </div>
  );
}

export default App;
