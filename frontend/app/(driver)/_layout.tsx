import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

// Guards the entire (driver) route group — mirrors (pharmacist)/_layout.tsx
// exactly. Drivers, like pharmacists, are admin-provisioned (promoted from
// an existing account via the admin Users screen), not a separate signup
// flow — so anyone who isn't a DRIVER gets bounced to the regular /login.
export default function DriverLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'DRIVER') {
      router.replace('/login' as any);
    }
  }, [user, loading, router]);

  return (
    <Stack>
      <Stack.Screen name="DriverHome" options={{ headerShown: false }} />
    </Stack>
  );
}
