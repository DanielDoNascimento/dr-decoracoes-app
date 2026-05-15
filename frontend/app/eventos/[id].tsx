import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getEventoById, updateEventoStatus } from '../../services/api';

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
  outrosValores: { descricao: string; valor: number }[];
  despesasTotais: number;
  status: string;
  observacoes: string;
  itens: ItemEvento[];
  totalProdutos: number;
  totalGeral: number;
  receitaTotal: number;
  lucroEvento: number;
}

export default function DetalhesEventoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const carregarEvento = useCallback(async () => {
    try {
      const data = await getEventoById(String(id));
      if (!data) {
        throw new Error('Evento não encontrado');
      }
      setEvento(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o evento');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    carregarEvento();
  }, [carregarEvento]);

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

  const formatTelefone = (input: string) => {
    const digits = input.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 14);
    }
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const alterarStatus = async (novoStatus: string) => {
    setAtualizandoStatus(true);
    try {
      await updateEventoStatus(String(id), novoStatus);

      Alert.alert('Sucesso', 'Status atualizado com sucesso!');
      carregarEvento();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao atualizar status');
    } finally {
      setAtualizandoStatus(false);
    }
  };

  const mostrarOpcoesStatus = () => {
    setStatusModalVisible(true);
  };

  const formatarEventoTexto = (e: Evento) => {
    const itensTexto = e.itens
      .map((item) => `  • ${item.nomeProduto} (${item.quantidade}x) - ${formatMoeda(item.valorTotal)}`)
      .join('\n');
    const outrosTexto = e.outrosValores.length > 0
      ? e.outrosValores.map((v) => `  • ${v.descricao}: ${formatMoeda(v.valor)}`).join('\n') + '\n'
      : '';
    return (
      `*D&R Decorações - Orçamento*\n\n` +
      `*Cliente:* ${e.cliente}\n` +
      `*Telefone:* ${formatTelefone(e.telefone)}\n` +
      `*Local:* ${e.local}\n` +
      `*Início:* ${formatData(e.dataHoraInicio)}\n` +
      `*Término:* ${formatData(e.dataHoraFim)}\n\n` +
      `*Produtos:*\n${itensTexto}\n\n` +
      `*Valores:*\n` +
      `  Produtos: ${formatMoeda(e.totalProdutos)}\n` +
      `  Frete: ${formatMoeda(e.valorFrete)}\n` +
      `  Mão de obra: ${formatMoeda(e.valorOrganizacao)}\n` +
      outrosTexto +
      `\n*Total: ${formatMoeda(e.totalGeral)}*` +
      (e.observacoes ? `\n\n*Obs:* ${e.observacoes}` : '')
    );
  };

  const compartilharWhatsApp = () => {
    if (!evento) return;
    const texto = formatarEventoTexto(evento);
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(texto)}`).catch(() => {
      Alert.alert('Erro', 'WhatsApp não encontrado no dispositivo');
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
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={compartilharWhatsApp} style={styles.actionButton}>
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/eventos/editar/${id}`)}
            style={styles.actionButton}
          >
            <Ionicons name="create" size={22} color="#FFB6C1" />
          </TouchableOpacity>
        </View>
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
              <Text style={styles.infoText}>{formatTelefone(evento.telefone)}</Text>
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
                <Text style={styles.totaisLabel}>Total Produtos:</Text>
                <Text style={styles.totaisValor}>{formatMoeda(evento.totalProdutos)}</Text>
              </View>
              <View style={styles.totaisRow}>
                <Text style={styles.totaisLabel}>Frete:</Text>
                <Text style={styles.totaisValor}>{formatMoeda(evento.valorFrete)}</Text>
              </View>
              <View style={styles.totaisRow}>
                <Text style={styles.totaisLabel}>Mão de obra:</Text>
                <Text style={styles.totaisValor}>{formatMoeda(evento.valorOrganizacao)}</Text>
              </View>
              {evento.outrosValores.length > 0 && (
                <>
                  <View style={styles.outrosValoresHeader}>
                    <Text style={styles.totaisLabel}>Outros valores:</Text>
                  </View>
                  {evento.outrosValores.map((item, index) => (
                    <View key={index} style={styles.outrosValoresRow}>
                      <Text style={styles.outrosValoresLabel}>{item.descricao}</Text>
                      <Text style={styles.totaisValor}>{formatMoeda(item.valor)}</Text>
                    </View>
                  ))}
                </>
              )}
              <View style={[styles.totaisRow, styles.totaisRowFinal]}>
                <Text style={styles.totaisLabelFinal}>Total de despesas:</Text>
                <Text style={styles.totaisValorFinal}>{formatMoeda(evento.despesasTotais)}</Text>
              </View>

              <View style={[styles.totaisRow, styles.totaisRowFinal]}>
                <Text style={styles.totaisLabelFinal}>Lucro do evento:</Text>
                <Text style={styles.totaisValorFinal}>{formatMoeda(evento.lucroEvento)}</Text>
              </View>

              <View style={[styles.totaisRow, styles.totaisRowFinal]}>
                <Text style={styles.totaisLabelFinal}>TOTAL DO EVENTO:</Text>
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

      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alterar Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Selecione o novo status do evento:</Text>
            {[
              { label: 'Orçamento', value: 'orçamento' },
              { label: 'Pendente', value: 'pendente' },
              { label: 'Realizado', value: 'realizado' },
              { label: 'Cancelado', value: 'cancelado' },
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                style={styles.modalOption}
                onPress={async () => {
                  setStatusModalVisible(false);
                  await alterarStatus(item.value);
                }}
              >
                <Text style={styles.modalOptionText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderWidth: 1.5,
    borderColor: '#FFB6C1',
  },
  statusCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusCardLabel: {
    fontSize: 13,
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
  status_cancelado: {
    backgroundColor: '#F8D7DA',
  },
  status_pendente: {
    backgroundColor: '#D1ECF1',
  },
  status_realizado: {
    backgroundColor: '#D4EDDA',
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
  outrosValoresHeader: {
    marginTop: 4,
    marginBottom: 2,
  },
  outrosValoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingLeft: 12,
  },
  outrosValoresLabel: {
    fontSize: 14,
    color: '#888',
    flex: 1,
    marginRight: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#777',
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  observacoes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
