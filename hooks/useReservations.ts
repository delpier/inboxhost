import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { getReservations } from '../services/storage';
import { syncAllCalendars } from '../services/syncService';
import { Reservation } from '../types';
import { isReservationPast } from '../utils/reservation';

export type ReservationFilter = 'all' | 'upcoming' | 'past';

export function useReservations(filter: ReservationFilter = 'all') {
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]   = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const mountedRef               = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load ALL reservations from storage — no date filtering here
      const all = await getReservations();
      if (mountedRef.current) {
        // Sort by checkIn descending (most recent first)
        setAllReservations(
          all.sort((a, b) => b.checkIn.localeCompare(a.checkIn))
        );
      }
    } catch {
      if (mountedRef.current) setError('Error loading reservations');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Reload whenever the screen comes into focus
  useFocusEffect(useCallback(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]));

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncAllCalendars();
      await load();
    } catch {
      setError('Error syncing calendars');
    } finally {
      setSyncing(false);
    }
  }, [load]);

  // Apply filter in memory — storage always has everything
  const reservations = allReservations.filter(r => {
    if (filter === 'all') return true;
    const past = isReservationPast(r);
    return filter === 'past' ? past : !past;
  });

  const totalUnread = allReservations.reduce(
    (acc, r) => acc + r.messages.filter(m => !m.read && m.direction === 'received').length,
    0
  );

  return {
    reservations,
    allReservations,
    loading,
    syncing,
    error,
    reload: load,
    sync,
    totalUnread,
  };
}
