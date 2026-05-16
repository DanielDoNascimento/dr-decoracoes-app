import React, { useCallback, useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createEvento, getDisponibilidadeProdutos } from '../../services/api';
import { DatePickerField } from '../../components/DatePickerField';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

type OutroValor = {
  descricao: string;
  valor: string;
};

export default function NovoEventoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  // Dados do cliente
  const [cliente, setCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [local, setLocal] = useState('');
  const [valorFrete, setValorFrete] = useState('');
  const [valorOrganizacao, setValorOrganizacao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [outrosValores, setOutrosValores] = useState<OutroValor[]>([]);

  // Função para formatar como moeda
  const formatarMoeda = (valor: string) => {
    // Remove tudo que não é número
    const apenas_numeros = valor.replace(/\D/g, '');
    
    // Converte para número e formata
    const numero = Number(apenas_numeros) / 100;
    
    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleValorFreteChange = (text: string) => {
    const formatted = formatarMoeda(text);
    setValorFrete(formatted);
  };

  const handleValorOrganizacaoChange = (text: string) => {
    const formatted = formatarMoeda(text);
    setValorOrganizacao(formatted);
  };

  const handleOutroValorChange = (index: number, campo: 'descricao' | 'valor', value: string) => {
    const novos = [...outrosValores];
    if (!novos[index]) {
      novos[index] = { descricao: '', valor: '' };
    }
    if (campo === 'valor') {
      novos[index][campo] = formatarMoeda(value);
    } else {
      novos[index][campo] = value;
    }
    setOutrosValores(novos);
  };

  const adicionarOutroValor = () => {
    setOutrosValores((prev) => [...prev, { descricao: '', valor: '' }]);
  };

  const removerOutroValor = (index: number) => {
    setOutrosValores((prev) => prev.filter((_, i) => i !== index));
  };

  // Função para converter moeda formatada para número
  const moedaParaNumero = (valor: string): number => {
    return parseFloat(valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
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

  const limparTelefone = (input: string) => input.replace(/\D/g, '');

  // Datas e horários — padrão: amanhã, 08h–18h
  const amanha = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })();
  const horaPadraInicio = (() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d; })();
  const horaPadraFim = (() => { const d = new Date(); d.setHours(18, 0, 0, 0); return d; })();
  const [dataInicio, setDataInicio] = useState(amanha);
  const [horaInicio, setHoraInicio] = useState(horaPadraInicio);
  const [dataFim, setDataFim] = useState(amanha);
  const [horaFim, setHoraFim] = useState(horaPadraFim);
  // Produtos
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ItemEvento[]>([]);
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');

  const buscarDisponibilidade = useCallback(async () => {
    try {
      const inicio = combinarDataHora(dataInicio, horaInicio);
      const fim = combinarDataHora(dataFim, horaFim);

      const data = await getDisponibilidadeProdutos(
        inicio.toISOString(),
        fim.toISOString()
      );
      setProdutos(data);
    } catch (error) {
      console.error('Erro ao buscar disponibilidade:', error);
    }
  }, [dataFim, dataInicio, horaFim, horaInicio]);

  useEffect(() => {
    buscarDisponibilidade();
  }, [buscarDisponibilidade]);

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

    const estoqueDisponivel = produto.estoqueDisponivel ?? produto.quantidadeEstoque;
    if (estoqueDisponivel <= 0) {
      Alert.alert('Erro', 'Produto sem disponibilidade para o período selecionado');
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

    const estoqueDisponivel = produto?.estoqueDisponivel ?? produto?.quantidadeEstoque ?? 0;

    if (produto && quantidade > estoqueDisponivel) {
      Alert.alert('Erro', `Disponível apenas ${estoqueDisponivel} unidades`);
      return;
    }

    const novosItens = [...itens];
    novosItens[index].quantidade = quantidade;
    novosItens[index].valorTotal = quantidade * novosItens[index].valorUnitario;
    setItens(novosItens);
  };

  const alterarQuantidade = (index: number, delta: number) => {
    const quantidadeAtual = itens[index]?.quantidade ?? 0;
    const novaQuantidade = quantidadeAtual + delta;
    if (novaQuantidade <= 0) {
      removerProduto(index);
      return;
    }
    atualizarQuantidade(index, String(novaQuantidade));
  };

  const removerProduto = (index: number) => {
    const novosItens = itens.filter((_, i) => i !== index);
    setItens(novosItens);
  };

  const calcularTotais = () => {
    const totalProdutos = itens.reduce((sum, item) => sum + item.valorTotal, 0);
    const frete = moedaParaNumero(valorFrete);
    const maoDeObra = moedaParaNumero(valorOrganizacao);
    const outrosTotal = outrosValores.reduce(
      (sum, item) => sum + moedaParaNumero(item.valor),
      0
    );
    const totalGeral = totalProdutos + frete + maoDeObra + outrosTotal;
    return { totalProdutos, totalGeral, outrosTotal };
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
    const freteNumero = moedaParaNumero(valorFrete);
    if (isNaN(freteNumero)) {
      Alert.alert('Erro', 'Valor do frete é obrigatório');
      return false;
    }
    if (itens.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um produto ao evento');
      return false;
    }
    if (itens.some((item) => item.quantidade <= 0)) {
      Alert.alert('Erro', 'Todos os produtos devem ter quantidade maior que 0');
      return false;
    }
    const inicio = combinarDataHora(dataInicio, horaInicio);
    const fim = combinarDataHora(dataFim, horaFim);
    if (fim <= inicio) {
      Alert.alert('Erro', 'A data e hora de término devem ser maiores que o início');
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
        telefone: limparTelefone(telefone),
        dataHoraInicio: inicio.toISOString(),
        dataHoraFim: fim.toISOString(),
        local: local.trim(),
        valorFrete: moedaParaNumero(valorFrete),
        valorOrganizacao: moedaParaNumero(valorOrganizacao),
        outrosValores: outrosValores
          .map((item) => ({
            descricao: item.descricao.trim(),
            valor: moedaParaNumero(item.valor),
          }))
          .filter((item) => item.descricao || item.valor > 0),
        observacoes: observacoes.trim(),
        itens,
        status: 'orçamento',
      };

      await createEvento(evento);

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

  const { totalProdutos, totalGeral, outrosTotal } = calcularTotais();
  const despesasTotais = moedaParaNumero(valorFrete) + outrosTotal;
  const lucroTotal = totalProdutos + moedaParaNumero(valorOrganizacao);

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
        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
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
                onChangeText={(text) => setTelefone(formatTelefone(text))}
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.sectionTitle}>Data e Horário</Text>

            <View style={styles.dateRow}>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Data Início *</Text>
                <DatePickerField mode="date" value={dataInicio} onChange={setDataInicio} />
              </View>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Hora Início *</Text>
                <DatePickerField mode="time" value={horaInicio} onChange={setHoraInicio} />
              </View>
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Data Fim *</Text>
                <DatePickerField mode="date" value={dataFim} onChange={setDataFim} />
              </View>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Hora Fim *</Text>
                <DatePickerField mode="time" value={horaFim} onChange={setHoraFim} />
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
              <Text style={styles.label}>Valor do Frete (R$)</Text>
              <TextInput
                style={styles.input}
                value={valorFrete}
                onChangeText={handleValorFreteChange}
                placeholder="R$ 0,00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mão de obra (R$)</Text>
              <TextInput
                style={styles.input}
                value={valorOrganizacao}
                onChangeText={handleValorOrganizacaoChange}
                placeholder="R$ 0,00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Outros Valores (despesas)</Text>
              {outrosValores.map((item, index) => (
                <View key={`outro-${index}`} style={styles.outroValorRow}>
                  <TextInput
                    style={[styles.input, styles.outroDescricao]}
                    value={item.descricao}
                    onChangeText={(text) => handleOutroValorChange(index, 'descricao', text)}
                    placeholder="Descrição"
                  />
                  <TextInput
                    style={[styles.input, styles.outroValor]}
                    value={item.valor}
                    onChangeText={(text) => handleOutroValorChange(index, 'valor', text)}
                    placeholder="R$ 0,00"
                    keyboardType="numeric"
                  />
                  <TouchableOpacity onPress={() => removerOutroValor(index)}>
                    <Ionicons name="close-circle" size={22} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addOutroValorButton} onPress={adicionarOutroValor}>
                <Ionicons name="add" size={20} color="#FFB6C1" />
                <Text style={styles.addOutroValorText}>Adicionar outro valor</Text>
              </TouchableOpacity>
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
                <Text style={styles.itemCodigo}>#{item.codigoProduto}</Text>
                <Text style={styles.itemValorUnitario}>
                  Valor unitário: {formatMoeda(item.valorUnitario)}
                </Text>
                <View style={styles.itemFooter}>
                  <View style={styles.quantidadeContainer}>
                    <Text style={styles.itemLabel}>Qtd:</Text>
                    <TouchableOpacity
                      style={styles.quantidadeButton}
                      onPress={() => alterarQuantidade(index, -1)}
                    >
                      <Ionicons name="remove" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.quantidadeValueBox}>
                      <Text style={styles.quantidadeValueText}>{item.quantidade}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.quantidadeButton}
                      onPress={() => alterarQuantidade(index, 1)}
                    >
                      <Ionicons name="add" size={18} color="#FFF" />
                    </TouchableOpacity>
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
                  {formatMoeda(moedaParaNumero(valorFrete))}
                </Text>
              </View>
              <View style={styles.totaisRow}>
                <Text style={styles.totaisLabel}>Mão de obra:</Text>
                <Text style={styles.totaisValor}>
                  {formatMoeda(moedaParaNumero(valorOrganizacao))}
                </Text>
              </View>
              <View style={styles.totaisRow}>
                <Text style={styles.totaisLabel}>Outras despesas:</Text>
                <Text style={styles.totaisValor}>{formatMoeda(outrosTotal)}</Text>
              </View>
              <View style={[styles.totaisRow, styles.totaisRowFinal]}>
                <Text style={styles.totaisLabelFinal}>Total de despesas:</Text>
                <Text style={styles.totaisValorFinal}>{formatMoeda(despesasTotais)}</Text>
              </View>
              <View style={[styles.totaisRow, styles.totaisRowFinal]}>
                <Text style={styles.totaisLabelFinal}>Total de lucro:</Text>
                <Text style={styles.totaisValorFinal}>{formatMoeda(lucroTotal)}</Text>
              </View>
              <View style={[styles.totaisRow, styles.totaisRowFinal]}>
                <Text style={styles.totaisLabelFinal}>TOTAL DO EVENTO:</Text>
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
                      Disponível: {item.estoqueDisponivel ?? item.quantidadeEstoque} un.
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
  outroValorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  outroDescricao: {
    flex: 1,
  },
  outroValor: {
    width: 120,
  },
  addOutroValorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  addOutroValorText: {
    color: '#FFB6C1',
    fontWeight: '600',
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
    marginBottom: 4,
  },
  itemValorUnitario: {
    fontSize: 13,
    color: '#666',
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
    gap: 8,
  },
  itemLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  quantidadeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FF8FA3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  quantidadeValueBox: {
    minWidth: 64,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  quantidadeValueText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
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
