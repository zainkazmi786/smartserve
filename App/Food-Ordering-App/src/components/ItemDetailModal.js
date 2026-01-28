import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, Image, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default function ItemDetailModal({ visible, item, onClose, onAddToBag, disabled }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('Full'); // State to track size

  // Reset state when modal opens for a new item
  useEffect(() => {
    if (visible) {
      setQuantity(1);
      setSelectedSize('Full');
    }
  }, [visible]);

  if (!item) return null;

  // Get image from images array or fallback to image property
  const itemImage = (item.images && item.images.length > 0) ? item.images[0] : (item.image || null);
  
  // Get description from description or desc property
  const itemDescription = item.description || item.desc || '';
  
  // Check if half price is available (from API or mock data)
  const hasHalfPrice = item.halfPrice !== undefined && item.halfPrice !== null;
  
  // Calculate price based on size. For Half: halfPrice if available, else price/2 (per backend)
  const currentPrice = (selectedSize === 'Half' && hasHalfPrice)
    ? item.halfPrice
    : (selectedSize === 'Half' ? (item.price / 2) : item.price);

  const handleAdd = () => {
    if (disabled) return;
    onAddToBag({
      ...item,
      quantity,
      size: selectedSize,
      portionSize: selectedSize === 'Half' ? 'half' : 'full',
      price: currentPrice,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#2D2926" />
          </TouchableOpacity>

          {itemImage && (
            <Image source={{ uri: itemImage }} style={styles.itemImage} />
          )}
          
          <View style={styles.details}>
            <Text style={styles.itemName}>{item.name}</Text>
            {itemDescription && (
              <Text style={styles.itemDesc}>{itemDescription}</Text>
            )}

            {/* --- Portion Size Toggle --- */}
            {hasHalfPrice && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Portion</Text>
                <View style={styles.sizeRow}>
                  <TouchableOpacity 
                    style={[styles.sizeBtn, selectedSize === 'Half' && styles.activeSize, disabled && styles.disabledBtn]} 
                    onPress={() => !disabled && setSelectedSize('Half')}
                    disabled={disabled}
                  >
                    <Text style={[styles.sizeText, selectedSize === 'Half' && styles.whiteText]}>Half Plate</Text>
                    <Text style={[styles.priceText, selectedSize === 'Half' && styles.whiteText]}>Rs {item.halfPrice}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.sizeBtn, selectedSize === 'Full' && styles.activeSize, disabled && styles.disabledBtn]} 
                    onPress={() => !disabled && setSelectedSize('Full')}
                    disabled={disabled}
                  >
                    <Text style={[styles.sizeText, selectedSize === 'Full' && styles.whiteText]}>Full Plate</Text>
                    <Text style={[styles.priceText, selectedSize === 'Full' && styles.whiteText]}>Rs {item.price}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!hasHalfPrice && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Price</Text>
                <Text style={styles.singlePrice}>Rs {item.price}</Text>
              </View>
            )}

            {/* --- Quantity Selector --- */}
            <View style={styles.footerRow}>
              <View style={styles.qtyContainer}>
                <TouchableOpacity 
                  onPress={() => !disabled && quantity > 1 && setQuantity(quantity - 1)}
                  disabled={disabled}
                >
                  <Ionicons name="remove-circle-outline" size={35} color={disabled ? "#A67B5B" : "#2D2926"} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{quantity}</Text>
                <TouchableOpacity 
                  onPress={() => !disabled && setQuantity(quantity + 1)}
                  disabled={disabled}
                >
                  <Ionicons name="add-circle-outline" size={35} color={disabled ? "#A67B5B" : "#2D2926"} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.addBtn, disabled && styles.disabledAddBtn]} 
                onPress={handleAdd}
                disabled={disabled}
              >
                <Text style={styles.addBtnText}>
                  {disabled ? 'Menu Not Active' : `Add Rs ${currentPrice * quantity}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingBottom: 40, overflow: 'hidden' },
  closeBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10, backgroundColor: '#fff', borderRadius: 20, padding: 5 },
  itemImage: { width: '100%', height: hp('30%') },
  details: { padding: 25 },
  itemName: { fontSize: 24, fontWeight: 'bold', color: '#2D2926' },
  itemDesc: { fontSize: 14, color: '#6F4E37', marginVertical: 10 },
  section: { marginVertical: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  sizeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  sizeBtn: { flex: 1, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#E5D3B3', alignItems: 'center' },
  activeSize: { backgroundColor: '#2D2926', borderColor: '#2D2926' },
  sizeText: { fontSize: 14, fontWeight: 'bold', color: '#6F4E37' },
  priceText: { fontSize: 12, color: '#A67B5B', marginTop: 5 },
  whiteText: { color: '#fff' },
  disabledBtn: { opacity: 0.5 },
  singlePrice: { fontSize: 18, fontWeight: 'bold', color: '#FFA500', marginTop: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  qtyText: { fontSize: 20, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#FFA500', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 20, elevation: 5 },
  disabledAddBtn: { backgroundColor: '#A67B5B', opacity: 0.6 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});