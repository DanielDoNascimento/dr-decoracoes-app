import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { listEventos } from '../../services/api';
import { showError } from '../../services/alert';

interface Evento {
  id: string;
  cliente: string;
  telefone: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  local: string;
  status: string;
  statusPagamento: string;
  totalGeral: number;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  'orçamento': '#F5A623',
  pendente: '#4A90D9',
  realizado: '#5CB85C',
  cancelado: '#D9534F',
};

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getDaysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month - 1, 1).getDay(); }
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

export default function EventosScreen() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('orçamento');
  const [busca, setBusca] = useState('');
  const hoje = new Date();
  const [filtroAno, setFiltroAno] = useState<number | null>(null);
  const [filtroMes, setFiltroMes] = useState<number | null>(null);
  const [calendarView, setCalendarView] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState({ year: hoje.getFullYear(), month: hoje.getMonth() + 1 });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const fetchEventos = async () => {
    try {
      const data = await listEventos();
      const ordenados = [...data].sort((a: Evento, b: Evento) =>
        new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime()
      );
      setEventos(ordenados);
    } catch {
      showError('Não foi possível carregar os eventos');
    } finally {
      setLoading(false);
    }
  };

  const contarStatus = (status: string) => eventos.filter((e) => e.status === status).length;

  useFocusEffect(
    useCallback(() => {
      fetchEventos();
    }, [])
  );

  const formatData = (dataISO: string) => {
    const date = new Date(dataISO);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const isEventoAtrasado = (dataISO: string, status: string) => {
    if (status === 'realizado' || status === 'cancelado') return false;
    return new Date(dataISO) < new Date();
  };

  const navegarMes = (direcao: 1 | -1) => {
    const anoBase = filtroAno ?? hoje.getFullYear();
    const mesBase = filtroMes ?? (hoje.getMonth() + 1);
    let novoMes = mesBase + direcao;
    let novoAno = anoBase;
    if (novoMes > 12) { novoMes = 1; novoAno++; }
    if (novoMes < 1) { novoMes = 12; novoAno--; }
    setFiltroMes(novoMes);
    setFiltroAno(novoAno);
  };

  const limparFiltroMes = () => { setFiltroMes(null); setFiltroAno(null); };

  const navegarCalendario = (dir: 1 | -1) => {
    setCalendarMonth(prev => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m > 12) { m = 1; y++; }
      if (m < 1) { m = 12; y--; }
      return { year: y, month: m };
    });
    setSelectedDay(null);
  };

  const todayStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  const eventsByDate = useMemo(() => {
    const map: Record<string, Evento[]> = {};
    eventos.forEach(e => {
      const d = new Date(e.dataHoraInicio);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [eventos]);

  const eventosFiltrados = eventos.filter((e) => {
    if (e.status !== filtroStatus) return false;
    if (busca.trim() !== '' && !e.cliente.toLowerCase().includes(busca.trim().toLowerCase())) return false;
    if (filtroMes !== null && filtroAno !== null) {
      const d = new Date(e.dataHoraInicio);
      if (d.getMonth() + 1 !== filtroMes || d.getFullYear() !== filtroAno) return false;
    }
    return true;
  });

  const eventosDoDia = useMemo(() => {
    if (!selectedDay) return [];
    return eventos.filter(e => {
      const d = new Date(e.dataHoraInicio);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (key !== selectedDay) return false;
      if (busca.trim() && !e.cliente.toLowerCase().includes(busca.trim().toLowerCase())) return false;
      return true;
    });
  }, [selectedDay, eventos, busca]);

  const formatSelectedDay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const formatted = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const renderCalendar = () => {
    const { year, month } = calendarMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks = chunk(cells, 7);

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarNav}>
          <TouchableOpacity onPress={() => navegarCalendario(-1)} style={styles.calendarNavBtn}>
            <Ionicons name="chevron-back" size={22} color="#666" />
          </TouchableOpacity>
          <Text style={styles.calendarNavTitle}>{MESES_FULL[month - 1]} {year}</Text>
          <TouchableOpacity onPress={() => navegarCalendario(1)} style={styles.calendarNavBtn}>
            <Ionicons name="chevron-forward" size={22} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarWeekHeader}>
          {DIAS_SEMANA.map(d => (
            <Text key={d} style={styles.calendarWeekDay}>{d}</Text>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.calendarWeekRow}>
            {week.map((day, di) => {
              if (day === null) {
                return <View key={di} style={styles.calendarDayCell} />;
              }
              const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsByDate[dateKey] || [];
              const isSelected = selectedDay === dateKey;
              const isToday = dateKey === todayStr;
              const dots = [...new Set(dayEvents.map(e => e.status))].slice(0, 3);

              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.calendarDayCell,
                    isSelected && styles.calendarDayCellSelected,
                    isToday && !isSelected && styles.calendarDayCellToday,
                  ]}
                  onPress={() => setSelectedDay(isSelected ? null : dateKey)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.calendarDayNum,
                    isSelected && styles.calendarDayNumSelected,
                    isToday && !isSelected && styles.calendarDayNumToday,
                  ]}>
                    {day}
                  </Text>
                  <View style={styles.calendarDots}>
                    {dots.map((status, si) => (
                      <View key={si} style={[styles.calendarDot, { backgroundColor: STATUS_DOT_COLORS[status] || '#CCC' }]} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const listData = calendarView ? eventosDoDia : eventosFiltrados;

  const renderEventoCard = (item: Evento) => {
    const atrasado = isEventoAtrasado(item.dataHoraInicio, item.status);
    return (
      <TouchableOpacity
        style={styles.eventoCard}
        onPress={() => router.push(`/eventos/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.eventoHeader}>
          <Text style={styles.eventoCliente}>{item.cliente}</Text>
          <View style={[styles.statusBadge, (styles as any)[`status_${item.status}`]]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.eventoInfo}>
          <Ionicons name="calendar" size={16} color={atrasado ? '#FF6B6B' : '#666'} />
          <Text style={[styles.eventoInfoText, atrasado && styles.eventoInfoTextAtrasado]}>
            {formatData(item.dataHoraInicio)}
            {atrasado && ' • Atrasado'}
          </Text>
        </View>
        <View style={styles.eventoInfo}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.eventoInfoText}>{item.local}</Text>
        </View>
        <View style={styles.eventoFooter}>
          <Text style={styles.eventoValor}>{formatMoeda(item.totalGeral)}</Text>
          <View style={styles.eventoFooterRight}>
            <View style={[
              styles.pagamentoBadge,
              item.statusPagamento === 'pago' && styles.pagamentoPago,
              item.statusPagamento === 'parcial' && styles.pagamentoParcial,
            ]}>
              <Text style={[
                styles.pagamentoBadgeText,
                (item.statusPagamento === 'pago' || item.statusPagamento === 'parcial') && styles.pagamentoBadgeTextAtivo,
              ]}>
                {item.statusPagamento === 'pago' ? 'Pago' : item.statusPagamento === 'parcial' ? 'Parcial' : 'Pendente'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Eventos</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.calendarToggle}
            onPress={() => { setCalendarView(v => !v); setSelectedDay(null); }}
          >
            <Ionicons name={calendarView ? 'list-outline' : 'calendar-outline'} size={22} color="#FFB6C1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/eventos/novo')}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {!calendarView && (
        <>
          <View style={styles.filterContainer}>
            {[
              { label: 'Orçamento', value: 'orçamento' },
              { label: 'Pendente', value: 'pendente' },
              { label: 'Realizado', value: 'realizado' },
              { label: 'Cancelado', value: 'cancelado' },
            ].map((tab) => {
              const count = contarStatus(tab.value);
              const active = filtroStatus === tab.value;
              return (
                <TouchableOpacity
                  key={tab.value}
                  style={[styles.filterButton, active && styles.filterButtonActive]}
                  onPress={() => setFiltroStatus(tab.value)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{tab.label}</Text>
                  {count > 0 && (
                    <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                      <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.mesFilterContainer}>
            <TouchableOpacity onPress={() => navegarMes(-1)} style={styles.mesArrow}>
              <Ionicons name="chevron-back" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mesLabel} onPress={limparFiltroMes}>
              <Text style={styles.mesLabelText}>
                {filtroMes !== null && filtroAno !== null ? `${MESES[filtroMes - 1]} ${filtroAno}` : 'Todos os meses'}
              </Text>
              {filtroMes !== null && (
                <Ionicons name="close-circle" size={14} color="#999" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navegarMes(1)} style={styles.mesArrow}>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {calendarView && renderCalendar()}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente..."
          value={busca}
          onChangeText={setBusca}
          placeholderTextColor="#BBB"
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => setBusca('')}>
            <Ionicons name="close-circle" size={18} color="#BBB" />
          </TouchableOpacity>
        )}
      </View>

      {calendarView && selectedDay && (
        <View style={styles.calendarDayHeader}>
          <Ionicons name="calendar" size={15} color="#FFB6C1" />
          <Text style={styles.calendarDayHeaderText}>{formatSelectedDay(selectedDay)}</Text>
          <Text style={styles.calendarDayCount}>
            {eventosDoDia.length} evento{eventosDoDia.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFB6C1" />
        </View>
      ) : listData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={56} color="#CCC" />
          <Text style={styles.emptyText}>
            {calendarView && !selectedDay
              ? 'Toque em um dia para ver os eventos'
              : calendarView
              ? 'Nenhum evento neste dia'
              : 'Nenhum evento encontrado'}
          </Text>
          {!calendarView && (
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/eventos/novo')}>
              <Text style={styles.emptyButtonText}>Criar Primeiro Evento</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={({ item }) => renderEventoCard(item)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFB6C1',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarToggle: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFB6C1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#FFB6C1',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFF',
  },
  filterBadge: {
    marginTop: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  filterBadgeTextActive: {
    color: '#FFF',
  },
  mesFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mesArrow: {
    padding: 6,
  },
  mesLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mesLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  // Calendar styles
  calendarContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingBottom: 6,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  calendarNavBtn: {
    padding: 8,
  },
  calendarNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    paddingVertical: 4,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  calendarDayCell: {
    flex: 1,
    height: 48,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 6,
    borderRadius: 8,
    marginVertical: 2,
  },
  calendarDayCellSelected: {
    backgroundColor: '#FFB6C1',
  },
  calendarDayCellToday: {
    borderWidth: 1.5,
    borderColor: '#FFB6C1',
  },
  calendarDayNum: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  calendarDayNumSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  calendarDayNumToday: {
    color: '#FFB6C1',
    fontWeight: '700',
  },
  calendarDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 3,
    height: 6,
    alignItems: 'center',
  },
  calendarDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  calendarDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF8F9',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E8',
    gap: 8,
  },
  calendarDayHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  calendarDayCount: {
    fontSize: 12,
    color: '#FFB6C1',
    fontWeight: '600',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  eventoCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventoCliente: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  status_orçamento: {
    backgroundColor: '#FFF3CD',
  },
  status_pendente: {
    backgroundColor: '#D1ECF1',
  },
  status_realizado: {
    backgroundColor: '#D4EDDA',
  },
  status_cancelado: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  eventoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventoInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  eventoInfoTextAtrasado: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  eventoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  eventoValor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFB6C1',
  },
  eventoFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pagamentoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  pagamentoPago: {
    backgroundColor: '#D4EDDA',
  },
  pagamentoParcial: {
    backgroundColor: '#D1ECF1',
  },
  pagamentoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  pagamentoBadgeTextAtivo: {
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#FFB6C1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
