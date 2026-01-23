/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import api from '@/lib/api';
import { tokenStorage } from '@/lib/tokenStorage';

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    activeCafeId: string;
  };
}

export interface Permission {
  resource: string;
  actions: string[];
}

export interface Role {
  _id: string;
  name: string;
  permissions: Permission[]; // Required - fetched from backend
  description?: string;
  isActive?: boolean;
}

export interface Cafe {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  cafes: Cafe[];
  status: 'active' | 'inactive';
}

export interface ProfileResponse {
  success: boolean;
  data: {
    user: User;
  };
}

/**
 * Login user with email/phone and password
 * Stores token and active cafe ID in localStorage on success
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse['data']> {
  const response = await api.post<LoginResponse>('/users/login', credentials);
  
  if (response.data.success) {
    const { token, activeCafeId, user } = response.data.data;
    
    // Store token and active cafe ID
    tokenStorage.setToken(token);
    if (activeCafeId) {
      tokenStorage.setActiveCafeId(activeCafeId);
    }
    
    return response.data.data;
  }
  
  throw new Error(response.data.message || 'Login failed');
}

/**
 * Logout user (client-side only)
 * Clears token and active cafe ID from localStorage
 */
export function logout(): void {
  tokenStorage.clear();
}

/**
 * Get current user profile
 * Used to verify token validity and get updated user data
 */
export async function getProfile(): Promise<User> {
  const response = await api.get<ProfileResponse>('/users/profile');
  
  if (response.data.success) {
    return response.data.data.user;
  }
  
  throw new Error(response.data.message || 'Failed to fetch profile');
}
