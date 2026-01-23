/**
 * Token Storage Utilities
 * Manages JWT tokens and active cafe ID in localStorage
 */

const TOKEN_KEY = 'smart_cafe_token';
const ACTIVE_CAFE_ID_KEY = 'smart_cafe_active_cafe_id';

export const tokenStorage = {
  /**
   * Get stored authentication token
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error reading token from localStorage:', error);
      return null;
    }
  },

  /**
   * Store authentication token
   */
  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token to localStorage:', error);
    }
  },

  /**
   * Remove authentication token
   */
  removeToken(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token from localStorage:', error);
    }
  },

  /**
   * Get stored active cafe ID
   */
  getActiveCafeId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_CAFE_ID_KEY);
    } catch (error) {
      console.error('Error reading active cafe ID from localStorage:', error);
      return null;
    }
  },

  /**
   * Store active cafe ID
   */
  setActiveCafeId(cafeId: string): void {
    try {
      localStorage.setItem(ACTIVE_CAFE_ID_KEY, cafeId);
    } catch (error) {
      console.error('Error saving active cafe ID to localStorage:', error);
    }
  },

  /**
   * Remove active cafe ID
   */
  removeActiveCafeId(): void {
    try {
      localStorage.removeItem(ACTIVE_CAFE_ID_KEY);
    } catch (error) {
      console.error('Error removing active cafe ID from localStorage:', error);
    }
  },

  /**
   * Clear all authentication data
   */
  clear(): void {
    this.removeToken();
    this.removeActiveCafeId();
  },
};
