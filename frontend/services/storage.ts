import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueuedOperation {
  queueId: string;
  op: 'create' | 'update' | 'delete';
  resource: 'evento' | 'produto';
  resourceId?: string;
  tempId?: string;
  data?: any;
  timestamp: number;
}

const K = {
  eventos: 'cache_v1_eventos',
  produtos: 'cache_v1_produtos',
  eventoDetail: (id: string) => `cache_v1_evento_${id}`,
  produtoDetail: (id: string) => `cache_v1_produto_${id}`,
  queue: 'offline_queue_v1',
};

// ─── Eventos cache ────────────────────────────────────────────────────────────

export const saveEventosCache = async (items: any[]) => {
  await AsyncStorage.setItem(K.eventos, JSON.stringify({ items, ts: Date.now() }));
};

export const getEventosCache = async (): Promise<any[]> => {
  try {
    const raw = await AsyncStorage.getItem(K.eventos);
    return raw ? JSON.parse(raw).items : [];
  } catch { return []; }
};

export const saveEventoDetailCache = async (id: string, data: any) => {
  await AsyncStorage.setItem(K.eventoDetail(id), JSON.stringify(data));
};

export const getEventoDetailCache = async (id: string): Promise<any | null> => {
  try {
    const raw = await AsyncStorage.getItem(K.eventoDetail(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

// ─── Produtos cache ───────────────────────────────────────────────────────────

export const saveProdutosCache = async (items: any[]) => {
  await AsyncStorage.setItem(K.produtos, JSON.stringify({ items, ts: Date.now() }));
};

export const getProdutosCache = async (): Promise<any[]> => {
  try {
    const raw = await AsyncStorage.getItem(K.produtos);
    return raw ? JSON.parse(raw).items : [];
  } catch { return []; }
};

export const saveProdutoDetailCache = async (id: string, data: any) => {
  await AsyncStorage.setItem(K.produtoDetail(id), JSON.stringify(data));
};

export const getProdutoDetailCache = async (id: string): Promise<any | null> => {
  try {
    const raw = await AsyncStorage.getItem(K.produtoDetail(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

// ─── Queue ────────────────────────────────────────────────────────────────────

export const getQueue = async (): Promise<QueuedOperation[]> => {
  try {
    const raw = await AsyncStorage.getItem(K.queue);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const enqueueOp = async (op: QueuedOperation) => {
  const queue = await getQueue();
  await AsyncStorage.setItem(K.queue, JSON.stringify([...queue, op]));
};

export const removeFromQueue = async (queueId: string) => {
  const queue = await getQueue();
  await AsyncStorage.setItem(K.queue, JSON.stringify(queue.filter(q => q.queueId !== queueId)));
};

export const getQueueCount = async (): Promise<number> => {
  const q = await getQueue();
  return q.length;
};
