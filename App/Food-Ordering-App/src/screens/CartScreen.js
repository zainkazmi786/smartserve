import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useCart } from '../context/CartContext';
import { useActiveOrder } from '../context/ActiveOrderContext';

export default function CartScreen({ navigation }) {
  const { items: cartItems, total, updateQuantity, removeItem } = useCart();
  const { activeOrder } = useActiveOrder();
  const hasActiveOrder = !!activeOrder;

  const renderItem = ({ item }) => {
    const id = item._id || item.id;
    const size = item.size || 'Full';
    return (
      <View style={styles.cartCard}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>
            {size} • Rs {item.price}
          </Text>

          <View style={styles.quantitySelector}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQuantity(id, size, -1)}
              activeOpacity={0.6}
            >
              <Ionicons name="remove" size={18} color="#2D2926" />
            </TouchableOpacity>

            <Text style={styles.qtyText}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQuantity(id, size, 1)}
              activeOpacity={0.6}
            >
              <Ionicons name="add" size={18} color="#2D2926" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => removeItem(id, size)}
          activeOpacity={0.7}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={22} color="#FF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#2D2926" />
        </TouchableOpacity>
        <Text style={styles.title}>Your Cart</Text>
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={(item, index) => `${item._id || item.id}-${item.size || 'Full'}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          cartItems.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Ionicons name="cart-outline" size={60} color="#E5D3B3" />
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          </View>
        }
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      />

      {cartItems.length > 0 && (
        <View style={styles.footer}>
          {hasActiveOrder && (
            <Text style={styles.blockMessage}>
              Complete or cancel your current order before placing a new one.
            </Text>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>Rs {total}</Text>
          </View>
          <Text style={styles.taxNote}>Tax may be applied at confirmation.</Text>

          <TouchableOpacity
            style={[styles.checkoutBtn, hasActiveOrder && styles.checkoutBtnDisabled]}
            onPress={() => !hasActiveOrder && navigation.navigate('Checkout')}
            disabled={hasActiveOrder}
            activeOpacity={0.85}
          >
            <Text style={styles.checkoutBtnText}>
              {hasActiveOrder ? 'Complete current order first' : 'Proceed to Checkout'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    width: '100%',
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    color: '#2D2926',
    marginLeft: 15,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    color: '#A67B5B',
    fontSize: 16,
    marginTop: 10,
  },
  cartCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#2D2926',
  },
  itemMeta: {
    color: '#6F4E37',
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
    fontSize: 13,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#F8F1E7',
    alignSelf: 'flex-start',
    borderRadius: 10,
    padding: 4,
  },
  qtyBtn: {
    padding: 4,
    backgroundColor: '#fff',
    borderRadius: 6,
    elevation: 1,
  },
  qtyText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
    marginHorizontal: 15,
    color: '#2D2926',
    minWidth: 20,
    textAlign: 'center',
  },
  deleteBtn: {
    padding: 8,
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 25,
    paddingVertical: 25,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  blockMessage: {
    fontSize: 13,
    color: '#C62828',
    marginBottom: 10,
    fontFamily: 'Poppins-Regular',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center',
  },
  taxNote: {
    fontSize: 12,
    color: '#6F4E37',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: '#6F4E37',
    fontFamily: 'Poppins-Regular',
  },
  totalValue: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#2D2926',
  },
  checkoutBtn: {
    backgroundColor: '#2D2926',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  checkoutBtnDisabled: {
    backgroundColor: '#9E9E9E',
    opacity: 0.8,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
});