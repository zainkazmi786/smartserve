import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useActiveOrder } from '../context/ActiveOrderContext';

/**
 * Floating action button shown when user has an active order and is not on OrderTracker.
 * Tapping navigates to OrderTracker for that order.
 */
export default function OrderTrackerFAB() {
  const navigation = useNavigation();
  const routeName = useNavigationState((state) => {
    const route = state?.routes?.[state.index];
    return route?.name ?? null;
  });
  const { activeOrder } = useActiveOrder();

  const shouldShow = Boolean(activeOrder) && routeName !== 'OrderTracker';

  if (!shouldShow) return null;

  const handlePress = () => {
    navigation.navigate('OrderTracker', { orderId: activeOrder._id });
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.fab}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <Ionicons name="receipt" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    left: 0,
    alignItems: 'flex-end',
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFA500',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
