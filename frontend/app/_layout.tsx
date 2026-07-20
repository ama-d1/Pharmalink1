import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';



export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <CartProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="forgotpassword" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="order" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="payment" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="delivery" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="pharmacy" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="pharmacy-details" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="community/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </CartProvider>
    </AuthProvider>
  );
}
