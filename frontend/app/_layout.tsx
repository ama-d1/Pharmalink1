import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { loadApiBaseUrlOverride } from '@/constants/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { ModalProvider } from '@/context/ModalContext';



export default function RootLayout() {
  const colorScheme = useColorScheme();

  // The saved server-URL override lives in AsyncStorage, so it can only be
  // read asynchronously — but constants/api.ts resolves the base URL
  // synchronously on every read, because non-React code (services/*,
  // ChatClient) needs it. Rendering is held back until that one-time
  // hydration finishes so no request can go out against the build-time URL
  // and then get "corrected" mid-flight. It's a single AsyncStorage read, so
  // this resolves well within the splash screen.
  const [apiUrlReady, setApiUrlReady] = useState(false);
  useEffect(() => {
    loadApiBaseUrlOverride().finally(() => setApiUrlReady(true));
  }, []);

  if (!apiUrlReady) return null;

  return (
    // @gorhom/bottom-sheet's pan-down-to-close gesture needs a
    // GestureHandlerRootView somewhere above it in the tree — without this,
    // sheets render but the drag handle silently does nothing.
    <GestureHandlerRootView style={{ flex: 1 }}>
    <AuthProvider>
      <CartProvider>
        {/* ModalProvider sits inside the theme/nav providers but wraps the
            whole Stack, so the single shared <AppModal> it renders floats
            above every screen regardless of which route is active. */}
        <ModalProvider>
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
            {/* Sign-up email verification (auth redesign). Needs an entry
                here for the same reason delivery-tracking did: without one,
                expo-router renders its default native header with the route
                filename above the screen's own header. */}
            <Stack.Screen name="verify-email" options={{ headerShown: false }} />
            <Stack.Screen name="server-settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
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
        </ModalProvider>
      </CartProvider>
    </AuthProvider>
    </GestureHandlerRootView>
  );
}
