import { SafeAreaView, View, StyleSheet, Platform, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const MAX_WIDTH = Platform.OS === 'web' ? Math.min(width, 520) : width;

export default function ScreenWrapper({ children }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8EE',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      overflow: 'hidden',
    }),
  },
  wrapper: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    ...(Platform.OS === 'web' && {
      overflow: 'hidden',
      boxSizing: 'border-box',
    }),
  },
});
