import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

// Guards the entire (pharmacist) route group — mirrors (admin)/_layout.tsx
// exactly. Unlike admin, pharmacists log in through the normal /login
// screen (no separate pharmacist-login) since they're provisioned by an
// admin promoting an existing account, not a special signup flow — so
// anyone who isn't a PHARMACIST gets bounced to the regular /login, not an
// admin-style dedicated login page.
export default function PharmacistLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'PHARMACIST') {
      router.replace('/login' as any);
    }
  }, [user, loading, router]);

  return (
    <Stack>
      <Stack.Screen name="PharmacistHome" options={{ headerShown: false }} />
      <Stack.Screen name="stock" options={{ headerShown: false }} />
      <Stack.Screen name="payout-settings" options={{ headerShown: false }} />
    </Stack>
  );
}
