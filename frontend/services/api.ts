import { Platform } from 'react-native';
import { getOnlineStatus, isNetworkError } from './network';
import {
  saveEventosCache, getEventosCache, saveEventoDetailCache, getEventoDetailCache,
  saveProdutosCache, getProdutosCache, saveProdutoDetailCache, getProdutoDetailCache,
  enqueueOp, getQueue, removeFromQueue,
} from './storage';

const API_BASE = Platform.OS === 'web'
  ? ''
  : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/$/, '');
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || '';

export type EventoItem = {
  produtoId: string;
  codigoProduto: string;
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type EventoDetalhado = {
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
  itens: EventoItem[];
  totalProdutos: number;
  totalGeral: number;
  receitaTotal: number;
  lucroEvento: number;
};

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit, retries = 4): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['x-api-key'] = API_KEY;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options?.headers as Record<string, string> | undefined) },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        let message = `Erro ${res.status}`;
        try {
          const body = await res.json();
          if (typeof body?.detail === 'string') message = body.detail;
          else if (body?.detail?.error) message = body.detail.error;
        } catch {}
        throw new Error(message);
      }

      if (res.status === 204) return undefined as T;
      return res.json() as Promise<T>;
    } catch (err: any) {
      const isNetErr = err?.name === 'AbortError' || err?.message === 'Failed to fetch' || err?.message?.includes('fetch');
      if (isNetErr && attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Servidor indisponível. Tente novamente.');
}

// Direct fetch: no retries, short timeout — used for offline-aware calls
async function apiFetchDirect<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['x-api-key'] = API_KEY;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string> | undefined) },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      let message = `Erro ${res.status}`;
      try {
        const body = await res.json();
        if (typeof body?.detail === 'string') message = body.detail;
        else if (body?.detail?.error) message = body.detail.error;
      } catch {}
      throw new Error(message);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ─── Ping ─────────────────────────────────────────────────────────────────────

export const pingServer = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (API_KEY) headers['x-api-key'] = API_KEY;
    const res = await fetch(`${API_BASE}/api/ping`, { headers, signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
};

// ─── Sync queue (called by SyncContext when back online) ──────────────────────

export const syncQueue = async (): Promise<{ synced: number; failed: number }> => {
  const queue = await getQueue();
  let synced = 0;
  let failed = 0;

  for (const op of queue) {
    try {
      if (op.resource === 'evento') {
        if (op.op === 'create') {
          await apiFetchDirect('/api/eventos', { method: 'POST', body: JSON.stringify(op.data) });
        } else if (op.op === 'update' && op.resourceId && !op.resourceId.startsWith('temp_')) {
          await apiFetchDirect(`/api/eventos/${op.resourceId}`, { method: 'PUT', body: JSON.stringify(op.data) });
        } else if (op.op === 'delete' && op.resourceId && !op.resourceId.startsWith('temp_')) {
          await apiFetchDirect(`/api/eventos/${op.resourceId}`, { method: 'DELETE' });
        }
      } else if (op.resource === 'produto') {
        if (op.op === 'create') {
          await apiFetchDirect('/api/produtos', { method: 'POST', body: JSON.stringify(op.data) });
        } else if (op.op === 'update' && op.resourceId && !op.resourceId.startsWith('temp_')) {
          await apiFetchDirect(`/api/produtos/${op.resourceId}`, { method: 'PUT', body: JSON.stringify(op.data) });
        } else if (op.op === 'delete' && op.resourceId && !op.resourceId.startsWith('temp_')) {
          await apiFetchDirect(`/api/produtos/${op.resourceId}`, { method: 'DELETE' });
        }
      }
      await removeFromQueue(op.queueId);
      synced++;
    } catch {
      failed++;
    }
  }

  // Refresh caches after sync
  if (synced > 0) {
    try {
      const ed = await apiFetchDirect<{ items: any[] }>('/api/eventos');
      await saveEventosCache(ed.items.map(mapEvento));
    } catch {}
    try {
      const pd = await apiFetchDirect<{ items: any[] }>('/api/produtos');
      await saveProdutosCache(pd.items.map(mapProduto));
    } catch {}
  }

  return { synced, failed };
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

const mapEvento = (e: any) => ({
  id: String(e.id),
  cliente: e.cliente,
  telefone: e.telefone ?? '',
  dataHoraInicio: e.dataHoraInicio,
  dataHoraFim: e.dataHoraFim,
  local: e.local,
  status: e.status,
  statusPagamento: e.statusPagamento ?? 'pendente',
  totalGeral: e.totalGeral ?? 0,
  _pending: e._pending ?? false,
});

const mapProduto = (p: any) => ({
  id: String(p.id),
  codigo: p.codigo ?? `PROD${String(p.id).padStart(4, '0')}`,
  nome: p.nome,
  categoria: p.categoria ?? 'Sem categoria',
  valorUnitario: p.valorUnitario,
  quantidadeEstoque: p.quantidadeEstoque,
  observacoes: p.observacoes ?? '',
  foto: p.foto ?? '',
  _pending: p._pending ?? false,
});

// Merge server items with pending queue items
const mergeEventosWithQueue = async (serverItems: any[]) => {
  const queue = await getQueue();

  // Items pending delete (exclude from list)
  const deletedIds = queue
    .filter(q => q.resource === 'evento' && q.op === 'delete')
    .map(q => q.resourceId);

  // Items pending create (add as pending)
  const pendingCreates = queue
    .filter(q => q.resource === 'evento' && q.op === 'create')
    .map(q => mapEvento({ ...q.data, id: q.tempId, _pending: true }));

  // Items pending update (show updated version)
  const pendingUpdates = queue
    .filter(q => q.resource === 'evento' && q.op === 'update')
    .reduce((acc, q) => { acc[q.resourceId!] = q.data; return acc; }, {} as Record<string, any>);

  return [
    ...serverItems
      .filter(e => !deletedIds.includes(e.id))
      .map(e => pendingUpdates[e.id] ? mapEvento({ ...pendingUpdates[e.id], id: e.id, _pending: true }) : e),
    ...pendingCreates,
  ];
};

const mergeProdutosWithQueue = async (serverItems: any[]) => {
  const queue = await getQueue();

  const deletedIds = queue
    .filter(q => q.resource === 'produto' && q.op === 'delete')
    .map(q => q.resourceId);

  const pendingCreates = queue
    .filter(q => q.resource === 'produto' && q.op === 'create')
    .map(q => mapProduto({ ...q.data, id: q.tempId, _pending: true }));

  const pendingUpdates = queue
    .filter(q => q.resource === 'produto' && q.op === 'update')
    .reduce((acc, q) => { acc[q.resourceId!] = q.data; return acc; }, {} as Record<string, any>);

  return [
    ...serverItems
      .filter(p => !deletedIds.includes(p.id))
      .map(p => pendingUpdates[p.id] ? mapProduto({ ...pendingUpdates[p.id], id: p.id, _pending: true }) : p),
    ...pendingCreates,
  ];
};

// ─── PRODUTOS ─────────────────────────────────────────────────────────────────

export const listProdutos = async (searchTerm = '') => {
  const online = getOnlineStatus();

  if (online) {
    try {
      const qs = searchTerm.trim() ? `?busca=${encodeURIComponent(searchTerm.trim())}` : '';
      const data = await apiFetchDirect<{ items: any[] }>(`/api/produtos${qs}`);
      const items = data.items.map(mapProduto);
      if (!searchTerm.trim()) await saveProdutosCache(items);
      return mergeProdutosWithQueue(searchTerm.trim() ? items : items);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  }

  // Offline: return cache merged with queue
  const cached = await getProdutosCache();
  return mergeProdutosWithQueue(cached);
};

export const getProdutoById = async (id: string) => {
  if (getOnlineStatus()) {
    try {
      const p = await apiFetchDirect<any>(`/api/produtos/${id}`);
      const mapped = mapProduto(p);
      await saveProdutoDetailCache(id, mapped);
      return mapped;
    } catch (err: any) {
      if (err.message?.startsWith('Erro 404')) return null;
      if (!isNetworkError(err)) throw err;
    }
  }

  return getProdutoDetailCache(id);
};

export const createProduto = async (produto: {
  nome: string; categoria: string; valorUnitario: number;
  quantidadeEstoque: number; observacoes?: string; foto?: string;
}) => {
  if (!getOnlineStatus()) {
    const tempId = 'temp_' + Date.now();
    await enqueueOp({ queueId: tempId, op: 'create', resource: 'produto', data: produto, tempId, timestamp: Date.now() });
    return tempId;
  }
  try {
    const data = await apiFetchDirect<any>('/api/produtos', { method: 'POST', body: JSON.stringify(produto) });
    return String(data.id);
  } catch (err) {
    if (isNetworkError(err)) {
      const tempId = 'temp_' + Date.now();
      await enqueueOp({ queueId: tempId, op: 'create', resource: 'produto', data: produto, tempId, timestamp: Date.now() });
      return tempId;
    }
    throw err;
  }
};

export const updateProduto = async (id: string, produto: {
  nome: string; categoria: string; valorUnitario: number;
  quantidadeEstoque: number; observacoes?: string; foto?: string;
}) => {
  if (!getOnlineStatus()) {
    await enqueueOp({ queueId: `upd_${id}_${Date.now()}`, op: 'update', resource: 'produto', resourceId: id, data: produto, timestamp: Date.now() });
    return;
  }
  try {
    await apiFetchDirect<any>(`/api/produtos/${id}`, { method: 'PUT', body: JSON.stringify(produto) });
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueOp({ queueId: `upd_${id}_${Date.now()}`, op: 'update', resource: 'produto', resourceId: id, data: produto, timestamp: Date.now() });
      return;
    }
    throw err;
  }
};

export const deleteProduto = async (id: string) => {
  if (!getOnlineStatus() || id.startsWith('temp_')) {
    await enqueueOp({ queueId: `del_${id}_${Date.now()}`, op: 'delete', resource: 'produto', resourceId: id, timestamp: Date.now() });
    return;
  }
  try {
    await apiFetchDirect<any>(`/api/produtos/${id}`, { method: 'DELETE' });
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueOp({ queueId: `del_${id}_${Date.now()}`, op: 'delete', resource: 'produto', resourceId: id, timestamp: Date.now() });
      return;
    }
    throw err;
  }
};

// ─── EVENTOS ──────────────────────────────────────────────────────────────────

export const listEventos = async () => {
  const online = getOnlineStatus();

  if (online) {
    try {
      const data = await apiFetchDirect<{ items: any[] }>('/api/eventos');
      const items = data.items.map(mapEvento);
      await saveEventosCache(items);
      return mergeEventosWithQueue(items);
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  }

  const cached = await getEventosCache();
  return mergeEventosWithQueue(cached);
};

export const getEventoById = async (id: string): Promise<EventoDetalhado | null> => {
  if (getOnlineStatus()) {
    try {
      const e = await apiFetchDirect<any>(`/api/eventos/${id}`);
      const outrosValores: { descricao: string; valor: number }[] = e.outrosValores ?? [];
      const despesasTotais = (e.valorFrete ?? 0) + outrosValores.reduce((s, o) => s + (o.valor || 0), 0);
      const totalGeral = e.totalGeral ?? 0;
      const itens: EventoItem[] = (e.itens ?? []).map((item: any) => ({
        produtoId: String(item.produtoId),
        codigoProduto: item.codigoProduto,
        nomeProduto: item.nomeProduto,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
      }));
      const mapped: EventoDetalhado = {
        id: String(e.id), cliente: e.cliente, telefone: e.telefone ?? '',
        dataHoraInicio: e.dataHoraInicio, dataHoraFim: e.dataHoraFim, local: e.local,
        valorFrete: e.valorFrete ?? 0, valorOrganizacao: e.valorOrganizacao ?? 0,
        outrosValores, despesasTotais, status: e.status,
        statusPagamento: e.statusPagamento ?? 'pendente', formaPagamento: e.formaPagamento ?? '',
        observacoes: e.observacoes ?? '', itens,
        totalProdutos: e.totalProdutos ?? 0, totalGeral,
        receitaTotal: e.receitaTotal ?? totalGeral,
        lucroEvento: e.lucroEvento ?? totalGeral - despesasTotais,
      };
      await saveEventoDetailCache(id, mapped);
      return mapped;
    } catch (err: any) {
      if (err.message?.startsWith('Erro 404')) return null;
      if (!isNetworkError(err)) throw err;
    }
  }

  return getEventoDetailCache(id);
};

export const createEvento = async (payload: {
  cliente: string; telefone: string; dataHoraInicio: string; dataHoraFim: string;
  local: string; valorFrete: number; valorOrganizacao: number;
  outrosValores: { descricao: string; valor: number }[];
  observacoes?: string; formaPagamento?: string; itens: EventoItem[]; status: string;
}) => {
  if (!getOnlineStatus()) {
    const tempId = 'temp_' + Date.now();
    await enqueueOp({ queueId: tempId, op: 'create', resource: 'evento', data: payload, tempId, timestamp: Date.now() });
    return tempId;
  }
  try {
    const data = await apiFetchDirect<any>('/api/eventos', { method: 'POST', body: JSON.stringify(payload) });
    return String(data.id);
  } catch (err) {
    if (isNetworkError(err)) {
      const tempId = 'temp_' + Date.now();
      await enqueueOp({ queueId: tempId, op: 'create', resource: 'evento', data: payload, tempId, timestamp: Date.now() });
      return tempId;
    }
    throw err;
  }
};

export const updateEvento = async (id: string, payload: {
  cliente: string; telefone: string; dataHoraInicio: string; dataHoraFim: string;
  local: string; valorFrete: number; valorOrganizacao: number;
  outrosValores: { descricao: string; valor: number }[];
  observacoes?: string; formaPagamento?: string; itens: EventoItem[]; status: string;
}) => {
  if (!getOnlineStatus()) {
    await enqueueOp({ queueId: `upd_${id}_${Date.now()}`, op: 'update', resource: 'evento', resourceId: id, data: payload, timestamp: Date.now() });
    return;
  }
  try {
    await apiFetchDirect<any>(`/api/eventos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueOp({ queueId: `upd_${id}_${Date.now()}`, op: 'update', resource: 'evento', resourceId: id, data: payload, timestamp: Date.now() });
      return;
    }
    throw err;
  }
};

export const updateEventoStatus = async (id: string, status: string) => {
  if (!getOnlineStatus()) {
    // Apply status change on top of existing queued update, or queue separately
    await enqueueOp({ queueId: `status_${id}_${Date.now()}`, op: 'update', resource: 'evento', resourceId: id, data: { _statusOnly: true, status }, timestamp: Date.now() });
    return;
  }
  await apiFetch<any>(`/api/eventos/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
};

export const updateEventoPagamento = async (id: string, statusPagamento: string) => {
  await apiFetch<any>(`/api/eventos/${id}/pagamento`, { method: 'PUT', body: JSON.stringify({ statusPagamento }) });
};

export const deleteEvento = async (id: string) => {
  if (!getOnlineStatus() || id.startsWith('temp_')) {
    await enqueueOp({ queueId: `del_${id}_${Date.now()}`, op: 'delete', resource: 'evento', resourceId: id, timestamp: Date.now() });
    return;
  }
  try {
    await apiFetchDirect<any>(`/api/eventos/${id}`, { method: 'DELETE' });
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueueOp({ queueId: `del_${id}_${Date.now()}`, op: 'delete', resource: 'evento', resourceId: id, timestamp: Date.now() });
      return;
    }
    throw err;
  }
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export const getDashboardData = async () => {
  const data = await apiFetch<{ totalNaoRealizados: number; proximosEventos: any[] }>(
    '/api/eventos/dashboard'
  );
  return {
    totalNaoRealizados: data.totalNaoRealizados,
    proximosEventos: data.proximosEventos.map((e) => ({
      id: String(e.id), cliente: e.cliente, telefone: e.telefone ?? '',
      dataHoraInicio: e.dataHoraInicio, dataHoraFim: e.dataHoraFim,
      local: e.local, status: e.status, totalGeral: e.totalGeral ?? 0,
    })),
  };
};

// ─── DISPONIBILIDADE ──────────────────────────────────────────────────────────

export const getDisponibilidadeProdutos = async (
  dataInicio: string, dataFim: string, eventoIdExcluir?: string
) => {
  const body: Record<string, string> = { dataHoraInicio: dataInicio, dataHoraFim: dataFim };
  if (eventoIdExcluir) body.eventoIdExcluir = eventoIdExcluir;
  const data = await apiFetch<{ items: any[] }>('/api/eventos/disponibilidade', {
    method: 'POST', body: JSON.stringify(body),
  });
  return data.items.map((p) => ({
    id: String(p.id),
    codigo: p.codigo ?? `PROD${String(p.id).padStart(4, '0')}`,
    nome: p.nome, categoria: p.categoria ?? 'Sem categoria',
    valorUnitario: p.valorUnitario, quantidadeEstoque: p.quantidadeEstoque,
    observacoes: p.observacoes ?? '', estoqueDisponivel: p.estoqueDisponivel,
  }));
};

// ─── FINANCEIRO ───────────────────────────────────────────────────────────────

export const getFinanceMonthSummary = async (year: number, month: number) => {
  const monthStr = String(month).padStart(2, '0');
  const monthStart = `${year}-${monthStr}-01T00:00:00`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00`;
  const data = await apiFetch<{ items: any[] }>(
    `/api/eventos?status_filter=realizado&data_inicio=${monthStart}&data_fim=${monthEnd}&limit=500`
  );
  let totalEventos = 0, entradas = 0, aluguelProdutos = 0, maoDeObra = 0, frete = 0, outrasDespesas = 0, despesas = 0;
  for (const ev of data.items) {
    const outrosTotal = (ev.outrosValores ?? []).reduce((s: number, o: any) => s + (o.valor || 0), 0);
    totalEventos++;
    entradas += ev.totalGeral ?? 0;
    aluguelProdutos += ev.totalProdutos ?? 0;
    maoDeObra += ev.valorOrganizacao ?? 0;
    frete += ev.valorFrete ?? 0;
    outrasDespesas += outrosTotal;
    despesas += (ev.valorFrete ?? 0) + outrosTotal;
  }
  return {
    totalEventos, entradas, despesas, lucro: entradas - despesas,
    entradasDetalhe: { aluguelProdutos, maoDeObra, total: entradas },
    despesasDetalhe: { frete, outrasDespesas, total: despesas },
  };
};
