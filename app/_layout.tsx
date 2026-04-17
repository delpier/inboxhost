import './globals.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nProvider } from '../i18n';
import { ProProvider } from '../context/ProContext';

export default function RootLayout() {
  return (
    <I18nProvider>
      <ProProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </ProProvider>
    </I18nProvider>
  );
}
