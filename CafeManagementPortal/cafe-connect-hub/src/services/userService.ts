/**
 * User Service
 * Handles all user-related API calls
 */

import api from '@/lib/api';

export interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: {
    _id: string;
    name: 'superadmin' | 'manager' | 'receptionist' | 'customer';
    description?: string;
  };
  cafes: Array<{
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  }>;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersResponse {
  success: boolean;
  data: {
    users: User[];
  };
}

export interface UserResponse {
  success: boolean;
  data: {
    user: User;
    tempPassword?: string;
  };
}

export interface CreateUserRequest {
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  roleName: 'manager' | 'receptionist' | 'customer';
  cafes?: string[]; // Array of cafe IDs
}

export interface UpdateUserRoleRequest {
  roleName: 'superadmin' | 'manager' | 'receptionist' | 'customer';
}

export interface UpdateUserStatusRequest {
  status: 'active' | 'inactive';
}

/**
 * List all users (filtered by role and cafe for managers)
 */
export async function listUsers(params?: { role?: string; cafe?: string }): Promise<User[]> {
  const queryParams = new URLSearchParams();
  if (params?.role) queryParams.append('role', params.role);
  if (params?.cafe) queryParams.append('cafe', params.cafe);

  const queryString = queryParams.toString();
  const url = `/users${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get<ListUsersResponse>(url);
  
  if (response.data.success) {
    return response.data.data.users;
  }
  
  throw new Error(response.data.message || 'Failed to fetch users');
}

/**
 * Create a new user
 */
export async function createUser(data: CreateUserRequest): Promise<{ user: User; tempPassword?: string }> {
  const response = await api.post<UserResponse>('/users', data);
  
  if (response.data.success) {
    return {
      user: response.data.data.user,
      tempPassword: response.data.data.tempPassword,
    };
  }
  
  throw new Error(response.data.message || 'Failed to create user');
}

/**
 * Update user role (Super Admin only)
 */
export async function updateUserRole(userId: string, roleName: string): Promise<User> {
  const response = await api.put<UserResponse>(`/users/${userId}/role`, { roleName });
  
  if (response.data.success) {
    return response.data.data.user;
  }
  
  throw new Error(response.data.message || 'Failed to update user role');
}

/**
 * Update user status (activate/deactivate)
 */
export async function updateUserStatus(userId: string, status: 'active' | 'inactive'): Promise<User> {
  const response = await api.patch<UserResponse>(`/users/${userId}/status`, { status });
  
  if (response.data.success) {
    return response.data.data.user;
  }
  
  throw new Error(response.data.message || 'Failed to update user status');
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<void> {
  const response = await api.delete(`/users/${userId}`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to delete user');
  }
}

/**
 * Remove user from cafe
 */
export async function removeUserFromCafe(userId: string, cafeId: string): Promise<User> {
  const response = await api.delete<UserResponse>(`/users/${userId}/cafe/${cafeId}`);
  
  if (response.data.success) {
    return response.data.data.user;
  }
  
  throw new Error(response.data.message || 'Failed to remove user from cafe');
}
