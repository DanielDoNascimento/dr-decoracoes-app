import React, { useCallback, useEffect, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { getDashboardData } from '../../services/api';

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
  const [eventosEstaSemana, setEventosEstaSemana] = useState(0);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await getDashboardData();
      setData(result);

      const hoje = new Date();
      const seteDiasDepois = new Date();
      seteDiasDepois.setDate(hoje.getDate() + 7);

      const eventosSemana = (result.proximosEventos || []).filter((evento: Evento) => {
        const dataEvento = new Date(evento.dataHoraInicio);
        return dataEvento >= hoje && dataEvento <= seteDiasDepois;
      });

      setEventosEstaSemana(eventosSemana.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const formatData = (dataISO: string) => {
    const date = new Date(dataISO);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia!';
    if (hour < 18) return 'Boa tarde!';
    return 'Boa noite!';
  };

  const formatCurrentDate = () => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
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
          <Text style={styles.loadingText}>Conectando ao servidor...</Text>
          <Text style={styles.loadingSubText}>Pode levar até 30 segundos na primeira vez</Text>
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
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.title}>D&R Decorações</Text>
            <Text style={styles.subtitle}>{formatCurrentDate()}</Text>
          </View>
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
            {/* Card Clicável de Eventos Não Realizados */}
            <TouchableOpacity 
              style={styles.statsCard}
              onPress={() => router.push('/(tabs)/eventos')}
              activeOpacity={0.7}
            >
              <View style={styles.statsIconContainer}>
                <Ionicons name="calendar-outline" size={32} color="#FFB6C1" />
              </View>
              <View style={styles.statsContent}>
                <Text style={styles.statsValue}>{data?.totalNaoRealizados || 0}</Text>
                <Text style={styles.statsLabel}>Eventos Não Realizados</Text>
                {eventosEstaSemana > 0 && (
                  <Text style={styles.statsSecondary}>
                    {eventosEstaSemana} esta semana
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={24} color="#CCC" />
            </TouchableOpacity>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Próximos Eventos</Text>
              {data?.proximosEventos && data.proximosEventos.length > 0 ? (
                data.proximosEventos.map((evento) => (
                  <TouchableOpacity 
                    key={evento.id} 
                    style={styles.eventoCardCompact}
                    onPress={() => router.push(`/eventos/${evento.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.eventoMainInfo}>
                      <View style={styles.eventoLeft}>
                        <Text style={styles.eventoClienteCompact}>{evento.cliente}</Text>
                        <View style={styles.eventoInfoRow}>
                          <Ionicons name="calendar" size={14} color="#666" />
                          <Text style={styles.eventoInfoTextCompact}>{formatData(evento.dataHoraInicio)}</Text>
                        </View>
                      </View>
                      <View style={styles.eventoRight}>
                        <View style={[styles.statusChipSmall, (styles as any)[`status_${evento.status}`]]}>
                          <Text style={styles.statusChipText}>{evento.status}</Text>
                        </View>
                        <Text style={styles.eventoValorCompact}>{formatMoeda(evento.totalGeral)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={80} color="#E0E0E0" />
                  <Text style={styles.emptyText}>Nenhum evento próximo</Text>
                  <Text style={styles.emptySubtext}>
                    Crie seu primeiro evento para começar
                  </Text>
                  <TouchableOpacity 
                    style={styles.emptyButton}
                    onPress={() => router.push('/eventos/novo')}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#FFB6C1" />
                    <Text style={styles.emptyButtonText}>Criar novo evento</Text>
                  </TouchableOpacity>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  loadingSubText: {
    fontSize: 13,
    color: '#AAA',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  header: {
    padding: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  greeting: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#D05078',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#AAA',
    textTransform: 'capitalize',
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
    alignItems: 'center',
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
  statsSecondary: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statsCardGreen: {
    marginTop: 0,
  },
  statsIconGreen: {
    backgroundColor: '#E8F5E9',
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
  eventoCardCompact: {
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
  eventoMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventoLeft: {
    flex: 1,
    marginRight: 12,
  },
  eventoRight: {
    alignItems: 'flex-end',
  },
  eventoClienteCompact: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  eventoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventoInfoTextCompact: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  statusChipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 6,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
    color: '#555',
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
  eventoValorCompact: {
    fontSize: 15,
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
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFB6C1',
    backgroundColor: '#FFF',
  },
  emptyButtonText: {
    color: '#FFB6C1',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
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
