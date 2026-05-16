import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../contexts/SyncContext';

export default function OfflineBanner() {
  const { isOnline, pendingCount, syncStatus } = useSyncContext();

  if (isOnline && syncStatus === 'idle') return null;

  if (syncStatus === 'syncing') {
    return (
      <View style={[styles.banner, styles.syncing]}>
        <Ionicons name="cloud-upload-outline" size={14} color="#FFF" />
        <Text style={styles.text}>Sincronizando {pendingCount} operação{pendingCount !== 1 ? 'ões' : ''}...</Text>
      </View>
    );
  }

  if (syncStatus === 'synced') {
    return (
      <View style={[styles.banner, styles.synced]}>
        <Ionicons name="checkmark-circle-outline" size={14} color="#FFF" />
        <Text style={styles.text}>Sincronizado com sucesso</Text>
      </View>
    );
  }

  if (!isOnline) {
    return (
      <View style={[styles.banner, styles.offline]}>
        <Ionicons name="cloud-offline-outline" size={14} color="#FFF" />
        <Text style={styles.text}>
          {pendingCount > 0
            ? `Offline • ${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`
            : 'Offline • mostrando último acesso'}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 6,
  },
  offline: {
    backgroundColor: '#888',
  },
  syncing: {
    backgroundColor: '#4A90D9',
  },
  synced: {
    backgroundColor: '#5CB85C',
  },
  text: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
