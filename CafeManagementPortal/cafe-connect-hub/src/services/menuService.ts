/**
 * Menu Service
 * Handles all menu-related API calls
 */

import api from '@/lib/api';

export interface TimeSlot {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  priority?: number; // Default: 1
}

export interface Menu {
  _id: string;
  cafe: {
    _id: string;
    name: string;
  };
  name: string;
  items: Array<{
    _id: string;
    name: string;
    price: number;
    category: string;
    images?: string[];
    isActive?: boolean;
  }>;
  status: 'active' | 'inactive' | 'scheduled' | 'deleted';
  timeSlots: TimeSlot[];
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ListMenusResponse {
  success: boolean;
  data: {
    menus: Menu[];
  };
}

export interface MenuResponse {
  success: boolean;
  data: {
    menu: Menu;
  };
}

export interface TimeSlotsResponse {
  success: boolean;
  data: {
    timeSlots: TimeSlot[];
  };
}

export interface CreateMenuRequest {
  name: string;
  items?: string[]; // Array of MenuItem IDs
}

export interface UpdateMenuRequest {
  name?: string;
  items?: string[];
}

export interface SetTimeSlotsRequest {
  timeSlots: TimeSlot[];
}

export interface AddItemsRequest {
  itemIds: string[];
}

export interface RemoveItemsRequest {
  itemIds: string[];
}

/**
 * List all menus for the cafe
 */
export async function listMenus(): Promise<Menu[]> {
  const response = await api.get<ListMenusResponse>('/menus');
  
  if (response.data.success) {
    return response.data.data.menus;
  }
  
  throw new Error(response.data.message || 'Failed to fetch menus');
}

/**
 * Get menu by ID
 */
export async function getMenu(id: string): Promise<Menu> {
  const response = await api.get<MenuResponse>(`/menus/${id}`);
  
  if (response.data.success) {
    return response.data.data.menu;
  }
  
  throw new Error(response.data.message || 'Failed to fetch menu');
}

/**
 * Create a new menu
 */
export async function createMenu(data: CreateMenuRequest): Promise<Menu> {
  const response = await api.post<MenuResponse>('/menus', data);
  
  if (response.data.success) {
    return response.data.data.menu;
  }
  
  throw new Error(response.data.message || 'Failed to create menu');
}

/**
 * Update menu (only inactive menus can be updated)
 */
export async function updateMenu(id: string, data: UpdateMenuRequest): Promise<Menu> {
  const response = await api.put<MenuResponse>(`/menus/${id}`, data);
  
  if (response.data.success) {
    return response.data.data.menu;
  }
  
  throw new Error(response.data.message || 'Failed to update menu');
}

/**
 * Activate menu manually
 */
export async function activateMenu(id: string): Promise<Menu> {
  const response = await api.post<MenuResponse>(`/menus/${id}/activate`);
  
  if (response.data.success) {
    return response.data.data.menu;
  }
  
  throw new Error(response.data.message || 'Failed to activate menu');
}

/**
 * Deactivate menu
 */
export async function deactivateMenu(id: string): Promise<Menu> {
  const response = await api.post<MenuResponse>(`/menus/${id}/deactivate`);
  
  if (response.data.success) {
    return response.data.data.menu;
  }
  
  throw new Error(response.data.message || 'Failed to deactivate menu');
}

/**
 * Add items to menu
 */
export async function addItemsToMenu(id: string, data: AddItemsRequest): Promise<Menu> {
  const response = await api.post<MenuResponse>(`/menus/${id}/items`, data);
  
  if (response.data.success) {
    return response.data.data.menu;
  }
  
  throw new Error(response.data.message || 'Failed to add items to menu');
}

/**
 * Remove items from menu
 */
export async function removeItemsFromMenu(id: string, data: RemoveItemsRequest): Promise<Menu> {
  const response = await api.delete<MenuResponse>(`/menus/${id}/items`, {
    data,
  });
  
  if (response.data.success) {
    return response.data.data.menu;
  }
  
  throw new Error(response.data.message || 'Failed to remove items from menu');
}

/**
 * Delete menu (soft delete)
 */
export async function deleteMenu(id: string): Promise<void> {
  const response = await api.delete<{ success: boolean; message: string }>(`/menus/${id}`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to delete menu');
  }
}

/**
 * Set time slots for menu
 */
export async function setTimeSlots(id: string, data: SetTimeSlotsRequest): Promise<Menu> {
  const response = await api.put<MenuResponse>(`/menus/${id}/time-slots`, data);
  
  if (response.data.success) {
    return response.data.data.menu;
  }
  
  throw new Error(response.data.message || 'Failed to set time slots');
}

/**
 * Get time slots for menu
 */
export async function getTimeSlots(id: string): Promise<TimeSlot[]> {
  const response = await api.get<TimeSlotsResponse>(`/menus/${id}/time-slots`);
  
  if (response.data.success) {
    return response.data.data.timeSlots;
  }
  
  throw new Error(response.data.message || 'Failed to fetch time slots');
}

/**
 * Remove time slots from menu
 */
export async function removeTimeSlots(id: string): Promise<Menu> {
  const response = await api.delete<MenuResponse>(`/menus/${id}/time-slots`);
  
  if (response.data.success) {
    return response.data.data.menu;
  }
  
  throw new Error(response.data.message || 'Failed to remove time slots');
}
