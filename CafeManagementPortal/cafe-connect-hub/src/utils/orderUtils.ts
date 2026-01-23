/**
 * Order utility functions
 * Maps backend order statuses to frontend display
 */

import { Order as BackendOrder } from '@/services/orderService';

/**
 * Map backend status to frontend display status
 */
export function mapBackendStatusToDisplay(
  status: BackendOrder['status']
): 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'disapproved' {
  const statusMap: Record<BackendOrder['status'], 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'disapproved'> = {
    draft: 'pending',
    payment_uploaded: 'pending',
    cash_selected: 'pending',
    disapproved: 'disapproved',
    approved: 'pending', // Approved but not yet preparing
    preparing: 'preparing',
    ready: 'ready',
    received: 'completed',
    cancelled: 'cancelled',
  };

  return statusMap[status] || 'pending';
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: BackendOrder['status']): string {
  const labelMap: Record<BackendOrder['status'], string> = {
    draft: 'Draft',
    payment_uploaded: 'Payment Uploaded',
    cash_selected: 'Cash Selected',
    disapproved: 'Disapproved',
    approved: 'Approved',
    preparing: 'Preparing',
    ready: 'Ready',
    received: 'Received',
    cancelled: 'Cancelled',
  };

  return labelMap[status] || status;
}

/**
 * Check if order can be approved
 */
export function canApproveOrder(order: BackendOrder): boolean {
  return ['payment_uploaded', 'cash_selected'].includes(order.status);
}

/**
 * Check if order can be disapproved
 */
export function canDisapproveOrder(order: BackendOrder): boolean {
  return ['payment_uploaded', 'cash_selected'].includes(order.status);
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(order: BackendOrder): boolean {
  return !['received', 'cancelled'].includes(order.status);
}

/**
 * Check if order can be marked ready
 */
export function canMarkReady(order: BackendOrder): boolean {
  return order.status === 'preparing';
}

/**
 * Format order number from order ID
 */
export function formatOrderNumber(orderId: string): string {
  // Use last 6 characters of ID for display
  return `ORD-${orderId.slice(-6).toUpperCase()}`;
}
