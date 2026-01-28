import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  getOrderHistory,
  getOrder,
  uploadReceipt,
  cancelOrder,
} from '../services/apiService';
import { useActiveOrder } from '../context/ActiveOrderContext';

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const TRACKABLE = [
  'payment_uploaded',
  'cash_selected',
  'approved',
  'preparing',
  'ready',
  'disapproved',
];

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const { activeOrder, clearActiveOrder, fetchActiveOrder } = useActiveOrder();

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getOrderHistory();
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load orders');
      setOrders([]);
    }
  }, []);

  const load = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      await fetchOrders();
      if (showRefreshing) setRefreshing(false);
      else setLoading(false);
    },
    [fetchOrders]
  );

  useFocusEffect(
    useCallback(() => {
      load();
      fetchActiveOrder();
    }, [load, fetchActiveOrder])
  );

  useEffect(() => {
    if (!viewOrder?._id) {
      setViewDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    getOrder(viewOrder._id)
      .then((o) => {
        if (!cancelled) setViewDetail(o);
      })
      .catch(() => {
        if (!cancelled) setViewDetail(viewOrder);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewOrder?._id]);

  const closeView = useCallback(() => {
    setViewOrder(null);
    setViewDetail(null);
    setCancelModal(false);
    setCancelNote('');
  }, []);

  const handleCancel = async () => {
    const order = viewDetail || viewOrder;
    if (!order?._id) return;
    if (!['payment_uploaded', 'cash_selected'].includes(order.status)) return;
    try {
      await cancelOrder(order._id, { cancellationNote: cancelNote || undefined });
      if (activeOrder?._id === order._id) clearActiveOrder();
      setCancelModal(false);
      setCancelNote('');
      await fetchOrders();
      setViewDetail(null);
      setViewOrder(null);
      Alert.alert('Done', 'Order cancelled.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not cancel order.');
    }
  };

  const handleUploadReceipt = async () => {
    const order = viewDetail || viewOrder;
    if (!order?._id || order.status !== 'disapproved') return;
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
      await uploadReceipt(order._id, result.assets[0].uri);
      const updated = await getOrder(order._id);
      setViewDetail(updated);
      await fetchOrders();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to upload receipt.');
    } finally {
      setUploading(false);
    }
  };

  const goToTracker = () => {
    const o = viewDetail || viewOrder;
    if (!o?._id) return;
    closeView();
    navigation.navigate('OrderTracker', { orderId: o._id });
  };

  const display = viewDetail || viewOrder;
  const canCancel = display && ['payment_uploaded', 'cash_selected'].includes(display.status);
  const isDisapproved = display?.status === 'disapproved';
  const canTrack = display && TRACKABLE.includes(display.status);

  const renderOrder = ({ item }) => {
    const total = item.pricing?.total ?? 0;
    const id = item.orderNumber || item._id || '—';
    return (
      <View style={styles.card}>
        <Text style={styles.orderId}>{id}</Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        <View style={styles.divider} />
        <Text style={styles.total}>Rs {total}</Text>
        <Text style={styles.statusLabel}>{item.status}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.viewBtn} onPress={() => setViewOrder(item)}>
            <Text style={styles.viewText}>View</Text>
          </TouchableOpacity>
          {TRACKABLE.includes(item.status) && (
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => navigation.navigate('OrderTracker', { orderId: item._id })}
            >
              <Text style={styles.trackText}>Track</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2D2926" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <Text style={styles.title}>Order History</Text>
          <View style={{ width: 24 }} />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#FFA500']} />
          }
          ListEmptyComponent={
            !loading && !error ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No orders yet</Text>
              </View>
            ) : null
          }
        />

        {/* VIEW MODAL */}
        <Modal visible={!!viewOrder} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <ScrollView>
                <Text style={styles.modalTitle}>Order Details</Text>
                <Text style={styles.modalSub}>{display?.orderNumber || display?._id || '—'}</Text>
                {detailLoading ? (
                  <ActivityIndicator size="small" color="#2D2926" style={{ marginVertical: 16 }} />
                ) : (
                  <>
                    {(display?.items || []).map((line, idx) => {
                      const name = line.item?.name || 'Item';
                      const qty = line.quantity || 1;
                      const ps = line.portionSize === 'half' ? ' (Half)' : '';
                      return (
                        <Text key={idx} style={styles.item}>
                          {qty}× {name}{ps}
                        </Text>
                      );
                    })}
                    <Text style={styles.modalTotal}>
                      Total: Rs {display?.pricing?.total ?? 0}
                    </Text>
                    {isDisapproved && display?.payment?.rejectionNote && (
                      <View style={styles.rejectionBox}>
                        <Text style={styles.rejectionTitle}>Rejection note</Text>
                        <Text style={styles.rejectionNote}>{display.payment.rejectionNote}</Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              {!detailLoading && (
                <View style={styles.modalActions}>
                  {isDisapproved && (
                    <TouchableOpacity
                      style={[styles.primaryBtn, uploading && styles.disabledBtn]}
                      onPress={handleUploadReceipt}
                      disabled={uploading}
                    >
                      <Text style={styles.primaryBtnText}>
                        {uploading ? 'Uploading...' : 'Upload new receipt'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {canCancel && (
                    <TouchableOpacity
                      style={styles.cancelOrderBtn}
                      onPress={() => setCancelModal(true)}
                    >
                      <Text style={styles.cancelOrderText}>Cancel order</Text>
                    </TouchableOpacity>
                  )}
                  {canTrack && (
                    <TouchableOpacity style={styles.trackBtnModal} onPress={goToTracker}>
                      <Text style={styles.trackBtnModalText}>Track order</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.closeBtn} onPress={closeView}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* CANCEL MODAL */}
        <Modal visible={cancelModal} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Cancel order?</Text>
              <TextInput
                style={styles.input}
                placeholder="Reason (optional)"
                value={cancelNote}
                onChangeText={setCancelNote}
                multiline
              />
              <View style={styles.cancelModalRow}>
                <TouchableOpacity
                  style={styles.keepBtn}
                  onPress={() => {
                    setCancelModal(false);
                    setCancelNote('');
                  }}
                >
                  <Text style={styles.keepBtnText}>Keep order</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmCancelBtn} onPress={handleCancel}>
                  <Text style={styles.confirmCancelText}>Cancel order</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#A67B5B' },
  errorBox: { paddingHorizontal: 20, paddingBottom: 8 },
  errorText: { color: '#C62828', fontSize: 14 },
  list: { padding: 20, paddingBottom: 80 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#A67B5B', fontSize: 16 },

  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    marginBottom: 15,
    elevation: 3,
  },
  orderId: { fontWeight: '700' },
  date: { color: '#A67B5B', marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
  total: { fontSize: 18, color: '#FFA500', marginBottom: 4 },
  statusLabel: { fontSize: 12, color: '#6F4E37', marginBottom: 12 },
  actions: { flexDirection: 'column', gap: 10 },
  viewBtn: {
    borderWidth: 1,
    borderColor: '#FFA500',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  viewText: { color: '#FFA500', fontWeight: '700' },
  trackBtn: {
    backgroundColor: '#2D2926',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  trackText: { color: '#fff', fontWeight: '700' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalSub: { color: '#A67B5B', marginBottom: 15 },
  item: { marginBottom: 8 },
  modalTotal: { fontWeight: '700', marginTop: 15 },
  rejectionBox: { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 12, marginTop: 12 },
  rejectionTitle: { fontSize: 12, fontWeight: '700', color: '#C62828', marginBottom: 4 },
  rejectionNote: { fontSize: 14, color: '#6F4E37' },
  modalActions: { gap: 10, marginTop: 16 },
  primaryBtn: { backgroundColor: '#FFA500', padding: 14, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
  cancelOrderBtn: { alignItems: 'center', padding: 10 },
  cancelOrderText: { color: '#C62828', fontSize: 15 },
  trackBtnModal: { backgroundColor: '#2D2926', padding: 14, borderRadius: 14, alignItems: 'center' },
  trackBtnModalText: { color: '#fff', fontWeight: '700' },
  closeBtn: { marginTop: 15, alignItems: 'center' },
  closeText: { color: '#FFA500', fontWeight: '700' },

  input: {
    borderWidth: 1,
    borderColor: '#E5D3B3',
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  cancelModalRow: { flexDirection: 'row', gap: 12 },
  keepBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center' },
  keepBtnText: { color: '#2D2926', fontWeight: '600' },
  confirmCancelBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#C62828', alignItems: 'center' },
  confirmCancelText: { color: '#fff', fontWeight: '700' },
});
