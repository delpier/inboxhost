import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getCalendarSources,
  saveCalendarSource,
  deleteCalendarSource,
  toggleCalendarSource,
  getReservations,
  saveReservations,
} from '../services/storage';
import { syncCalendar } from '../services/syncService';
import { CalendarSource } from '../types';

export function useCalendarSources() {
  const [sources, setSources]   = useState<CalendarSource[]>([]);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSources(await getCalendarSources());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addSource = useCallback(async (source: CalendarSource): Promise<number> => {
    await saveCalendarSource(source);
    const count = await syncCalendar(source);
    await load();
    return count;
  }, [load]);

  const removeSource = useCallback(async (id: string) => {
    await deleteCalendarSource(id);
    // Also remove reservations that came from this source
    const all = await getReservations();
    await saveReservations(all.filter(r => r.sourceId !== id));
    await load();
  }, [load]);

  // Toggle active state and immediately reflect in reservation list
  const toggle = useCallback(async (id: string) => {
    await toggleCalendarSource(id);
    await load();
  }, [load]);

  const syncSource = useCallback(async (source: CalendarSource): Promise<number> => {
    const count = await syncCalendar(source);
    await load();
    return count;
  }, [load]);

  return { sources, loading, reload: load, addSource, removeSource, toggle, syncSource };
}
