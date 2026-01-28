import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Storage } from '../utils/storage';

const CART_KEY = '@cart';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [cafeId, setCafeId] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const persist = useCallback(async (nextItems, nextCafeId) => {
    try {
      await AsyncStorage.setItem(CART_KEY, JSON.stringify({
        items: nextItems,
        cafeId: nextCafeId,
      }));
    } catch (e) {
      console.warn('Cart persist failed:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CART_KEY);
        if (raw) {
          const { items: prev, cafeId: prevCafe } = JSON.parse(raw);
          const active = await Storage.getActiveCafeId();
          if (prevCafe && active && prevCafe !== active) {
            await AsyncStorage.removeItem(CART_KEY);
            setItems([]);
            setCafeId(null);
          } else {
            setItems(Array.isArray(prev) ? prev : []);
            setCafeId(prevCafe || null);
          }
        }
      } catch (e) {
        console.warn('Cart hydrate failed:', e);
      }
      setHydrated(true);
    })();
  }, []);

  const addItem = useCallback(async (item) => {
    const id = item._id || item.id;
    const size = item.size || 'Full';
    const portionSize = item.portionSize || (size === 'Half' ? 'half' : 'full');
    const price = item.price;
    const qty = item.quantity || 1;
    const name = item.name;

    let nextCafeId = cafeId;
    if (!nextCafeId) {
      nextCafeId = await Storage.getActiveCafeId() || null;
      setCafeId(nextCafeId);
    }

    setItems((prev) => {
      const key = `${id}-${portionSize}`;
      const idx = prev.findIndex(
        (i) => `${i._id || i.id}-${i.portionSize || (i.size === 'Half' ? 'half' : 'full')}` === key
      );
      let next;
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
      } else {
        next = [
          ...prev,
          {
            _id: id,
            id,
            name,
            price,
            quantity: qty,
            size,
            portionSize,
            type: item.type,
          },
        ];
      }
      persist(next, nextCafeId);
      return next;
    });
  }, [cafeId, persist]);

  const updateQuantity = useCallback((id, size, change) => {
    const portionSize = size === 'Half' ? 'half' : 'full';
    setItems((prev) => {
      const next = prev.map((i) => {
        const pid = i._id || i.id;
        const ps = i.portionSize || (i.size === 'Half' ? 'half' : 'full');
        if (pid === id && ps === portionSize) {
          const q = Math.max(1, (i.quantity || 1) + change);
          return { ...i, quantity: q };
        }
        return i;
      });
      persist(next, cafeId);
      return next;
    });
  }, [cafeId, persist]);

  const removeItem = useCallback((id, size) => {
    const portionSize = size === 'Half' ? 'half' : 'full';
    setItems((prev) => {
      const next = prev.filter((i) => {
        const pid = i._id || i.id;
        const ps = i.portionSize || (i.size === 'Half' ? 'half' : 'full');
        return !(pid === id && ps === portionSize);
      });
      persist(next, cafeId);
      return next;
    });
  }, [cafeId, persist]);

  const clear = useCallback(() => {
    setItems([]);
    persist([], cafeId);
  }, [cafeId, persist]);

  const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

  const value = {
    items,
    cafeId,
    total,
    hydrated,
    addItem,
    updateQuantity,
    removeItem,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error('useCart must be used within CartProvider');
  return c;
}
