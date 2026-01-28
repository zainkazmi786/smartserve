import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Platform, Modal, FlatList, ActivityIndicator, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCafes, registerUser } from '../services/apiService';
import { showError, showSuccess } from '../utils/toast';

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [cafeList, setCafeList] = useState([]);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCafes, setLoadingCafes] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-100)).current;

  // Fetch cafes on component mount
  useEffect(() => {
    fetchCafes();
  }, []);

  // Store the onHide callback
  const toastOnHideRef = useRef(null);

  // Subscribe to toast updates (for web)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const { subscribeToToast, getToastState } = require('../utils/toast');
      const unsubscribe = subscribeToToast((toastState) => {
        if (toastState.visible) {
          // Store the onHide callback
          toastOnHideRef.current = toastState.onHide;
          
          setToast({
            visible: true,
            message: toastState.message,
            type: toastState.type,
          });
          // Show animation
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

          // Auto hide after 4 seconds
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
      
      // Call the onHide callback if it exists
      if (toastOnHideRef.current) {
        const callback = toastOnHideRef.current;
        toastOnHideRef.current = null; // Clear the callback
        callback();
      }
    });
  };



  // Auto-select cafe if only one exists
  useEffect(() => {
    if (cafeList.length === 1 && !selectedCafe) {
      setSelectedCafe(cafeList[0]);
    }
  }, [cafeList]);

  const fetchCafes = async () => {
    try {
      setLoadingCafes(true);
      const cafes = await getCafes();
      
      // Filter only active cafes and sort by name
      const activeCafes = cafes
        .filter(cafe => cafe.isActive !== false)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setCafeList(activeCafes);
      
      // Auto-select if only one cafe exists
      if (activeCafes.length === 1) {
        setSelectedCafe(activeCafes[0]);
      } else {
        // If multiple cafes, auto-select the first active cafe
        const firstActiveCafe = activeCafes.find(cafe => cafe.isActive === true);
        if (firstActiveCafe && !selectedCafe) {
          setSelectedCafe(firstActiveCafe);
        }
      }
    } catch (error) {
      console.error('Error fetching cafes:', error);
      showError(
        'Error',
        'Failed to load cafes. Please check your connection and try again.'
      );
    } finally {
      setLoadingCafes(false);
    }
  };

  const handleSignup = async () => {
    // Basic validation
    if (!fullName || !email || !password || !selectedCafe) {
      console.log('Validation failed:', { fullName, email, password: !!password, selectedCafe });
      showError('Validation Error', 'Please fill in all details including cafe selection');
      return;
    }

    // Debug: Log the cafe being sent
    console.log('Registering with cafe:', selectedCafe._id, selectedCafe.name);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError('Validation Error', 'Please enter a valid email address');
      return;
    }

    // Password validation (minimum 6 characters)
    if (password.length < 6) {
      showError('Validation Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const userData = {
        name: fullName,
        email: email,
        phone: phone || undefined, // Optional field
        password: password,
        cafeId: selectedCafe._id, // Backend expects cafeId (camelCase), not cafe_id
      };

      const response = await registerUser(userData);

      // Registration successful
      if (Platform.OS === 'web') {
        // For web: show toast and navigate after it auto-hides
        showSuccess(
          'Success',
          'Registration successful! Please login to continue.',
          {
            onHide: () => {
              // Navigate to login screen after toast is hidden
              navigation.navigate('Login');
            },
          }
        );
      } else {
        // For mobile: use Alert with navigation
        Alert.alert(
          'Success',
          'Registration successful! Please login to continue.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('Login');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      // Error message is already extracted properly in apiService
      showError(
        'Registration Failed',
        error.message || 'An error occurred during registration. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCafe = (cafe) => {
    setSelectedCafe(cafe);
    setIsDropdownOpen(false);
  };

  const toastBgColor = toast.type === 'error' ? '#FF4444' : toast.type === 'success' ? '#4CAF50' : '#2196F3';

  const renderCafeItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        selectedCafe?._id === item._id && styles.dropdownItemSelected
      ]}
      onPress={() => handleSelectCafe(item)}
    >
      <Text style={[
        styles.dropdownItemText,
        selectedCafe?._id === item._id && styles.dropdownItemTextSelected
      ]}>
        {item.name}
      </Text>
      {selectedCafe?._id === item._id && (
        <Ionicons name="checkmark" size={20} color="#2D2926" />
      )}
    </TouchableOpacity>
  );

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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Create Account</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput 
            style={styles.input} 
            value={fullName} 
            onChangeText={setFullName} 
            placeholder="Aasim Bilal Khan" 
            placeholderTextColor="#A67B5B"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput 
            style={styles.input} 
            value={email} 
            onChangeText={setEmail} 
            placeholder="email@example.com" 
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#A67B5B"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone (Optional)</Text>
          <TextInput 
            style={styles.input} 
            value={phone} 
            onChangeText={setPhone} 
            placeholder="+923001234567" 
            keyboardType="phone-pad"
            placeholderTextColor="#A67B5B"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput 
              style={styles.passwordInput} 
              value={password} 
              onChangeText={setPassword} 
              placeholder="••••••••" 
              secureTextEntry={!isPasswordVisible}
              placeholderTextColor="#A67B5B"
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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Select Cafe</Text>
          {loadingCafes ? (
            <View style={[styles.dropdownButton, styles.loadingContainer]}>
              <ActivityIndicator size="small" color="#6F4E37" />
              <Text style={styles.loadingText}>Loading cafes...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setIsDropdownOpen(true)}
                activeOpacity={0.7}
                disabled={cafeList.length === 0}
              >
                <Text style={[
                  styles.dropdownButtonText,
                  (!selectedCafe || cafeList.length === 0) && styles.dropdownPlaceholder
                ]}>
                  {selectedCafe ? selectedCafe.name : cafeList.length === 0 ? 'No cafes available' : 'Choose a cafe'}
                </Text>
                <Ionicons 
                  name={isDropdownOpen ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#6F4E37" 
                />
              </TouchableOpacity>

              <Modal
                visible={isDropdownOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsDropdownOpen(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setIsDropdownOpen(false)}
                >
                  <View style={styles.dropdownContainer}>
                    <View style={styles.dropdownHeader}>
                      <Text style={styles.dropdownHeaderText}>Select Cafe</Text>
                      <TouchableOpacity
                        onPress={() => setIsDropdownOpen(false)}
                        style={styles.closeButton}
                      >
                        <Ionicons name="close" size={24} color="#2D2926" />
                      </TouchableOpacity>
                    </View>
                    {cafeList.length === 0 ? (
                      <View style={styles.emptyCafeContainer}>
                        <Text style={styles.emptyCafeText}>No cafes available</Text>
                      </View>
                    ) : (
                      <FlatList
                        data={cafeList}
                        renderItem={renderCafeItem}
                        keyExtractor={(item) => item._id}
                        style={styles.dropdownList}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </Modal>
            </>
          )}
        </View>

        <TouchableOpacity 
          style={[
            styles.signupButton,
            (loading || loadingCafes) && styles.signupButtonDisabled
          ]} 
          onPress={handleSignup}
          disabled={loading || loadingCafes}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signupText}>Sign up</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8EE' },
  content: { padding: 30, flexGrow: 1, justifyContent: 'center' },
  header: { fontSize: 32, fontFamily: 'Poppins-Bold', color: '#2D2926', marginBottom: 30 },
  inputContainer: { marginBottom: 15 },
  label: { fontFamily: 'Poppins-Bold', fontSize: 14, color: '#2D2926', marginBottom: 5 },
  input: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#E5D3B3',
    fontFamily: 'Poppins-Regular'
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5D3B3',
  },
  passwordInput: { flex: 1, padding: 15, fontFamily: 'Poppins-Regular' },
  eyeIcon: { paddingHorizontal: 15 },
  dropdownButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5D3B3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#2D2926',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#A67B5B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    ...Platform.select({
      web: { boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)' },
      default: { elevation: 10 },
    }),
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5D3B3',
  },
  dropdownHeaderText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#2D2926',
  },
  closeButton: {
    padding: 5,
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dropdownItemSelected: {
    backgroundColor: '#FFF8EE',
  },
  dropdownItemText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#2D2926',
    flex: 1,
  },
  dropdownItemTextSelected: {
    fontFamily: 'Poppins-Bold',
    color: '#2D2926',
  },
  signupButton: { 
    backgroundColor: '#2D2926', 
    padding: 18, 
    borderRadius: 15, 
    alignItems: 'center', 
    marginTop: 20,
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)' },
      default: { elevation: 3 }
    })
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins-Bold' },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#6F4E37',
    marginLeft: 10,
  },
  emptyCafeContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyCafeText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#A67B5B',
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