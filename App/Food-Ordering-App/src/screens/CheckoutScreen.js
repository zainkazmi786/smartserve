import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ScreenWrapper from '../components/ScreenWrapper';
import { useCart } from '../context/CartContext';
import { useActiveOrder } from '../context/ActiveOrderContext';
import { createOrder } from '../services/apiService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const MAX_WIDTH = isWeb ? Math.min(SCREEN_WIDTH, 520) : SCREEN_WIDTH;

export default function CheckoutScreen({ navigation }) {
  const { items: cartItems, total, clear } = useCart();
  const { activeOrder, setActiveOrder } = useActiveOrder();
  const [payMethod, setPayMethod] = useState('Cash');
  const [proof, setProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const bankDetails = {
    bankName: 'Meezan Bank Ltd',
    accountTitle: 'Aasim Bilal Khan',
    accountNumber: '0235-010567891',
    branch: 'Peshawar City',
  };

  const hasActiveOrder = !!activeOrder;

  const pickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert(
        'Permission denied',
        'Photo access is required to upload receipt.'
      );
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setProof(result.assets[0].uri);
    }
  };

  const handleConfirm = async () => {
    if (hasActiveOrder) return;
    if (payMethod === 'Bank' && !proof) {
      return Alert.alert(
        'Proof required',
        'Please upload bank transfer receipt.'
      );
    }

    const apiItems = cartItems.map((i) => ({
      itemId: i._id || i.id,
      quantity: i.quantity || 1,
      portionSize: i.portionSize || (i.size === 'Half' ? 'half' : 'full'),
      ...(i.type === 'short' || i.type === 'long' ? { cookingOverrideType: i.type } : {}),
    }));

    const paymentMethod = payMethod === 'Bank' ? 'receipt' : 'cash';
    setSubmitting(true);
    try {
      const payload = {
        items: apiItems,
        paymentMethod,
      };
      if (paymentMethod === 'receipt') payload.receiptUri = proof;
      const data = await createOrder(payload);
      clear();
      setActiveOrder(data?.order || null);
      navigation.reset({
        index: 0,
        routes: [{ name: 'OrderTracker', params: { orderId: data.order._id, order: data.order } }],
      });
    } catch (err) {
      Alert.alert('Order failed', err.message || 'Could not place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.wrapper}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={isWeb}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons
                name="arrow-back"
                size={26}
                color="#2D2926"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Checkout</Text>
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Bill Summary</Text>

            <View style={styles.row}>
              <Text style={styles.label}>
                Items ({cartItems.length})
              </Text>
              <Text style={styles.val}>Rs {total}</Text>
            </View>

            <Text style={styles.taxNote}>Tax may be applied at confirmation.</Text>
            <View style={[styles.row, styles.borderTop]}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalVal}>Rs {total}</Text>
            </View>
          </View>

          {/* Payment */}
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.payOptions}>
            {['Cash', 'Bank'].map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.payBtn,
                  payMethod === method && styles.activePay,
                ]}
                onPress={() => setPayMethod(method)}
              >
                <Ionicons
                  name={
                    method === 'Cash'
                      ? 'cash-outline'
                      : 'business-outline'
                  }
                  size={20}
                  color={
                    payMethod === method ? '#fff' : '#2D2926'
                  }
                />
                <Text
                  style={[
                    styles.payBtnText,
                    payMethod === method &&
                      styles.activePayText,
                  ]}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bank Section */}
          {payMethod === 'Bank' && (
            <View style={styles.bankBox}>
              <Text style={styles.bankTitle}>
                Transfer to Bank Account
              </Text>

              {[
                ['Bank', bankDetails.bankName],
                ['Title', bankDetails.accountTitle],
                ['Account #', bankDetails.accountNumber],
                ['Branch', bankDetails.branch],
              ].map(([label, value]) => (
                <View key={label} style={styles.bankRow}>
                  <Text style={styles.bankLabel}>{label}</Text>
                  <Text
                    style={[
                      styles.bankValue,
                      label === 'Account #' && {
                        color: '#FFA500',
                      },
                    ]}
                  >
                    {value}
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.uploadArea}
                onPress={pickImage}
              >
                {proof ? (
                  <Image
                    source={{ uri: proof }}
                    style={styles.image}
                  />
                ) : (
                  <View style={styles.placeholder}>
                    <Ionicons
                      name="camera-outline"
                      size={32}
                      color="#A67B5B"
                    />
                    <Text style={styles.placeholderText}>
                      Upload Receipt Screenshot
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {hasActiveOrder && (
            <Text style={styles.blockMessage}>Complete or cancel your current order before placing a new one.</Text>
          )}

          {/* Confirm */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (payMethod === 'Bank' && !proof) && styles.disabledBtn,
              hasActiveOrder && styles.disabledBtn,
            ]}
            onPress={handleConfirm}
            disabled={submitting || hasActiveOrder || (payMethod === 'Bank' && !proof)}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.confirmText}>Confirm Order</Text>
                <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },

  scrollContent: {
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 80,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },

  backBtn: {
    padding: 5,
  },

  headerTitle: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    color: '#2D2926',
    marginLeft: 15,
  },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 25,
    elevation: 4,
  },

  cardTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    marginBottom: 20,
    color: '#2D2926',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  label: {
    color: '#6F4E37',
    fontSize: 15,
  },

  val: {
    fontSize: 15,
    fontWeight: '600',
  },

  taxNote: {
    fontSize: 12,
    color: '#6F4E37',
    marginTop: 4,
    marginBottom: 8,
  },
  blockMessage: {
    fontSize: 13,
    color: '#C62828',
    marginTop: 16,
    marginBottom: 8,
  },
  borderTop: {
    borderTopWidth: 1,
    borderColor: '#F5F5F5',
    paddingTop: 15,
    marginTop: 5,
  },

  totalLabel: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#2D2926',
  },

  totalVal: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFA500',
  },

  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    marginTop: 35,
    marginBottom: 15,
    color: '#2D2926',
  },

  payOptions: {
    flexDirection: 'row',
    gap: 15,
  },

  payBtn: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5D3B3',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  activePay: {
    backgroundColor: '#2D2926',
    borderColor: '#2D2926',
  },

  payBtnText: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#2D2926',
  },

  activePayText: {
    color: '#fff',
  },

  bankBox: {
    marginTop: 25,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5D3B3',
  },

  bankTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    marginBottom: 15,
    color: '#2D2926',
  },

  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  bankLabel: {
    color: '#6F4E37',
    fontSize: 14,
  },

  bankValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2926',
  },

  uploadArea: {
    height: 160,
    marginTop: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5D3B3',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8EE',
    overflow: 'hidden',
  },

  placeholder: {
    alignItems: 'center',
  },

  placeholderText: {
    marginTop: 8,
    color: '#A67B5B',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  confirmBtn: {
    backgroundColor: '#FFA500',
    padding: 20,
    borderRadius: 20,
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  disabledBtn: {
    opacity: 0.5,
  },

  confirmText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
});