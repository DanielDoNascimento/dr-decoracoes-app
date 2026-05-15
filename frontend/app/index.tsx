import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.topDecoration} />

      <View style={styles.content}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/images/logo_dr.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.brandName}>D&R Decorações</Text>
        <Text style={styles.tagline}>Controle de Festas e Eventos</Text>

        <View style={styles.divider} />

        <Text style={styles.welcomeText}>
          Gerencie seus eventos, produtos e finanças com facilidade.
        </Text>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(tabs)/dashboard')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Acessar App</Text>
        </TouchableOpacity>
        <Text style={styles.version}>D&R Decorações • v1.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  topDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: '#FFF0F3',
    borderBottomLeftRadius: 64,
    borderBottomRightRadius: 64,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  logoWrapper: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FFB6C1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    marginBottom: 28,
  },
  logo: {
    width: 140,
    height: 140,
  },
  brandName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#D05078',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: '#888',
    marginBottom: 24,
    textAlign: 'center',
  },
  divider: {
    width: 48,
    height: 3,
    backgroundColor: '#FFB6C1',
    borderRadius: 2,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  bottomSection: {
    padding: 32,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#FFB6C1',
    paddingVertical: 18,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#FFB6C1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  version: {
    fontSize: 12,
    color: '#CCC',
  },
});
