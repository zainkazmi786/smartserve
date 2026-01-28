import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ItemDetailModal from '../components/ItemDetailModal';
import ScreenWrapper from '../components/ScreenWrapper';
import { getTodayMenus } from '../services/apiService';
import { useCart } from '../context/CartContext';
import { useActiveOrder } from '../context/ActiveOrderContext';

export default function ActiveMenu({ navigation }) {
  const [menus, setMenus] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { items: cartItems, addItem } = useCart();
  const { fetchActiveOrder } = useActiveOrder();

  // Group items by category
  const groupItemsByCategory = (items) => {
    const grouped = {};
    items.forEach((item) => {
      const category = item.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    return grouped;
  };

  // Get selected menu
  const selectedMenu = menus.find((m) => m._id === selectedMenuId) || (menus.length > 0 ? menus[0] : null);
  // Lock based on status: "inactive" (not isCurrentlyActive)
  // If status is "inactive", lock it even if it has active time slots
  const isMenuActive = selectedMenu?.status !== "inactive";
  const groupedItems = selectedMenu
    ? groupItemsByCategory(selectedMenu.items || [])
    : {};

  const loadMenus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTodayMenus();
      
      if (response.menus && response.menus.length > 0) {
        setMenus(response.menus);
        // Select first menu (active menu) by default, or keep current selection if it still exists
        const currentSelectedMenu = response.menus.find((m) => m._id === selectedMenuId);
        if (!currentSelectedMenu) {
          setSelectedMenuId(response.menus[0]._id);
        }
      } else {
        setMenus([]);
        setError('No menus available for today');
      }
    } catch (err) {
      console.error('Error loading menus:', err);
      setError(err.message || 'Failed to load menus');
      // Only show alert on initial load, not on refetch
      if (menus.length === 0) {
        Alert.alert('Error', err.message || 'Failed to load menus. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Refetch menus and active order whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMenus();
      fetchActiveOrder();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handleItemPress = (item) => {
    if (!isMenuActive) return;
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleAddToBag = (orderData) => {
    if (!isMenuActive) return;
    addItem({
      ...orderData,
      quantity: orderData.quantity || 1,
      size: orderData.size || 'Full',
      portionSize: orderData.portionSize || (orderData.size === 'Half' ? 'half' : 'full'),
      price: orderData.price ?? (orderData.size === 'Half' ? orderData.halfPrice : orderData.price),
    });
    setModalVisible(false);
  };

  const renderCategorySection = (category, items) => {
    // Ensure we have a valid menu state
    const menuIsActive = isMenuActive === true;
    
    return (
      <View key={category} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{category}</Text>
          {!menuIsActive && (
            <View style={styles.lockContainer}>
              <Ionicons name="lock-closed" size={18} color="#A67B5B" />
              <Text style={styles.lockText}>LOCKED</Text>
            </View>
          )}
        </View>
        <FlatList
          data={items}
          renderItem={({ item }) => renderItem(item)}
          keyExtractor={(item) => item._id || item.id}
          scrollEnabled={false}
        />
      </View>
    );
  };

  const renderItem = (item) => {
    const itemImage = item.images && item.images.length > 0 ? item.images[0] : null;
    // Use the isMenuActive from component scope
    const menuIsActive = isMenuActive === true;

    return (
      <TouchableOpacity
        style={[styles.card, !menuIsActive && styles.disabledCard]}
        onPress={() => handleItemPress(item)}
        disabled={!menuIsActive}
        activeOpacity={0.85}
      >
        {itemImage && (
          <Image source={{ uri: itemImage }} style={styles.cardImage} />
        )}

        <View style={styles.cardDetails}>
          <View style={styles.cardHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            {!menuIsActive && (
              <View style={styles.lockContainer}>
                <Ionicons name="lock-closed" size={16} color="#A67B5B" />
                <Text style={styles.lockTextSmall}>LOCKED</Text>
              </View>
            )}
          </View>

          {item.description && (
            <Text style={styles.itemDesc} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.itemPrice}>Rs {item.price}</Text>
            {menuIsActive && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddToBag(item)}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2D2926" />
          <Text style={styles.loadingText}>Loading menus...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && menus.length === 0) {
    return (
      <ScreenWrapper>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color="#A67B5B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadMenus}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Menu</Text>

        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => navigation.navigate('Cart')}
        >
          <Ionicons name="bag-handle" size={28} color="#2D2926" />
          {cartItems.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {cartItems.reduce((t, i) => t + (i.quantity || 1), 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Menu Tabs */}
      {menus.length > 0 && (
        <View style={styles.tabContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScroll}
          >
            {menus.map((menu) => {
              const isSelected = menu._id === selectedMenuId;
              // Lock based on status: "inactive" (not isCurrentlyActive)
              const isActive = menu.status !== "inactive";

              return (
                <TouchableOpacity
                  key={menu._id}
                  style={[
                    styles.tab,
                    isSelected && styles.activeTab,
                    !isActive && styles.inactiveTab,
                  ]}
                  onPress={() => setSelectedMenuId(menu._id)}
                >
                  <View style={styles.tabContent}>
                    <Text
                      style={[
                        styles.tabText,
                        isSelected && styles.activeTabText,
                        !isActive && styles.inactiveTabText,
                      ]}
                    >
                      {menu.name}
                    </Text>
                    {!isActive && (
                      <View style={styles.tabLockContainer}>
                        <Ionicons
                          name="lock-closed"
                          size={14}
                          color={isSelected ? '#fff' : '#A67B5B'}
                          style={styles.tabLockIcon}
                        />
                        <Text style={[styles.tabLockText, isSelected && styles.tabLockTextActive]}>
                          LOCKED
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Menu Items by Category */}
      {selectedMenu && Object.keys(groupedItems).length > 0 ? (
        <FlatList
          data={Object.entries(groupedItems)}
          renderItem={({ item: [category, items] }) =>
            renderCategorySection(category, items)
          }
          keyExtractor={([category]) => category}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No items available in this menu</Text>
        </View>
      )}

      <ItemDetailModal
        visible={modalVisible}
        item={selectedItem}
        onClose={() => setModalVisible(false)}
        onAddToBag={handleAddToBag}
        disabled={!isMenuActive}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2D2926',
  },

  cartBtn: {
    position: 'relative',
    padding: 5,
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFA500',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  tabContainer: {
    marginBottom: 10,
  },

  tabScroll: {
    paddingHorizontal: 20,
  },

  tab: {
    marginRight: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#E5D3B3',
  },

  activeTab: {
    backgroundColor: '#2D2926',
  },

  inactiveTab: {
    backgroundColor: '#F5F5F5',
    opacity: 0.7,
  },

  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  tabText: {
    fontWeight: 'bold',
    color: '#6F4E37',
  },

  activeTabText: {
    color: '#fff',
  },

  inactiveTabText: {
    color: '#A67B5B',
  },

  tabLockIcon: {
    marginLeft: 4,
  },

  tabLockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },

  tabLockText: {
    fontSize: 10,
    color: '#A67B5B',
    fontWeight: 'bold',
  },

  tabLockTextActive: {
    color: '#fff',
  },

  lockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  lockText: {
    fontSize: 12,
    color: '#A67B5B',
    fontWeight: 'bold',
  },

  lockTextSmall: {
    fontSize: 10,
    color: '#A67B5B',
    fontWeight: 'bold',
    marginLeft: 4,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'web' ? 120 : 80,
  },

  categorySection: {
    marginBottom: 24,
  },

  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2926',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 25,
    marginBottom: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 4,
  },

  disabledCard: {
    opacity: 0.6,
  },

  cardImage: {
    width: 110,
    aspectRatio: 1,
  },

  cardDetails: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D2926',
    flex: 1,
  },

  itemDesc: {
    fontSize: 12,
    color: '#A67B5B',
    marginVertical: 4,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFA500',
  },

  addButton: {
    backgroundColor: '#2D2926',
    padding: 8,
    borderRadius: 10,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#A67B5B',
  },

  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#A67B5B',
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2D2926',
    borderRadius: 25,
  },

  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  emptyText: {
    fontSize: 16,
    color: '#A67B5B',
    textAlign: 'center',
  },
});
