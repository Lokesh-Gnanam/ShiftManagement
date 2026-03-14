import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null means not logged in
  const [error, setError] = useState('');

  // Expected roles: 'admin', 'senior', 'junior'
  const mockUsers = [
    { username: 'admin', password: 'password123', role: 'admin', name: 'Super Admin' },
    { username: 'senior', password: 'password123', role: 'senior', name: 'Senior Tech Ravi' },
    { username: 'junior', password: 'password123', role: 'junior', name: 'Junior Tech Arjun' }
  ];

  const login = async (username, password) => {
    setError('');
    const cleanUsername = username?.trim().toLowerCase() || '';
    const cleanPassword = password?.trim() || '';

    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cleanUsername,
          password: cleanPassword,
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser({
          name: userData.name,
          role: userData.role,
          username: userData.username
        });
        console.log(`${userData.role} login success`);
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Invalid username or password');
        return false;
      }
    } catch (err) {
      console.error('Backend connection error:', err);
      setError('Cannot connect to backend server');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};
