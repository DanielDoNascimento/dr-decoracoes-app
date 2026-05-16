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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { deleteProduto, getProdutoById, updateProduto } from '../../services/api';
import { showError } from '../../services/alert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EditarProdutoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');
  const [quantidadeEstoque, setQuantidadeEstoque] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [foto, setFoto] = useState('');
  const [showFotoModal, setShowFotoModal] = useState(false);

  const pickFoto = async (fromCamera: boolean) => {
    setShowFotoModal(false);
    try {
      let result: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { showError('Permissão de câmera necessária'); return; }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { showError('Permissão de galeria necessária'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true, mediaTypes: 'images' });
      }
      if (!result.canceled && result.assets[0]?.base64) {
        setFoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch {
      showError('Não foi possível selecionar a imagem');
    }
  };

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
      setFoto(data.foto || '');
    } catch {
      showError('Não foi possível carregar o produto');
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
      showError('Código é obrigatório');
      return false;
    }
    if (!nome.trim()) {
      showError('Nome é obrigatório');
      return false;
    }
    if (!categoria.trim()) {
      showError('Categoria é obrigatória');
      return false;
    }
    if (!valorUnitario || isNaN(parseCurrency(valorUnitario))) {
      showError('Valor unitário inválido');
      return false;
    }
    if (!quantidadeEstoque || isNaN(parseInt(quantidadeEstoque))) {
      showError('Quantidade de estoque inválida');
      return false;
    }
    if (parseInt(quantidadeEstoque) < 0) {
      showError('Estoque não pode ser negativo');
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
        foto,
      });

      router.back();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const confirmarExclusao = () => {
    setShowDeleteModal(true);
  };

  const excluirProduto = async () => {
    setSaving(true);
    try {
      await deleteProduto(String(id));
      router.back();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro ao excluir produto');
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
              <Text style={styles.label}>Foto do Produto (opcional)</Text>
              <TouchableOpacity style={styles.fotoContainer} onPress={() => setShowFotoModal(true)}>
                {foto ? (
                  <>
                    <Image source={{ uri: foto }} style={styles.fotoPreview} contentFit="cover" />
                    <TouchableOpacity style={styles.fotoRemove} onPress={(e) => { e.stopPropagation(); setFoto(''); }}>
                      <Ionicons name="close-circle" size={22} color="#FF6B6B" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.fotoPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color="#CCC" />
                    <Text style={styles.fotoPlaceholderText}>Adicionar foto</Text>
                  </View>
                )}
              </TouchableOpacity>
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

      <Modal visible={showFotoModal} transparent animationType="fade" onRequestClose={() => setShowFotoModal(false)}>
        <TouchableOpacity style={styles.fotoModalOverlay} activeOpacity={1} onPress={() => setShowFotoModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.fotoModalBox}>
            <Text style={styles.fotoModalTitle}>Foto do Produto</Text>
            <TouchableOpacity style={styles.fotoModalBtn} onPress={() => pickFoto(true)}>
              <Ionicons name="camera-outline" size={22} color="#FFB6C1" />
              <Text style={styles.fotoModalBtnText}>Tirar Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fotoModalBtn} onPress={() => pickFoto(false)}>
              <Ionicons name="images-outline" size={22} color="#FFB6C1" />
              <Text style={styles.fotoModalBtnText}>Escolher da Galeria</Text>
            </TouchableOpacity>
            {foto ? (
              <TouchableOpacity style={styles.fotoModalBtn} onPress={() => { setFoto(''); setShowFotoModal(false); }}>
                <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
                <Text style={[styles.fotoModalBtnText, { color: '#FF6B6B' }]}>Remover Foto</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.fotoModalBtn, { borderBottomWidth: 0 }]} onPress={() => setShowFotoModal(false)}>
              <Text style={[styles.fotoModalBtnText, { color: '#999' }]}>Cancelar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="trash-outline" size={40} color="#FF6B6B" style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>Excluir Produto</Text>
            <Text style={styles.modalMessage}>Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={() => { setShowDeleteModal(false); excluirProduto(); }}>
                <Text style={styles.modalConfirmText}>Excluir</Text>
              </TouchableOpacity>
            </View>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '600',
  },
  fotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  fotoPreview: {
    width: 120,
    height: 120,
  },
  fotoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFF',
    borderRadius: 11,
  },
  fotoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  fotoPlaceholderText: {
    fontSize: 12,
    color: '#BBB',
  },
  fotoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  fotoModalBox: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  fotoModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  fotoModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  fotoModalBtnText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});
