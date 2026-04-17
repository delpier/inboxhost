import * as FileSystem from 'expo-file-system/legacy';
import { parseICal } from './icalParser';
import {
  getCalendarSources,
  saveCalendarSource,
  upsertReservation,
  clearReservationsForSource,
  getReservations,
} from './storage';
import { CalendarSource, Message } from '../types';

export async function syncCalendar(source: CalendarSource): Promise<number> {
  const destUri = `${FileSystem.cacheDirectory}cal_${source.id}.ics`;

  const result = await FileSystem.downloadAsync(source.url, destUri);
  if (result.status !== 200) throw new Error(`HTTP ${result.status}`);

  const content      = await FileSystem.readAsStringAsync(result.uri);
  const reservations = parseICal(content, source.id, source.url, source.platform);

  // Guarda as mensagens existentes antes de limpar
  const existing   = await getReservations();
  const msgMap     = new Map<string, Message[]>();
  existing
    .filter(r => r.sourceId === source.id)
    .forEach(r => msgMap.set(r.uid, r.messages));

  // Limpa reservas antigas desta fonte (remove blocked events do storage)
  await clearReservationsForSource(source.id);

  // Re-insere apenas as reservas válidas (blocked já filtrados pelo parser)
  for (const res of reservations) {
    await upsertReservation({
      ...res,
      messages:  msgMap.get(res.uid) ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  await saveCalendarSource({ ...source, lastSync: new Date().toISOString() });

  return reservations.length;
}

export async function syncAllCalendars(): Promise<{ ok: number; failed: number }> {
  const sources = await getCalendarSources();
  const active  = sources.filter(s => s.active);
  const results = await Promise.allSettled(active.map(syncCalendar));
  return {
    ok:     results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
  };
}
