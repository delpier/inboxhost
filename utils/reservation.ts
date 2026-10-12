import { isBefore, isToday, isTomorrow, parseISO, startOfToday } from 'date-fns';
import { Reservation } from '../types';

// Só passa a "passada" depois do dia do check-out (no próprio dia ainda conta)
export function isReservationPast(r: Pick<Reservation, 'checkOut'>): boolean {
  return isBefore(parseISO(r.checkOut), startOfToday());
}

export type ReservationPhase = 'past' | 'today' | 'tomorrow' | 'upcoming' | 'active';

export function getReservationPhase(r: Pick<Reservation, 'checkIn' | 'checkOut'>): ReservationPhase {
  if (isReservationPast(r))           return 'past';
  if (isToday(parseISO(r.checkIn)))    return 'today';
  if (isTomorrow(parseISO(r.checkIn))) return 'tomorrow';
  if (!isBefore(parseISO(r.checkIn), startOfToday())) return 'upcoming';
  return 'active';
}
