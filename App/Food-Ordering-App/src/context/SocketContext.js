import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import { Storage } from '../utils/storage';
import { Platform } from 'react-native';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const orderStatusListenersRef = useRef(new Set());

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket.removeAllListeners();
      setSocket(null);
      setIsConnected(false);
    }
    orderStatusListenersRef.current.clear();
  }, [socket]);

  const connect = useCallback(async (token, user) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    if (!token || !user?._id) return;

    disconnect();

    const userId = user._id.toString?.() || user._id;
    const userRole = user.role?.name || (typeof user.role === 'string' ? user.role : null);
    const cafeIds = Array.isArray(user.cafes)
      ? user.cafes.map((c) => (c._id?.toString?.() || c.toString?.() || c))
      : [];

    const socketInstance = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      socketInstance.emit('authenticate', {
        userId,
        userRole,
        cafeIds,
      });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('order:status-changed', (payload) => {
      const orderId = payload?.orderId;
      const message = payload?.message;
      orderStatusListenersRef.current.forEach((fn) => {
        try {
          fn({ orderId, message, ...payload });
        } catch (e) {
          console.warn('Order status listener error:', e);
        }
      });
    });

    setSocket(socketInstance);
  }, [disconnect]);

  const addOrderStatusListener = useCallback((callback) => {
    orderStatusListenersRef.current.add(callback);
    return () => orderStatusListenersRef.current.delete(callback);
  }, []);

  const value = {
    socket,
    isConnected,
    connect,
    disconnect,
    addOrderStatusListener,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

/**
 * Call connect when app has token + user in storage (e.g. returning user).
 * Mount once inside SocketProvider.
 */
export function SocketConnector() {
  const { connect } = useSocket();
  const didConnect = useRef(false);

  React.useEffect(() => {
    if (didConnect.current) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await Storage.getToken();
        const user = await Storage.getUserData();
        if (!cancelled && token && user) {
          didConnect.current = true;
          connect(token, user);
        }
      } catch (e) {
        console.warn('SocketConnector:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [connect]);

  return null;
}
