import React, { useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, Platform, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CartProvider } from './src/context/CartContext';
import { ActiveOrderProvider } from './src/context/ActiveOrderContext';
import { SocketProvider, SocketConnector } from './src/context/SocketContext';
import OrderTrackerFAB from './src/components/OrderTrackerFAB';
import GlobalToast from './src/components/GlobalToast';

// Screen Imports
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import ActiveMenu from './src/screens/ActiveMenu';
// import OrderSummary from './src/screens/OrderSummary';
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrderTracker from './src/screens/OrderTracker';
import OrderHistoryScreen from './src/screens/OrderHistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CartScreen from './src/screens/CartScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const { height } = useWindowDimensions();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFF8EE',
          height: Platform.OS === 'ios' ? 90 : 70, // Responsive height for iOS/Android
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: '#2D2926',
        tabBarInactiveTintColor: '#A67B5B',
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Menu') iconName = focused ? 'cafe' : 'cafe-outline';
          else if (route.name === 'Orders') iconName = focused ? 'receipt' : 'receipt-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Menu" component={ActiveMenu} />
      <Tab.Screen name="Orders" component={OrderHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Handle notification tap: navigate to OrderTracker when user taps push notification
function useNotificationResponse(navigationRef) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content?.data;
      const orderId = data?.orderId;
      if (orderId && navigationRef.current?.isReady()) {
        navigationRef.current.navigate('OrderTracker', { orderId });
      }
    });
    return () => sub.remove();
  }, []);
}

export default function App() {
  const navigationRef = useNavigationContainerRef();
  useNotificationResponse(navigationRef);

  return (
    <CartProvider>
      <ActiveOrderProvider>
        <SocketProvider>
          <SocketConnector />
          <NavigationContainer ref={navigationRef}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF8EE" />
            <View style={{ flex: 1 }}>
            <Stack.Navigator
              initialRouteName="Splash"
              screenOptions={{
                headerShown: false,
                animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
              }}
            >
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Cart" component={CartScreen} />
              <Stack.Screen name="Auth" component={AuthScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen name="Checkout" component={CheckoutScreen} />
              <Stack.Screen name="OrderTracker" component={OrderTracker} />
            </Stack.Navigator>
            <OrderTrackerFAB />
            <GlobalToast />
          </View>
        </NavigationContainer>
        </SocketProvider>
      </ActiveOrderProvider>
    </CartProvider>
  );
}