import React from 'react';
import Card from '../components/Card';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = React.useState({
    nodes: 0,
    resolutionRate: '0%',
    downtimeSaved: '0h',
    activeLogs: 0
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('shiftsync_token');
      try {
        const response = await fetch('http://localhost:8000/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="page-header">
        <h2>Admin Overview</h2>
        <p>Monitor shift metrics and knowledge graph adoption across the facility.</p>
      </div>

      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-value">{stats.nodes}</div>
          <div className="stat-label">Knowledge Graph Nodes</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">{stats.resolutionRate}</div>
          <div className="stat-label">Resolution Rate via Agent</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">{stats.downtimeSaved}</div>
          <div className="stat-label">Downtime Saved (This Week)</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">{stats.activeLogs}</div>
          <div className="stat-label">Active Voice Logs</div>
        </Card>
      </div>

      <div className="dashboard-grid admin-charts">
        <Card title="Knowledge Capture Trend">
          <div className="chart-placeholder">
            <div className="bar-chart">
              <div className="bar" style={{height: '30%'}}></div>
              <div className="bar" style={{height: '50%'}}></div>
              <div className="bar" style={{height: '40%'}}></div>
              <div className="bar" style={{height: '70%'}}></div>
              <div className="bar" style={{height: '80%'}}></div>
              <div className="bar" style={{height: '65%'}}></div>
              <div className="bar" style={{height: '90%'}}></div>
            </div>
            <p className="chart-info">Steady increase in voice logs submitted by Senior Techs over 7 days.</p>
          </div>
        </Card>
        
        <Card title="Top Queried Machines">
          <ul className="machine-list">
            <li>
              <span>CNC Machine Alpha</span>
              <span className="query-count">142 queries</span>
            </li>
            <li>
              <span>Boiler System 2</span>
              <span className="query-count">89 queries</span>
            </li>
            <li>
              <span>Robotic Arm Assembly B</span>
              <span className="query-count">76 queries</span>
            </li>
            <li>
              <span>Conveyor Belt Sensor</span>
              <span className="query-count">45 queries</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
