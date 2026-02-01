import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Produto {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  valorUnitario: number;
  quantidadeEstoque: number;
  estoqueDisponivel?: number;
}

interface ItemEvento {
  produtoId: string;
  codigoProduto: string;
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export default function NovoEventoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Dados do cliente
  const [cliente, setCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [local, setLocal] = useState('');
  const [valorFrete, setValorFrete] = useState('');
  const [valorOrganizacao, setValorOrganizacao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Datas e horários
  const [dataInicio, setDataInicio] = useState(new Date());
  const [horaInicio, setHoraInicio] = useState(new Date());
  const [dataFim, setDataFim] = useState(new Date());
  const [horaFim, setHoraFim] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);

  // Produtos
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ItemEvento[]>([]);
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');

  useEffect(() => {
    buscarDisponibilidade();
  }, [dataInicio, horaInicio, dataFim, horaFim]);

  const buscarDisponibilidade = async () => {
    try {
      const inicio = combinarDataHora(dataInicio, horaInicio);
      const fim = combinarDataHora(dataFim, horaFim);

      const response = await fetch(`${API_URL}/api/eventos/disponibilidade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataHoraInicio: inicio.toISOString(),
          dataHoraFim: fim.toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProdutos(data);
      }
    } catch (error) {
      console.error('Erro ao buscar disponibilidade:', error);
    }
  };

  const combinarDataHora = (data: Date, hora: Date) => {
    const resultado = new Date(data);
    resultado.setHours(hora.getHours());
    resultado.setMinutes(hora.getMinutes());
    resultado.setSeconds(0);
    resultado.setMilliseconds(0);
    return resultado;
  };

  const adicionarProduto = (produto: Produto) => {
    const jaAdicionado = itens.find((i) => i.produtoId === produto.id);
    if (jaAdicionado) {
      Alert.alert('Aviso', 'Produto já adicionado ao evento');
      return;
    }

    const novoItem: ItemEvento = {
      produtoId: produto.id,
      codigoProduto: produto.codigo,
      nomeProduto: produto.nome,
      quantidade: 1,
      valorUnitario: produto.valorUnitario,
      valorTotal: produto.valorUnitario,
    };

    setItens([...itens, novoItem]);
    setShowProdutoModal(false);
    setBuscaProduto('');
  };

  const atualizarQuantidade = (index: number, novaQuantidade: string) => {
    const quantidade = parseInt(novaQuantidade) || 0;
    const produto = produtos.find((p) => p.id === itens[index].produtoId);
    
    if (produto && quantidade > (produto.estoqueDisponivel || produto.quantidadeEstoque)) {
      Alert.alert('Erro', `Disponível apenas ${produto.estoqueDisponivel || produto.quantidadeEstoque} unidades`);
      return;
    }

    const novosItens = [...itens];
    novosItens[index].quantidade = quantidade;
    novosItens[index].valorTotal = quantidade * novosItens[index].valorUnitario;
    setItens(novosItens);
  };

  const removerProduto = (index: number) => {
    const novosItens = itens.filter((_, i) => i !== index);
    setItens(novosItens);
  };

  const calcularTotais = () => {
    const totalProdutos = itens.reduce((sum, item) => sum + item.valorTotal, 0);
    const frete = parseFloat(valorFrete) || 0;
    const organizacao = parseFloat(valorOrganizacao) || 0;
    const totalGeral = totalProdutos + frete + organizacao;
    return { totalProdutos, totalGeral };
  };

  const validarCampos = () => {
    if (!cliente.trim()) {
      Alert.alert('Erro', 'Nome do cliente é obrigatório');
      return false;
    }
    if (!telefone.trim()) {
      Alert.alert('Erro', 'Telefone é obrigatório');
      return false;
    }
    if (!local.trim()) {
      Alert.alert('Erro', 'Local do evento é obrigatório');
      return false;
    }
    if (!valorFrete || isNaN(parseFloat(valorFrete))) {
      Alert.alert('Erro', 'Valor do frete é obrigatório');
      return false;
    }
    if (itens.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um produto ao evento');
      return false;
    }
    return true;
  };

  const salvarEvento = async () => {
    if (!validarCampos()) return;

    setLoading(true);
    try {
      const inicio = combinarDataHora(dataInicio, horaInicio);
      const fim = combinarDataHora(dataFim, horaFim);

      const evento = {
        cliente: cliente.trim(),
        telefone: telefone.trim(),
        dataHoraInicio: inicio.toISOString(),
        dataHoraFim: fim.toISOString(),
        local: local.trim(),
        valorFrete: parseFloat(valorFrete),
        valorOrganizacao: parseFloat(valorOrganizacao) || 0,
        observacoes: observacoes.trim(),
        itens,
        status: 'orçamento',
      };

      const response = await fetch(`${API_URL}/api/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evento),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao salvar evento');
      }

      Alert.alert('Sucesso', 'Evento criado com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao salvar evento');
    } finally {
      setLoading(false);
    }
  };

  const formatMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const produtosFiltrados = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(buscaProduto.toLowerCase()) ||
      p.codigo.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  const { totalProdutos, totalGeral } = calcularTotais();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFB6C1" />
        </TouchableOpacity>
        <Text style={styles.title}>Novo Evento</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Dados do Cliente</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome do Cliente *</Text>
              <TextInput
                style={styles.input}
                value={cliente}
                onChangeText={setCliente}
                placeholder="Nome completo"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone *</Text>
              <TextInput
                style={styles.input}
                value={telefone}
                onChangeText={setTelefone}
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.sectionTitle}>Data e Horário</Text>

            <View style={styles.dateRow}>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Data Início *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker('dataInicio')}
                >
                  <Text style={styles.dateButtonText}>
                    {dataInicio.toLocaleDateString('pt-BR')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateGroup}>
                <Text style={styles.label}>Hora Início *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker('horaInicio')}
                >
                  <Text style={styles.dateButtonText}>
                    {horaInicio.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Data Fim *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker('dataFim')}
                >
                  <Text style={styles.dateButtonText}>
                    {dataFim.toLocaleDateString('pt-BR')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateGroup}>
                <Text style={styles.label}>Hora Fim *</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker('horaFim')}
                >
                  <Text style={styles.dateButtonText}>
                    {horaFim.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Local e Valores</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Local do Evento *</Text>
              <TextInput
                style={styles.input}
                value={local}
                onChangeText={setLocal}
                placeholder="Endereço ou descrição do local"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Valor do Frete (R$) *</Text>
              <TextInput
                style={styles.input}
                value={valorFrete}
                onChangeText={setValorFrete}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Valor Organização (R$)</Text>
              <TextInput
                style={styles.input}
                value={valorOrganizacao}
                onChangeText={setValorOrganizacao}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.sectionTitle}>Produtos</Text>

            <TouchableOpacity
              style={styles.addProdutoButton}
              onPress={() => setShowProdutoModal(true)}
            >
              <Ionicons name="add-circle" size={24} color="#FFB6C1" />
              <Text style={styles.addProdutoText}>Adicionar Produto</Text>
            </TouchableOpacity>

            {itens.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNome}>{item.nomeProduto}</Text>
                  <TouchableOpacity onPress={() => removerProduto(index)}>
                    <Ionicons name="trash" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemCodigo}>#{item.codigoProdigo}</Text>
                <Text style={styles.itemValorUnitario}>
                  Valor unitário: {formatMoeda(item.valorUnitario)}
                </Text>
                <View style={styles.itemFooter}>
                  <View style={styles.quantidadeContainer}>
                    <Text style={styles.itemLabel}>Qtd:</Text>
                    <TextInput
                      style={styles.quantidadeInput}
                      value={item.quantidade.toString()}
                      onChangeText={(text) => atualizarQuantidade(index, text)}
                      keyboardType="number-pad"
                    />
                  </View>
                  <Text style={styles.itemValor}>{formatMoeda(item.valorTotal)}</Text>
                </View>
              </View>
            ))}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Observações</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={observacoes}
                onChangeText={setObservacoes}
                placeholder="Informações adicionais..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.totaisCard}>
              <View style={styles.totaisRow}>
                <Text style={styles.totaisLabel}>Total Produtos:</Text>
                <Text style={styles.totaisValor}>{formatMoeda(totalProdutos)}</Text>
              </View>
              <View style={styles.totaisRow}>
                <Text style={styles.totaisLabel}>Frete:</Text>
                <Text style={styles.totaisValor}>
                  {formatMoeda(parseFloat(valorFrete) || 0)}
                </Text>
              </View>
              <View style={styles.totaisRow}>
                <Text style={styles.totaisLabel}>Organização:</Text>
                <Text style={styles.totaisValor}>
                  {formatMoeda(parseFloat(valorOrganizacao) || 0)}
                </Text>
              </View>
              <View style={[styles.totaisRow, styles.totaisRowFinal]}>
                <Text style={styles.totaisLabelFinal}>Total Geral:</Text>
                <Text style={styles.totaisValorFinal}>{formatMoeda(totalGeral)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={salvarEvento}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Criar Evento</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DateTimePicker
          value={
            showDatePicker === 'dataInicio'
              ? dataInicio
              : showDatePicker === 'horaInicio'
              ? horaInicio
              : showDatePicker === 'dataFim'
              ? dataFim
              : horaFim
          }
          mode={showDatePicker.includes('data') ? 'date' : 'time'}
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(null);
            if (selectedDate) {
              if (showDatePicker === 'dataInicio') setDataInicio(selectedDate);
              else if (showDatePicker === 'horaInicio') setHoraInicio(selectedDate);
              else if (showDatePicker === 'dataFim') setDataFim(selectedDate);
              else if (showDatePicker === 'horaFim') setHoraFim(selectedDate);
            }
          }}
        />
      )}

      <Modal visible={showProdutoModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Produto</Text>
              <TouchableOpacity onPress={() => setShowProdutoModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              value={buscaProduto}
              onChangeText={setBuscaProduto}
              placeholder="Buscar produto..."
            />

            <FlatList
              data={produtosFiltrados}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.produtoItem}
                  onPress={() => adicionarProduto(item)}
                >
                  <View>
                    <Text style={styles.produtoNome}>{item.nome}</Text>
                    <Text style={styles.produtoCodigo}>#{item.codigo}</Text>
                    <Text style={styles.produtoDisponivel}>
                      Disponível: {item.estoqueDisponivel || item.quantidadeEstoque} un.
                    </Text>
                  </View>
                  <Text style={styles.produtoValor}>{formatMoeda(item.valorUnitario)}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyModal}>
                  <Text style={styles.emptyModalText}>Nenhum produto disponível</Text>
                </View>
              }
            />
          </View>
        </View>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFB6C1',
    marginTop: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateGroup: {
    flex: 1,
  },
  dateButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  addProdutoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FFB6C1',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
    marginBottom: 16,
  },
  addProdutoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFB6C1',
    marginLeft: 8,
  },
  itemCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
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
  itemCodigo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantidadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  quantidadeInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    width: 60,
    textAlign: 'center',
  },
  itemValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFB6C1',
  },
  totaisCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
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
  saveButton: {
    backgroundColor: '#FFB6C1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSearch: {
    backgroundColor: '#F5F5F5',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  produtoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  produtoCodigo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  produtoDisponivel: {
    fontSize: 12,
    color: '#666',
  },
  produtoValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFB6C1',
  },
  emptyModal: {
    padding: 48,
    alignItems: 'center',
  },
  emptyModalText: {
    fontSize: 16,
    color: '#999',
  },
});