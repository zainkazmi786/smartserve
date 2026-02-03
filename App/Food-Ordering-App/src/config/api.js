// API Configuration
// For Expo, use EXPO_PUBLIC_ prefix for environment variables
// These are available at build time and work on all platforms (web, iOS, Android)

// Get base URL from environment variable or use default
const getBaseUrl = () => {
  // Priority order:
  // 1. EXPO_PUBLIC_API_BASE_URL (from .env file - works on all platforms)
  // 2. Default fallback
  const baseUrl = 
    process.env.EXPO_PUBLIC_API_BASE_URL || 
    'http://localhost:3000'; // Default fallback
  
  return baseUrl.replace(/\/$/, ''); // Remove trailing slash
};

export const API_BASE_URL = getBaseUrl();

export const API_ENDPOINTS = {
  CAFES: '/api/cafes',
  REGISTER: '/api/users/register',
  LOGIN: '/api/users/login',
  PROFILE: '/api/users/profile',
  CHANGE_PASSWORD: '/api/users/profile/password',
  UPLOAD_PICTURE: '/api/users/profile/picture',
  MENUS_TODAY: '/api/menus/today',
  ORDERS: '/api/orders',
  ORDERS_ME_ACTIVE: '/api/orders/me/active',
  PROFILE_PUSH_TOKEN: '/api/users/profile/push-token',
  REVIEWS: '/api/reviews',
};
