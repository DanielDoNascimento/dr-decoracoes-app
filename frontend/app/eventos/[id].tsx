import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { deleteEvento, getEventoById, updateEventoStatus, updateEventoPagamento } from '../../services/api';
import { showError } from '../../services/alert';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
  statusPagamento: string;
  formaPagamento: string;
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
  const [atualizandoPagamento, setAtualizandoPagamento] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [cancelarConfirmVisible, setCancelarConfirmVisible] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const carregarEvento = useCallback(async () => {
    try {
      const data = await getEventoById(String(id));
      if (!data) {
        throw new Error('Evento não encontrado');
      }
      setEvento(data);
    } catch {
      showError('Não foi possível carregar o evento');
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

      carregarEvento();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro ao atualizar status');
    } finally {
      setAtualizandoStatus(false);
    }
  };

  const mostrarOpcoesStatus = () => {
    setStatusModalVisible(true);
  };

  const alterarPagamento = async (novoStatus: string) => {
    if (!evento || atualizandoPagamento) return;
    setAtualizandoPagamento(true);
    try {
      await updateEventoPagamento(String(id), novoStatus);
      setEvento({ ...evento, statusPagamento: novoStatus });
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro ao atualizar pagamento');
    } finally {
      setAtualizandoPagamento(false);
    }
  };

  const excluirEvento = async () => {
    setExcluindo(true);
    try {
      await deleteEvento(String(id));
      setDeleteModalVisible(false);
      router.replace('/(tabs)/eventos');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Não foi possível excluir o evento');
    } finally {
      setExcluindo(false);
    }
  };

  const gerarPDF = async () => {
    if (!evento) return;

    const itensRows = evento.itens.map((item) => `
      <tr>
        <td>${item.nomeProduto}</td>
        <td style="text-align:center">${item.quantidade}</td>
      </tr>`).join('');

    const dataEvento = new Date(evento.dataHoraInicio).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
    const horaEvento = new Date(evento.dataHoraInicio).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit',
    });

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; color: #333; background: #fff; padding: 48px 52px; }

  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 2px solid #FFB6C1; }
  .brand h1 { font-size: 26px; color: #FFB6C1; font-weight: 900; letter-spacing: 1px; }
  .brand p { color: #AAA; font-size: 12px; margin-top: 2px; }
  .doc-info { text-align: right; }
  .doc-info .label { font-size: 11px; color: #AAA; text-transform: uppercase; letter-spacing: 1px; }
  .doc-info .value { font-size: 13px; color: #555; margin-top: 2px; }

  .greeting { font-size: 15px; color: #555; margin-bottom: 20px; line-height: 1.6; }
  .greeting strong { color: #333; }

  .info-block { background: #FFF8F9; border-left: 3px solid #FFB6C1; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 28px; }
  .info-block .row { display:flex; gap: 8px; font-size: 14px; margin-bottom: 6px; }
  .info-block .row:last-child { margin-bottom: 0; }
  .info-block .lbl { color: #AAA; min-width: 60px; }
  .info-block .val { color: #333; font-weight: 600; }

  .section-title { font-size: 11px; font-weight: bold; color: #FFB6C1; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; }
  table { width:100%; border-collapse:collapse; font-size: 14px; margin-bottom: 28px; }
  thead tr { border-bottom: 2px solid #FFB6C1; }
  thead td { padding: 8px 10px; font-weight: bold; color: #FFB6C1; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  tbody tr { border-bottom: 1px solid #F0F0F0; }
  tbody td { padding: 10px 10px; }

  .total-box { display:flex; justify-content:flex-end; margin-top: 4px; }
  .total-inner { background: #FFB6C1; color: #fff; padding: 14px 24px; border-radius: 10px; text-align: center; min-width: 200px; }
  .total-inner .total-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85; }
  .total-inner .total-value { font-size: 26px; font-weight: 900; margin-top: 4px; }

  .obs { background:#F9F9F9; border-left:3px solid #DDD; padding:10px 14px; font-size:13px; color:#666; margin-top:8px; border-radius: 0 6px 6px 0; }

  .footer { text-align:center; color:#CCC; font-size:11px; margin-top:48px; padding-top:16px; border-top:1px solid #EEE; }
</style>
</head>
<body>

  <div class="header">
    <div class="brand">
      <h1>D&R Decorações</h1>
      <p>Decoração de eventos</p>
    </div>
    <div class="doc-info">
      <div class="label">Orçamento</div>
      <div class="value">${new Date().toLocaleDateString('pt-BR')}</div>
    </div>
  </div>

  <p class="greeting">
    Prezado(a) <strong>${evento.cliente}</strong>,<br/>
    segue abaixo o orçamento para o seu evento conforme solicitado.
  </p>

  <div class="info-block">
    <div class="row"><span class="lbl">Data:</span><span class="val">${dataEvento}, às ${horaEvento}</span></div>
    <div class="row"><span class="lbl">Local:</span><span class="val">${evento.local}</span></div>
    <div class="row"><span class="lbl">Telefone:</span><span class="val">${formatTelefone(evento.telefone)}</span></div>
  </div>

  <div class="section-title">Itens do Orçamento</div>
  <table>
    <thead><tr>
      <td>Produto</td>
      <td style="text-align:center">Qtd</td>
    </tr></thead>
    <tbody>${itensRows}</tbody>
  </table>

  <div class="total-box">
    <div class="total-inner">
      <div class="total-label">Valor Total</div>
      <div class="total-value">${formatMoeda(evento.totalGeral)}</div>
    </div>
  </div>

  ${evento.observacoes ? `<div style="margin-top:28px"><div class="section-title">Observações</div><div class="obs">${evento.observacoes}</div></div>` : ''}

  <div class="footer">
    D&R Decorações &nbsp;·&nbsp; Este orçamento foi gerado em ${new Date().toLocaleDateString('pt-BR')} e pode ser alterado a qualquer momento.
  </div>

</body>
</html>`;

    try {
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 500);
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar Orçamento' });
        } else {
          await Print.printAsync({ html });
        }
      }
    } catch {
      showError('Não foi possível gerar o PDF');
    }
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
          <TouchableOpacity onPress={gerarPDF} style={styles.pdfButton}>
            <Ionicons name="document-text-outline" size={16} color="#FFF" />
            <Text style={styles.pdfButtonText}>Orçamento PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/eventos/editar/${id}`)}
            style={styles.actionButton}
          >
            <Ionicons name="create" size={22} color="#FFB6C1" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setDeleteModalVisible(true)}
            style={styles.actionButton}
          >
            <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
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
            <View style={[styles.statusBadgeLarge, (styles as any)[`status_${evento.status}`]]}>
              <Text style={styles.statusBadgeText}>{evento.status.toUpperCase()}</Text>
            </View>
            {atualizandoStatus && (
              <ActivityIndicator size="small" color="#FFB6C1" style={{ marginTop: 8 }} />
            )}
          </TouchableOpacity>

          {/* Pagamento */}
          <View style={styles.pagamentoCard}>
            <View style={styles.pagamentoHeader}>
              <Ionicons name="cash-outline" size={18} color="#FFB6C1" />
              <Text style={styles.pagamentoTitle}>Pagamento</Text>
              {atualizandoPagamento && <ActivityIndicator size="small" color="#FFB6C1" style={{ marginLeft: 8 }} />}
            </View>
            {evento.formaPagamento ? (
              <View style={styles.formaPagBadgeRow}>
                {{
                  pix: { label: 'Pix', icon: 'phone-portrait-outline' as const },
                  dinheiro: { label: 'Dinheiro', icon: 'cash-outline' as const },
                  cartao: { label: 'Cartão', icon: 'card-outline' as const },
                  transferencia: { label: 'Transferência', icon: 'swap-horizontal-outline' as const },
                }[evento.formaPagamento] ? (
                  <View style={styles.formaPagBadge}>
                    <Ionicons
                      name={({ pix: 'phone-portrait-outline', dinheiro: 'cash-outline', cartao: 'card-outline', transferencia: 'swap-horizontal-outline' } as any)[evento.formaPagamento]}
                      size={14}
                      color="#FFB6C1"
                    />
                    <Text style={styles.formaPagBadgeText}>
                      {{ pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', transferencia: 'Transferência' }[evento.formaPagamento]}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            <View style={styles.pagamentoButtons}>
              {([
                { label: 'Pendente', value: 'pendente', cor: '#FFF3CD', corAtivo: '#F0AD00' },
                { label: 'Parcial', value: 'parcial', cor: '#D1ECF1', corAtivo: '#17A2B8' },
                { label: 'Pago', value: 'pago', cor: '#D4EDDA', corAtivo: '#28A745' },
              ] as const).map((op) => {
                const ativo = evento.statusPagamento === op.value;
                return (
                  <TouchableOpacity
                    key={op.value}
                    style={[styles.pagamentoBtn, ativo && { backgroundColor: op.corAtivo }]}
                    onPress={() => alterarPagamento(op.value)}
                    disabled={atualizandoPagamento}
                  >
                    <Text style={[styles.pagamentoBtnText, ativo && styles.pagamentoBtnTextAtivo]}>
                      {op.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Cliente */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Cliente</Text>
              <TouchableOpacity
                style={styles.historicoBtn}
                onPress={() => router.push(`/clientes/historico?nome=${encodeURIComponent(evento.cliente)}&telefone=${evento.telefone}` as any)}
              >
                <Ionicons name="time-outline" size={14} color="#FFB6C1" />
                <Text style={styles.historicoBtnText}>Ver histórico</Text>
              </TouchableOpacity>
            </View>
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
              { label: 'Cancelado', value: 'cancelado', danger: true },
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                style={styles.modalOption}
                onPress={() => {
                  setStatusModalVisible(false);
                  if (item.value === 'cancelado') {
                    setCancelarConfirmVisible(true);
                  } else {
                    alterarStatus(item.value);
                  }
                }}
              >
                <Text style={[styles.modalOptionText, item.danger && { color: '#FF6B6B' }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      {/* Modal: confirmar exclusão */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !excluindo && setDeleteModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Excluir Evento</Text>
              <TouchableOpacity onPress={() => !excluindo && setDeleteModalVisible(false)}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { marginBottom: 20, fontSize: 15 }]}>
              Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalOption, { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 8, alignItems: 'center', borderBottomWidth: 0 }]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={excluindo}
              >
                <Text style={[styles.modalOptionText, { color: '#666' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOption, { flex: 1, backgroundColor: '#FF6B6B', borderRadius: 8, alignItems: 'center', borderBottomWidth: 0 }]}
                onPress={excluirEvento}
                disabled={excluindo}
              >
                {excluindo
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={[styles.modalOptionText, { color: '#FFF' }]}>Excluir</Text>
                }
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal: confirmar cancelamento */}
      <Modal
        visible={cancelarConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelarConfirmVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCancelarConfirmVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancelar Evento</Text>
              <TouchableOpacity onPress={() => setCancelarConfirmVisible(false)}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { marginBottom: 20, fontSize: 15 }]}>
              Confirma o cancelamento deste evento?
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalOption, { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 8, alignItems: 'center', borderBottomWidth: 0 }]}
                onPress={() => setCancelarConfirmVisible(false)}
              >
                <Text style={[styles.modalOptionText, { color: '#666' }]}>Não</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOption, { flex: 1, backgroundColor: '#F8D7DA', borderRadius: 8, alignItems: 'center', borderBottomWidth: 0 }]}
                onPress={() => {
                  setCancelarConfirmVisible(false);
                  alterarStatus('cancelado');
                }}
              >
                <Text style={[styles.modalOptionText, { color: '#721C24' }]}>Sim, cancelar</Text>
              </TouchableOpacity>
            </View>
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
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB6C1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  pdfButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
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
  pagamentoCard: {
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
  pagamentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pagamentoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  pagamentoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pagamentoBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  pagamentoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  pagamentoBtnTextAtivo: {
    color: '#FFF',
  },
  formaPagBadgeRow: {
    marginBottom: 10,
  },
  formaPagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF0F4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD6E0',
  },
  formaPagBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D05078',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    // override the sectionTitle marginBottom inside this row
  },
  historicoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB6C1',
  },
  historicoBtnText: {
    fontSize: 12,
    color: '#FFB6C1',
    fontWeight: '600',
  },
});
