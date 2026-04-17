// __tests__/services/icalParser.test.ts

import { parseICal } from '../../services/icalParser';
import {
  ICAL_AIRBNB_SIMPLE,
  ICAL_BOOKING_SIMPLE,
  ICAL_EMPTY,
  ICAL_MALFORMED,
  ICAL_FOLDED_LINES,
  SOURCE_AIRBNB,
  SOURCE_BOOKING,
} from '../fixtures';

describe('parseICal', () => {

  // ─── Parsing básico ──────────────────────────────────────────────────────

  describe('parsing básico', () => {
    it('deve retornar array vazio para calendário sem eventos', () => {
      const result = parseICal(ICAL_EMPTY, 'src-1', 'https://test.com/cal.ics');
      expect(result).toEqual([]);
    });

    it('deve ignorar eventos sem UID', () => {
      const result = parseICal(ICAL_MALFORMED, 'src-1', 'https://test.com/cal.ics');
      expect(result).toHaveLength(0);
    });

    it('deve fazer parse de múltiplos eventos num único ficheiro iCal', () => {
      const result = parseICal(ICAL_AIRBNB_SIMPLE, SOURCE_AIRBNB.id, SOURCE_AIRBNB.url);
      expect(result).toHaveLength(2);
    });

    it('deve extrair o UID correctamente', () => {
      const [first] = parseICal(ICAL_AIRBNB_SIMPLE, SOURCE_AIRBNB.id, SOURCE_AIRBNB.url);
      expect(first.uid).toBe('airbnb-stay-123@airbnb.com');
    });

    it('deve gerar o id composto de sourceId + uid', () => {
      const [first] = parseICal(ICAL_AIRBNB_SIMPLE, SOURCE_AIRBNB.id, SOURCE_AIRBNB.url);
      expect(first.id).toBe(`${SOURCE_AIRBNB.id}_airbnb-stay-123@airbnb.com`);
    });

    it('deve guardar o sourceId correcto em cada evento', () => {
      const result = parseICal(ICAL_AIRBNB_SIMPLE, SOURCE_AIRBNB.id, SOURCE_AIRBNB.url);
      result.forEach(r => {
        expect(r.sourceId).toBe(SOURCE_AIRBNB.id);
      });
    });
  });

  // ─── Datas ───────────────────────────────────────────────────────────────

  describe('parsing de datas', () => {
    it('deve fazer parse de DTSTART no formato YYYYMMDD', () => {
      const [first] = parseICal(ICAL_AIRBNB_SIMPLE, SOURCE_AIRBNB.id, SOURCE_AIRBNB.url);
      expect(first.checkIn).toBe('2025-04-12');
    });

    it('deve fazer parse de DTEND no formato YYYYMMDD', () => {
      const [first] = parseICal(ICAL_AIRBNB_SIMPLE, SOURCE_AIRBNB.id, SOURCE_AIRBNB.url);
      expect(first.checkOut).toBe('2025-04-16');
    });

    it('deve fazer parse de datas com TZID (formato longo com hora)', () => {
      const [result] = parseICal(ICAL_BOOKING_SIMPLE, SOURCE_BOOKING.id, SOURCE_BOOKING.url);
      expect(result.checkIn).toBe('2025-05-01');
      expect(result.checkOut).toBe('2025-05-05');
    });
  });

  // ─── Campos de texto ─────────────────────────────────────────────────────

  describe('extracção de campos de texto', () => {
    it('deve extrair o nome do hóspede do campo SUMMARY', () => {
      const [first] = parseICal(ICAL_AIRBNB_SIMPLE, SOURCE_AIRBNB.id, SOURCE_AIRBNB.url);
      expect(first.guestName).toBe('Sarah Mitchell');
    });

    it('deve extrair o email do campo ATTENDEE quando presente', () => {
      const [first] = parseICal(ICAL_AIRBNB_SIMPLE, SOURCE_AIRBNB.id, SOURCE_AIRBNB.url);
      expect(first.guestEmail).toBe('sarah.mitchell@gmail.com');
    });

    it('deve deixar guestEmail undefined quando ATTENDEE está ausente', () => {
      const [, second] = parseICal(ICAL_AIRBNB_SIMPLE, SOURCE_AIRBNB.id, SOURCE_AIRBNB.url);
      expect(second.guestEmail).toBeUndefined();
    });

    it('deve guardar o DESCRIPTION como notes', () => {
      const [first] = parseICal(ICAL_AIRBNB_SIMPLE, SOURCE_AIRBNB.id, SOURCE_AIRBNB.url);
      expect(first.notes).toContain('Sarah Mitchell');
    });

    it('deve guardar o SUMMARY original no campo summary', () => {
      const [first] = parseICal(ICAL_AIRBNB_SIMPLE, SOURCE_AIRBNB.id, SOURCE_AIRBNB.url);
      expect(first.summary).toBe('Sarah Mitchell - Reservation');
    });
  });

  // ─── Detecção de plataforma ───────────────────────────────────────────────

  describe('detecção de plataforma', () => {
    it('deve detectar Airbnb pela URL', () => {
      const [first] = parseICal(ICAL_AIRBNB_SIMPLE, SOURCE_AIRBNB.id, SOURCE_AIRBNB.url);
      expect(first.platform).toBe('airbnb');
    });

    it('deve detectar Booking.com pela URL', () => {
      const [result] = parseICal(ICAL_BOOKING_SIMPLE, SOURCE_BOOKING.id, SOURCE_BOOKING.url);
      expect(result.platform).toBe('booking');
    });

    it('deve respeitar a plataforma passada explicitamente', () => {
      const [first] = parseICal(ICAL_AIRBNB_SIMPLE, 'src-1', 'https://outro.com/cal.ics', 'vrbo');
      expect(first.platform).toBe('vrbo');
    });

    it('deve usar "other" para URLs desconhecidos sem plataforma explícita', () => {
      const ical = ICAL_AIRBNB_SIMPLE.replace('airbnb', 'desconhecido');
      const [first] = parseICal(ical, 'src-1', 'https://desconhecido.com/cal.ics');
      expect(first.platform).toBe('other');
    });
  });

  // ─── Linha dobrada (line folding) ─────────────────────────────────────────

  describe('line folding RFC 5545', () => {
    it('deve re-unir linhas dobradas com espaço no início', () => {
      const [result] = parseICal(ICAL_FOLDED_LINES, 'src-1', 'https://test.com/cal.ics');
      expect(result.uid).toBe('folded-uid-001@test.com');
      expect(result.summary).toContain('calendário iCal');
    });
  });

  // ─── Casos extremos ───────────────────────────────────────────────────────

  describe('casos extremos', () => {
    it('deve retornar array vazio para string vazia', () => {
      const result = parseICal('', 'src-1', 'https://test.com/cal.ics');
      expect(result).toEqual([]);
    });

    it('não deve lançar excepção para conteúdo inesperado', () => {
      expect(() => parseICal('CONTEUDO_INVALIDO', 'src-1', 'https://test.com')).not.toThrow();
    });

    it('deve tratar SUMMARY apenas com nome (sem " - ")', () => {
      const ical = ICAL_BOOKING_SIMPLE;
      const [result] = parseICal(ical, SOURCE_BOOKING.id, SOURCE_BOOKING.url);
      expect(result.guestName).toBe('Ana Ferreira');
      expect(result.guestName).not.toContain(' - ');
    });
  });
});
