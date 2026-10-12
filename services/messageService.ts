import * as Linking from 'expo-linking';
import { differenceInDays, format, parseISO } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { Locale, Translations } from '../i18n/translations';
import { MessageChannel, Reservation } from '../types';

// A app não tem servidor: prepara a mensagem e abre a app do sistema
// (WhatsApp, SMS ou email) com o texto pré-preenchido.

export type TemplateKey = keyof Translations['templates'];
export const TEMPLATE_KEYS: TemplateKey[] = ['welcome', 'checkin', 'checkout', 'review'];
export const CHANNELS: MessageChannel[] = ['whatsapp', 'sms', 'email'];

export function fillTemplate(
  text: string,
  reservation: Reservation,
  t: Translations,
  locale: Locale
): string {
  const dfLocale = locale === 'pt' ? pt : enUS;
  const fmt      = (d: string) => format(parseISO(d), 'EEEE, d MMMM', { locale: dfLocale });
  const nights   = differenceInDays(parseISO(reservation.checkOut), parseISO(reservation.checkIn));
  // Primeiro nome — "Reserva HMX8…" (Airbnb sem nome) não é um nome
  const firstName = reservation.guestName.startsWith('Reserva ')
    ? ''
    : reservation.guestName.split(' ')[0];

  return text
    .replace(/ \{name\}/g, firstName ? ` ${firstName}` : '')
    .replace(/\{name\}/g, firstName)
    .replace(/\{property\}/g, reservation.property || t.messaging.property_fallback)
    .replace(/\{checkIn\}/g, fmt(reservation.checkIn))
    .replace(/\{checkOut\}/g, fmt(reservation.checkOut))
    .replace(/\{nights\}/g, String(nights));
}

// wa.me exige o número em formato internacional, só dígitos
function whatsappNumber(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^00/, '');
}

export function canUseChannel(channel: MessageChannel, reservation: Reservation): boolean {
  return channel === 'email' ? !!reservation.guestEmail : !!reservation.guestPhone;
}

export function buildMessageUrl(
  channel: MessageChannel,
  reservation: Reservation,
  text: string,
  subject: string
): string | null {
  const body = encodeURIComponent(text);
  switch (channel) {
    case 'whatsapp':
      return reservation.guestPhone
        ? `https://wa.me/${whatsappNumber(reservation.guestPhone)}?text=${body}`
        : null;
    case 'sms':
      return reservation.guestPhone
        ? `sms:${reservation.guestPhone.replace(/[^\d+]/g, '')}?body=${body}`
        : null;
    case 'email':
      return reservation.guestEmail
        ? `mailto:${reservation.guestEmail}?subject=${encodeURIComponent(subject)}&body=${body}`
        : null;
  }
}

// Devolve true se a app do sistema foi aberta
export async function openMessageChannel(
  channel: MessageChannel,
  reservation: Reservation,
  text: string,
  subject: string
): Promise<boolean> {
  const url = buildMessageUrl(channel, reservation, text, subject);
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
