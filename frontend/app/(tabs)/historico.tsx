import React, { useEffect, useState } from 'react';
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
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

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

export default function HistoricoScreen() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);

  const fetchEventos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/eventos`);
      if (!response.ok) throw new Error('Erro ao carregar eventos');
      const data = await response.json();
      // Filtrar apenas realizados e cancelados
      const eventosFiltrados = data.filter(
        (e: Evento) => e.status === 'realizado' || e.status === 'cancelado'
      );
      setEventos(eventosFiltrados);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o histórico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  const formatData = (dataISO: string) => {
    const date = new Date(dataISO);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const eventosFiltrados = filtroStatus
    ? eventos.filter((e) => e.status === filtroStatus)
    : eventos;

  const renderEvento = ({ item }: { item: Evento }) => (
    <View style={styles.eventoCard}>
      <View style={styles.eventoHeader}>
        <Text style={styles.eventoCliente}>{item.cliente}</Text>
        <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.eventoInfo}>
        <Ionicons name="calendar" size={16} color="#666" />
        <Text style={styles.eventoInfoText}>{formatData(item.dataHoraInicio)}</Text>
      </View>
      <View style={styles.eventoInfo}>
        <Ionicons name="location" size={16} color="#666" />
        <Text style={styles.eventoInfoText}>{item.local}</Text>
      </View>
      <View style={styles.eventoFooter}>
        <Text style={styles.eventoValor}>{formatMoeda(item.totalGeral)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !filtroStatus && styles.filterButtonActive]}
          onPress={() => setFiltroStatus(null)}
        >
          <Text style={[styles.filterText, !filtroStatus && styles.filterTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filtroStatus === 'realizado' && styles.filterButtonActive,
          ]}
          onPress={() => setFiltroStatus('realizado')}
        >
          <Text
            style={[
              styles.filterText,
              filtroStatus === 'realizado' && styles.filterTextActive,
            ]}
          >
            Realizados
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filtroStatus === 'cancelado' && styles.filterButtonActive,
          ]}
          onPress={() => setFiltroStatus('cancelado')}
        >
          <Text
            style={[
              styles.filterText,
              filtroStatus === 'cancelado' && styles.filterTextActive,
            ]}
          >
            Cancelados
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFB6C1" />
        </View>
      ) : eventosFiltrados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>Nenhum evento encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={eventosFiltrados}
          renderItem={renderEvento}
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterButtonActive: {
    backgroundColor: '#FFB6C1',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
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
});