import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Evento {
  id: string;
  cliente: string;
  dataHoraInicio: string;
  local: string;
  status: string;
  totalGeral: number;
}

interface DashboardData {
  totalNaoRealizados: number;
  proximosEventos: Evento[];
}

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/eventos/dashboard`);
      if (!response.ok) throw new Error('Erro ao carregar dashboard');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const formatData = (dataISO: string) => {
    const date = new Date(dataISO);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFB6C1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFB6C1']} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>D&R Decorações</Text>
          <Text style={styles.subtitle}>Painel de Controle</Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statsCard}>
              <View style={styles.statsIconContainer}>
                <Ionicons name="calendar-outline" size={32} color="#FFB6C1" />
              </View>
              <View style={styles.statsContent}>
                <Text style={styles.statsValue}>{data?.totalNaoRealizados || 0}</Text>
                <Text style={styles.statsLabel}>Eventos Não Realizados</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Próximos Eventos</Text>
              {data?.proximosEventos && data.proximosEventos.length > 0 ? (
                data.proximosEventos.map((evento) => (
                  <View key={evento.id} style={styles.eventoCard}>
                    <View style={styles.eventoHeader}>
                      <Text style={styles.eventoCliente}>{evento.cliente}</Text>
                      <View style={[styles.statusBadge, styles[`status_${evento.status}`]]}>
                        <Text style={styles.statusText}>{evento.status}</Text>
                      </View>
                    </View>
                    <View style={styles.eventoInfo}>
                      <Ionicons name="calendar" size={16} color="#666" />
                      <Text style={styles.eventoInfoText}>{formatData(evento.dataHoraInicio)}</Text>
                    </View>
                    <View style={styles.eventoInfo}>
                      <Ionicons name="location" size={16} color="#666" />
                      <Text style={styles.eventoInfoText}>{evento.local}</Text>
                    </View>
                    <View style={styles.eventoFooter}>
                      <Text style={styles.eventoValor}>{formatMoeda(evento.totalGeral)}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={64} color="#CCC" />
                  <Text style={styles.emptyText}>Nenhum evento próximo</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFB6C1',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE8EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statsContent: {
    flex: 1,
    justifyContent: 'center',
  },
  statsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  eventoCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventoCliente: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  status_orçamento: {
    backgroundColor: '#FFF3CD',
  },
  status_pendente: {
    backgroundColor: '#D1ECF1',
  },
  status_realizado: {
    backgroundColor: '#D4EDDA',
  },
  status_cancelado: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  eventoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventoInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  eventoFooter: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  eventoValor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFB6C1',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#FFB6C1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});