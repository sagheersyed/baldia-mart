import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, authApi, registerSignOutCallback } from '../api/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  loginSuccess: (token: string, user?: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('riderToken');
        if (token) {
          setAuthToken(token);
          setIsAuthenticated(true);
          const savedUser = await AsyncStorage.getItem('riderData');
          if (savedUser) setUser(JSON.parse(savedUser));

          // Background verification
          try {
            const res = await authApi.getMe();
            setUser(res.data);
            await AsyncStorage.setItem('riderData', JSON.stringify(res.data));
          } catch (error) {
            console.error('Auth verification failed:', error);
            if (error.response?.status === 401) {
              await logout();
            }
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

  const loginSuccess = async (token: string, userInfo?: any) => {
    await AsyncStorage.setItem('riderToken', token);
    setAuthToken(token);
    if (userInfo) {
      setUser(userInfo);
      await AsyncStorage.setItem('riderData', JSON.stringify(userInfo));
    } else {
      try {
        const res = await authApi.getMe();
        setUser(res.data);
        await AsyncStorage.setItem('riderData', JSON.stringify(res.data));
      } catch (e) {}
    }
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('riderToken');
    await AsyncStorage.removeItem('riderData');
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Register logout with Axios so 401 responses auto-logout globally
  useEffect(() => {
    registerSignOutCallback(logout);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, loginSuccess, logout }}>
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
