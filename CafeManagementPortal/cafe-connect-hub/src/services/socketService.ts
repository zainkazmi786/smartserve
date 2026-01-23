/**
 * Socket.io Service
 * Handles WebSocket connections for real-time updates
 */

import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '@/lib/tokenStorage';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Initialize socket connection
 */
export function initializeSocket(userId: string, userRole: string, cafeIds: string[]): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket?.id);
    
    // Authenticate and join rooms
    socket?.emit('authenticate', {
      userId,
      userRole,
      cafeIds,
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to kitchen updates
 */
export function subscribeToKitchenUpdates(
  cafeId: string,
  callbacks: {
    onActiveOrderChanged?: (data: { orderId: string | null }) => void;
    onQueueUpdated?: (data: { queueLength: number }) => void;
    onOrderReady?: (data: { orderId: string }) => void;
  }
): () => void {
  if (!socket) {
    console.warn('Socket not initialized');
    return () => {};
  }

  const handleKitchenUpdate = (payload: {
    type: string;
    data: any;
    timestamp: string;
  }) => {
    switch (payload.type) {
      case 'active-order-changed':
        callbacks.onActiveOrderChanged?.(payload.data);
        break;
      case 'queue-updated':
        callbacks.onQueueUpdated?.(payload.data);
        break;
      case 'order-ready':
        callbacks.onOrderReady?.(payload.data);
        break;
    }
  };

  socket.on('kitchen:update', handleKitchenUpdate);

  // Return unsubscribe function
  return () => {
    socket?.off('kitchen:update', handleKitchenUpdate);
  };
}
