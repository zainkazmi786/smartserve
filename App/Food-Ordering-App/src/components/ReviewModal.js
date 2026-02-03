import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createReview, listReviews, markOrderReviewed } from '../services/apiService';
import { showError, showSuccess } from '../utils/toast';

const STAR_COUNT = 5;

/**
 * Get unique order line items by item id (one row per menu item, not per quantity).
 */
function getUniqueItems(order) {
  if (!order?.items?.length) return [];
  const seen = new Set();
  const out = [];
  for (const line of order.items) {
    const id = line.item?._id ?? line.item;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ itemId: id, name: line.item?.name ?? 'Item', line });
  }
  return out;
}

export default function ReviewModal({ visible, onClose, order, onSubmitted }) {
  const [itemRatings, setItemRatings] = useState({});
  const [existingItemIds, setExistingItemIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const orderId = order?._id;
  const uniqueItems = getUniqueItems(order);

  const fetchExistingReviews = useCallback(async () => {
    if (!orderId || !uniqueItems.length) return;
    setLoading(true);
    try {
      const res = await listReviews({ limit: 100 });
      const reviews = res?.reviews ?? [];
      const itemIds = uniqueItems.map((u) => u.itemId);
      const reviewed = new Set(
        reviews.filter((r) => r.item && itemIds.includes(r.item._id || r.item)).map((r) => r.item?._id ?? r.item)
      );
      setExistingItemIds(reviewed);
      const prefill = {};
      reviews.forEach((r) => {
        const id = r.item?._id ?? r.item;
        if (itemIds.includes(id)) {
          prefill[id] = { rating: r.rating ?? 5, comment: r.comment ?? '' };
        }
      });
      setItemRatings((prev) => ({ ...prev, ...prefill }));
    } catch (_) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [orderId, uniqueItems.length]);

  useEffect(() => {
    if (visible && uniqueItems.length > 0) {
      fetchExistingReviews();
    }
    if (!visible) {
      setItemRatings({});
      setExistingItemIds(new Set());
    }
  }, [visible, orderId, uniqueItems.length]);

  const setRating = (itemId, rating) => {
    setItemRatings((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), rating },
    }));
  };

  const setComment = (itemId, comment) => {
    setItemRatings((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), comment },
    }));
  };

  const handleSubmit = async () => {
    if (!orderId) return;
    setSubmitting(true);
    try {
      for (const { itemId } of uniqueItems) {
        if (existingItemIds.has(itemId)) continue;
        const r = itemRatings[itemId];
        const rating = r?.rating;
        if (rating == null || rating < 1) continue;
        await createReview({
          item: itemId,
          rating: Math.min(5, Math.max(1, rating)),
          comment: r?.comment?.trim() || undefined,
        });
      }
      await markOrderReviewed(orderId);
      showSuccess('Thanks', 'Your review has been submitted.');
      onSubmitted?.();
      onClose?.();
    } catch (e) {
      showError('Error', e.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaybeLater = () => {
    onClose?.();
  };

  const hasAnyRating =
    uniqueItems.length > 0 &&
    uniqueItems.some(
      ({ itemId }) => !existingItemIds.has(itemId) && (itemRatings[itemId]?.rating ?? 0) >= 1
    );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Rate your order</Text>
          <Text style={styles.subtitle}>Your feedback helps us improve</Text>

          {loading ? (
            <ActivityIndicator size="small" color="#2D2926" style={{ marginVertical: 24 }} />
          ) : uniqueItems.length === 0 ? (
            <Text style={styles.emptyText}>No items to review.</Text>
          ) : (
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
              {uniqueItems.map(({ itemId, name }) => {
                const isExisting = existingItemIds.has(itemId);
                const r = itemRatings[itemId] || {};
                const rating = r.rating ?? 0;
                return (
                  <View key={itemId} style={styles.itemRow}>
                    <Text style={styles.itemName}>{name}</Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => !isExisting && setRating(itemId, s)}
                          disabled={isExisting}
                          style={styles.starBtn}
                        >
                          <Ionicons
                            name={s <= rating ? 'star' : 'star-outline'}
                            size={28}
                            color={s <= rating ? '#FFA500' : '#E5D3B3'}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    {isExisting && <Text style={styles.reviewedLabel}>Reviewed</Text>}
                    {!isExisting && (
                      <TextInput
                        style={styles.commentInput}
                        placeholder="Comment (optional)"
                        value={r.comment ?? ''}
                        onChangeText={(t) => setComment(itemId, t)}
                        multiline
                        maxLength={500}
                      />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, (!hasAnyRating || submitting) && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={submitting || !hasAnyRating}
            >
              <Text style={styles.primaryBtnText}>
                {submitting ? 'Submitting...' : 'Submit review'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.laterBtn}
              onPress={handleMaybeLater}
              disabled={submitting}
            >
              <Text style={styles.laterBtnText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  title: { fontSize: 22, fontFamily: 'Poppins-Bold', color: '#2D2926', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#A67B5B', textAlign: 'center', marginTop: 6, marginBottom: 20 },
  scroll: { maxHeight: 320 },
  itemRow: { marginBottom: 20 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#2D2926', marginBottom: 8 },
  starRow: { flexDirection: 'row', marginBottom: 8 },
  starBtn: { padding: 4 },
  reviewedLabel: { fontSize: 12, color: '#A67B5B', marginBottom: 4 },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E5D3B3',
    borderRadius: 12,
    padding: 12,
    minHeight: 64,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  actions: { marginTop: 16, gap: 12 },
  primaryBtn: { backgroundColor: '#FFA500', padding: 16, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontFamily: 'Poppins-Bold' },
  disabledBtn: { opacity: 0.6 },
  laterBtn: { alignItems: 'center', padding: 12 },
  laterBtnText: { color: '#A67B5B', fontSize: 15 },
  emptyText: { fontSize: 14, color: '#A67B5B', textAlign: 'center', marginVertical: 16 },
});
