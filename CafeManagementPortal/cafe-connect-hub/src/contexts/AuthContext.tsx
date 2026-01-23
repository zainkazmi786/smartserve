import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as loginService, logout as logoutService, getProfile, User, LoginRequest } from '@/services/authService';
import { tokenStorage } from '@/lib/tokenStorage';

export type UserRole = 'superadmin' | 'manager' | 'receptionist' | 'customer';

export interface AuthUser extends User {
  // User type already includes role, cafes, etc.
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  activeCafeId: string | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load user from token on app initialization
   * Validates that user has manager or receptionist role
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = tokenStorage.getToken();
      
      if (token) {
        try {
          // Verify token validity by fetching profile
          const userData = await getProfile();
          
          // Validate role - only manager and receptionist can access this portal
          const userRole = userData?.role?.name;
          if (userRole !== 'manager' && userRole !== 'receptionist') {
            // Clear token if invalid role
            console.warn(`User role (${userRole}) not authorized for this portal`);
            tokenStorage.clear();
            setUser(null);
          } else {
            setUser(userData);
          }
        } catch (error) {
          // Token is invalid or expired
          console.error('Failed to verify token:', error);
          tokenStorage.clear();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Login user and store authentication data
   * Validates that user has manager or receptionist role
   */
  const login = async (credentials: LoginRequest) => {
    try {
      const loginData = await loginService(credentials);
      
      // Validate role - only manager and receptionist can access this portal
      const userRole = loginData.user?.role?.name;
      if (userRole !== 'manager' && userRole !== 'receptionist') {
        // Clear token if invalid role
        tokenStorage.clear();
        
        throw new Error(
          'Access denied. This portal is only for managers and receptionists. ' +
          `Your role (${userRole}) is not authorized to access this portal.`
        );
      }
      
      // Set user state
      setUser(loginData.user);
      
      // Redirect will be handled by the component using this function
    } catch (error: any) {
      // Re-throw error so login component can handle it
      throw error;
    }
  };

  /**
   * Logout user and clear authentication data
   * Note: Navigation is handled by the component calling logout
   */
  const logout = () => {
    logoutService();
    setUser(null);
  };

  /**
   * Refresh user data from API
   */
  const refreshUser = async () => {
    try {
      const userData = await getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // If token is invalid, logout
      logout();
    }
  };

  const activeCafeId = tokenStorage.getActiveCafeId();

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        activeCafeId,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
