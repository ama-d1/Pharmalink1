import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

// Guards the entire (admin) route group: only signed-in ADMIN accounts may
// pass. Anyone else is bounced back to the dedicated admin login screen.
export default function AdminLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'ADMIN') {
      router.replace('/admin-login' as any);
    }
  }, [user, loading, router]);

  return (
    <Stack>
      <Stack.Screen name="AdminHome" options={{ headerShown: false }} />
      <Stack.Screen name="users" options={{ headerShown: false }} />
      <Stack.Screen name="pharmacies" options={{ headerShown: false }} />
      <Stack.Screen name="orders" options={{ headerShown: false }} />
      <Stack.Screen name="moderation" options={{ headerShown: false }} />
    </Stack>
  );
}
