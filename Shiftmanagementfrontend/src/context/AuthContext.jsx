import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();
const API_BASE_URL = 'http://localhost:8000'; // FastAPI backend

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('shiftsync_token');
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            localStorage.removeItem('shiftsync_token');
          }
        } catch (err) {
          console.error('Auth verification failed:', err);
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (username, password) => {
    setError('');
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/token`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('shiftsync_token', data.access_token);
        
        // Fetch user data
        const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });
        const userData = await userResponse.json();
        setUser(userData);
        return true;
      } else {
        const errData = await response.json();
        setError(errData.detail || 'Invalid username or password');
        return false;
      }
    } catch (err) {
      setError('Connection refused. Is the backend running?');
      return false;
    }
  };

  const register = async (userData) => {
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        return true;
      } else {
        const errData = await response.json();
        setError(errData.detail || 'Registration failed');
        return false;
      }
    } catch (err) {
      setError('Connection refused. Is the backend running?');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('shiftsync_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, error, setError, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
