import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text, ActivityIndicator, View } from 'react-native';


import { CartProvider, useCart } from './src/context/CartContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { categoriesApi, productsApi, addressesApi, settingsApi } from './src/api/api';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import FoodScreen from './src/screens/FoodScreen';
import BrandsScreen from './src/screens/BrandsScreen';
import CartScreen from './src/screens/CartScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrderTrackingScreen from './src/screens/OrderTrackingScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import SavedAddressesScreen from './src/screens/SavedAddressesScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import HelpScreen from './src/screens/HelpScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import OtpScreen from './src/screens/OtpScreen';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import MpinLoginScreen from './src/screens/MpinLoginScreen';
import MpinSetupScreen from './src/screens/MpinSetupScreen';
import MpinSetupDirectScreen from './src/screens/MpinSetupDirectScreen';
import SearchScreen from './src/screens/SearchScreen';
import BrandDetailScreen from './src/screens/BrandDetailScreen';
import RestaurantDetailScreen from './src/screens/RestaurantDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

import { Ionicons } from '@expo/vector-icons';

function MainTabs() {
  const { setActiveMode, currentCount, activeOrdersCount } = useCart();
  const [showFood, setShowFood] = useState(true);
  const [showBrands, setShowBrands] = useState(true);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const res = await settingsApi.getPublicSettings();
        if (res.data) {
          // Default to true if not specified, otherwise follow setting
          setShowFood(res.data.feature_show_restaurants !== 'false');
          setShowBrands(res.data.feature_show_brands !== 'false');
        }
      } catch (error) {
        console.error('Failed to fetch feature configs:', error);
        // On error, keep them visible
        setShowFood(true);
        setShowBrands(true);
      }
    };
    fetchConfigs();
  }, []);

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF4500',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          position: 'absolute',
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 10
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, focused }) => {
          let iconName: any;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Food') iconName = focused ? 'restaurant' : 'restaurant-outline';
          else if (route.name === 'Brands') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Cart') iconName = focused ? 'cart' : 'cart-outline';
          else if (route.name === 'Orders') iconName = focused ? 'receipt' : 'receipt-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Mart' }}
        listeners={{ focus: () => setActiveMode('mart') }}
      />
      {showFood && (
        <Tab.Screen
          name="Food"
          component={FoodScreen}
          options={{ tabBarLabel: 'Food' }}
          listeners={{ focus: () => setActiveMode('food') }}
        />
      )}
      {showBrands && (
        <Tab.Screen
          name="Brands"
          component={BrandsScreen}
          options={{ tabBarLabel: 'Brands' }}
        />
      )}
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarBadge: currentCount > 0 ? currentCount : undefined
        }}
      />
      <Tab.Screen 
        name="Orders" 
        component={MyOrdersScreen} 
        options={{ 
          tabBarLabel: 'Orders',
          tabBarBadge: activeOrdersCount > 0 ? activeOrdersCount : undefined
        }} 
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function Navigation() {
  const { userToken, isLoading, userData } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#FF4500" />
      </View>
    );
  }

  const isProfileComplete =
    userData &&
    userData.name &&
    userData.name !== 'Valued Customer' &&
    userData.name !== 'New Customer' &&
    userData.phoneNumber;

  if (userToken && !userData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#FF4500" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!userToken ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
            <Stack.Screen name="MpinLogin" component={MpinLoginScreen} />
            <Stack.Screen name="MpinSetup" component={MpinSetupScreen} />
            <Stack.Screen name="MpinSetupDirect" component={MpinSetupDirectScreen} />
          </>
        ) : !isProfileComplete ? (
          <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="BrandsList" component={BrandsScreen} />
            <Stack.Screen name="BrandDetail" component={BrandDetailScreen} />
            <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
            <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
            <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <Navigation />
          <StatusBar style="auto" />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
