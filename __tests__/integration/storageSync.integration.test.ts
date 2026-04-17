// __tests__/integration/storageSync.integration.test.ts
// Testa o fluxo completo: adicionar calendário → sincronizar → verificar reservas

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { syncCalendar } from '../../services/syncService';
import {
  getReservations,
  getCalendarSources,
  saveCalendarSource,
  upsertReservation,
  addMessageToReservation,
} from '../../services/storage';
import {
  SOURCE_AIRBNB,
  SOURCE_BOOKING,
  ICAL_AIRBNB_SIMPLE,
  ICAL_BOOKING_SIMPLE,
  RESERVATION_ACTIVE,
  MSG_SENT,
  MSG_RECEIVED,
} from '../fixtures';

beforeEach(() => {
  (AsyncStorage as any)._reset();
  jest.clearAllMocks();
});

describe('Fluxo completo: adicionar calendário e sincronizar', () => {
  it('deve guardar calendário e ter as suas reservas após sync', async () => {
    // 1. Utilizador adiciona calendário
    await saveCalendarSource(SOURCE_AIRBNB);

    // 2. App sincroniza
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValueOnce({ uri: 'file:///cache/test.ics' });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(ICAL_AIRBNB_SIMPLE);
    await syncCalendar(SOURCE_AIRBNB);

    // 3. Verificar reservas
    const reservations = await getReservations();
    expect(reservations.length).toBeGreaterThan(0);
    const guestNames = reservations.map(r => r.guestName);
    expect(guestNames).toContain('Sarah Mitchell');
  });

  it('deve manter reservas de múltiplas plataformas separadas', async () => {
    await saveCalendarSource(SOURCE_AIRBNB);
    await saveCalendarSource(SOURCE_BOOKING);

    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ uri: 'file:///cache/test.ics' });
    (FileSystem.readAsStringAsync as jest.Mock)
      .mockResolvedValueOnce(ICAL_AIRBNB_SIMPLE)
      .mockResolvedValueOnce(ICAL_BOOKING_SIMPLE);

    await syncCalendar(SOURCE_AIRBNB);
    await syncCalendar(SOURCE_BOOKING);

    const reservations = await getReservations();
    const platforms = [...new Set(reservations.map(r => r.platform))];
    expect(platforms).toContain('airbnb');
    expect(platforms).toContain('booking');
  });

  it('deve actualizar lastSync depois de sincronizar com sucesso', async () => {
    await saveCalendarSource(SOURCE_AIRBNB);

    (FileSystem.downloadAsync as jest.Mock).mockResolvedValueOnce({ uri: 'file:///cache/test.ics' });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(ICAL_AIRBNB_SIMPLE);

    await syncCalendar(SOURCE_AIRBNB);

    const sources = await getCalendarSources();
    const airbnb = sources.find(s => s.id === SOURCE_AIRBNB.id);
    expect(airbnb?.lastSync).toBeDefined();
    expect(new Date(airbnb!.lastSync!).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe('Fluxo de mensagens', () => {
  beforeEach(async () => {
    await upsertReservation({ ...RESERVATION_ACTIVE, messages: [] });
  });

  it('deve ter conversa ordenada cronologicamente', async () => {
    // Mensagem recebida mais antiga
    const msgOld = { ...MSG_RECEIVED, timestamp: '2025-04-10T10:00:00.000Z' };
    const msgNew = { ...MSG_SENT, id: 'msg-new', timestamp: '2025-04-10T10:05:00.000Z' };

    await addMessageToReservation(RESERVATION_ACTIVE.id, msgOld);
    await addMessageToReservation(RESERVATION_ACTIVE.id, msgNew);

    const [res] = await getReservations();
    expect(res.messages).toHaveLength(2);
    expect(res.messages[0].direction).toBe('received');
    expect(res.messages[1].direction).toBe('sent');
  });

  it('deve contar mensagens não lidas correctamente', async () => {
    const unread1 = { ...MSG_RECEIVED, id: 'm1', read: false };
    const unread2 = { ...MSG_RECEIVED, id: 'm2', read: false };
    const read1 = { ...MSG_SENT, id: 'm3', read: true };

    await addMessageToReservation(RESERVATION_ACTIVE.id, unread1);
    await addMessageToReservation(RESERVATION_ACTIVE.id, unread2);
    await addMessageToReservation(RESERVATION_ACTIVE.id, read1);

    const [res] = await getReservations();
    const unreadCount = res.messages.filter(m => !m.read).length;
    expect(unreadCount).toBe(2);
  });

  it('deve preservar mensagens ao fazer novo sync do calendário', async () => {
    // Adiciona mensagem
    await addMessageToReservation(RESERVATION_ACTIVE.id, MSG_SENT);

    // Faz novo sync (simula actualização de dados da reserva)
    const updatedReservation = { ...RESERVATION_ACTIVE, guestName: 'Sarah M. Updated' };
    await upsertReservation(updatedReservation);

    // Mensagens devem estar intactas
    const [res] = await getReservations();
    expect(res.messages.length).toBeGreaterThan(0);
  });
});

describe('Persistência de dados', () => {
  it('deve manter dados após múltiplas operações de leitura/escrita', async () => {
    await saveCalendarSource(SOURCE_AIRBNB);
    await upsertReservation(RESERVATION_ACTIVE);
    await addMessageToReservation(RESERVATION_ACTIVE.id, MSG_SENT);

    // Simula releitura do storage (como se a app fosse reaberta)
    const reservations = await getReservations();
    const sources = await getCalendarSources();

    expect(sources).toHaveLength(1);
    expect(reservations).toHaveLength(1);
    expect(reservations[0].messages).toHaveLength(1);
  });

  it('deve usar AsyncStorage com as chaves correctas', async () => {
    await saveCalendarSource(SOURCE_AIRBNB);
    await upsertReservation(RESERVATION_ACTIVE);

    const calls = (AsyncStorage.setItem as jest.Mock).mock.calls.map(c => c[0]);
    expect(calls).toContain('calendar_sources');
    expect(calls).toContain('reservations');
  });
});
