import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';

export default function OrderTracker({ route, navigation }) {
  const [orderStatus, setOrderStatus] = useState('waiting');
  const [rating, setRating] = useState(0);
  const [ordersAhead] = useState(3);
  const { total = 0 } = route.params || {};
  const orderId = `B23F-${Math.floor(1000 + Math.random() * 9000)}`;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      friction: 3,
      useNativeDriver: true,
    }).start(() =>
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start()
    );
  }, [orderStatus]);

  useEffect(() => {
    let timer;

    if (orderStatus === 'waiting')
      timer = setTimeout(() => setOrderStatus('approved'), 3000);

    if (orderStatus === 'approved')
      timer = setTimeout(() => setOrderStatus('in_queue'), 4000);

    if (orderStatus === 'in_queue')
      timer = setTimeout(() => {
        setOrderStatus('ready');
        Alert.alert('Order Ready ☕', 'Your order is ready for pickup.');
      }, 7000);

    return () => timer && clearTimeout(timer);
  }, [orderStatus]);

  const handleReceived = () => {
    setOrderStatus('received');
    Alert.alert('Thank You!', 'Order marked as received.');
  };

  const StepIndicator = ({ target, label, icon }) => {
    const steps = ['waiting', 'approved', 'in_queue', 'ready', 'received'];
    const current = steps.indexOf(orderStatus);
    const targetIndex = steps.indexOf(target);
    const active = current >= targetIndex;

    return (
      <View style={styles.stepWrapper}>
        <Animated.View
          style={[
            styles.circle,
            active && styles.activeCircle,
            active && { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Ionicons
            name={current > targetIndex ? 'checkmark' : icon}
            size={18}
            color={active ? '#fff' : '#A67B5B'}
          />
        </Animated.View>
        <Text style={[styles.stepLabel, active && styles.activeLabel]}>
          {label}
        </Text>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.orderId}>{orderId}</Text>
            <Text style={styles.title}>Order Status</Text>
          </View>

          {/* TIMELINE */}
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

          {/* QUEUE */}
          {orderStatus === 'in_queue' && (
            <View style={styles.queueBox}>
              <Text style={styles.queueText}>{ordersAhead} Orders Ahead</Text>
              <Ionicons name="restaurant" size={36} color="#FFA500" />
              <Text style={styles.queueHint}>Chef is preparing your order</Text>
            </View>
          )}

          {/* STATUS CARD */}
          <View style={styles.statusBox}>
            <Text style={styles.statusTitle}>
              {orderStatus === 'waiting' && 'Verifying Payment'}
              {orderStatus === 'approved' && 'Order Approved'}
              {orderStatus === 'in_queue' && 'Cooking in Progress'}
              {orderStatus === 'ready' && 'Ready for Pickup'}
              {orderStatus === 'received' && 'Order Completed'}
            </Text>
            <Text style={styles.statusDesc}>
              We appreciate your patience 💛
            </Text>
          </View>

          {/* 🧾 ORDER SUMMARY CARD */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.itemText}>White Karahi × 1</Text>
              <Text style={styles.priceText}>Rs 1800</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.itemText}>Roti × 4</Text>
              <Text style={styles.priceText}>Rs 200</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>Rs {total}</Text>
            </View>
          </View>

          {orderStatus === 'ready' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleReceived}>
              <Text style={styles.primaryBtnText}>
                I have received my order
              </Text>
            </TouchableOpacity>
          )}

          {orderStatus === 'received' && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewTitle}>Rate your experience</Text>

              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={30}
                      color="#FFA500"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Write your feedback..."
                multiline
              />

              <TouchableOpacity
                style={styles.darkBtn}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.darkBtnText}>Save & Finish</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 25,
    elevation: 6,
  },

  header: { alignItems: 'center', marginBottom: 30 },
  orderId: { color: '#A67B5B', fontWeight: '700' },
  title: { fontSize: 26, fontFamily: 'Poppins-Bold', color: '#2D2926' },

  timelineContainer: { marginBottom: 40, position: 'relative' },
  timelineLine: {
    position: 'absolute',
    top: 22,
    left: 30,
    right: 30,
    height: 2,
    backgroundColor: '#E5D3B3',
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepWrapper: { alignItems: 'center', width: 60 },

  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5D3B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCircle: { backgroundColor: '#2D2926', borderColor: '#2D2926' },
  stepLabel: { fontSize: 10, marginTop: 6, color: '#A67B5B', textAlign: 'center' },
  activeLabel: { color: '#2D2926', fontWeight: '700' },

  queueBox: {
    backgroundColor: '#FFF8EE',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  queueText: { fontSize: 16, fontWeight: '700' },
  queueHint: { fontSize: 12, color: '#6F4E37', marginTop: 8 },

  statusBox: {
    backgroundColor: '#FFF8EE',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#2D2926',
  },
  statusDesc: { fontSize: 13, color: '#6F4E37', marginTop: 6 },

  summaryCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemText: { fontSize: 14, color: '#2D2926' },
  priceText: { fontSize: 14, color: '#6F4E37' },
  divider: {
    height: 1,
    backgroundColor: '#E5D3B3',
    marginVertical: 10,
  },
  totalLabel: { fontWeight: '700' },
  totalPrice: { fontWeight: '700', color: '#FFA500' },

  primaryBtn: {
    backgroundColor: '#FFA500',
    padding: 18,
    borderRadius: 15,
    marginTop: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontFamily: 'Poppins-Bold' },

  reviewSection: { marginTop: 30 },
  reviewTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', marginBottom: 15 },
  starRow: { flexDirection: 'row', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    padding: 15,
    height: 80,
    textAlignVertical: 'top',
  },

  darkBtn: {
    backgroundColor: '#2D2926',
    padding: 18,
    borderRadius: 15,
    marginTop: 20,
    alignItems: 'center',
  },
  darkBtnText: { color: '#fff', fontFamily: 'Poppins-Bold' },
});
