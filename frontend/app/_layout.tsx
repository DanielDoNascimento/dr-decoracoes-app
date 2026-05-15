import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initBackupSync } from '../services/backup';
import { DatabaseProvider, useDatabase } from '../services/DatabaseProvider';

const RootNavigator = () => {
  const [ready, setReady] = useState(false);
  const { databaseReady } = useDatabase();

  useEffect(() => {
    let mounted = true;
    let stopBackup = () => {};
    if (databaseReady) {
      if (mounted) setReady(true);
      stopBackup = initBackupSync();
    }
    return () => {
      mounted = false;
      stopBackup();
    };
  }, [databaseReady]);

  if (!ready || !databaseReady) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#FFB6C1" />
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
};

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <RootNavigator />
    </DatabaseProvider>
  );
}
