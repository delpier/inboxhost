import * as FileSystem from 'expo-file-system/legacy';
import { parseICal } from './icalParser';
import {
  getCalendarSources,
  saveCalendarSource,
  getReservations,
  saveReservations,
  applyGuestOverrides,
} from './storage';
import { CalendarSource, Reservation } from '../types';

export async function syncCalendar(source: CalendarSource): Promise<number> {
  const destUri = `${FileSystem.cacheDirectory}cal_${source.id}.ics`;

  const result = await FileSystem.downloadAsync(source.url, destUri);
  if (result.status !== 200) throw new Error(`HTTP ${result.status}`);

  const content = await FileSystem.readAsStringAsync(result.uri);
  const parsed  = parseICal(content, source.id, source.url, source.platform);

  // Reservas anteriores desta fonte — para preservar mensagens, edições manuais
  // e a data de criação
  const all      = await getReservations();
  const previous = new Map<string, Reservation>();
  all
    .filter(r => r.sourceId === source.id)
    .forEach(r => previous.set(r.uid, r));

  const now    = new Date().toISOString();
  const merged = parsed.map(res => {
    const prev = previous.get(res.uid);
    return applyGuestOverrides({
      ...res,
      property:  source.name,
      overrides: prev?.overrides,
      messages:  prev?.messages ?? [],
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    });
  });

  // Substitui as reservas desta fonte numa única escrita
  // (as que já não vêm no iCal — p.ex. bloqueios — desaparecem)
  await saveReservations([
    ...all.filter(r => r.sourceId !== source.id),
    ...merged,
  ]);

  await saveCalendarSource({ ...source, lastSync: now });

  return merged.length;
}

export async function syncAllCalendars(): Promise<{ ok: number; failed: number }> {
  const sources = await getCalendarSources();
  const active  = sources.filter(s => s.active);

  // Sequencial: cada sync lê e reescreve a lista de reservas no AsyncStorage,
  // em paralelo as escritas sobrepunham-se e perdiam-se reservas
  let ok = 0;
  let failed = 0;
  for (const source of active) {
    try {
      await syncCalendar(source);
      ok++;
    } catch {
      failed++;
    }
  }
  return { ok, failed };
}
