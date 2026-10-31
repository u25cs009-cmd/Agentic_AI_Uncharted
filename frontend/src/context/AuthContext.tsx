import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface User {
  id?: string;
  email: string;
  name: string;
  workspace?: string;
  googleId?: string;
  profilePicture?: string;
  authProviders?: string[];
  createdAt?: string;
  lastLoginAt?: string;
  isActive?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password?: string, name?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  updateProfile: (updates: { name?: string; profilePicture?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('anchor_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('anchor_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email === 'alex.chen@anchor.ai' || parsed.name === 'Alex Chen') {
          localStorage.removeItem('anchor_user');
          localStorage.removeItem('anchor_token');
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Hydrate user profile on load if token is present
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('anchor_token');
      if (storedToken) {
        try {
          const res = await api.me();
          if (res?.user) {
            setUser(res.user);
          }
        } catch {
          // If token verification fails and we are not in offline fallback, logout cleanly
          const savedUser = localStorage.getItem('anchor_user');
          if (!savedUser) {
            logout();
          }
        }
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password?: string, name?: string) => {
    setIsLoading(true);
    try {
      const res = await api.register(email, password, name);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string) => {
    setIsLoading(true);
    try {
      const res = await api.googleLogin(credential);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: { name?: string; profilePicture?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.updateProfile(updates);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setIsLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.me();
      if (res?.user) setUser(res.user);
    } catch {}
  };

  const logout = () => {
    api.logout();
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
        loginWithGoogle,
        updateProfile,
        changePassword,
        logout,
        refreshUser,
        isAuthenticated: !!token && !!user,
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

