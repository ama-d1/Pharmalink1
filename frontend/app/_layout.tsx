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
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="forgotpassword" options={{ headerShown: false }} />
            <Stack.Screen name="reset-password" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="admin-login" options={{ headerShown: false }} />
            <Stack.Screen name="verify-2fa" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(admin)" options={{ headerShown: false }} />
            {/* (pharmacist) and (driver) each have their own nested Stack
                (see their _layout.tsx) that already hides the header for
                every screen inside the group — but without headerShown:
                false on THIS outer entry too, expo-router's root Stack still
                wraps that whole nested navigator in its own default native
                header (showing the literal route/group name, e.g.
                "(pharmacist)", as a title bar above everything the group
                renders). That outer header is the black bar with
                "delivery-tracking" in it from the screenshot — same root
                cause as delivery-tracking below, just one level up for
                these two route groups. */}
            <Stack.Screen name="(pharmacist)" options={{ headerShown: false }} />
            <Stack.Screen name="(driver)" options={{ headerShown: false }} />
            <Stack.Screen name="order" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="payment" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="delivery" options={{ headerShown: false, animation: 'slide_from_right' }} />
            {/* FIXED — was missing from this list entirely, so expo-router
                fell back to its default native header showing the route
                filename ("delivery-tracking") as the title, stacked above
                this screen's own custom "Track Delivery" header — exactly
                the black bar reported. */}
            <Stack.Screen name="delivery-tracking" options={{ headerShown: false, animation: 'slide_from_right' }} />
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
