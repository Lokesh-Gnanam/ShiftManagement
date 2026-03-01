import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <div style={{ padding: '20px', background: '#dc3545', color: 'white' }}>
        <h2>Admin Dashboard</h2>
        <button onClick={handleLogout}>Logout</button>
      </div>
      <div style={{ padding: '20px' }}>
        <h3>Welcome {user?.name}!</h3>
      </div>
    </div>
  );
};

export default AdminDashboard;