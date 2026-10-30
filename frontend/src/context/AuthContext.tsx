import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface User {
  id?: string;
  email: string;
  name: string;
  workspace?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password?: string, name?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('anchor_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('anchor_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Set default demo session if nothing exists yet
  useEffect(() => {
    if (!token && !localStorage.getItem('anchor_logged_out')) {
      const defaultToken = `jwt_shakti2_${Date.now()}`;
      const defaultUser = { email: 'yashi@shakti2.io', name: 'Yashi Aadarsh', workspace: 'ws-primary' };
      localStorage.setItem('anchor_token', defaultToken);
      localStorage.setItem('anchor_user', JSON.stringify(defaultUser));
      setToken(defaultToken);
      setUser(defaultUser);
    }
  }, [token]);

  const login = async (email: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email);
      setToken(res.token);
      setUser(res.user);
      localStorage.removeItem('anchor_logged_out');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, _password?: string, name?: string) => {
    setIsLoading(true);
    try {
      const res = await api.register(email);
      const updatedUser = { ...res.user, name: name || res.user.name };
      localStorage.setItem('anchor_user', JSON.stringify(updatedUser));
      setToken(res.token);
      setUser(updatedUser);
      localStorage.removeItem('anchor_logged_out');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('anchor_token');
    localStorage.removeItem('anchor_user');
    localStorage.setItem('anchor_logged_out', 'true');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

