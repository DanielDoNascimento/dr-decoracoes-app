import { Platform } from 'react-native';

// On web (Netlify), use relative URL so Netlify proxy handles the request (avoids CORS + cold start).
// On native, use the full Render URL directly.
const API_BASE = Platform.OS === 'web'
  ? ''
  : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001').replace(/\/$/, '');
const API_KEY  = process.env.EXPO_PUBLIC_API_KEY || '';

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
      const isNetworkError = err?.name === 'AbortError' || err?.message === 'Failed to fetch' || err?.message?.includes('fetch');
      if (isNetworkError && attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Servidor indisponível. Tente novamente.');
}

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

// ─── PRODUTOS ─────────────────────────────────────────────────────────────────

export const listProdutos = async (searchTerm = '') => {
  const qs = searchTerm.trim() ? `?busca=${encodeURIComponent(searchTerm.trim())}` : '';
  const data = await apiFetch<{ items: any[] }>(`/api/produtos${qs}`);
  return data.items.map((p) => ({
    id: String(p.id),
    codigo: p.codigo ?? `PROD${String(p.id).padStart(4, '0')}`,
    nome: p.nome,
    categoria: p.categoria ?? 'Sem categoria',
    valorUnitario: p.valorUnitario,
    quantidadeEstoque: p.quantidadeEstoque,
    observacoes: p.observacoes ?? '',
    foto: p.foto ?? '',
  }));
};

export const getProdutoById = async (id: string) => {
  try {
    const p = await apiFetch<any>(`/api/produtos/${id}`);
    return {
      id: String(p.id),
      codigo: p.codigo ?? `PROD${String(p.id).padStart(4, '0')}`,
      nome: p.nome,
      categoria: p.categoria ?? 'Sem categoria',
      valorUnitario: p.valorUnitario,
      quantidadeEstoque: p.quantidadeEstoque,
      observacoes: p.observacoes ?? '',
      foto: p.foto ?? '',
    };
  } catch (err: any) {
    if (err.message?.startsWith('Erro 404')) return null;
    throw err;
  }
};

export const createProduto = async (produto: {
  nome: string;
  categoria: string;
  valorUnitario: number;
  quantidadeEstoque: number;
  observacoes?: string;
  foto?: string;
}) => {
  const data = await apiFetch<any>('/api/produtos', {
    method: 'POST',
    body: JSON.stringify(produto),
  });
  return String(data.id);
};

export const updateProduto = async (
  id: string,
  produto: {
    nome: string;
    categoria: string;
    valorUnitario: number;
    quantidadeEstoque: number;
    observacoes?: string;
    foto?: string;
  }
) => {
  await apiFetch<any>(`/api/produtos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(produto),
  });
};

export const deleteProduto = async (id: string) => {
  await apiFetch<any>(`/api/produtos/${id}`, { method: 'DELETE' });
};

// ─── EVENTOS ──────────────────────────────────────────────────────────────────

export const listEventos = async () => {
  const data = await apiFetch<{ items: any[] }>('/api/eventos');
  return data.items.map((e) => ({
    id: String(e.id),
    cliente: e.cliente,
    telefone: e.telefone ?? '',
    dataHoraInicio: e.dataHoraInicio,
    dataHoraFim: e.dataHoraFim,
    local: e.local,
    status: e.status,
    statusPagamento: e.statusPagamento ?? 'pendente',
    totalGeral: e.totalGeral ?? 0,
  }));
};

export const getEventoById = async (id: string): Promise<EventoDetalhado | null> => {
  try {
    const e = await apiFetch<any>(`/api/eventos/${id}`);
    const outrosValores: { descricao: string; valor: number }[] = e.outrosValores ?? [];
    const outrosTotal = outrosValores.reduce((s, o) => s + (o.valor || 0), 0);
    const despesasTotais = (e.valorFrete ?? 0) + outrosTotal;
    const totalGeral = e.totalGeral ?? 0;
    const lucroEvento = e.lucroEvento ?? totalGeral - despesasTotais;

    const itens: EventoItem[] = (e.itens ?? []).map((item: any) => ({
      produtoId: String(item.produtoId),
      codigoProduto: item.codigoProduto,
      nomeProduto: item.nomeProduto,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
    }));

    return {
      id: String(e.id),
      cliente: e.cliente,
      telefone: e.telefone ?? '',
      dataHoraInicio: e.dataHoraInicio,
      dataHoraFim: e.dataHoraFim,
      local: e.local,
      valorFrete: e.valorFrete ?? 0,
      valorOrganizacao: e.valorOrganizacao ?? 0,
      outrosValores,
      despesasTotais,
      status: e.status,
      statusPagamento: e.statusPagamento ?? 'pendente',
      formaPagamento: e.formaPagamento ?? '',
      observacoes: e.observacoes ?? '',
      itens,
      totalProdutos: e.totalProdutos ?? 0,
      totalGeral,
      receitaTotal: e.receitaTotal ?? totalGeral,
      lucroEvento,
    };
  } catch (err: any) {
    if (err.message?.startsWith('Erro 404')) return null;
    throw err;
  }
};

export const createEvento = async (payload: {
  cliente: string;
  telefone: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  local: string;
  valorFrete: number;
  valorOrganizacao: number;
  outrosValores: { descricao: string; valor: number }[];
  observacoes?: string;
  formaPagamento?: string;
  itens: EventoItem[];
  status: string;
}) => {
  const data = await apiFetch<any>('/api/eventos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return String(data.id);
};

export const updateEvento = async (
  id: string,
  payload: {
    cliente: string;
    telefone: string;
    dataHoraInicio: string;
    dataHoraFim: string;
    local: string;
    valorFrete: number;
    valorOrganizacao: number;
    outrosValores: { descricao: string; valor: number }[];
    observacoes?: string;
    formaPagamento?: string;
    itens: EventoItem[];
    status: string;
  }
) => {
  await apiFetch<any>(`/api/eventos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const updateEventoStatus = async (id: string, status: string) => {
  await apiFetch<any>(`/api/eventos/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

export const updateEventoPagamento = async (id: string, statusPagamento: string) => {
  await apiFetch<any>(`/api/eventos/${id}/pagamento`, {
    method: 'PUT',
    body: JSON.stringify({ statusPagamento }),
  });
};

export const deleteEvento = async (id: string) => {
  await apiFetch<any>(`/api/eventos/${id}`, { method: 'DELETE' });
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export const getDashboardData = async () => {
  const data = await apiFetch<{ totalNaoRealizados: number; proximosEventos: any[] }>(
    '/api/eventos/dashboard'
  );
  return {
    totalNaoRealizados: data.totalNaoRealizados,
    proximosEventos: data.proximosEventos.map((e) => ({
      id: String(e.id),
      cliente: e.cliente,
      telefone: e.telefone ?? '',
      dataHoraInicio: e.dataHoraInicio,
      dataHoraFim: e.dataHoraFim,
      local: e.local,
      status: e.status,
      totalGeral: e.totalGeral ?? 0,
    })),
  };
};

// ─── DISPONIBILIDADE ──────────────────────────────────────────────────────────

export const getDisponibilidadeProdutos = async (
  dataInicio: string,
  dataFim: string,
  eventoIdExcluir?: string
) => {
  const body: Record<string, string> = { dataHoraInicio: dataInicio, dataHoraFim: dataFim };
  if (eventoIdExcluir) body.eventoIdExcluir = eventoIdExcluir;

  const data = await apiFetch<{ items: any[] }>('/api/eventos/disponibilidade', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return data.items.map((p) => ({
    id: String(p.id),
    codigo: p.codigo ?? `PROD${String(p.id).padStart(4, '0')}`,
    nome: p.nome,
    categoria: p.categoria ?? 'Sem categoria',
    valorUnitario: p.valorUnitario,
    quantidadeEstoque: p.quantidadeEstoque,
    observacoes: p.observacoes ?? '',
    estoqueDisponivel: p.estoqueDisponivel,
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

  let totalEventos = 0;
  let entradas = 0;
  let aluguelProdutos = 0;
  let maoDeObra = 0;
  let frete = 0;
  let outrasDespesas = 0;
  let despesas = 0;

  for (const ev of data.items) {
    const outrosTotal = (ev.outrosValores ?? []).reduce(
      (s: number, o: any) => s + (o.valor || 0),
      0
    );
    totalEventos++;
    entradas += ev.totalGeral ?? 0;
    aluguelProdutos += ev.totalProdutos ?? 0;
    maoDeObra += ev.valorOrganizacao ?? 0;
    frete += ev.valorFrete ?? 0;
    outrasDespesas += outrosTotal;
    despesas += (ev.valorFrete ?? 0) + outrosTotal;
  }

  return {
    totalEventos,
    entradas,
    despesas,
    lucro: entradas - despesas,
    entradasDetalhe: { aluguelProdutos, maoDeObra, total: entradas },
    despesasDetalhe: { frete, outrasDespesas, total: despesas },
  };
};

