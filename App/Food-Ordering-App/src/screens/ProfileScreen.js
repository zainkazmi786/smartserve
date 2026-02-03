import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ScreenWrapper from '../components/ScreenWrapper';
import { getProfile, updateProfile, changePassword, uploadProfilePicture, updatePushToken } from '../services/apiService';
import { Storage } from '../utils/storage';
import { showError, showSuccess } from '../utils/toast';
import { useActiveOrder } from '../context/ActiveOrderContext';
import { useSocket } from '../context/SocketContext';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const { fetchActiveOrder } = useActiveOrder();
  const { disconnect } = useSocket();

  useFocusEffect(
    useCallback(() => {
      fetchActiveOrder();
    }, [fetchActiveOrder])
  );
  const [updating, setUpdating] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const regNo = 'B23F0001AI073';
  const totalSpending = '1,240.50';

  const [profileImage, setProfileImage] = useState(
    'https://via.placeholder.com/150'
  );

  const [modalType, setModalType] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
  });

  // Toast state for web
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-100)).current;
  const toastOnHideRef = useRef(null);

  // Fetch profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

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

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const user = await getProfile();
      
      setUserName(user.name || '');
      setUserEmail(user.email || '');
      setUserPhone(user.phone || '');
      
      // Set profile picture if available
      if (user.profilePicture) {
        setProfileImage(user.profilePicture);
      }
      
      // Update stored user data
      await Storage.saveUserData(user);
    } catch (error) {
      console.error('Error fetching profile:', error);
      showError('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      showError('Permission Required', 'Please allow gallery access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8, // Reduce quality for faster upload
    });

    if (!result.canceled) {
      try {
        setUploadingPicture(true);
        
        // Upload to API
        const response = await uploadProfilePicture(result.assets[0].uri);
        
        // Update local state with new image URL from API
        if (response.imageUrl) {
          setProfileImage(response.imageUrl);
        } else if (response.user?.profilePicture) {
          setProfileImage(response.user.profilePicture);
        }
        
        // Update stored user data
        if (response.user) {
          await Storage.saveUserData(response.user);
          // Update local state with any other user data changes
          setUserName(response.user.name || userName);
          setUserEmail(response.user.email || userEmail);
          setUserPhone(response.user.phone || userPhone);
        }
        
        showSuccess('Success', 'Profile picture updated successfully');
      } catch (error) {
        console.error('Error uploading picture:', error);
        showError('Upload Failed', error.message || 'Failed to upload picture. Please try again.');
      } finally {
        setUploadingPicture(false);
      }
    }
  };

  const handleEditProfile = () => {
    // Pre-fill form with current values
    setEditForm({
      name: userName,
      email: userEmail,
      phone: userPhone,
    });
    setModalType('edit');
  };

  const saveProfile = async () => {
    // Validation
    if (!editForm.name.trim()) {
      showError('Validation Error', 'Name cannot be empty');
      return;
    }

    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      showError('Validation Error', 'Please enter a valid email address');
      return;
    }

    setUpdating(true);

    try {
      const updatedUser = await updateProfile({
        name: editForm.name,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
      });

      // Update local state
      setUserName(updatedUser.name);
      setUserEmail(updatedUser.email || '');
      setUserPhone(updatedUser.phone || '');
      
      // Update stored user data
      await Storage.saveUserData(updatedUser);

      setModalType(null);
      showSuccess('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Update Failed', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              disconnect();
              await updatePushToken('').catch(() => {});
              await Storage.clearAll();
              navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
            } catch (e) {
              console.warn('Logout error:', e);
              navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
            }
          },
        },
      ]
    );
  };

  const savePassword = async () => {
    // Validation
    if (!passwords.current) {
      showError('Validation Error', 'Current password is required');
      return;
    }

    if (!passwords.new) {
      showError('Validation Error', 'New password is required');
      return;
    }

    if (passwords.new.length < 6) {
      showError('Validation Error', 'New password must be at least 6 characters long');
      return;
    }

    if (passwords.current === passwords.new) {
      showError('Validation Error', 'New password must be different from current password');
      return;
    }

    setUpdating(true);

    try {
      const updatedUser = await changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });

      // Update stored user data
      await Storage.saveUserData(updatedUser);

      // Clear password fields
      setPasswords({ current: '', new: '' });
      setModalType(null);
      
      showSuccess('Success', 'Password updated successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      showError('Update Failed', error.message || 'Failed to update password. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const toastBgColor = toast.type === 'error' ? '#FF4444' : toast.type === 'success' ? '#4CAF50' : '#2196F3';

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D2926" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
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
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={pickImage} 
            style={styles.imageWrapper}
            disabled={uploadingPicture}
          >
            {uploadingPicture ? (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="large" color="#2D2926" />
              </View>
            ) : (
              <>
                <Image source={{ uri: profileImage }} style={styles.image} />
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.nameText}>{userName || 'User'}</Text>
          <Text style={styles.regText}>{userPhone || userEmail || regNo}</Text>
        </View>

        {/* SPENDING */}
        <View style={styles.spendingCard}>
          <View>
            <Text style={styles.cardLabel}>Total Spending</Text>
            <Text style={styles.cardValue}>Rs {totalSpending}</Text>
          </View>
          <Ionicons
            name="wallet-outline"
            size={40}
            color="rgba(255,255,255,0.3)"
          />
        </View>

        {/* MENU */}
        <View style={styles.menuList}>
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            onPress={handleEditProfile}
          />
          <MenuItem
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => setModalType('password')}
          />
          <MenuItem
            icon="help-circle-outline"
            label="Contact Us / Help"
            onPress={() => setModalType('help')}
          />
          <MenuItem
            icon="log-out-outline"
            label="Log out"
            onPress={handleLogout}
            last
          />
        </View>
      </ScrollView>

      {/* MODALS */}
      <Modal visible={!!modalType} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* EDIT PROFILE */}
            {modalType === 'edit' && (
              <>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                  placeholder="Enter your name"
                />
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.email}
                  onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                  placeholder="Enter your phone"
                  keyboardType="phone-pad"
                />
                <ModalActions
                  onCancel={() => setModalType(null)}
                  onSave={saveProfile}
                  loading={updating}
                />
              </>
            )}

            {/* CHANGE PASSWORD */}
            {modalType === 'password' && (
              <>
                <Text style={styles.modalTitle}>Change Password</Text>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter current password"
                  placeholderTextColor="#A67B5B"
                  secureTextEntry
                  value={passwords.current}
                  onChangeText={t =>
                    setPasswords({ ...passwords, current: t })
                  }
                />
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password (min 6 characters)"
                  placeholderTextColor="#A67B5B"
                  secureTextEntry
                  value={passwords.new}
                  onChangeText={t =>
                    setPasswords({ ...passwords, new: t })
                  }
                />
                <ModalActions
                  onCancel={() => {
                    setPasswords({ current: '', new: '' });
                    setModalType(null);
                  }}
                  onSave={savePassword}
                  loading={updating}
                />
              </>
            )}

            {/* HELP */}
            {modalType === 'help' && (
              <>
                <Text style={styles.modalTitle}>Need Help?</Text>
                <Text style={styles.helpText}>
                  📧 support@cafeteria.app{'\n'}
                  📞 +92 300 1234567{'\n'}
                  🕒 9AM – 6PM
                </Text>

                <TouchableOpacity
                  style={styles.fullBtn}
                  onPress={() => setModalType(null)}
                >
                  <Text style={styles.fullBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

/* SMALL COMPONENTS */
const MenuItem = ({ icon, label, onPress, last }) => (
  <TouchableOpacity
    style={[styles.menuItem, last && { borderBottomWidth: 0 }]}
    onPress={onPress}
  >
    <Ionicons name={icon} size={24} color="#2D2926" />
    <Text style={styles.menuText}>{label}</Text>
    <Ionicons name="chevron-forward" size={20} color="#A67B5B" />
  </TouchableOpacity>
);

const ModalActions = ({ onCancel, onSave, loading = false }) => (
  <View style={styles.modalActions}>
    <TouchableOpacity onPress={onCancel} disabled={loading}>
      <Text style={[styles.cancelText, loading && styles.disabledText]}>Cancel</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
      onPress={onSave}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.saveText}>Save</Text>
      )}
    </TouchableOpacity>
  </View>
);

/* STYLES */
const styles = StyleSheet.create({
  content: { padding: 25 },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 20 },

  imageWrapper: { position: 'relative' },
  image: { width: 120, height: 120, borderRadius: 60 },
  imageLoadingContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#2D2926',
    padding: 8,
    borderRadius: 20,
  },

  nameText: { fontSize: 24, fontFamily: 'Poppins-Bold', marginTop: 15 },
  regText: { fontSize: 14, color: '#6F4E37' },

  spendingCard: {
    backgroundColor: '#2D2926',
    padding: 25,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  cardLabel: { color: '#A67B5B' },
  cardValue: { color: '#fff', fontSize: 32, fontFamily: 'Poppins-Bold' },

  menuList: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 25,
  },
  modalTitle: { fontSize: 20, fontFamily: 'Poppins-Bold', marginBottom: 15 },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#2D2926',
    marginBottom: 5,
    marginTop: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    fontFamily: 'Poppins-Regular',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6F4E37',
    fontFamily: 'Poppins-Regular',
  },
  disabledText: {
    opacity: 0.5,
  },
  saveBtnDisabled: {
    opacity: 0.6,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelText: { color: '#A67B5B' },
  saveBtn: {
    backgroundColor: '#2D2926',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveText: { color: '#fff' },

  helpText: { color: '#6F4E37', lineHeight: 22, marginBottom: 20 },
  fullBtn: {
    backgroundColor: '#2D2926',
    padding: 14,
    borderRadius: 15,
    alignItems: 'center',
  },
  fullBtnText: { color: '#fff', fontFamily: 'Poppins-Bold' },
});
