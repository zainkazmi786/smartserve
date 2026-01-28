import React, { createContext, useContext, useState, useCallback } from 'react';
import { getMyActiveOrder } from '../services/apiService';

const ActiveOrderContext = createContext(null);

export function ActiveOrderProvider({ children }) {
  const [activeOrder, setActiveOrderState] = useState(null);

  const fetchActiveOrder = useCallback(async () => {
    try {
      const data = await getMyActiveOrder();
      setActiveOrderState(data?.order || null);
      return data?.order ?? null;
    } catch (e) {
      setActiveOrderState(null);
      return null;
    }
  }, []);

  const setActiveOrder = useCallback((order) => {
    setActiveOrderState(order || null);
  }, []);

  const clearActiveOrder = useCallback(() => {
    setActiveOrderState(null);
  }, []);

  const value = {
    activeOrder,
    fetchActiveOrder,
    setActiveOrder,
    clearActiveOrder,
  };

  return (
    <ActiveOrderContext.Provider value={value}>
      {children}
    </ActiveOrderContext.Provider>
  );
}

export function useActiveOrder() {
  const c = useContext(ActiveOrderContext);
  if (!c) throw new Error('useActiveOrder must be used within ActiveOrderProvider');
  return c;
}
