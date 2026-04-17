// __tests__/utils/helpers.test.ts
// Testa funções utilitárias puras que podemos extrair dos componentes

import { isToday, isTomorrow, isPast, parseISO, addDays } from 'date-fns';
import { RESERVATION_ACTIVE, RESERVATION_FUTURE, RESERVATION_PAST } from '../fixtures';

// ─── Helpers de status de reserva ────────────────────────────────────────────
// Estas funções seriam exportadas de utils/reservationHelpers.ts

type StatusColor = 'emerald' | 'amber' | 'blue' | 'slate';

function getReservationStatus(checkIn: string, checkOut: string): StatusColor {
  if (isPast(parseISO(checkOut))) return 'slate';
  if (isToday(parseISO(checkIn))) return 'emerald';
  if (isTomorrow(parseISO(checkIn))) return 'amber';
  return 'blue';
}

function formatDateRange(checkIn: string, checkOut: string): string {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return `${nights} noite${nights !== 1 ? 's' : ''}`;
}

function isReservationActive(checkIn: string, checkOut: string): boolean {
  const now = new Date();
  return parseISO(checkIn) <= now && parseISO(checkOut) >= now;
}

function extractGuestInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');
}

function sortReservationsByCheckIn(reservations: typeof RESERVATION_ACTIVE[]) {
  return [...reservations].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
}

function filterUpcoming(reservations: typeof RESERVATION_ACTIVE[]) {
  return reservations.filter(r => !isPast(parseISO(r.checkOut)));
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('getReservationStatus', () => {
  it('deve retornar "slate" para reserva terminada', () => {
    expect(getReservationStatus('2025-01-10', '2025-01-15')).toBe('slate');
  });

  it('deve retornar "emerald" para check-in hoje', () => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = addDays(new Date(), 3).toISOString().slice(0, 10);
    expect(getReservationStatus(today, tomorrow)).toBe('emerald');
  });

  it('deve retornar "amber" para check-in amanhã', () => {
    const tomorrow = addDays(new Date(), 1).toISOString().slice(0, 10);
    const later = addDays(new Date(), 4).toISOString().slice(0, 10);
    expect(getReservationStatus(tomorrow, later)).toBe('amber');
  });

  it('deve retornar "blue" para reserva futura (mais de 1 dia)', () => {
    const future = addDays(new Date(), 5).toISOString().slice(0, 10);
    const futureEnd = addDays(new Date(), 10).toISOString().slice(0, 10);
    expect(getReservationStatus(future, futureEnd)).toBe('blue');
  });
});

describe('formatDateRange', () => {
  it('deve calcular 1 noite correctamente', () => {
    expect(formatDateRange('2025-04-12', '2025-04-13')).toBe('1 noite');
  });

  it('deve calcular 4 noites correctamente', () => {
    expect(formatDateRange('2025-04-12', '2025-04-16')).toBe('4 noites');
  });

  it('deve usar plural para múltiplas noites', () => {
    const result = formatDateRange('2025-05-01', '2025-05-05');
    expect(result).toContain('noites');
  });

  it('deve usar singular para 1 noite', () => {
    const result = formatDateRange('2025-05-01', '2025-05-02');
    expect(result).toContain('noite');
    expect(result).not.toContain('noites');
  });

  it('deve retornar 7 noites para uma semana completa', () => {
    expect(formatDateRange('2025-06-01', '2025-06-08')).toBe('7 noites');
  });
});

describe('isReservationActive', () => {
  it('deve retornar false para reserva passada', () => {
    expect(isReservationActive('2025-01-10', '2025-01-15')).toBe(false);
  });

  it('deve retornar false para reserva futura', () => {
    const future = addDays(new Date(), 5).toISOString().slice(0, 10);
    const futureEnd = addDays(new Date(), 10).toISOString().slice(0, 10);
    expect(isReservationActive(future, futureEnd)).toBe(false);
  });

  it('deve retornar true para reserva em curso', () => {
    const yesterday = addDays(new Date(), -1).toISOString().slice(0, 10);
    const tomorrow = addDays(new Date(), 1).toISOString().slice(0, 10);
    expect(isReservationActive(yesterday, tomorrow)).toBe(true);
  });
});

describe('extractGuestInitials', () => {
  it('deve extrair iniciais de nome completo', () => {
    expect(extractGuestInitials('Sarah Mitchell')).toBe('SM');
  });

  it('deve usar apenas as duas primeiras palavras', () => {
    expect(extractGuestInitials('Ana Maria Silva')).toBe('AM');
  });

  it('deve funcionar com nome único', () => {
    expect(extractGuestInitials('Marco')).toBe('M');
  });

  it('deve capitalizar as iniciais', () => {
    expect(extractGuestInitials('joão silva')).toBe('JS');
  });

  it('deve ignorar espaços extras', () => {
    expect(extractGuestInitials('  Ana   Ferreira  ')).toBe('AF');
  });
});

describe('sortReservationsByCheckIn', () => {
  it('deve ordenar do mais antigo para o mais recente', () => {
    const unsorted = [RESERVATION_FUTURE, RESERVATION_PAST, RESERVATION_ACTIVE];
    const sorted = sortReservationsByCheckIn(unsorted);
    expect(sorted[0].checkIn).toBe(RESERVATION_PAST.checkIn);
    expect(sorted[2].checkIn).toBe(RESERVATION_FUTURE.checkIn);
  });

  it('não deve mutar o array original', () => {
    const original = [RESERVATION_FUTURE, RESERVATION_PAST];
    sortReservationsByCheckIn(original);
    expect(original[0].id).toBe(RESERVATION_FUTURE.id);
  });

  it('deve retornar array vazio se input for vazio', () => {
    expect(sortReservationsByCheckIn([])).toEqual([]);
  });
});

describe('filterUpcoming', () => {
  it('deve excluir reservas terminadas', () => {
    const all = [RESERVATION_ACTIVE, RESERVATION_FUTURE, RESERVATION_PAST];
    const upcoming = filterUpcoming(all);
    expect(upcoming.find(r => r.id === RESERVATION_PAST.id)).toBeUndefined();
  });

  it('deve incluir reservas futuras', () => {
    const all = [RESERVATION_FUTURE, RESERVATION_PAST];
    const upcoming = filterUpcoming(all);
    expect(upcoming.find(r => r.id === RESERVATION_FUTURE.id)).toBeDefined();
  });

  it('deve retornar array vazio se todas as reservas estão terminadas', () => {
    const result = filterUpcoming([RESERVATION_PAST]);
    expect(result).toEqual([]);
  });
});
