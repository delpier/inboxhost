// __tests__/services/storage.test.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getReservations,
  saveReservations,
  upsertReservation,
  addMessageToReservation,
  getCalendarSources,
  saveCalendarSource,
  deleteCalendarSource,
} from '../../services/storage';
import {
  RESERVATION_ACTIVE,
  RESERVATION_FUTURE,
  RESERVATION_PAST,
  SOURCE_AIRBNB,
  SOURCE_BOOKING,
  MSG_SENT,
} from '../fixtures';

// Reset storage antes de cada teste
beforeEach(() => {
  (AsyncStorage as any)._reset();
  jest.clearAllMocks();
});

// ─── Reservas ──────────────────────────────────────────────────────────────

describe('getReservations', () => {
  it('deve retornar array vazio quando não há dados', async () => {
    const result = await getReservations();
    expect(result).toEqual([]);
  });

  it('deve retornar as reservas guardadas anteriormente', async () => {
    await saveReservations([RESERVATION_ACTIVE]);
    const result = await getReservations();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(RESERVATION_ACTIVE.id);
  });

  it('deve preservar todos os campos da reserva', async () => {
    await saveReservations([RESERVATION_ACTIVE]);
    const [res] = await getReservations();
    expect(res.guestName).toBe(RESERVATION_ACTIVE.guestName);
    expect(res.guestEmail).toBe(RESERVATION_ACTIVE.guestEmail);
    expect(res.checkIn).toBe(RESERVATION_ACTIVE.checkIn);
    expect(res.messages).toHaveLength(RESERVATION_ACTIVE.messages.length);
  });
});

describe('saveReservations', () => {
  it('deve sobrescrever completamente as reservas existentes', async () => {
    await saveReservations([RESERVATION_ACTIVE, RESERVATION_FUTURE]);
    await saveReservations([RESERVATION_PAST]);
    const result = await getReservations();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(RESERVATION_PAST.id);
  });

  it('deve chamar AsyncStorage.setItem com a chave correcta', async () => {
    await saveReservations([RESERVATION_ACTIVE]);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'reservations',
      expect.any(String)
    );
  });

  it('deve guardar array vazio sem erros', async () => {
    await expect(saveReservations([])).resolves.not.toThrow();
    const result = await getReservations();
    expect(result).toEqual([]);
  });
});

describe('upsertReservation', () => {
  it('deve inserir uma nova reserva quando não existe', async () => {
    await upsertReservation(RESERVATION_ACTIVE);
    const all = await getReservations();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(RESERVATION_ACTIVE.id);
  });

  it('deve actualizar uma reserva existente com mesmo uid+sourceId', async () => {
    await upsertReservation(RESERVATION_ACTIVE);
    const updated = { ...RESERVATION_ACTIVE, guestName: 'Sarah M. Updated' };
    await upsertReservation(updated);
    const all = await getReservations();
    expect(all).toHaveLength(1);
    expect(all[0].guestName).toBe('Sarah M. Updated');
  });

  it('deve actualizar o campo updatedAt na actualização', async () => {
    await upsertReservation(RESERVATION_ACTIVE);
    const before = (await getReservations())[0].updatedAt;

    await new Promise(r => setTimeout(r, 10));
    await upsertReservation({ ...RESERVATION_ACTIVE, guestName: 'Novo Nome' });
    const after = (await getReservations())[0].updatedAt;

    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it('deve preservar as mensagens existentes ao fazer upsert', async () => {
    await upsertReservation(RESERVATION_ACTIVE); // tem 2 mensagens nas fixtures
    const [res] = await getReservations();
    expect(res.messages).toHaveLength(RESERVATION_ACTIVE.messages.length);
  });

  it('deve inserir várias reservas com ids diferentes', async () => {
    await upsertReservation(RESERVATION_ACTIVE);
    await upsertReservation(RESERVATION_FUTURE);
    await upsertReservation(RESERVATION_PAST);
    const all = await getReservations();
    expect(all).toHaveLength(3);
  });

  it('não deve duplicar ao fazer upsert da mesma reserva duas vezes', async () => {
    await upsertReservation(RESERVATION_ACTIVE);
    await upsertReservation(RESERVATION_ACTIVE);
    const all = await getReservations();
    expect(all).toHaveLength(1);
  });
});

describe('addMessageToReservation', () => {
  beforeEach(async () => {
    // Reserva sem mensagens para cada teste
    await saveReservations([{ ...RESERVATION_FUTURE, messages: [] }]);
  });

  it('deve adicionar uma mensagem à reserva correcta', async () => {
    await addMessageToReservation(RESERVATION_FUTURE.id, MSG_SENT);
    const [res] = await getReservations();
    expect(res.messages).toHaveLength(1);
    expect(res.messages[0].text).toBe(MSG_SENT.text);
  });

  it('deve acumular múltiplas mensagens em ordem', async () => {
    const msg2 = { ...MSG_SENT, id: 'msg-99', text: 'Segunda mensagem' };
    await addMessageToReservation(RESERVATION_FUTURE.id, MSG_SENT);
    await addMessageToReservation(RESERVATION_FUTURE.id, msg2);
    const [res] = await getReservations();
    expect(res.messages).toHaveLength(2);
    expect(res.messages[1].text).toBe('Segunda mensagem');
  });

  it('deve actualizar updatedAt da reserva após adicionar mensagem', async () => {
    const before = (await getReservations())[0].updatedAt;
    await new Promise(r => setTimeout(r, 10));
    await addMessageToReservation(RESERVATION_FUTURE.id, MSG_SENT);
    const after = (await getReservations())[0].updatedAt;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it('deve ignorar silenciosamente se a reserva não existir', async () => {
    await expect(
      addMessageToReservation('id-inexistente', MSG_SENT)
    ).resolves.not.toThrow();
  });

  it('deve preservar mensagens já existentes', async () => {
    const resComMensagem = { ...RESERVATION_FUTURE, messages: [MSG_SENT] };
    await saveReservations([resComMensagem]);
    const novaMensagem = { ...MSG_SENT, id: 'msg-novo', text: 'Nova' };
    await addMessageToReservation(RESERVATION_FUTURE.id, novaMensagem);
    const [res] = await getReservations();
    expect(res.messages).toHaveLength(2);
  });
});

// ─── Calendários ─────────────────────────────────────────────────────────────

describe('getCalendarSources', () => {
  it('deve retornar array vazio quando não há dados', async () => {
    const result = await getCalendarSources();
    expect(result).toEqual([]);
  });

  it('deve retornar os calendários guardados', async () => {
    await saveCalendarSource(SOURCE_AIRBNB);
    const result = await getCalendarSources();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(SOURCE_AIRBNB.id);
  });
});

describe('saveCalendarSource', () => {
  it('deve inserir um novo calendário', async () => {
    await saveCalendarSource(SOURCE_AIRBNB);
    const all = await getCalendarSources();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe(SOURCE_AIRBNB.name);
  });

  it('deve actualizar um calendário existente com o mesmo id', async () => {
    await saveCalendarSource(SOURCE_AIRBNB);
    const updated = { ...SOURCE_AIRBNB, name: 'Aprt. Lisboa Actualizado' };
    await saveCalendarSource(updated);
    const all = await getCalendarSources();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Aprt. Lisboa Actualizado');
  });

  it('deve guardar o lastSync quando fornecido', async () => {
    const withSync = { ...SOURCE_AIRBNB, lastSync: '2025-04-10T09:15:00.000Z' };
    await saveCalendarSource(withSync);
    const [saved] = await getCalendarSources();
    expect(saved.lastSync).toBe('2025-04-10T09:15:00.000Z');
  });

  it('deve guardar múltiplos calendários de plataformas diferentes', async () => {
    await saveCalendarSource(SOURCE_AIRBNB);
    await saveCalendarSource(SOURCE_BOOKING);
    const all = await getCalendarSources();
    expect(all).toHaveLength(2);
    const platforms = all.map(s => s.platform);
    expect(platforms).toContain('airbnb');
    expect(platforms).toContain('booking');
  });
});

describe('deleteCalendarSource', () => {
  it('deve remover o calendário com o id fornecido', async () => {
    await saveCalendarSource(SOURCE_AIRBNB);
    await saveCalendarSource(SOURCE_BOOKING);
    await deleteCalendarSource(SOURCE_AIRBNB.id);
    const all = await getCalendarSources();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(SOURCE_BOOKING.id);
  });

  it('não deve lançar excepção ao apagar id inexistente', async () => {
    await saveCalendarSource(SOURCE_AIRBNB);
    await expect(deleteCalendarSource('id-que-nao-existe')).resolves.not.toThrow();
    const all = await getCalendarSources();
    expect(all).toHaveLength(1);
  });

  it('deve deixar lista vazia após apagar o único calendário', async () => {
    await saveCalendarSource(SOURCE_AIRBNB);
    await deleteCalendarSource(SOURCE_AIRBNB.id);
    const all = await getCalendarSources();
    expect(all).toEqual([]);
  });
});
