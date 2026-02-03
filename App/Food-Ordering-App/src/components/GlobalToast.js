import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { subscribeToToast } from '../utils/toast';

const TOAST_DURATION_MS = 4000;

/**
 * Renders toast notifications for showError/showSuccess/showInfo on web.
 * On native, those use Alert.alert, so this renders nothing.
 */
export default function GlobalToast() {
  if (Platform.OS !== 'web') return null;

  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const onHideRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToToast((state) => {
      if (state.visible) {
        onHideRef.current = state.onHide;
        setToast({ visible: true, message: state.message, type: state.type || 'error' });
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
        ]).start();

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(hideToast, TOAST_DURATION_MS);
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        onHideRef.current = null;
        setToast({ visible: false, message: '', type: 'error' });
      }
    });
    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const hideToast = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setToast((t) => ({ ...t, visible: false }));
      if (onHideRef.current) {
        const fn = onHideRef.current;
        onHideRef.current = null;
        fn();
      }
    });
  };

  if (!toast.visible) return null;

  const bg = toast.type === 'success' ? '#4CAF50' : toast.type === 'info' ? '#2196F3' : '#FF4444';

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.toast, { backgroundColor: bg }]}>
        <Text style={styles.message}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});
