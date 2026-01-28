import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { useActiveOrder } from '../context/ActiveOrderContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Max width for desktop / laptop
const MAX_WIDTH = isWeb ? Math.min(SCREEN_WIDTH, 520) : SCREEN_WIDTH;

// Responsive chart size
const CHART_SIZE = Math.min(MAX_WIDTH * 0.7, 260);

export default function HomeScreen({ navigation }) {
  const [activeMenu, setActiveMenu] = useState('Snacks');
  const { fetchActiveOrder } = useActiveOrder();

  useFocusEffect(
    useCallback(() => {
      fetchActiveOrder();
    }, [fetchActiveOrder])
  );

  const pieData = [
    { value: 45, color: '#2D2926', label: 'White Karahi' },
    { value: 25, color: '#FFA500', label: 'Beef Pulao' },
    { value: 20, color: '#6F4E37', label: 'Samosa Chat' },
    { value: 10, color: '#E5D3B3', label: 'Tea' },
  ];

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 8 && hour < 12) setActiveMenu('Breakfast');
    else if (hour >= 12 && hour < 17) setActiveMenu('Lunch');
    else if (hour >= 18 && hour < 22) setActiveMenu('Dinner');
    else setActiveMenu('Snacks');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Centered universal wrapper */}
      <View style={styles.wrapper}>
        <ScrollView
          showsVerticalScrollIndicator={isWeb}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.welcome}>Welcome, Aasim!</Text>
            <Text style={styles.subtitle}>Cafe Business Performance</Text>
          </View>

          {/* Cards Row */}
          <View style={styles.cardRow}>
            <View style={[styles.card, styles.darkCard]}>
              <Text style={styles.label}>TOP RATED ITEM</Text>
              <Text style={styles.itemName}>White Karahi</Text>
              <View style={styles.starRow}>
                {[...Array(5)].map((_, i) => (
                  <Ionicons key={i} name="star" size={14} color="#FFA500" />
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Queue</Text>
                <Text style={styles.queueCount}>14/20</Text>
              </View>

              <View style={styles.seekBg}>
                <View style={[styles.seekFill, { width: '70%' }]} />
              </View>

              <Text style={styles.hint}>Currently Busy</Text>
            </View>
          </View>

          {/* Chart Section */}
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Top Selling</Text>

            <View style={styles.chartBox}>
              <PieChart
                data={pieData}
                donut
                radius={CHART_SIZE / 2}
                innerRadius={CHART_SIZE / 3}
                innerCircleColor="#fff"
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerText}>{activeMenu}</Text>
                    <Text style={styles.centerSub}>Active Menu</Text>
                  </View>
                )}
              />
            </View>

            {/* Legend */}
            <View style={styles.legendWrap}>
              {pieData.map((item, i) => (
                <View key={i} style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.btnContainer}
            onPress={() => navigation.navigate('Menu')}
          >
            <LinearGradient
              colors={['#FFA500', '#FF8C00']}
              style={styles.gradientBtn}
            >
              <Text style={styles.btnText}>Live Digital Menu</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8EE',
    alignItems: 'center',
  },

  wrapper: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: Platform.OS === 'web' ? 120 : 80,
  },

  header: {
    marginBottom: 25,
  },

  welcome: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D2926',
  },

  subtitle: {
    fontSize: 14,
    color: '#6F4E37',
  },

  cardRow: {
    flexDirection: 'row',
    marginBottom: 25,
  },

  card: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 15,
    elevation: 4,
    justifyContent: 'space-between',
  },

  darkCard: {
    backgroundColor: '#2D2926',
  },

  label: {
    color: '#A67B5B',
    fontSize: 10,
  },

  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },

  starRow: {
    flexDirection: 'row',
    marginTop: 5,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D2926',
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  queueCount: {
    color: '#FFA500',
    fontSize: 12,
    fontWeight: 'bold',
  },

  seekBg: {
    height: 6,
    backgroundColor: '#FFF8EE',
    borderRadius: 3,
    marginVertical: 8,
    overflow: 'hidden',
  },

  seekFill: {
    height: '100%',
    backgroundColor: '#2D2926',
  },

  hint: {
    fontSize: 11,
    color: '#A67B5B',
  },

  chartSection: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 25,
    elevation: 5,
    marginBottom: 25,
    width: '100%',
    minHeight: 320,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2926',
    marginBottom: 10,
  },

  chartBox: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerLabel: {
    alignItems: 'center',
  },

  centerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFA500',
  },

  centerSub: {
    fontSize: 10,
    color: '#A67B5B',
  },

  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },

  legendText: {
    fontSize: 10,
    color: '#6F4E37',
  },

  btnContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
  },

  gradientBtn: {
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
});
