import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Animated,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ScreenWrapper from '../components/ScreenWrapper';
import { getOrder, markOrderReceived, cancelOrder, uploadReceipt } from '../services/apiService';
import { useActiveOrder } from '../context/ActiveOrderContext';

const POLL_INTERVAL_MS = 12000;

function mapApiStatusToStep(apiStatus) {
  if (['payment_uploaded', 'cash_selected'].includes(apiStatus)) return 'waiting';
  if (apiStatus === 'disapproved') return 'waiting';
  if (apiStatus === 'approved') return 'approved';
  if (apiStatus === 'preparing') return 'in_queue';
  if (apiStatus === 'ready') return 'ready';
  if (apiStatus === 'received') return 'received';
  if (apiStatus === 'cancelled') return 'cancelled';
  return 'waiting';
}

export default function OrderTracker({ route, navigation }) {
  const { orderId, order: initialOrder } = route.params || {};
  const [order, setOrder] = useState(initialOrder || null);
  const [loading, setLoading] = useState(!!orderId && !initialOrder);
  const [error, setError] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const { clearActiveOrder } = useActiveOrder();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const goToDashboard = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  }, [navigation]);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const o = await getOrder(orderId);
      setOrder(o);
      setError(null);
      return o;
    } catch (e) {
      setError(e.message || 'Failed to load order');
      return null;
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      setError('No order specified');
      return;
    }
    if (initialOrder) setOrder(initialOrder);
    setLoading(!initialOrder);
    fetchOrder().then((o) => {
      setLoading(false);
    });
  }, [orderId, initialOrder]);

  useEffect(() => {
    if (!orderId || !order) return;
    const s = order.status;
    if (['received', 'cancelled'].includes(s)) return;
    const t = setInterval(fetchOrder, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [orderId, order?.status, fetchOrder]);

  const orderStatus = order ? mapApiStatusToStep(order.status) : 'waiting';
  const apiStatus = order?.status;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1.1, friction: 3, useNativeDriver: true }).start(() =>
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()
    );
  }, [orderStatus]);

  const handleReceived = async () => {
    if (apiStatus !== 'ready') return;
    try {
      await markOrderReceived(orderId);
      clearActiveOrder();
      const o = await fetchOrder();
      setOrder(o || { ...order, status: 'received' });
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not mark as received.');
    }
  };

  const handleCancel = async () => {
    if (!['payment_uploaded', 'cash_selected'].includes(apiStatus)) return;
    try {
      await cancelOrder(orderId, { cancellationNote: cancelNote || undefined });
      clearActiveOrder();
      setCancelModal(false);
      setCancelNote('');
      const o = await fetchOrder();
      setOrder(o);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not cancel order.');
    }
  };

  const handleUploadReceipt = async () => {
    if (apiStatus !== 'disapproved') return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Photo access is required to upload receipt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      await uploadReceipt(orderId, result.assets[0].uri);
      await fetchOrder();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to upload receipt.');
    } finally {
      setUploading(false);
    }
  };

  const StepIndicator = ({ target, label, icon }) => {
    const steps = ['waiting', 'approved', 'in_queue', 'ready', 'received'];
    const current = steps.indexOf(orderStatus);
    const targetIndex = steps.indexOf(target);
    const active = current >= targetIndex;
    return (
      <View style={styles.stepWrapper}>
        <Animated.View style={[styles.circle, active && styles.activeCircle, active && { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name={current > targetIndex ? 'checkmark' : icon} size={18} color={active ? '#fff' : '#A67B5B'} />
        </Animated.View>
        <Text style={[styles.stepLabel, active && styles.activeLabel]}>{label}</Text>
      </View>
    );
  };

  if (loading && !order) {
    return (
      <ScreenWrapper>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2D2926" />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !order) {
    return (
      <ScreenWrapper>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={goToDashboard}>
            <Text style={styles.primaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const displayId = order?.orderNumber || order?._id || orderId || '—';
  const canCancel = ['payment_uploaded', 'cash_selected'].includes(apiStatus);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity onPress={goToDashboard} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={26} color="#2D2926" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.orderId}>{displayId}</Text>
              <Text style={styles.title}>Order Status</Text>
            </View>
            <View style={styles.backBtn} />
          </View>

          {apiStatus === 'disapproved' && (
            <View style={styles.disapprovedBox}>
              <Text style={styles.disapprovedTitle}>Payment Disapproved</Text>
              {order?.payment?.rejectionNote && (
                <Text style={styles.rejectionNote}>{order.payment.rejectionNote}</Text>
              )}
              <TouchableOpacity
                style={[styles.primaryBtn, uploading && styles.disabledBtn]}
                onPress={handleUploadReceipt}
                disabled={uploading}
              >
                <Text style={styles.primaryBtnText}>
                  {uploading ? 'Uploading...' : 'Upload new receipt'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {apiStatus === 'cancelled' && (
            <View style={styles.statusBox}>
              <Text style={styles.statusTitle}>Order Cancelled</Text>
            </View>
          )}

          {!['cancelled', 'disapproved'].includes(apiStatus) && (
            <>
              <View style={styles.timelineContainer}>
                <View style={styles.timelineLine} />
                <View style={styles.stepsRow}>
                  <StepIndicator target="waiting" label="Waiting" icon="card-outline" />
                  <StepIndicator target="approved" label="Approved" icon="shield-checkmark-outline" />
                  <StepIndicator target="in_queue" label="Queue" icon="restaurant-outline" />
                  <StepIndicator target="ready" label="Ready" icon="cafe-outline" />
                  <StepIndicator target="received" label="Received" icon="happy-outline" />
                </View>
              </View>

              {orderStatus === 'in_queue' && (
                <View style={styles.queueBox}>
                  <Ionicons name="restaurant" size={36} color="#FFA500" />
                  <Text style={styles.queueHint}>Chef is preparing your order</Text>
                </View>
              )}

              <View style={styles.statusBox}>
                <Text style={styles.statusTitle}>
                  {orderStatus === 'waiting' && 'Verifying Payment'}
                  {orderStatus === 'approved' && 'Order Approved'}
                  {orderStatus === 'in_queue' && 'Cooking in Progress'}
                  {orderStatus === 'ready' && 'Ready for Pickup'}
                  {orderStatus === 'received' && 'Order Completed'}
                </Text>
                <Text style={styles.statusDesc}>We appreciate your patience</Text>
              </View>
            </>
          )}

          {/* Order Summary */}
          {order?.items && order.items.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              {order.items.map((line, idx) => {
                const name = line.item?.name || 'Item';
                const qty = line.quantity || 1;
                const ps = line.portionSize === 'half' ? ' (Half)' : '';
                return (
                  <View key={idx} style={styles.summaryRow}>
                    <Text style={styles.itemText}>{name} × {qty}{ps}</Text>
                  </View>
                );
              })}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalPrice}>Rs {order.pricing?.total ?? 0}</Text>
              </View>
            </View>
          )}

          {apiStatus === 'ready' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleReceived}>
              <Text style={styles.primaryBtnText}>I have received my order</Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCancelModal(true)}>
              <Text style={styles.cancelBtnText}>Cancel order</Text>
            </TouchableOpacity>
          )}

          {orderStatus === 'received' && (
            <TouchableOpacity style={styles.darkBtn} onPress={goToDashboard}>
              <Text style={styles.darkBtnText}>Back to Home</Text>
            </TouchableOpacity>
          )}

          {apiStatus === 'cancelled' && (
            <TouchableOpacity style={styles.darkBtn} onPress={goToDashboard}>
              <Text style={styles.darkBtnText}>Back to Home</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={cancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cancel order?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason (optional)"
              value={cancelNote}
              onChangeText={setCancelNote}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setCancelModal(false); setCancelNote(''); }}>
                <Text style={styles.modalCancelText}>Keep order</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleCancel}>
                <Text style={styles.darkBtnText}>Cancel order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#A67B5B' },
  errorText: { fontSize: 16, color: '#C62828', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 30, padding: 25, elevation: 6 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backBtn: { padding: 5, minWidth: 36 },
  headerCenter: { flex: 1, alignItems: 'center' },
  orderId: { color: '#A67B5B', fontWeight: '700' },
  title: { fontSize: 26, fontFamily: 'Poppins-Bold', color: '#2D2926' },
  disapprovedBox: { backgroundColor: '#FFEBEE', borderRadius: 20, padding: 20, marginBottom: 20 },
  disapprovedTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#C62828', marginBottom: 8 },
  rejectionNote: { fontSize: 14, color: '#6F4E37', marginBottom: 12 },
  timelineContainer: { marginBottom: 40, position: 'relative' },
  timelineLine: { position: 'absolute', top: 22, left: 30, right: 30, height: 2, backgroundColor: '#E5D3B3' },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepWrapper: { alignItems: 'center', width: 60 },
  circle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 2, borderColor: '#E5D3B3', justifyContent: 'center', alignItems: 'center' },
  activeCircle: { backgroundColor: '#2D2926', borderColor: '#2D2926' },
  stepLabel: { fontSize: 10, marginTop: 6, color: '#A67B5B', textAlign: 'center' },
  activeLabel: { color: '#2D2926', fontWeight: '700' },
  queueBox: { backgroundColor: '#FFF8EE', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 20 },
  queueHint: { fontSize: 12, color: '#6F4E37', marginTop: 8 },
  statusBox: { backgroundColor: '#FFF8EE', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 20 },
  statusTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#2D2926' },
  statusDesc: { fontSize: 13, color: '#6F4E37', marginTop: 6 },
  summaryCard: { backgroundColor: '#F9F9F9', borderRadius: 20, padding: 20, marginBottom: 20 },
  summaryTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemText: { fontSize: 14, color: '#2D2926' },
  totalLabel: { fontWeight: '700' },
  totalPrice: { fontWeight: '700', color: '#FFA500' },
  divider: { height: 1, backgroundColor: '#E5D3B3', marginVertical: 10 },
  primaryBtn: { backgroundColor: '#FFA500', padding: 18, borderRadius: 15, marginTop: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontFamily: 'Poppins-Bold' },
  disabledBtn: { opacity: 0.6 },
  cancelBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 10 },
  cancelBtnText: { color: '#C62828', fontSize: 15 },
  darkBtn: { backgroundColor: '#2D2926', padding: 18, borderRadius: 15, marginTop: 20, alignItems: 'center' },
  darkBtnText: { color: '#fff', fontFamily: 'Poppins-Bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#E5D3B3', borderRadius: 12, padding: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center' },
  modalCancelText: { color: '#2D2926', fontWeight: '600' },
  modalConfirm: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#C62828', alignItems: 'center' },
});
