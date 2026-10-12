import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Message, MessageChannel } from '../types';

export const CHANNEL_ICONS: Record<MessageChannel, keyof typeof Ionicons.glyphMap> = {
  whatsapp: 'logo-whatsapp',
  sms:      'chatbox-ellipses-outline',
  email:    'mail-outline',
};

export function MessageBubble({ message }: { message: Message }) {
  const sent = message.direction === 'sent';

  return (
    <View className={`mb-2 max-w-xs ${sent ? 'self-end' : 'self-start'}`}>
      <View className={`rounded-2xl px-3.5 py-2.5 ${
        sent ? 'bg-blue-600 rounded-br-sm' : 'bg-slate-800 rounded-bl-sm'
      }`}>
        <Text className="text-slate-100 text-sm leading-5">{message.text}</Text>
      </View>
      <View className={`flex-row items-center gap-1 mt-0.5 ${sent ? 'self-end' : 'self-start'}`}>
        {message.channel ? (
          <Ionicons name={CHANNEL_ICONS[message.channel]} size={11} color="#475569" />
        ) : null}
        <Text className="text-slate-600 text-xs">
          {format(parseISO(message.timestamp), 'dd/MM HH:mm')}
        </Text>
      </View>
    </View>
  );
}
