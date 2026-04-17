import { Tabs, router } from 'expo-router';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';
import { usePro } from '../../context/ProContext';

function HeaderActions({ onAdd, onSync }: { onAdd?: () => void; onSync?: () => void }) {
  const { locale, setLocale } = useI18n();
  const { isPro } = usePro();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 12 }}>
      {/* Pro badge */}
      {!isPro && (
        <TouchableOpacity
          onPress={() => router.push('/upgrade')}
          style={{ paddingHorizontal: 8, paddingVertical: 4, marginRight: 4 }}
        >
          <Text style={{ fontSize: 11, color: '#FBBF24', fontWeight: '600' }}>⭐ Pro</Text>
        </TouchableOpacity>
      )}

      {/* Action buttons (sync or add) */}
      {onSync && (
        <TouchableOpacity
          onPress={onSync}
          style={{ padding: 6, borderRadius: 20, backgroundColor: '#1E293B', marginRight: 2 }}
        >
          <Ionicons name="sync-outline" size={18} color="#2563EB" />
        </TouchableOpacity>
      )}
      {onAdd && (
        <TouchableOpacity
          onPress={onAdd}
          style={{ padding: 6, borderRadius: 20, backgroundColor: '#2563EB', marginRight: 2 }}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Language toggle */}
      <TouchableOpacity
        onPress={() => setLocale(locale === 'pt' ? 'en' : 'pt')}
        style={{ padding: 6, borderRadius: 20, backgroundColor: '#1E293B' }}
      >
        <Text style={{ fontSize: 13 }}>{locale === 'pt' ? '🇵🇹' : '🇬🇧'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Exportamos o componente para ser usado nos ecrãs via navigation.setOptions
export { HeaderActions };

export default function TabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown:             true,
        headerStyle:             { backgroundColor: '#0F172A' },
        headerTintColor:         '#F1F5F9',
        headerTitleStyle:        { fontWeight: '700', fontSize: 18 },
        headerShadowVisible:     false,
        // Default header right — só linguagem e Pro
        headerRight: () => <HeaderActions />,
        tabBarActiveTintColor:   '#2563EB',
        tabBarInactiveTintColor: '#475569',
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor:  '#1E293B',
          borderTopWidth:  1,
          paddingBottom:   4,
          height:          56,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.nav.reservations,
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendars"
        options={{
          title: t.nav.calendars,
          tabBarIcon: ({ color }) => <Ionicons name="link-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t.nav.messages,
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
