import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { listEventos } from '../../services/api';

interface Evento {
  id: string;
  cliente: string;
  telefone: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  local: string;
  status: string;
  totalGeral: number;
}

export default function EventosScreen() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('orçamento');

  const fetchEventos = async () => {
    try {
      const data = await listEventos();
      const ordenados = [...data].sort((a: Evento, b: Evento) =>
        new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime()
      );
      setEventos(ordenados);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os eventos');
    } finally {
      setLoading(false);
    }
  };

  const contarStatus = (status: string) => eventos.filter((e) => e.status === status).length;

  useFocusEffect(
    useCallback(() => {
      fetchEventos();
    }, [])
  );

  const formatData = (dataISO: string) => {
    const date = new Date(dataISO);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
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

  const isEventoAtrasado = (dataISO: string, status: string) => {
    if (status === 'realizado') return false;
    const dataEvento = new Date(dataISO);
    const agora = new Date();
    return dataEvento < agora;
  };

  const eventosFiltrados = eventos.filter((e) => e.status === filtroStatus);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Eventos</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/eventos/novo')}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filtro Rápido */}
      <View style={styles.filterContainer}>
        {[
          { label: 'Orçamento', value: 'orçamento' },
          { label: 'Pendente', value: 'pendente' },
          { label: 'Realizado', value: 'realizado' },
          { label: 'Cancelado', value: 'cancelado' },
        ].map((tab) => {
          const count = contarStatus(tab.value);
          const active = filtroStatus === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.filterButton, active && styles.filterButtonActive]}
              onPress={() => setFiltroStatus(tab.value)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFB6C1" />
        </View>
      ) : eventosFiltrados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>Nenhum evento encontrado</Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => router.push('/eventos/novo')}
          >
            <Text style={styles.emptyButtonText}>Criar Primeiro Evento</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={eventosFiltrados}
          renderItem={({ item }) => {
            const atrasado = isEventoAtrasado(item.dataHoraInicio, item.status);
            return (
              <TouchableOpacity 
                style={styles.eventoCard}
                onPress={() => router.push(`/eventos/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.eventoHeader}>
                  <Text style={styles.eventoCliente}>{item.cliente}</Text>
                  <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </View>
                <View style={styles.eventoInfo}>
                  <Ionicons name="calendar" size={16} color={atrasado ? "#FF6B6B" : "#666"} />
                  <Text style={[styles.eventoInfoText, atrasado && styles.eventoInfoTextAtrasado]}>
                    {formatData(item.dataHoraInicio)}
                    {atrasado && ' • Atrasado'}
                  </Text>
                </View>
                <View style={styles.eventoInfo}>
                  <Ionicons name="location" size={16} color="#666" />
                  <Text style={styles.eventoInfoText}>{item.local}</Text>
                </View>
                <View style={styles.eventoFooter}>
                  <Text style={styles.eventoValor}>{formatMoeda(item.totalGeral)}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFB6C1',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFB6C1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#FFB6C1',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFF',
  },
  filterBadge: {
    marginTop: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  filterBadgeTextActive: {
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
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
  eventoInfoTextAtrasado: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  eventoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#FFB6C1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
