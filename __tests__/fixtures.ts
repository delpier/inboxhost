// __tests__/fixtures.ts
// Dados de teste reutilizáveis em todos os testes

import { Reservation, CalendarSource, Message, Platform } from '../types';

// ─── iCal samples ───────────────────────────────────────────────────────────

export const ICAL_AIRBNB_SIMPLE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting Calendar 0.1//EN
BEGIN:VEVENT
UID:airbnb-stay-123@airbnb.com
DTSTART:20250412
DTEND:20250416
SUMMARY:Sarah Mitchell - Reservation
DESCRIPTION:Guest: Sarah Mitchell\\nPhone: +351910000001
ATTENDEE:mailto:sarah.mitchell@gmail.com
END:VEVENT
BEGIN:VEVENT
UID:airbnb-stay-456@airbnb.com
DTSTART:20250420
DTEND:20250425
SUMMARY:Marco Rossi - Reservation
DESCRIPTION:Guest: Marco Rossi
END:VEVENT
END:VCALENDAR`;

export const ICAL_BOOKING_SIMPLE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Booking.com//EN
BEGIN:VEVENT
UID:booking-reservation-789@booking.com
DTSTART;TZID=Europe/Lisbon:20250501T150000
DTEND;TZID=Europe/Lisbon:20250505T110000
SUMMARY:Ana Ferreira
DESCRIPTION:Booking.com reservation
END:VEVENT
END:VCALENDAR`;

export const ICAL_EMPTY = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
END:VCALENDAR`;

export const ICAL_MALFORMED = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Sem UID nem datas
END:VEVENT
END:VCALENDAR`;

export const ICAL_FOLDED_LINES = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:folded-uid-001@test.com
DTSTART:20250601
DTEND:20250605
SUMMARY:Hóspede com linha longa que foi dobrada pelo servidor de cale
 ndário iCal para não exceder 75 caracteres por linha
END:VEVENT
END:VCALENDAR`;

// ─── Calendar sources ────────────────────────────────────────────────────────

export const SOURCE_AIRBNB: CalendarSource = {
  id: 'src-airbnb-1',
  name: 'Apartamento Lisboa',
  url: 'https://airbnb.com/ical/rooms/12345.ics',
  platform: 'airbnb',
  color: '#FF5A5F',
  active: true,
};

export const SOURCE_BOOKING: CalendarSource = {
  id: 'src-booking-1',
  name: 'Moradia Sintra',
  url: 'https://booking.com/ical/prop/67890.ics',
  platform: 'booking',
  color: '#003580',
  active: true,
};

export const SOURCE_INACTIVE: CalendarSource = {
  id: 'src-inactive-1',
  name: 'Villa Algarve (inactivo)',
  url: 'https://vrbo.com/ical/listing/99999.ics',
  platform: 'vrbo',
  color: '#1DA462',
  active: false,
};

// ─── Messages ────────────────────────────────────────────────────────────────

export const MSG_SENT: Message = {
  id: 'msg-1',
  reservationId: 'res-1',
  text: 'O check-in é às 15h. A chave está na caixa.',
  direction: 'sent',
  timestamp: '2025-04-10T14:35:00.000Z',
  read: true,
};

export const MSG_RECEIVED: Message = {
  id: 'msg-2',
  reservationId: 'res-1',
  text: 'Olá! A que horas posso entrar?',
  direction: 'received',
  timestamp: '2025-04-10T14:22:00.000Z',
  read: false,
};

// ─── Reservations ────────────────────────────────────────────────────────────

export const RESERVATION_ACTIVE: Reservation = {
  id: 'src-airbnb-1_airbnb-stay-123@airbnb.com',
  uid: 'airbnb-stay-123@airbnb.com',
  sourceId: 'src-airbnb-1',
  platform: 'airbnb',
  guestName: 'Sarah Mitchell',
  guestEmail: 'sarah.mitchell@gmail.com',
  checkIn: '2025-04-12',
  checkOut: '2025-04-16',
  summary: 'Sarah Mitchell - Reservation',
  notes: 'Guest: Sarah Mitchell\\nPhone: +351910000001',
  messages: [MSG_RECEIVED, MSG_SENT],
  createdAt: '2025-04-01T10:00:00.000Z',
  updatedAt: '2025-04-10T14:35:00.000Z',
};

export const RESERVATION_FUTURE: Reservation = {
  id: 'src-booking-1_booking-res-789',
  uid: 'booking-res-789',
  sourceId: 'src-booking-1',
  platform: 'booking',
  guestName: 'Marco Rossi',
  guestEmail: 'marco.rossi@outlook.com',
  checkIn: '2025-05-01',
  checkOut: '2025-05-05',
  summary: 'Marco Rossi',
  messages: [],
  createdAt: '2025-04-01T10:00:00.000Z',
  updatedAt: '2025-04-01T10:00:00.000Z',
};

export const RESERVATION_PAST: Reservation = {
  id: 'src-airbnb-1_past-stay-001',
  uid: 'past-stay-001',
  sourceId: 'src-airbnb-1',
  platform: 'airbnb',
  guestName: 'Ana Ferreira',
  checkIn: '2025-01-10',
  checkOut: '2025-01-15',
  summary: 'Ana Ferreira - Reservation',
  messages: [],
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z',
};
