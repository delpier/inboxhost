export type Platform = 'airbnb' | 'booking' | 'vrbo' | 'other';

export interface Reservation {
  // ─── Identifiers ───────────────────────────────────────────────────────
  id: string;          // sourceId_uid
  uid: string;         // UID do evento iCal
  sourceId: string;    // ID do calendário de origem

  // ─── Plataforma ────────────────────────────────────────────────────────
  platform: Platform;

  // ─── Hóspede ───────────────────────────────────────────────────────────
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  phoneLast4?: string;   // Airbnb: últimos 4 dígitos (privacidade)
  numGuests?: number;    // Booking/VRBO: número de hóspedes

  // ─── Datas ─────────────────────────────────────────────────────────────
  checkIn: string;       // YYYY-MM-DD
  checkOut: string;      // YYYY-MM-DD

  // ─── Reserva ───────────────────────────────────────────────────────────
  summary: string;               // SUMMARY original do iCal
  status: string;                // confirmed, cancelled, tentative
  reservationCode?: string;      // Código da reserva (ex: HMX8HX333E)
  reservationUrl?: string;       // Link para a reserva na plataforma
  totalPrice?: string;           // Preço total (Booking/VRBO)
  currency?: string;             // Moeda (EUR, USD...)

  // ─── Extras ────────────────────────────────────────────────────────────
  property?: string;     // Nome da propriedade (se tiveres múltiplas)
  notes?: string;        // DESCRIPTION do iCal

  // ─── Edições manuais ───────────────────────────────────────────────────
  overrides?: GuestOverrides;    // Dados do hóspede editados à mão — sobrevivem ao sync

  // ─── Mensagens ─────────────────────────────────────────────────────────
  messages: Message[];

  // ─── Metadados ─────────────────────────────────────────────────────────
  createdAt: string;
  updatedAt: string;
}

// Campos do hóspede que o utilizador pode completar/corrigir manualmente.
// Uma string vazia significa "apagado pelo utilizador".
export type GuestOverrides = Partial<
  Pick<Reservation, 'guestName' | 'guestEmail' | 'guestPhone' | 'numGuests'>
>;

// Canal usado para enviar a mensagem (a app abre a app do sistema)
export type MessageChannel = 'whatsapp' | 'sms' | 'email';

export interface Message {
  id: string;
  reservationId: string;
  text: string;
  direction: 'sent' | 'received';
  channel?: MessageChannel;
  timestamp: string;
  read: boolean;
}

export interface CalendarSource {
  id: string;
  name: string;
  url: string;
  platform: Platform;
  color: string;
  lastSync?: string;
  active: boolean;
}

export const PLATFORM_COLORS: Record<Platform, string> = {
  airbnb:  '#FF5A5F',
  booking: '#003580',
  vrbo:    '#1DA462',
  other:   '#6366F1',
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  airbnb:  'Airbnb',
  booking: 'Booking.com',
  vrbo:    'VRBO',
  other:   'Outro',
};

export const PLATFORM_ICONS: Record<Platform, string> = {
  airbnb:  '🏠',
  booking: '🔵',
  vrbo:    '🌴',
  other:   '📅',
};
