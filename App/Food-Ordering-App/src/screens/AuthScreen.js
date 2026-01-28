import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';

export default function AuthScreen({ navigation }) {
  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <Text style={styles.header}>Welcome Back!</Text>
        <Text style={styles.subHeader}>
          Sign in to continue your coffee journey
        </Text>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupButton}
          onPress={() => navigation.navigate('Signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.signupText}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  header: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#2D2926',
    textAlign: 'center',
  },

  subHeader: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginTop: 10,
    color: '#6F4E37',
    marginBottom: 50,
  },

  loginButton: {
    backgroundColor: '#2D2926',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)' },
      default: { elevation: 4 },
    }),
  },

  loginText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },

  signupButton: {
    borderWidth: 2,
    borderColor: '#2D2926',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
  },

  signupText: {
    color: '#2D2926',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
});
