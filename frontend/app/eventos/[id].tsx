import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface ItemEvento {
  produtoId: string;
  codigoProduto: string;
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

interface Evento {
  id: string;
  cliente: string;
  telefone: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  local: string;
  valorFrete: number;
  valorOrganizacao: number;
  status: string;
  observacoes: string;
  itens: ItemEvento[];
  totalProdutos: number;
  totalGeral: number;
}

export default function DetalhesEventoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);

  useEffect(() => {
    carregarEvento();
  }, []);

  const carregarEvento = async () => {
    try {
      const response = await fetch(`${API_URL}/api/eventos/${id}`);
      if (!response.ok) throw new Error('Erro ao carregar evento');
      const data = await response.json();
      setEvento(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o evento');
      router.back();
    } finally {
      setLoading(false);
    }
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

  const alterarStatus = async (novoStatus: string) => {
    setAtualizandoStatus(true);
    try {
      const response = await fetch(`${API_URL}/api/eventos/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao atualizar status');
      }

      Alert.alert('Sucesso', 'Status atualizado com sucesso!');
      carregarEvento();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao atualizar status');
    } finally {
      setAtualizandoStatus(false);
    }
  };

  const confirmarExclusao = () => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: excluirEvento },
      ]
    );
  };

  const excluirEvento = async () => {
    try {
      const response = await fetch(`${API_URL}/api/eventos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao excluir evento');
      }

      Alert.alert('Sucesso', 'Evento excluído com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao excluir evento');
    }
  };

  const mostrarOpcoesStatus = () => {
    const opcoes = [
      { text: 'Orçamento', value: 'orçamento' },
      { text: 'Pendente', value: 'pendente' },
      { text: 'Realizado', value: 'realizado' },
      { text: 'Cancelado', value: 'cancelado' },
      { text: 'Cancelar', style: 'cancel' as const },
    ];

    Alert.alert(
      'Alterar Status',
      'Selecione o novo status do evento:',
      opcoes.slice(0, -1).map(op => ({
        text: op.text,
        onPress: () => alterarStatus(op.value),
      })).concat([opcoes[opcoes.length - 1]])
    );
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

  if (!evento) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFB6C1" />
        </TouchableOpacity>
        <Text style={styles.title}>Detalhes do Evento</Text>
        <TouchableOpacity 
          onPress={() => router.push(`/eventos/editar/${id}`)} 
          style={styles.editButton}
        >
          <Ionicons name="create" size={24} color="#FFB6C1" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Status Card - Clicável */}
          <TouchableOpacity 
            style={styles.statusCard}
            onPress={mostrarOpcoesStatus}
            disabled={atualizandoStatus}
            activeOpacity={0.7}
          >
            <View style={styles.statusCardHeader}>
              <Text style={styles.statusCardLabel}>Status do Evento (Toque para alterar)</Text>
              <Ionicons name="chevron-down" size={20} color="#FFB6C1" />
            </View>
            <View style={[styles.statusBadgeLarge, styles[`status_${evento.status}`]]}>
              <Text style={styles.statusBadgeText}>{evento.status.toUpperCase()}</Text>
            </View>
            {atualizandoStatus && (
              <ActivityIndicator size="small" color="#FFB6C1" style={{ marginTop: 8 }} />
            )}
          </TouchableOpacity>

          {/* Cliente */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color="#FFB6C1" />
              <Text style={styles.infoText}>{evento.cliente}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color="#FFB6C1" />
              <Text style={styles.infoText}>{evento.telefone}</Text>
            </View>
          </View>

          {/* Data e Local */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data e Local</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color="#FFB6C1" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Início:</Text>
                <Text style={styles.infoText}>{formatData(evento.dataHoraInicio)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color="#FFB6C1" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Término:</Text>
                <Text style={styles.infoText}>{formatData(evento.dataHoraFim)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#FFB6C1" />
              <Text style={styles.infoText}>{evento.local}</Text>
            </View>
          </View>

          {/* Produtos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Produtos ({evento.itens.length})</Text>
            {evento.itens.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNome}>{item.nomeProduto}</Text>
                  <Text style={styles.itemValor}>{formatMoeda(item.valorTotal)}</Text>
                </View>
                <Text style={styles.itemCodigo}>#{item.codigoProduto}</Text>
                <View style={styles.itemFooter}>
                  <Text style={styles.itemInfo}>
                    {item.quantidade}x {formatMoeda(item.valorUnitario)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Valores */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Valores</Text>
            <View style={styles.totaisCard}>
              <View style={styles.totaisRow}>
                <Text style={styles.totaisLabel}>Produtos:</Text>
                <Text style={styles.totaisValor}>{formatMoeda(evento.totalProdutos)}</Text>
              </View>
              <View style={styles.totaisRow}>
                <Text style={styles.totaisLabel}>Frete:</Text>
                <Text style={styles.totaisValor}>{formatMoeda(evento.valorFrete)}</Text>
              </View>
              <View style={styles.totaisRow}>
                <Text style={styles.totaisLabel}>Organização:</Text>
                <Text style={styles.totaisValor}>{formatMoeda(evento.valorOrganizacao)}</Text>
              </View>
              <View style={[styles.totaisRow, styles.totaisRowFinal]}>
                <Text style={styles.totaisLabelFinal}>Total Geral:</Text>
                <Text style={styles.totaisValorFinal}>{formatMoeda(evento.totalGeral)}</Text>
              </View>
            </View>
          </View>

          {/* Observações */}
          {evento.observacoes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Observações</Text>
              <Text style={styles.observacoes}>{evento.observacoes}</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusCardLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  statusBadgeLarge: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  itemCard: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  itemValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFB6C1',
  },
  itemCodigo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemInfo: {
    fontSize: 14,
    color: '#666',
  },
  totaisCard: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 8,
  },
  totaisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totaisRowFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  totaisLabel: {
    fontSize: 14,
    color: '#666',
  },
  totaisValor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totaisLabelFinal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totaisValorFinal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFB6C1',
  },
  observacoes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
