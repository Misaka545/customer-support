import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [agent, setAgent] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cskh-token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await api.get('/auth/me');
        setAgent(res.data.data.agent);
      } catch {
        localStorage.removeItem('cskh-token');
        setToken(null);
        delete api.defaults.headers.common['Authorization'];
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { token: newToken, agent: agentData } = res.data.data;

    localStorage.setItem('cskh-token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setAgent(agentData);

    return agentData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('cskh-token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setAgent(null);
  }, []);

  const isAdmin = agent?.role === 'admin';

  return (
    <AuthContext.Provider value={{ agent, token, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
