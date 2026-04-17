import { Platform, Reservation } from '../types';

// ─── Eventos a filtrar (não são reservas reais) ────────────────────────────
const BLOCKED_SUMMARIES = [
  'not available',
  'closed',
  'blocked',
  'owner block',
  'airbnb (not available)',
  'unavailable',
  'maintenance',
  'preparation time',
  'buffer',
  'hold',
];

function isBlockedEvent(summary: string): boolean {
  const lower = summary.toLowerCase().trim();
  return BLOCKED_SUMMARIES.some(blocked => lower.includes(blocked));
}

// ─── Detecção de plataforma ───────────────────────────────────────────────
function detectPlatform(url: string, summary: string, description: string): Platform {
  const s = (url + summary + description).toLowerCase();
  if (s.includes('airbnb'))                                           return 'airbnb';
  if (s.includes('booking.com') || s.includes('booking reference'))  return 'booking';
  if (s.includes('vrbo') || s.includes('homeaway'))                  return 'vrbo';
  return 'other';
}

// ─── Parse de data iCal ───────────────────────────────────────────────────
function parseICalDate(raw: string): string {
  const val    = raw.includes(':') ? raw.split(':').pop()! : raw;
  const digits = val.replace(/[TZ\-: ]/g, '').replace(/[^0-9]/g, '');
  if (digits.length < 8) return '';
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

// ─── Extracção de campo ───────────────────────────────────────────────────
function extractField(lines: string[], field: string): string {
  const found = lines.find(l => {
    const upper = l.toUpperCase();
    return upper.startsWith(`${field}:`) || upper.startsWith(`${field};`);
  });
  if (!found) return '';
  const colonIdx = found.indexOf(':');
  return colonIdx >= 0 ? found.slice(colonIdx + 1).trim() : '';
}

// ─── Tipo dos dados extraídos por plataforma ──────────────────────────────
interface ParsedFields {
  guestName:       string;
  guestEmail?:     string;
  guestPhone?:     string;
  numGuests?:      number;
  totalPrice?:     string;
  currency?:       string;
  reservationCode?: string;
  reservationUrl?:  string;
  phoneLast4?:     string;
  status:          string;
}

// ─── Airbnb ───────────────────────────────────────────────────────────────
function parseAirbnb(desc: string, summary: string): ParsedFields {
  const clean = desc.replace(/\\n/g, '\n');

  const urlMatch   = clean.match(
    /https:\/\/www\.airbnb\.[a-z.]+\/hosting\/reservations\/details\/([A-Z0-9]+)/i
  );
  const phoneMatch = clean.match(/Phone Number.*?:\s*(\d{4})/i);
  const code       = urlMatch?.[1];

  return {
    guestName:       code ? `Reserva ${code}` : (summary || 'Hóspede'),
    reservationCode: code,
    reservationUrl:  urlMatch?.[0],
    phoneLast4:      phoneMatch?.[1],
    status:          'confirmed',
  };
}

// ─── Booking.com ──────────────────────────────────────────────────────────
function parseBooking(desc: string, summary: string): ParsedFields {
  const clean = desc.replace(/\\n/g, '\n').replace(/\\,/g, ',');

  // Summary pode ser "BOOKING - John Smith"
  const nameFromSummary = summary.replace(/^BOOKING\s*[-–]\s*/i, '').trim();

  const nameMatch   = clean.match(/Guest name[:\s]+(.+)/i);
  const emailMatch  = clean.match(/Guest email[:\s]+([\w.@+-]+)/i);
  const phoneMatch  = clean.match(/(?:Phone|Tel)[:\s]+([\d\s+()-]+)/i);
  const guestsMatch = clean.match(/(?:Number of guests|Guests)[:\s]+(\d+)/i);
  const priceMatch  = clean.match(/Total price[:\s]+([\d.,]+)\s*([A-Z]{3})?/i);
  const refMatch    = clean.match(/Booking reference[:\s]+(\w+)/i);
  const statusMatch = clean.match(/Status[:\s]+(\w+)/i);

  return {
    guestName:       nameMatch?.[1]?.trim() || nameFromSummary || 'Hóspede',
    guestEmail:      emailMatch?.[1]?.trim(),
    guestPhone:      phoneMatch?.[1]?.trim(),
    numGuests:       guestsMatch ? parseInt(guestsMatch[1], 10) : undefined,
    totalPrice:      priceMatch?.[1],
    currency:        priceMatch?.[2] || 'EUR',
    reservationCode: refMatch?.[1],
    status:          statusMatch?.[1]?.toLowerCase() || 'confirmed',
  };
}

// ─── VRBO / HomeAway ──────────────────────────────────────────────────────
function parseVrbo(desc: string, summary: string): ParsedFields {
  const clean = desc.replace(/\\n/g, '\n');

  const phoneMatch  = clean.match(/Phone[:\s]+([\d\s+()-]+)/i);
  const guestsMatch = clean.match(/Guests?[:\s]+(\d+)/i);
  const refMatch    = clean.match(/Confirmation[:\s]+([\w-]+)/i);
  const emailMatch  = clean.match(/Email[:\s]+([\w.@+-]+)/i);
  const priceMatch  = clean.match(/Total[:\s]+([\d.,]+)\s*([A-Z]{3})?/i);

  return {
    guestName:       summary.trim() || 'Hóspede',
    guestEmail:      emailMatch?.[1]?.trim(),
    guestPhone:      phoneMatch?.[1]?.trim(),
    numGuests:       guestsMatch ? parseInt(guestsMatch[1], 10) : undefined,
    totalPrice:      priceMatch?.[1],
    currency:        priceMatch?.[2] || 'EUR',
    reservationCode: refMatch?.[1],
    status:          'confirmed',
  };
}

// ─── Genérico ─────────────────────────────────────────────────────────────
function parseGeneric(desc: string, summary: string): ParsedFields {
  const clean = desc.replace(/\\n/g, '\n');

  const emailMatch  = clean.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  const phoneMatch  = clean.match(/(?:Phone|Tel|Telefone)[:\s]+([\d\s+()-]+)/i);
  const guestsMatch = clean.match(/(?:Guests?|Hóspedes?)[:\s]+(\d+)/i);
  const priceMatch  = clean.match(/(?:Total|Price|Preço)[:\s]+([\d.,]+)\s*([A-Z]{3})?/i);

  return {
    guestName:  summary.trim() || 'Hóspede',
    guestEmail: emailMatch?.[0],
    guestPhone: phoneMatch?.[1]?.trim(),
    numGuests:  guestsMatch ? parseInt(guestsMatch[1], 10) : undefined,
    totalPrice: priceMatch?.[1],
    currency:   priceMatch?.[2],
    status:     'confirmed',
  };
}

// ─── Parser principal ─────────────────────────────────────────────────────
export function parseICal(
  icalText: string,
  sourceId: string,
  sourceUrl: string,
  platform?: Platform
): Omit<Reservation, 'messages' | 'createdAt' | 'updatedAt'>[] {
  if (!icalText?.includes('BEGIN:VEVENT')) return [];

  // RFC 5545 line unfolding: CRLF/LF + whitespace = continuation
  const unfolded = icalText
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '');

  const events = unfolded.split(/BEGIN:VEVENT/i).slice(1);

  return events
    .map(eventStr => {
      const lines = eventStr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      const uid     = extractField(lines, 'UID');
      const summary = extractField(lines, 'SUMMARY');
      const dtstart = extractField(lines, 'DTSTART');
      const dtend   = extractField(lines, 'DTEND');
      const desc    = extractField(lines, 'DESCRIPTION');

      if (!uid || !dtstart) return null;

      // Filtrar bloqueios e eventos que não são reservas
      if (isBlockedEvent(summary)) {
        console.log(`[iCal] Filtered blocked event: "${summary}"`);
        return null;
      }

      const checkIn  = parseICalDate(dtstart);
      const checkOut = dtend ? parseICalDate(dtend) : checkIn;
      if (!checkIn) return null;

      const detectedPlatform = platform ?? detectPlatform(sourceUrl, summary, desc);

      let parsed: ParsedFields;
      switch (detectedPlatform) {
        case 'airbnb':  parsed = parseAirbnb(desc, summary);  break;
        case 'booking': parsed = parseBooking(desc, summary); break;
        case 'vrbo':    parsed = parseVrbo(desc, summary);    break;
        default:        parsed = parseGeneric(desc, summary); break;
      }

      return {
        id: `${sourceId}_${uid}`,
        uid,
        sourceId,
        platform: detectedPlatform,
        checkIn,
        checkOut,
        summary,
        notes: desc ? desc.replace(/\\n/g, '\n').replace(/\\,/g, ',') : undefined,
        ...parsed,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
}
