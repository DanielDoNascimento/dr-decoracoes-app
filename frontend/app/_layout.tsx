import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { pingServer } from '../services/api';

export default function RootLayout() {
  const [serverReady, setServerReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    const timer = setInterval(() => {
      if (!cancelled) setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const init = async () => {
      // 1. Verificar atualização OTA (só em builds de produção)
      if (!__DEV__) {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
            return;
          }
        } catch {
          // falha silenciosa — app continua normalmente
        }
      }

      if (!cancelled) setChecking(false);

      // 2. Aguardar servidor acordar
      while (!cancelled) {
        const ok = await pingServer();
        if (ok) {
          if (!cancelled) setServerReady(true);
          break;
        }
        await new Promise(r => setTimeout(r, 3000));
      }
    };

    init();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!serverReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <Text style={styles.logo}>D&R</Text>
          <Text style={styles.brand}>Decorações</Text>
          <ActivityIndicator size="large" color="#FFB6C1" style={styles.spinner} />
          <Text style={styles.message}>
            {checking
              ? 'Verificando atualizações...'
              : elapsed >= 5
              ? 'Servidor iniciando...'
              : 'Carregando...'}
          </Text>
          {!checking && elapsed >= 5 && (
            <Text style={styles.hint}>Isso é normal no primeiro acesso do dia</Text>
          )}
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFB6C1',
    letterSpacing: 6,
  },
  brand: {
    fontSize: 20,
    color: '#AAAAAA',
    marginTop: 4,
    letterSpacing: 3,
  },
  spinner: {
    marginTop: 56,
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    color: '#BBBBBB',
    textAlign: 'center',
  },
});
