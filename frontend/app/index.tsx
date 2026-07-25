import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';

// FIXED — there was no root `app/index.tsx`, and expo-router treats a
// group folder like `(tabs)` as adding NO path segment, so
// `app/(tabs)/index.tsx` was silently becoming the app's default "/" route.
// That meant every launch (including right after scanning the Expo QR code)
// dropped straight into the home tab, regardless of whether AuthContext had
// a session or not — login.tsx/register.tsx were reachable but never
// actually gated anything.
//
// This file now owns "/" and is the one real entry point: wait for
// AuthContext to finish reading AsyncStorage, then redirect to the tabs if
// there's a saved session, or to /login if there isn't.
export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <GlassBackground>
        <ActivityIndicator style={styles.spinner} color={GlassTheme.colors.primary} />
      </GlassBackground>
    );
  }

  // Added 2026-07-23 — pharmacists get their own minimal section instead of
  // the patient-facing tabs (see app/(pharmacist)/_layout.tsx). ADMIN is
  // deliberately NOT branched here — admins log in through a separate
  // /admin-login screen entirely, they don't reach this redirect via a
  // normal session in practice.
  if (user?.role === 'PHARMACIST') {
    return <Redirect href={'/(pharmacist)/PharmacistHome' as any} />;
  }

  // Added 2026-07-23 — same pattern as PHARMACIST above.
  if (user?.role === 'DRIVER') {
    return <Redirect href={'/(driver)/DriverHome' as any} />;
  }

  return <Redirect href={user ? '/(tabs)' : '/login'} />;
}

const styles = StyleSheet.create({
  spinner: { flex: 1 },
});
