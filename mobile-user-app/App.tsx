import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useCart } from './src/context/CartContext';
import { useAuth } from './src/context/AuthContext';
import { useSettings } from './src/context/SettingsContext';
import { useCartStore } from './src/store/cartStore';
import { useAuthStore } from './src/store/authStore';
import { useSettingsStore } from './src/store/settingsStore';

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
import FavouritesScreen from './src/screens/FavouritesScreen';
import AboutScreen from './src/screens/AboutScreen';
import OrderChatScreen from './src/screens/OrderChatScreen';
import RashanOrderScreen from './src/screens/RashanOrderScreen';
import PaymentWebViewScreen from './src/screens/PaymentWebViewScreen';
import ProductListingScreen from './src/screens/ProductListingScreen';

import FloatingTabBar from './src/components/FloatingTabBar';
import AppLoader from './src/components/AppLoader';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { settings, loading } = useSettings();
  const { setActiveMode, currentCount, activeOrdersCount } = useCart();

  const showMart = settings?.feature_show_mart === true;
  const showFood = settings?.feature_show_restaurants === true;
  const showBrands = settings?.feature_show_brands === true;

  if (loading) return <AppLoader label="Loading store…" />;

  // Key forces navigator remount when feature flags change so tabs appear/disappear
  const navKey = `tabs-${showMart ? 1 : 0}${showFood ? 1 : 0}${showBrands ? 1 : 0}`;

  return (
    <Tab.Navigator
      key={navKey}
      backBehavior="history"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {showMart && (
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarLabel: 'Mart' }}
          listeners={{ focus: () => setActiveMode('mart') }}
        />
      )}
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
          tabBarBadge: currentCount > 0 ? currentCount : undefined,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={MyOrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarBadge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Account' }} />
    </Tab.Navigator>
  );
}

function Navigation() {
  const { userToken, isLoading, userData } = useAuth();

  if (isLoading) {
    return <AppLoader label="Signing you in…" />;
  }

  const isProfileComplete =
    userData &&
    userData.name &&
    userData.name !== 'Valued Customer' &&
    userData.name !== 'New Customer' &&
    userData.phoneNumber;

  if (userToken && !userData) {
    return <AppLoader label="Loading your profile…" />;
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
            <Stack.Screen name="Favourites" component={FavouritesScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen
              name="OrderChat"
              component={OrderChatScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="RashanOrder" component={RashanOrderScreen} />
            <Stack.Screen name="PaymentWebView" component={PaymentWebViewScreen} />
            <Stack.Screen name="ProductListing" component={ProductListingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    useAuthStore.getState().loadStorageData();
    useSettingsStore.getState().refreshSettings();
    useSettingsStore.getState().initSocketListeners();
    useCartStore.getState().rehydrate();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Navigation />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
