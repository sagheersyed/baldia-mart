import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NavigationScreen from './src/screens/NavigationScreen';
import OtpScreen from './src/screens/OtpScreen';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, authApi } from './src/api/api';
import { ActivityIndicator, View } from 'react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function RiderTabs() {
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF4500',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#1E1E1E', borderTopWidth: 0, height: 60, paddingBottom: 10 },
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
          if (route.name === 'Dashboard') iconName = 'speedometer-outline';
          else if (route.name === 'Profile') iconName = 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('riderToken');
        if (token) {
          setAuthToken(token);
          // Verify token with server
          const res = await authApi.getMe();
          // We could set rider state here if needed
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.log('Session expired or invalid:', e);
        setAuthToken(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E1E1E' }}>
        <ActivityIndicator size="large" color="#FF4500" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Otp">
                {(props) => <OtpScreen {...props} onLoginSuccess={handleLoginSuccess} />}
              </Stack.Screen>
              <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Main" component={RiderTabs} />
              <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
              <Stack.Screen name="Navigation" component={NavigationScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
