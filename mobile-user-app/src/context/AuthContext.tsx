import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, authApi } from '../api/api';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface AuthContextType {
  userToken: string | null;
  userData: any | null;
  isLoading: boolean;
  signIn: (token: string, userData?: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserData: (data: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  usePushNotifications(userToken);

  useEffect(() => {
    // Load token from storage on boot
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const savedUser = await AsyncStorage.getItem('userData');
      
      if (token) {
        setAuthToken(token);
        setUserToken(token);
        if (savedUser) {
          setUserData(JSON.parse(savedUser));
        }
        
        // Background verify
        try {
          const res = await authApi.getMe();
          setUserData(res.data);
          await AsyncStorage.setItem('userData', JSON.stringify(res.data));
        } catch (e) {
          console.log('Background auth verify failed:', e);
          // If 401, we might want to sign out, but let's be cautious with transient network errors
          if (e.response?.status === 401) {
            await signOut();
          }
        }
      }
    } catch (e) {
      console.error('Failed to load auth data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (token: string, user?: any) => {
    try {
      setAuthToken(token);
      setUserToken(token);
      await AsyncStorage.setItem('userToken', token);
      
      if (user) {
        setUserData(user);
        await AsyncStorage.setItem('userData', JSON.stringify(user));
      } else {
        // Fetch user data if not provided
        const res = await authApi.getMe();
        setUserData(res.data);
        await AsyncStorage.setItem('userData', JSON.stringify(res.data));
      }
    } catch (e) {
      console.error('SignIn error', e);
    }
  };

  const signOut = async () => {
    try {
      setAuthToken(null);
      setUserToken(null);
      setUserData(null);
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
    } catch (e) {
      console.error('SignOut error', e);
    }
  };

  const updateUserData = (data: any) => {
    setUserData(data);
    AsyncStorage.setItem('userData', JSON.stringify(data));
  };

  return (
    <AuthContext.Provider value={{ userToken, userData, isLoading, signIn, signOut, updateUserData }}>
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
