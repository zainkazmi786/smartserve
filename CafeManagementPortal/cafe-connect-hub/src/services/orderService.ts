/**
 * Order Service
 * Handles all order-related API calls for manager and receptionist
 */

import api from '@/lib/api';

export interface OrderItem {
  _id: string;
  item: {
    _id: string;
    name: string;
    price: number;
    type?: 'short' | 'long';
    description?: string;
    images?: string[];
    timeToCook?: number;
  };
  quantity: number;
  cookingOverrideType?: 'short' | 'long';
}

export interface OrderPayment {
  method: 'receipt' | 'cash';
  receiptImage?: string;
  paidAmount?: number;
  rejectionNote?: string;
}

export interface OrderPricing {
  subtotal: number;
  tax: number;
  total: number;
}

export interface AuditLog {
  _id: string;
  previousState: string;
  newState: string;
  changedBy: {
    _id: string;
    name: string;
  };
  role: string;
  note?: string;
  timestamp: string;
}

export interface Order {
  _id: string;
  orderNumber?: string;
  cafe: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
  };
  status:
    | 'draft'
    | 'payment_uploaded'
    | 'cash_selected'
    | 'disapproved'
    | 'approved'
    | 'preparing'
    | 'ready'
    | 'received'
    | 'cancelled';
  items: OrderItem[];
  payment: OrderPayment;
  pricing: OrderPricing;
  auditLogs: AuditLog[];
  queuePosition?: number;
  displayedAt?: string;
  hasLongItems?: boolean;
  timeoutAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListOrdersResponse {
  success: boolean;
  data: {
    orders: Order[];
    count: number;
  };
}

export interface OrderResponse {
  success: boolean;
  data: {
    order: Order;
  };
}

export interface ApproveOrderRequest {
  paidAmount?: number;
  cookingOverrides?: Array<{
    orderItemId: string;
    type: 'short' | 'long';
  }>;
}

export interface DisapproveOrderRequest {
  rejectionNote: string;
}

export interface CancelOrderRequest {
  cancellationNote?: string;
}

/**
 * Get order history with filters
 * For Manager: all orders for their cafe
 * For Receptionist: today's orders for their cafe
 */
export async function listOrders(params?: {
  status?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: 'receipt' | 'cash';
  customerId?: string;
}): Promise<Order[]> {
  const queryParams = new URLSearchParams();

  if (params?.status) {
    queryParams.append('status', params.status);
  }
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate);
  }
  if (params?.paymentMethod) {
    queryParams.append('paymentMethod', params.paymentMethod);
  }
  if (params?.customerId) {
    queryParams.append('customerId', params.customerId);
  }

  const response = await api.get<ListOrdersResponse>(
    `/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  );

  if (response.data.success) {
    return response.data.data.orders;
  }

  throw new Error(response.data.message || 'Failed to fetch orders');
}

/**
 * Get order by ID
 */
export async function getOrder(id: string): Promise<Order> {
  const response = await api.get<OrderResponse>(`/orders/${id}`);

  if (response.data.success) {
    return response.data.data.order;
  }

  throw new Error(response.data.message || 'Failed to fetch order');
}

/**
 * Approve order (Manager, Receptionist)
 */
export async function approveOrder(id: string, data?: ApproveOrderRequest): Promise<Order> {
  const response = await api.post<OrderResponse>(`/orders/${id}/approve`, data || {});

  if (response.data.success) {
    return response.data.data.order;
  }

  throw new Error(response.data.message || 'Failed to approve order');
}

/**
 * Disapprove order (Manager, Receptionist)
 */
export async function disapproveOrder(id: string, data: DisapproveOrderRequest): Promise<Order> {
  const response = await api.post<OrderResponse>(`/orders/${id}/disapprove`, data);

  if (response.data.success) {
    return response.data.data.order;
  }

  throw new Error(response.data.message || 'Failed to disapprove order');
}

/**
 * Cancel order (Manager, Receptionist can cancel anytime)
 */
export async function cancelOrder(id: string, data?: CancelOrderRequest): Promise<Order> {
  const response = await api.post<OrderResponse>(`/orders/${id}/cancel`, data || {});

  if (response.data.success) {
    return response.data.data.order;
  }

  throw new Error(response.data.message || 'Failed to cancel order');
}

/**
 * Mark order as ready (for kitchen)
 */
export async function markOrderReady(id: string): Promise<Order> {
  const response = await api.post<OrderResponse>(`/orders/${id}/mark-ready`);

  if (response.data.success) {
    return response.data.data.order;
  }

  throw new Error(response.data.message || 'Failed to mark order ready');
}

/**
 * Get active kitchen order (currently displayed)
 */
export async function getActiveKitchenOrder(): Promise<Order | null> {
  const response = await api.get<OrderResponse>('/orders/kitchen/active');

  if (response.data.success) {
    return response.data.data.order || null;
  }

  throw new Error(response.data.message || 'Failed to get active kitchen order');
}

/**
 * Get kitchen queue list
 */
export async function getKitchenQueue(): Promise<Order[]> {
  const response = await api.get<ListOrdersResponse>('/orders/kitchen/queue');

  if (response.data.success) {
    return response.data.data.queue || [];
  }

  throw new Error(response.data.message || 'Failed to get kitchen queue');
}

/**
 * Get next kitchen order
 */
export async function getNextKitchenOrder(): Promise<Order | null> {
  const response = await api.get<OrderResponse>('/orders/kitchen/next');

  if (response.data.success) {
    return response.data.data.order || null;
  }

  throw new Error(response.data.message || 'Failed to get next kitchen order');
}
