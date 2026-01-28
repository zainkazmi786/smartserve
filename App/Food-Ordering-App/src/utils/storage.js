import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For now, using AsyncStorage for all platforms
// Can be upgraded to use SecureStore for mobile later
const TOKEN_KEY = '@auth_token';
const USER_DATA_KEY = '@user_data';
const ACTIVE_CAFE_KEY = '@active_cafe_id';

export const Storage = {
  // Token management
  async saveToken(token) {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  },

  async getToken() {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async removeToken() {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },

  // User data
  async saveUserData(userData) {
    try {
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  },

  async getUserData() {
    try {
      const data = await AsyncStorage.getItem(USER_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  // Active cafe
  async saveActiveCafeId(cafeId) {
    try {
      await AsyncStorage.setItem(ACTIVE_CAFE_KEY, cafeId);
    } catch (error) {
      console.error('Error saving active cafe:', error);
    }
  },

  async getActiveCafeId() {
    try {
      return await AsyncStorage.getItem(ACTIVE_CAFE_KEY);
    } catch (error) {
      console.error('Error getting active cafe:', error);
      return null;
    }
  },

  // Clear all auth data
  async clearAll() {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_DATA_KEY, ACTIVE_CAFE_KEY]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};

export default Storage;
