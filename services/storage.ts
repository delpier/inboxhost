import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarSource, Message, Reservation } from '../types';

const KEYS = {
  RESERVATIONS:     'reservations',
  CALENDAR_SOURCES: 'calendar_sources',
  SHOW_BLOCKED:     'show_blocked_events',
};

// ─── Reservas ──────────────────────────────────────────────────────────────

export async function getReservations(): Promise<Reservation[]> {
  const raw = await AsyncStorage.getItem(KEYS.RESERVATIONS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveReservations(reservations: Reservation[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(reservations));
}

export async function upsertReservation(reservation: Reservation): Promise<void> {
  const all = await getReservations();
  const idx = all.findIndex(
    r => r.uid === reservation.uid && r.sourceId === reservation.sourceId
  );
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...reservation, updatedAt: new Date().toISOString() };
  } else {
    all.push(reservation);
  }
  await saveReservations(all);
}

export async function deleteReservation(id: string): Promise<void> {
  const all = await getReservations();
  await saveReservations(all.filter(r => r.id !== id));
}

export async function addMessageToReservation(
  reservationId: string,
  message: Message
): Promise<void> {
  const all = await getReservations();
  const res = all.find(r => r.id === reservationId);
  if (res) {
    res.messages = [...(res.messages ?? []), message];
    res.updatedAt = new Date().toISOString();
    await saveReservations(all);
  }
}

export async function markMessagesAsRead(reservationId: string): Promise<void> {
  const all = await getReservations();
  const res = all.find(r => r.id === reservationId);
  if (res) {
    res.messages = res.messages.map(m => ({ ...m, read: true }));
    await saveReservations(all);
  }
}

// Remove todas as reservas de uma fonte antes de resync
// Preserva mensagens — o syncService faz o merge depois
export async function clearReservationsForSource(sourceId: string): Promise<void> {
  const all = await getReservations();
  await saveReservations(all.filter(r => r.sourceId !== sourceId));
}

// ─── Calendários ─────────────────────────────────────────────────────────────

export async function getCalendarSources(): Promise<CalendarSource[]> {
  const raw = await AsyncStorage.getItem(KEYS.CALENDAR_SOURCES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveCalendarSource(source: CalendarSource): Promise<void> {
  const all = await getCalendarSources();
  const idx = all.findIndex(s => s.id === source.id);
  if (idx >= 0) all[idx] = source;
  else all.push(source);
  await AsyncStorage.setItem(KEYS.CALENDAR_SOURCES, JSON.stringify(all));
}

export async function deleteCalendarSource(id: string): Promise<void> {
  const all = await getCalendarSources();
  await AsyncStorage.setItem(
    KEYS.CALENDAR_SOURCES,
    JSON.stringify(all.filter(s => s.id !== id))
  );
}

export async function toggleCalendarSource(id: string): Promise<void> {
  const all = await getCalendarSources();
  const src = all.find(s => s.id === id);
  if (src) {
    src.active = !src.active;
    await AsyncStorage.setItem(KEYS.CALENDAR_SOURCES, JSON.stringify(all));
  }
}

// ─── Preferência: mostrar eventos bloqueados ──────────────────────────────

export async function getShowBlocked(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.SHOW_BLOCKED);
  return raw === 'true';
}

export async function setShowBlocked(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.SHOW_BLOCKED, value ? 'true' : 'false');
}
