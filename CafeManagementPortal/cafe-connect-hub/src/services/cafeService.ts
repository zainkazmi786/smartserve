/**
 * Cafe Service
 * Handles all cafe-related API calls
 */

import api from '@/lib/api';

export interface Cafe {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  linkedManager?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  settings: {
    taxPercentage: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CafeDetailsResponse {
  success: boolean;
  data: {
    cafe: Cafe;
    isActive?: boolean;
  };
}

export interface UpdateCafeRequest {
  name?: string;
  email?: string;
  phone?: string;
  taxPercentage?: number;
}

export interface UpdateCafeResponse {
  success: boolean;
  message: string;
  data: {
    cafe: Cafe;
  };
}

/**
 * Get cafe details by ID
 */
export async function getCafeDetails(cafeId: string): Promise<Cafe> {
  const response = await api.get<CafeDetailsResponse>(`/cafes/${cafeId}`);
  
  if (response.data.success) {
    return response.data.data.cafe;
  }
  
  throw new Error(response.data.message || 'Failed to fetch cafe details');
}

/**
 * Update cafe details
 */
export async function updateCafe(
  cafeId: string,
  data: UpdateCafeRequest
): Promise<Cafe> {
  const response = await api.put<UpdateCafeResponse>(`/cafes/${cafeId}`, data);
  
  if (response.data.success) {
    return response.data.data.cafe;
  }
  
  throw new Error(response.data.message || 'Failed to update cafe');
}
