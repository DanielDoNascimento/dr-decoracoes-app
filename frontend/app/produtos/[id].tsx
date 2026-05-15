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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { deleteProduto, getProdutoById, updateProduto } from '../../services/api';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EditarProdutoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');
  const [quantidadeEstoque, setQuantidadeEstoque] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const number = Number(digits) / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatCurrencyFromNumber = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const parseCurrency = (value: string) => {
    return parseFloat(
      value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
    ) || 0;
  };

  const carregarProduto = useCallback(async () => {
    try {
      const data = await getProdutoById(String(id));
      if (!data) {
        throw new Error('Produto não encontrado');
      }
      
      setCodigo(data.codigo);
      setNome(data.nome);
      setCategoria(data.categoria);
      setValorUnitario(formatCurrencyFromNumber(data.valorUnitario));
      setQuantidadeEstoque(data.quantidadeEstoque.toString());
      setObservacoes(data.observacoes || '');
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o produto');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    carregarProduto();
  }, [carregarProduto]);

  const validarCampos = () => {
    if (!codigo.trim()) {
      Alert.alert('Erro', 'Código é obrigatório');
      return false;
    }
    if (!nome.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return false;
    }
    if (!categoria.trim()) {
      Alert.alert('Erro', 'Categoria é obrigatória');
      return false;
    }
    if (!valorUnitario || isNaN(parseCurrency(valorUnitario))) {
      Alert.alert('Erro', 'Valor unitário inválido');
      return false;
    }
    if (!quantidadeEstoque || isNaN(parseInt(quantidadeEstoque))) {
      Alert.alert('Erro', 'Quantidade de estoque inválida');
      return false;
    }
    if (parseInt(quantidadeEstoque) < 0) {
      Alert.alert('Erro', 'Estoque não pode ser negativo');
      return false;
    }
    return true;
  };

  const salvarProduto = async () => {
    if (!validarCampos()) return;

    setSaving(true);
    try {
      await updateProduto(String(id), {
        nome: nome.trim(),
        categoria: categoria.trim(),
        valorUnitario: parseCurrency(valorUnitario),
        quantidadeEstoque: parseInt(quantidadeEstoque),
        observacoes: observacoes.trim(),
      });

      // Toast de sucesso
      setTimeout(() => {
        Alert.alert('✓ Sucesso', 'Produto atualizado com sucesso', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }, 100);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const confirmarExclusao = () => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este produto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: excluirProduto },
      ]
    );
  };

  const excluirProduto = async () => {
    setSaving(true);
    try {
      await deleteProduto(String(id));

      // Toast de sucesso
      setTimeout(() => {
        Alert.alert('✓ Sucesso', 'Produto excluído', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }, 100);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao excluir produto');
    } finally {
      setSaving(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFB6C1" />
        </TouchableOpacity>
        <Text style={styles.title}>Editar Produto</Text>
        <TouchableOpacity onPress={confirmarExclusao} style={styles.deleteButton}>
          <Ionicons name="trash" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        >
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código (Automático)</Text>
              <View style={styles.codigoDisplay}>
                <Text style={styles.codigoText}>{codigo}</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome *</Text>
              <TextInput
                style={styles.input}
                value={nome}
                onChangeText={setNome}
                placeholder="Ex: Mesa Redonda Branca"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Categoria *</Text>
              <TextInput
                style={styles.input}
                value={categoria}
                onChangeText={setCategoria}
                placeholder="Ex: Mesas, Cadeiras, Toalhas"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Valor Unitário (R$) *</Text>
              <TextInput
                style={styles.input}
                value={valorUnitario}
                onChangeText={(text) => setValorUnitario(formatCurrency(text))}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quantidade em Estoque *</Text>
              <TextInput
                style={styles.input}
                value={quantidadeEstoque}
                onChangeText={setQuantidadeEstoque}
                placeholder="0"
                keyboardType="number-pad"
              />
            </View>

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
          </View>
        </ScrollView>

        {/* Botão Fixo no Rodapé */}
        <View style={[styles.fixedFooter, { paddingBottom: 16 + insets.bottom }]}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={salvarProduto}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Espaço para o botão fixo
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
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
  codigoDisplay: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  codigoText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButton: {
    backgroundColor: '#FFB6C1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
