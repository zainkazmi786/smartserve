import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { Storage } from '../utils/storage';
import { Platform } from 'react-native';

/**
 * Generic API request function
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  // Add token to headers if authenticated request
  if (options.requireAuth !== false) {
    const token = await Storage.getToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Extract error message from API response
      // API might return error in different formats:
      // - data.message
      // - data.error
      // - data.errors (array)
      // - data.data.message
      let errorMessage = 'An error occurred';
      
      if (data.message) {
        errorMessage = data.message;
      } else if (data.error) {
        errorMessage = typeof data.error === 'string' ? data.error : data.error.message || errorMessage;
      } else if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        errorMessage = data.errors[0].msg || data.errors[0].message || data.errors[0];
      } else if (data.data && data.data.message) {
        errorMessage = data.data.message;
      } else {
        errorMessage = `HTTP error! status: ${response.status}`;
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error.message && error.status) {
      throw error;
    }
    
    // Handle network errors or JSON parsing errors
    if (error.message.includes('JSON') || error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Get all cafes
 */
export const getCafes = async () => {
  try {
    const response = await apiRequest(API_ENDPOINTS.CAFES, {
      method: 'GET',
    });

    if (response.success && response.data?.cafes) {
      return response.data.cafes;
    }
    throw new Error('Failed to fetch cafes');
  } catch (error) {
    console.error('Error fetching cafes:', error);
    throw error;
  }
};

/**
 * Register a new user
 */
export const registerUser = async (userData) => {
  try {
    const response = await apiRequest(API_ENDPOINTS.REGISTER, {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || 'Registration failed');
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

/**
 * Login user (customer app only – only customer accounts are allowed).
 * @param {Object} credentials - { email?: string, phone?: string, password: string }
 */
export const loginUser = async (credentials) => {
  try {
    const body = { ...credentials, for: 'customer' };
    const response = await apiRequest(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify(body),
      requireAuth: false, // Login doesn't need auth
    });

    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || 'Login failed');
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

/**
 * Get user profile
 */
export const getProfile = async () => {
  try {
    const response = await apiRequest(API_ENDPOINTS.PROFILE, {
      method: 'GET',
    });

    if (response.success && response.data?.user) {
      return response.data.user;
    }
    throw new Error('Failed to fetch profile');
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {Object} profileData - { name?: string, email?: string, phone?: string }
 */
export const updateProfile = async (profileData) => {
  try {
    const response = await apiRequest(API_ENDPOINTS.PROFILE, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });

    if (response.success) {
      return response.data.user;
    }
    throw new Error(response.message || 'Profile update failed');
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

/**
 * Change user password
 * @param {Object} passwordData - { currentPassword: string, newPassword: string }
 */
export const changePassword = async (passwordData) => {
  try {
    const response = await apiRequest(API_ENDPOINTS.CHANGE_PASSWORD, {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });

    if (response.success) {
      return response.data.user;
    }
    throw new Error(response.message || 'Password change failed');
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};

/**
 * Get today's menus (menus with time slots for today + manually activated)
 * Returns menus with isCurrentlyActive flag
 */
export const getTodayMenus = async () => {
  try {
    const response = await apiRequest(API_ENDPOINTS.MENUS_TODAY, {
      method: 'GET',
    });

    if (response.success && response.data?.menus) {
      return response.data;
    }
    throw new Error('Failed to fetch today\'s menus');
  } catch (error) {
    console.error('Error fetching today\'s menus:', error);
    throw error;
  }
};

/**
 * Upload profile picture
 * @param {string} imageUri - Local file URI from ImagePicker
 */
export const uploadProfilePicture = async (imageUri) => {
  try {
    // Create FormData for file upload
    const formData = new FormData();
    
    // Extract filename and type from URI
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // Handle web vs mobile differently
    if (Platform.OS === 'web') {
      // For web, convert URI to Blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('profilePicture', blob, filename);
    } else {
      // For mobile, use URI directly
      formData.append('profilePicture', {
        uri: imageUri,
        name: filename,
        type: type,
      });
    }

    // Get token for authorization
    const token = await Storage.getToken();
    if (!token) {
      throw new Error('Authentication required. Please login again.');
    }

    // Make request with FormData
    // Don't set Content-Type header - let fetch set it with boundary
    const url = `${API_BASE_URL}${API_ENDPOINTS.UPLOAD_PICTURE}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - fetch will set it with boundary for FormData
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      // Extract error message
      let errorMessage = 'Failed to upload picture';
      if (data.message) {
        errorMessage = data.message;
      } else if (data.error) {
        errorMessage = typeof data.error === 'string' ? data.error : data.error.message || errorMessage;
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (data.success) {
      return data.data; // Returns { user, imageUrl }
    }
    throw new Error(data.message || 'Upload failed');
  } catch (error) {
    console.error('Error uploading picture:', error);
    throw error;
  }
};

// ============ ORDERS ============

/**
 * Create order from cart.
 * @param {Object} payload - { items: [{ itemId, quantity, portionSize?, cookingOverrideType? }], paymentMethod: 'receipt'|'cash', receiptImage?: string, receiptUri?: string }
 * For receipt: pass receiptUri (local file URI) when uploading file; or receiptImage (URL) when using JSON.
 */
export const createOrder = async (payload) => {
  const { items, paymentMethod, receiptImage, receiptUri } = payload;
  const token = await Storage.getToken();
  if (!token) throw new Error('Authentication required. Please login again.');

  if (paymentMethod === 'receipt' && receiptUri) {
    const formData = new FormData();
    formData.append('items', JSON.stringify(items));
    formData.append('paymentMethod', 'receipt');
    const filename = receiptUri.split('/').pop() || `receipt_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    if (Platform.OS === 'web') {
      const res = await fetch(receiptUri);
      const blob = await res.blob();
      formData.append('receiptImage', blob, filename);
    } else {
      formData.append('receiptImage', {
        uri: receiptUri,
        name: filename,
        type: type,
      });
    }
    const url = `${API_BASE_URL}${API_ENDPOINTS.ORDERS}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.message || 'Failed to create order');
      err.status = response.status;
      err.data = data;
      throw err;
    }
    if (data.success) return data.data;
    throw new Error(data.message || 'Failed to create order');
  }

  const body = { items, paymentMethod };
  if (receiptImage) body.receiptImage = receiptImage;
  const response = await apiRequest(API_ENDPOINTS.ORDERS, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (response.success) return response.data;
  throw new Error(response.message || 'Failed to create order');
};

/**
 * Get single order
 */
export const getOrder = async (orderId) => {
  const response = await apiRequest(`${API_ENDPOINTS.ORDERS}/${orderId}`, { method: 'GET' });
  if (response.success && response.data?.order) return response.data.order;
  throw new Error(response.message || 'Failed to fetch order');
};

/**
 * Get order history. Optional: { status, startDate, endDate, paymentMethod }
 */
export const getOrderHistory = async (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const url = q ? `${API_ENDPOINTS.ORDERS}?${q}` : API_ENDPOINTS.ORDERS;
  const response = await apiRequest(url, { method: 'GET' });
  if (response.success) return response.data;
  throw new Error(response.message || 'Failed to fetch orders');
};

/**
 * Get my active (incomplete) order. Returns { order } with order or null.
 */
export const getMyActiveOrder = async () => {
  const response = await apiRequest(API_ENDPOINTS.ORDERS_ME_ACTIVE, { method: 'GET' });
  if (response.success) return response.data;
  throw new Error(response.message || 'Failed to fetch active order');
};

/**
 * Mark order as received
 */
export const markOrderReceived = async (orderId) => {
  const response = await apiRequest(`${API_ENDPOINTS.ORDERS}/${orderId}/mark-received`, {
    method: 'POST',
  });
  if (response.success) return response.data;
  throw new Error(response.message || 'Failed to mark order received');
};

/**
 * Cancel order. Optional: { cancellationNote }
 */
export const cancelOrder = async (orderId, body = {}) => {
  const response = await apiRequest(`${API_ENDPOINTS.ORDERS}/${orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (response.success) return response.data;
  throw new Error(response.message || 'Failed to cancel order');
};

/**
 * Upload/re-upload receipt for an order (FormData with receiptImage)
 */
export const uploadReceipt = async (orderId, receiptUri) => {
  const token = await Storage.getToken();
  if (!token) throw new Error('Authentication required. Please login again.');

  const formData = new FormData();
  const filename = receiptUri.split('/').pop() || `receipt_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  if (Platform.OS === 'web') {
    const res = await fetch(receiptUri);
    const blob = await res.blob();
    formData.append('receiptImage', blob, filename);
  } else {
    formData.append('receiptImage', { uri: receiptUri, name: filename, type });
  }

  const url = `${API_BASE_URL}${API_ENDPOINTS.ORDERS}/${orderId}/upload-receipt`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.message || 'Failed to upload receipt');
    err.status = response.status;
    err.data = data;
    throw err;
  }
  if (data.success) return data.data;
  throw new Error(data.message || 'Failed to upload receipt');
};

export default {
  getCafes,
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  getTodayMenus,
  createOrder,
  getOrder,
  getOrderHistory,
  getMyActiveOrder,
  markOrderReceived,
  cancelOrder,
  uploadReceipt,
};
