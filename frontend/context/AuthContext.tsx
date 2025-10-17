'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, setAuthCredentials, clearAuthCredentials } from '@/lib/api';

interface User {
  id: number;
  email: string;
  role: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    const storedPassword = localStorage.getItem('userPassword');

    if (storedEmail && storedPassword) {
      setAuthCredentials(storedEmail, storedPassword);
      authAPI
        .login(storedEmail, storedPassword)
        .then((data) => {
          setUser(data.data);
        })
        .catch(() => {
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userPassword');
          clearAuthCredentials();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await authAPI.login(email, password);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userPassword', password);
      setAuthCredentials(email, password);

      setUser(data.data);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPassword');
    clearAuthCredentials();
    setUser(null);
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
