import { Platform, Alert } from 'react-native';

// Toast state management (for web)
let toastState = {
  visible: false,
  message: '',
  type: 'error',
  onHide: null,
};

let toastListeners = [];

/**
 * Subscribe to toast state changes
 */
export const subscribeToToast = (callback) => {
  toastListeners.push(callback);
  return () => {
    toastListeners = toastListeners.filter(cb => cb !== callback);
  };
};

/**
 * Update toast state and notify listeners
 */
const updateToast = (visible, message, type, onHide) => {
  toastState = { visible, message, type, onHide };
  toastListeners.forEach(callback => callback(toastState));
};

/**
 * Show a toast/alert message
 * Uses custom Toast component on web, Alert on mobile
 */
export const showToast = (type, title, message, options = {}) => {
  const fullMessage = title ? `${title}\n${message}` : message;
  
  if (Platform.OS === 'web') {
    // Use custom Toast for web
    updateToast(true, fullMessage, type, () => {
      updateToast(false, '', 'error', null);
      if (options.onHide) options.onHide();
    });
  } else {
    // Use Alert for mobile (iOS/Android)
    Alert.alert(title || 'Notification', message, options.buttons || [{ text: 'OK' }]);
  }
};

/**
 * Show success toast
 */
export const showSuccess = (title, message, options) => {
  showToast('success', title, message, options);
};

/**
 * Show error toast
 */
export const showError = (title, message, options) => {
  showToast('error', title, message, options);
};

/**
 * Show info toast
 */
export const showInfo = (title, message, options) => {
  showToast('info', title, message, options);
};

/**
 * Get current toast state (for Toast component)
 */
export const getToastState = () => toastState;

export default {
  showToast,
  showSuccess,
  showError,
  showInfo,
  subscribeToToast,
  getToastState,
};
