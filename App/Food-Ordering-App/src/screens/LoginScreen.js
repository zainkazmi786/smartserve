import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loginUser, updatePushToken } from '../services/apiService';
import { showError, showSuccess } from '../utils/toast';
import { Storage } from '../utils/storage';
import { registerForPushNotificationsAsync } from '../services/notifications';
import { useSocket } from '../context/SocketContext';

export default function LoginScreen({ navigation }) {
  const { connect: connectSocket } = useSocket();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-100)).current;
  const toastOnHideRef = useRef(null);

  // Subscribe to toast updates (for web)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const { subscribeToToast } = require('../utils/toast');
      const unsubscribe = subscribeToToast((toastState) => {
        if (toastState.visible) {
          toastOnHideRef.current = toastState.onHide;
          setToast({
            visible: true,
            message: toastState.message,
            type: toastState.type,
          });
          Animated.parallel([
            Animated.timing(toastOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.spring(toastTranslateY, {
              toValue: 0,
              tension: 50,
              friction: 7,
              useNativeDriver: true,
            }),
          ]).start();
          setTimeout(() => {
            hideToast();
          }, 4000);
        } else {
          hideToast();
        }
      });
      return unsubscribe;
    }
  }, []);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast({ visible: false, message: '', type: 'error' });
      if (toastOnHideRef.current) {
        const callback = toastOnHideRef.current;
        toastOnHideRef.current = null;
        callback();
      }
    });
  };

  const handleLogin = async () => {
    // Validation: either email or phone required, password required
    if (!password) {
      showError('Validation Error', 'Password is required');
      return;
    }

    if (!email && !phone) {
      showError('Validation Error', 'Email or phone is required');
      return;
    }

    setLoading(true);

    try {
      const credentials = {
        password,
      };

      // Add email or phone (whichever is provided)
      if (email) {
        credentials.email = email;
      }
      if (phone) {
        credentials.phone = phone;
      }

      const response = await loginUser(credentials);

      // Store token and user data
      if (response.token) {
        await Storage.saveToken(response.token);
      }
      if (response.user) {
        await Storage.saveUserData(response.user);
      }
      if (response.activeCafeId) {
        await Storage.saveActiveCafeId(response.activeCafeId);
      }

      // Connect Socket.io for real-time order updates
      connectSocket(response.token, response.user);

      // Register for push notifications (native only) and send token to backend
      if (Platform.OS !== 'web') {
        registerForPushNotificationsAsync()
          .then((expoPushToken) => {
            if (expoPushToken) return updatePushToken(expoPushToken);
          })
          .catch((err) => console.warn('Push registration failed:', err));
      }

      // Success - navigate to Main
      if (Platform.OS === 'web') {
        showSuccess('Success', 'Login successful!', {
          onHide: () => {
            navigation.navigate('Main');
          },
        });
      } else {
        Alert.alert('Success', 'Login successful!', [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('Main');
            },
          },
        ]);
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('Login Failed', error.message || 'An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toastBgColor = toast.type === 'error' ? '#FF4444' : toast.type === 'success' ? '#4CAF50' : '#2196F3';

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'web' && toast.visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
        >
          <View style={[styles.toast, { backgroundColor: toastBgColor }]}>
            <Text style={styles.toastMessage}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
      <View style={styles.content}>
        <Text style={styles.header}>Welcome Back</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address (Optional)</Text>
          <TextInput 
            style={styles.input} 
            value={email}
            onChangeText={setEmail}
            placeholder="example@gmail.com"
            placeholderTextColor="#A67B5B"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone (Optional)</Text>
          <TextInput 
            style={styles.input} 
            value={phone}
            onChangeText={setPhone}
            placeholder="+923001234567"
            placeholderTextColor="#A67B5B"
            keyboardType="phone-pad"
          />
          <Text style={styles.hintText}>Enter either email or phone</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput 
              style={styles.passwordInput} 
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••" 
              placeholderTextColor="#A67B5B"
              secureTextEntry={!isPasswordVisible}
            />
            <TouchableOpacity 
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                size={24} 
                color="#6F4E37" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8EE' },
  content: { flex: 1, padding: 30, justifyContent: 'center' },
  header: { fontSize: 32, fontFamily: 'Poppins-Bold', color: '#2D2926', marginBottom: 40 },
  inputContainer: { marginBottom: 20 },
  label: { fontFamily: 'Poppins-Bold', fontSize: 14, color: '#2D2926', marginBottom: 8 },
  input: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 15, 
    fontFamily: 'Poppins-Regular', 
    borderWidth: 1, 
    borderColor: '#E5D3B3' 
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5D3B3',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontFamily: 'Poppins-Regular',
  },
  eyeIcon: { paddingHorizontal: 15 },
  loginButton: { 
    backgroundColor: '#2D2926', 
    padding: 18, 
    borderRadius: 15, 
    alignItems: 'center', 
    marginTop: 10,
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)' },
      default: { elevation: 3 }
    })
  },
  loginText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins-Bold' },
  hintText: {
    fontSize: 12,
    color: '#A67B5B',
    fontFamily: 'Poppins-Regular',
    marginTop: 5,
  },
  toastContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: '90%',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
  },
  toastMessage: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
});