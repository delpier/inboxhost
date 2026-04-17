# InboxHost v1.1 — Notificações + Sync Automático

## Dependências a instalar

```powershell
npx expo install expo-notifications expo-background-fetch expo-task-manager
```

## 1. Notificações de check-in (Pro)

### `services/notificationService.ts`

```typescript
import * as Notifications from 'expo-notifications';
import { getReservations } from './storage';
import { addDays, parseISO, isFuture, differenceInHours } from 'date-fns';

// Configurar como as notificações aparecem
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleCheckinNotifications(): Promise<void> {
  // Cancela todas as notificações agendadas anteriores
  await Notifications.cancelAllScheduledNotificationsAsync();

  const reservations = await getReservations();
  const upcoming     = reservations.filter(r => isFuture(parseISO(r.checkIn)));

  for (const res of upcoming) {
    const checkInDate = parseISO(res.checkIn);
    const notifDate   = addDays(checkInDate, -1); // 24h antes

    // Só agenda se ainda é no futuro
    if (isFuture(notifDate)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Check-in amanhã — ${res.guestName}`,
          body:  `${res.guestName} faz check-in amanhã. Prepara o alojamento!`,
          data:  { reservationId: res.id },
        },
        trigger: { date: notifDate },
      });
    }

    // Notificação no próprio dia
    const todayNotif = new Date(checkInDate);
    todayNotif.setHours(9, 0, 0, 0);
    if (isFuture(todayNotif)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Check-in hoje — ${res.guestName}`,
          body:  `${res.guestName} faz check-in hoje.`,
          data:  { reservationId: res.id },
        },
        trigger: { date: todayNotif },
      });
    }
  }
}
```

### Adicionar ao `app/_layout.tsx`

```typescript
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { scheduleCheckinNotifications, requestNotificationPermission } from '../services/notificationService';
import { usePro } from '../context/ProContext';

// Dentro do RootLayout:
const { isPro } = usePro();

useEffect(() => {
  if (!isPro) return;

  // Pedir permissão e agendar notificações
  requestNotificationPermission().then(granted => {
    if (granted) scheduleCheckinNotifications();
  });

  // Responder a clique em notificação — abre a reserva
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const id = response.notification.request.content.data?.reservationId;
    if (id) router.push(`/reservation/${id}`);
  });

  return () => sub.remove();
}, [isPro]);
```

### Adicionar ao `app.json` (plugins)

```json
"plugins": [
  "expo-router",
  [
    "expo-notifications",
    {
      "icon": "./assets/images/icon.png",
      "color": "#2563EB",
      "sounds": []
    }
  ]
]
```

---

## 2. Sync automático em background (Pro)

### `services/backgroundSync.ts`

```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { syncAllCalendars } from './syncService';
import { scheduleCheckinNotifications } from './notificationService';

const TASK_NAME = 'BACKGROUND_SYNC';

// Definir a tarefa
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    await syncAllCalendars();
    await scheduleCheckinNotifications();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();

  if (
    status === BackgroundFetch.BackgroundFetchStatus.Available ||
    status === BackgroundFetch.BackgroundFetchStatus.Restricted
  ) {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 60 * 6,   // a cada 6 horas
      stopOnTerminate:  false,
      startOnBoot:      true,
    });
  }
}

export async function unregisterBackgroundSync(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (registered) {
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
  }
}
```

### Activar/desactivar com o estado Pro

```typescript
// No ProProvider, após activatePro():
import { registerBackgroundSync, unregisterBackgroundSync } from '../services/backgroundSync';

const activatePro = useCallback(async () => {
  await AsyncStorage.setItem(PRO_KEY, 'true');
  setIsPro(true);
  await registerBackgroundSync();    // ← activa sync automático
}, []);

const deactivatePro = useCallback(async () => {
  await AsyncStorage.removeItem(PRO_KEY);
  setIsPro(false);
  await unregisterBackgroundSync();  // ← desactiva sync automático
}, []);
```

---

## 3. Ecrã de configuração de notificações

Adiciona um separador **Definições** (tab 4) ou uma secção no ecrã de Calendários:

```typescript
// Dentro do ecrã de Calendários, secção Pro:
{isPro && (
  <View className="mx-4 mt-3 mb-1 bg-slate-900 rounded-xl px-4 py-3">
    <Text className="text-slate-500 text-xs uppercase tracking-widest mb-3">Pro</Text>

    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-1">
        <Text className="text-slate-200 text-sm font-medium">
          Sincronização automática
        </Text>
        <Text className="text-slate-500 text-xs">A cada 6 horas</Text>
      </View>
      <Switch value={autoSync} onValueChange={toggleAutoSync} ... />
    </View>

    <View className="flex-row items-center justify-between">
      <View className="flex-1">
        <Text className="text-slate-200 text-sm font-medium">
          Notificações de check-in
        </Text>
        <Text className="text-slate-500 text-xs">24h e no próprio dia</Text>
      </View>
      <Switch value={notifications} onValueChange={toggleNotifications} ... />
    </View>
  </View>
)}
```

---

## Ordem de implementação sugerida

```
1. instalar dependências (expo-notifications, expo-background-fetch, expo-task-manager)
2. criar services/notificationService.ts
3. criar services/backgroundSync.ts
4. actualizar hooks/usePro.ts (ProProvider) para activar/desactivar sync
5. actualizar app/_layout.tsx para pedir permissão e responder a notificações
6. actualizar app.json com o plugin expo-notifications
7. adicionar toggles de configuração no ecrã de calendários
8. testar notificações no telemóvel físico (não funciona no emulador)
9. build de preview e testar background sync (requer telemóvel físico)
```
