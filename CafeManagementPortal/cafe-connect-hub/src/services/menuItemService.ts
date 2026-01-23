/**
 * Menu Item Service
 * Handles all menu item-related API calls
 */

import api from '@/lib/api';

export interface MenuItem {
  _id: string;
  cafe: {
    _id: string;
    name: string;
  };
  name: string;
  description?: string;
  category: string;
  images: string[];
  price: number;
  type: 'short' | 'long';
  timeToCook?: number; // in seconds, required if type is "long"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListMenuItemsResponse {
  success: boolean;
  data: {
    menuItems: MenuItem[];
  };
}

export interface MenuItemResponse {
  success: boolean;
  data: {
    menuItem: MenuItem;
  };
}

export interface CategoriesResponse {
  success: boolean;
  data: {
    categories: string[];
  };
}

export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  category: string;
  images?: string[] | string; // Can be array or single URL
  price: number;
  type: 'short' | 'long';
  timeToCook?: number; // Required if type is "long"
}

export interface UpdateMenuItemRequest extends Partial<CreateMenuItemRequest> {
  isActive?: boolean;
}

export interface ToggleStatusRequest {
  isActive: boolean;
}

/**
 * List menu items with optional filters
 */
export async function listMenuItems(params?: {
  category?: string;
  isActive?: boolean | string;
}): Promise<MenuItem[]> {
  const queryParams = new URLSearchParams();
  
  if (params?.category) {
    queryParams.append('category', params.category);
  }
  
  if (params?.isActive !== undefined) {
    queryParams.append('isActive', params.isActive === true || params.isActive === 'true' ? 'true' : 'false');
  }

  const response = await api.get<ListMenuItemsResponse>(
    `/menu-items${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  );
  
  if (response.data.success) {
    return response.data.data.menuItems;
  }
  
  throw new Error(response.data.message || 'Failed to fetch menu items');
}

/**
 * Get menu item by ID
 */
export async function getMenuItem(id: string): Promise<MenuItem> {
  const response = await api.get<MenuItemResponse>(`/menu-items/${id}`);
  
  if (response.data.success) {
    return response.data.data.menuItem;
  }
  
  throw new Error(response.data.message || 'Failed to fetch menu item');
}

/**
 * Create menu item
 * Supports both JSON (with image URLs) and FormData (with file uploads)
 */
export async function createMenuItem(
  data: CreateMenuItemRequest,
  images?: File[]
): Promise<MenuItem> {
  let payload: any;
  
  // If images are files, use FormData
  if (images && images.length > 0) {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('category', data.category);
    formData.append('price', data.price.toString());
    formData.append('type', data.type);
    
    if (data.description) {
      formData.append('description', data.description);
    }
    
    if (data.type === 'long' && data.timeToCook) {
      formData.append('timeToCook', data.timeToCook.toString());
    }
    
    // Append image files
    images.forEach((file) => {
      formData.append('images', file);
    });
    
    payload = formData;
  } else {
    // Use JSON payload with image URLs
    payload = {
      name: data.name,
      category: data.category,
      price: data.price,
      type: data.type,
      description: data.description || undefined,
      timeToCook: data.type === 'long' ? data.timeToCook : undefined,
      images: data.images 
        ? (Array.isArray(data.images) ? data.images : [data.images])
        : undefined,
    };
  }
  
  const response = await api.post<MenuItemResponse>(
    '/menu-items',
    payload,
    images && images.length > 0
      ? {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      : {}
  );
  
  if (response.data.success) {
    return response.data.data.menuItem;
  }
  
  throw new Error(response.data.message || 'Failed to create menu item');
}

/**
 * Update menu item
 * Supports both JSON (with image URLs) and FormData (with file uploads)
 */
export async function updateMenuItem(
  id: string,
  data: UpdateMenuItemRequest,
  images?: File[]
): Promise<MenuItem> {
  let payload: any;
  
  // If images are files, use FormData
  if (images && images.length > 0) {
    const formData = new FormData();
    
    if (data.name) formData.append('name', data.name);
    if (data.category) formData.append('category', data.category);
    if (data.price !== undefined) formData.append('price', data.price.toString());
    if (data.type) formData.append('type', data.type);
    if (data.description !== undefined) formData.append('description', data.description || '');
    if (data.isActive !== undefined) formData.append('isActive', data.isActive.toString());
    
    if (data.type === 'long' && data.timeToCook) {
      formData.append('timeToCook', data.timeToCook.toString());
    }
    
    // Append image files
    images.forEach((file) => {
      formData.append('images', file);
    });
    
    payload = formData;
  } else {
    // Use JSON payload
    payload = {
      ...data,
      images: data.images
        ? (Array.isArray(data.images) ? data.images : [data.images])
        : undefined,
    };
  }
  
  const response = await api.put<MenuItemResponse>(
    `/menu-items/${id}`,
    payload,
    images && images.length > 0
      ? {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      : {}
  );
  
  if (response.data.success) {
    return response.data.data.menuItem;
  }
  
  throw new Error(response.data.message || 'Failed to update menu item');
}

/**
 * Toggle menu item active status
 */
export async function toggleMenuItemStatus(
  id: string,
  isActive: boolean
): Promise<MenuItem> {
  const response = await api.patch<MenuItemResponse>(
    `/menu-items/${id}/status`,
    { isActive }
  );
  
  if (response.data.success) {
    return response.data.data.menuItem;
  }
  
  throw new Error(response.data.message || 'Failed to update menu item status');
}

/**
 * Delete menu item (soft delete - sets isActive to false)
 */
export async function deleteMenuItem(id: string): Promise<void> {
  const response = await api.delete<{ success: boolean; message: string }>(
    `/menu-items/${id}`
  );
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to delete menu item');
  }
}

/**
 * Get unique categories for the cafe
 */
export async function getCategories(): Promise<string[]> {
  const response = await api.get<CategoriesResponse>('/menu-items/categories');
  
  if (response.data.success) {
    return response.data.data.categories;
  }
  
  throw new Error(response.data.message || 'Failed to fetch categories');
}
