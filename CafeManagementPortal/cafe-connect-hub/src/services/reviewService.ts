/**
 * Review Service
 * Handles all review-related API calls
 */

import api from '@/lib/api';

export interface ManagerReply {
  message: string;
  repliedAt: string;
}

export interface Review {
  _id: string;
  cafe: {
    _id: string;
    name: string;
  };
  user: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  item?: {
    _id: string;
    name: string;
    image?: string[];
    description?: string;
  };
  order?: {
    _id: string;
    orderNumber?: string;
    status?: string;
  };
  rating: number; // 1-5
  comment?: string;
  managerReply?: ManagerReply;
  createdAt: string;
  updatedAt: string;
}

export interface ListReviewsParams {
  item?: string;
  order?: string;
  rating?: number;
  user?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ListReviewsResponse {
  success: boolean;
  data: {
    reviews: Review[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface ReviewResponse {
  success: boolean;
  data: {
    review: Review;
  };
}

export interface ReplyToReviewRequest {
  message: string;
}

export interface CreateReviewRequest {
  item?: string;
  order?: string;
  rating: number; // 1-5
  comment?: string;
}

/**
 * Create a new review
 */
export async function createReview(data: CreateReviewRequest): Promise<Review> {
  const response = await api.post<ReviewResponse>('/reviews', data);
  
  if (response.data.success) {
    return response.data.data.review;
  }
  
  throw new Error(response.data.message || 'Failed to create review');
}

/**
 * List reviews with optional filters
 */
export async function listReviews(params?: ListReviewsParams): Promise<ListReviewsResponse['data']> {
  const response = await api.get<ListReviewsResponse>('/reviews', { params });
  
  if (response.data.success) {
    return response.data.data;
  }
  
  throw new Error(response.data.message || 'Failed to fetch reviews');
}

/**
 * Get single review by ID
 */
export async function getReview(id: string): Promise<Review> {
  const response = await api.get<ReviewResponse>(`/reviews/${id}`);
  
  if (response.data.success) {
    return response.data.data.review;
  }
  
  throw new Error(response.data.message || 'Failed to fetch review');
}

/**
 * Reply to a review
 */
export async function replyToReview(id: string, data: ReplyToReviewRequest): Promise<Review> {
  const response = await api.put<ReviewResponse>(`/reviews/${id}/reply`, data);
  
  if (response.data.success) {
    return response.data.data.review;
  }
  
  throw new Error(response.data.message || 'Failed to reply to review');
}

/**
 * Update review (Manager only)
 */
export async function updateReview(id: string, data: { comment?: string }): Promise<Review> {
  const response = await api.put<ReviewResponse>(`/reviews/${id}`, data);
  
  if (response.data.success) {
    return response.data.data.review;
  }
  
  throw new Error(response.data.message || 'Failed to update review');
}

/**
 * Delete review (Manager only)
 */
export async function deleteReview(id: string): Promise<void> {
  const response = await api.delete<{ success: boolean; message: string }>(`/reviews/${id}`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to delete review');
  }
}
