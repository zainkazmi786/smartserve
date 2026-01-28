import React, { useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreenModule from 'expo-splash-screen';
import { Poppins_700Bold } from '@expo-google-fonts/poppins';

SplashScreenModule.preventAutoHideAsync();

const SplashScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    'Poppins-Bold': Poppins_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreenModule.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <View style={styles.imageContainer}>
        <Image 
          source={require('../assets/images/Splashscreen.png')} 
          style={styles.image}
          resizeMode="cover" 
        />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.title}>Savor the Moment, One Sip at a Time.</Text>
      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('Auth')} // Takes you to Login/Signup
      >
        <Text style={styles.buttonText}>Get started</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8EE',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  imageContainer: {
    marginBottom: 40,
    // Shadow for the image container
    ...Platform.select({
      web: { boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.1)' },
      default: { elevation: 8 },
    }),
  },
  image: {
    width: 320,
    height: 320,
    borderRadius: 40, // This rounds the edges of your picture
  },
  textContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    textAlign: 'center',
    color: '#2D2926',
  },
  button: {
    backgroundColor: '#FFA500',
    paddingVertical: 18,
    paddingHorizontal: 70,
    borderRadius: 35,
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(255, 165, 0, 0.4)' },
      default: { elevation: 5 },
    }),
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
  },
});

export default SplashScreen;