import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

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
import PharmaScreen from './src/screens/PharmaScreen';
import MedicineDetailScreen from './src/screens/MedicineDetailScreen';
import MedicineListScreen from './src/screens/MedicineListScreen';
import PrescriptionUploadScreen from './src/screens/PrescriptionUploadScreen';
import PharmaSubscribeScreen from './src/screens/PharmaSubscribeScreen';
import PharmaSubscriptionListScreen from './src/screens/PharmaSubscriptionListScreen';
import LabTestListScreen from './src/screens/LabTestListScreen';
import LabBookingScreen from './src/screens/LabBookingScreen';
import MyLabBookingsScreen from './src/screens/MyLabBookingsScreen';
import DoctorListScreen from './src/screens/DoctorListScreen';
import DoctorDetailScreen from './src/screens/DoctorDetailScreen';
import ConsultationBookingScreen from './src/screens/ConsultationBookingScreen';
import MyConsultationsScreen from './src/screens/MyConsultationsScreen';
import ReminderSetupScreen from './src/screens/ReminderSetupScreen';
import ReminderListScreen from './src/screens/ReminderListScreen';
import RefillRemindersScreen from './src/screens/RefillRemindersScreen';
import MedicineReviewsScreen from './src/screens/MedicineReviewsScreen';
import LabBookingDetailsScreen from './src/screens/LabBookingDetailsScreen';
import MyPrescriptionsScreen from './src/screens/MyPrescriptionsScreen';
import PrescriptionQuotationScreen from './src/screens/PrescriptionQuotationScreen';
import PharmaSearchScreen from './src/screens/PharmaSearchScreen';
import EventDetailsScreen from './src/screens/EventDetailsScreen';
import MerchantDashboardScreen from './src/screens/cms/MerchantDashboardScreen';
import ProductCatalogScreen from './src/screens/cms/ProductCatalogScreen';
import EditProductScreen from './src/screens/cms/EditProductScreen';
import ChangeRequestQueueScreen from './src/screens/cms/ChangeRequestQueueScreen';
import ChangeRequestDetailScreen from './src/screens/cms/ChangeRequestDetailScreen';
import CmsAuthGateScreen from './src/screens/cms/CmsAuthGateScreen';
import AddItemScreen from './src/screens/cms/AddItemScreen';
import AddNewItemFormScreen from './src/screens/cms/AddNewItemFormScreen';
import MerchantOrdersScreen from './src/screens/cms/MerchantOrdersScreen';
import StoreProfileScreen from './src/screens/cms/StoreProfileScreen';
import FloatingTabBar from './src/components/FloatingTabBar';
import AppLoader from './src/components/AppLoader';
import { usePushNotifications } from './src/hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { settings, loading } = useSettings();
  const { setActiveMode, currentCount, activeOrdersCount } = useCart();

  const showMart = settings?.feature_show_mart === true;
  const showFood = settings?.feature_show_restaurants === true;
  const showBrands = settings?.feature_show_brands === true;
  const showPharma = settings?.feature_show_pharma === true;

  if (loading) return <AppLoader label="Loading store…" />;

  // Key forces navigator remount when feature flags change so tabs appear/disappear
  const navKey = `tabs-${showMart ? 1 : 0}${showFood ? 1 : 0}${showBrands ? 1 : 0}${showPharma ? 1 : 0}`;

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
      {showPharma && (
        <Tab.Screen
          name="Pharma"
          component={PharmaScreen}
          options={{ tabBarLabel: 'Pharma' }}
          listeners={{ focus: () => setActiveMode('pharma') }}
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
  
  usePushNotifications(userToken);

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
            <Stack.Screen name="MedicineDetail" component={MedicineDetailScreen} />
            <Stack.Screen name="MedicineList" component={MedicineListScreen} />
            <Stack.Screen name="PrescriptionUpload" component={PrescriptionUploadScreen} />
            <Stack.Screen name="MyPrescriptions" component={MyPrescriptionsScreen} />
            <Stack.Screen name="PrescriptionQuotation" component={PrescriptionQuotationScreen} />
            <Stack.Screen name="PharmaSearch" component={PharmaSearchScreen} />
          <Stack.Screen name="PharmaCart" component={CartScreen} />
          <Stack.Screen name="PharmaCheckout" component={CheckoutScreen} />
          <Stack.Screen name="PharmaSubscribe" component={PharmaSubscribeScreen} />
          <Stack.Screen name="PharmaSubscriptionList" component={PharmaSubscriptionListScreen} />
          <Stack.Screen name="LabTestList" component={LabTestListScreen} />
          <Stack.Screen name="LabBooking" component={LabBookingScreen} />
          <Stack.Screen name="MyLabBookings" component={MyLabBookingsScreen} />
          <Stack.Screen name="DoctorList" component={DoctorListScreen} />
          <Stack.Screen name="DoctorDetail" component={DoctorDetailScreen} />
          <Stack.Screen name="ConsultationBooking" component={ConsultationBookingScreen} />
          <Stack.Screen name="MyConsultations" component={MyConsultationsScreen} />
          <Stack.Screen name="ReminderSetup" component={ReminderSetupScreen} />
          <Stack.Screen name="ReminderList" component={ReminderListScreen} />
          <Stack.Screen name="RefillReminders" component={RefillRemindersScreen} />
          <Stack.Screen name="MedicineReviews" component={MedicineReviewsScreen} />
          <Stack.Screen name="LabBookingDetails" component={LabBookingDetailsScreen} />
          <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
           <Stack.Screen name="MerchantDashboard" component={MerchantDashboardScreen} />
          <Stack.Screen name="ProductCatalog" component={ProductCatalogScreen} />
          <Stack.Screen name="EditProduct" component={EditProductScreen} />
          <Stack.Screen name="ChangeRequestQueue" component={ChangeRequestQueueScreen} />
          <Stack.Screen name="ChangeRequestDetail" component={ChangeRequestDetailScreen} />
          <Stack.Screen name="CmsAuthGate" component={CmsAuthGateScreen} />
          <Stack.Screen name="AddItem" component={AddItemScreen} />
          <Stack.Screen name="AddNewItemForm" component={AddNewItemFormScreen} />
          <Stack.Screen name="MerchantOrders" component={MerchantOrdersScreen} />
          <Stack.Screen name="StoreProfile" component={StoreProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    useAuthStore.getState().loadStorageData();
    useSettingsStore.getState().refreshSettings();
    useSettingsStore.getState().initSocketListeners();
    useCartStore.getState().rehydrate();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <AppLoader label="" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <Navigation />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
