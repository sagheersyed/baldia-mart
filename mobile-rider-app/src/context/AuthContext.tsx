import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, authApi } from '../api/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  loginSuccess: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('riderToken');
        if (token) {
          setAuthToken(token);
          setIsAuthenticated(true);
          
          // Background verification
          try {
            await authApi.getMe();
          } catch (error) {
            console.log('Token verification failed, logging out');
            await logout();
          }
        }
      } catch (error) {
        console.error('Failed to load token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  const loginSuccess = async (token: string) => {
    await AsyncStorage.setItem('riderToken', token);
    setAuthToken(token);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('riderToken');
    setAuthToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, loginSuccess, logout }}>
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
