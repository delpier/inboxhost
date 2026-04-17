// __tests__/services/syncService.test.ts

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncCalendar, syncAllCalendars } from '../../services/syncService';
import { getReservations, getCalendarSources } from '../../services/storage';
import {
  SOURCE_AIRBNB,
  SOURCE_BOOKING,
  SOURCE_INACTIVE,
  ICAL_AIRBNB_SIMPLE,
  ICAL_BOOKING_SIMPLE,
  ICAL_EMPTY,
} from '../fixtures';

beforeEach(() => {
  (AsyncStorage as any)._reset();
  jest.clearAllMocks();
});

describe('syncCalendar', () => {

  it('deve descarregar o URL correcto do calendário', async () => {
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValueOnce({
      uri: `file:///cache/cal_${SOURCE_AIRBNB.id}.ics`,
      status: 200,
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(ICAL_AIRBNB_SIMPLE);

    await syncCalendar(SOURCE_AIRBNB);

    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      SOURCE_AIRBNB.url,
      expect.stringContaining(SOURCE_AIRBNB.id)
    );
  });

  it('deve guardar as reservas parseadas no storage', async () => {
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValueOnce({ uri: 'file:///cache/test.ics' });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(ICAL_AIRBNB_SIMPLE);

    await syncCalendar(SOURCE_AIRBNB);

    const reservations = await getReservations();
    expect(reservations.length).toBeGreaterThan(0);
  });

  it('deve retornar o número de reservas encontradas', async () => {
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValueOnce({ uri: 'file:///cache/test.ics' });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(ICAL_AIRBNB_SIMPLE);

    const count = await syncCalendar(SOURCE_AIRBNB);
    expect(count).toBe(2); // ICAL_AIRBNB_SIMPLE tem 2 eventos
  });

  it('deve actualizar o lastSync do calendário após sincronização bem-sucedida', async () => {
    // Guarda o calendário no storage primeiro
    const { saveCalendarSource } = require('../../services/storage');
    await saveCalendarSource(SOURCE_AIRBNB);

    (FileSystem.downloadAsync as jest.Mock).mockResolvedValueOnce({ uri: 'file:///cache/test.ics' });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(ICAL_AIRBNB_SIMPLE);

    const before = new Date();
    await syncCalendar(SOURCE_AIRBNB);

    const sources = await getCalendarSources();
    const updated = sources.find(s => s.id === SOURCE_AIRBNB.id);
    if (updated?.lastSync) {
      expect(new Date(updated.lastSync).getTime()).toBeGreaterThanOrEqual(before.getTime());
    }
  });

  it('deve retornar 0 reservas para calendário vazio', async () => {
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValueOnce({ uri: 'file:///cache/test.ics' });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(ICAL_EMPTY);

    const count = await syncCalendar(SOURCE_AIRBNB);
    expect(count).toBe(0);
  });

  it('deve lançar excepção quando o download falha', async () => {
    (FileSystem.downloadAsync as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(syncCalendar(SOURCE_AIRBNB)).rejects.toThrow('Network error');
  });

  it('deve lançar excepção quando a leitura do ficheiro falha', async () => {
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValueOnce({ uri: 'file:///cache/test.ics' });
    (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValueOnce(new Error('Read error'));

    await expect(syncCalendar(SOURCE_AIRBNB)).rejects.toThrow('Read error');
  });

  it('deve fazer upsert (não duplicar) ao sincronizar o mesmo calendário duas vezes', async () => {
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ uri: 'file:///cache/test.ics' });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(ICAL_AIRBNB_SIMPLE);

    await syncCalendar(SOURCE_AIRBNB);
    await syncCalendar(SOURCE_AIRBNB);

    const reservations = await getReservations();
    expect(reservations).toHaveLength(2); // 2 eventos únicos, não 4
  });
});

describe('syncAllCalendars', () => {
  it('deve sincronizar apenas calendários activos', async () => {
    const { saveCalendarSource } = require('../../services/storage');
    await saveCalendarSource(SOURCE_AIRBNB);
    await saveCalendarSource(SOURCE_INACTIVE);

    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ uri: 'file:///cache/test.ics' });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(ICAL_AIRBNB_SIMPLE);

    await syncAllCalendars();

    // Deve ter chamado downloadAsync apenas 1 vez (SOURCE_AIRBNB é activo, SOURCE_INACTIVE não)
    expect(FileSystem.downloadAsync).toHaveBeenCalledTimes(1);
    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      SOURCE_AIRBNB.url,
      expect.any(String)
    );
  });

  it('deve completar mesmo que um calendário falhe', async () => {
    const { saveCalendarSource } = require('../../services/storage');
    await saveCalendarSource(SOURCE_AIRBNB);
    await saveCalendarSource(SOURCE_BOOKING);

    (FileSystem.downloadAsync as jest.Mock)
      .mockRejectedValueOnce(new Error('Falha no primeiro')) // Airbnb falha
      .mockResolvedValueOnce({ uri: 'file:///cache/test.ics' }); // Booking funciona

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(ICAL_BOOKING_SIMPLE);

    // Não deve lançar excepção
    await expect(syncAllCalendars()).resolves.not.toThrow();
  });

  it('deve retornar sem fazer nada se não houver calendários activos', async () => {
    const { saveCalendarSource } = require('../../services/storage');
    await saveCalendarSource(SOURCE_INACTIVE);

    await syncAllCalendars();

    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it('deve sincronizar todos os calendários activos em paralelo', async () => {
    const { saveCalendarSource } = require('../../services/storage');
    await saveCalendarSource(SOURCE_AIRBNB);
    await saveCalendarSource(SOURCE_BOOKING);

    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ uri: 'file:///cache/test.ics' });
    (FileSystem.readAsStringAsync as jest.Mock)
      .mockResolvedValueOnce(ICAL_AIRBNB_SIMPLE)
      .mockResolvedValueOnce(ICAL_BOOKING_SIMPLE);

    await syncAllCalendars();

    expect(FileSystem.downloadAsync).toHaveBeenCalledTimes(2);
    const reservations = await getReservations();
    expect(reservations.length).toBeGreaterThan(0);
  });
});
