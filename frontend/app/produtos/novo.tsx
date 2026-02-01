import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function NovoProdutoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');
  const [quantidadeEstoque, setQuantidadeEstoque] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Validações
  const [valorError, setValorError] = useState('');
  const [estoqueError, setEstoqueError] = useState('');

  const validarValorUnitario = (valor: string) => {
    setValorUnitario(valor);
    const num = parseFloat(valor);
    if (valor && (isNaN(num) || num <= 0)) {
      setValorError('Informe um valor maior que 0');
    } else {
      setValorError('');
    }
  };

  const validarQuantidadeEstoque = (quantidade: string) => {
    setQuantidadeEstoque(quantidade);
    const num = parseInt(quantidade);
    if (quantidade && (isNaN(num) || num < 0)) {
      setEstoqueError('Quantidade não pode ser negativa');
    } else {
      setEstoqueError('');
    }
  };

  const isFormularioValido = () => {
    if (!nome.trim() || !categoria.trim()) return false;
    if (!valorUnitario || parseFloat(valorUnitario) <= 0) return false;
    if (!quantidadeEstoque || parseInt(quantidadeEstoque) < 0) return false;
    return true;
  };

  const validarCampos = () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return false;
    }
    if (!categoria.trim()) {
      Alert.alert('Erro', 'Categoria é obrigatória');
      return false;
    }
    if (!valorUnitario || isNaN(parseFloat(valorUnitario))) {
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

    setLoading(true);
    try {
      const produto = {
        codigo: '', // Será gerado automaticamente no backend
        nome: nome.trim(),
        categoria: categoria.trim(),
        valorUnitario: parseFloat(valorUnitario),
        quantidadeEstoque: parseInt(quantidadeEstoque),
        observacoes: observacoes.trim(),
      };

      const response = await fetch(`${API_URL}/api/produtos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(produto),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao salvar produto');
      }

      Alert.alert('Sucesso', 'Produto cadastrado com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFB6C1" />
        </TouchableOpacity>
        <Text style={styles.title}>Novo Produto</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.form}>
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
                style={[styles.input, valorError && styles.inputError]}
                value={valorUnitario}
                onChangeText={validarValorUnitario}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              {valorError ? <Text style={styles.errorText}>{valorError}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quantidade em Estoque *</Text>
              <TextInput
                style={[styles.input, estoqueError && styles.inputError]}
                value={quantidadeEstoque}
                onChangeText={validarQuantidadeEstoque}
                placeholder="0"
                keyboardType="number-pad"
              />
              {estoqueError ? <Text style={styles.errorText}>{estoqueError}</Text> : null}
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
        <View style={styles.fixedFooter}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={salvarProduto}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Salvar Produto</Text>
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
});