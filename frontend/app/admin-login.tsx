import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { useConnectionError } from '@/hooks/useConnectionError';
import { loginUser } from '@/services/authService';

// Separate login flow for admin accounts — deliberately not reachable from the
// patient tabs. Uses the same /api/auth/login endpoint as the patient app,
// then checks role === 'ADMIN' before granting access to the admin dashboard.
export default function AdminLoginScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const showConnectionError = useConnectionError();
  const [loading, setLoading] = useState(false);

  const emailRef = useRef('');
  const passwordRef = useRef('');

  const handleLogin = async () => {
    const email = emailRef.current.trim();
    const password = passwordRef.current;

    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your admin email and password.');
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(email, password);

      if (data.requires2FA) {
        router.push({ pathname: '/verify-2fa' as any, params: { userId: data.userId, redirectTo: '/(admin)/AdminHome' } });
        return;
      }

      if (!data.token) {
        Alert.alert('Login Failed', data.message || 'Invalid credentials.');
        return;
      }

      if (data.role !== 'ADMIN') {
        Alert.alert('Access Denied', 'This account does not have admin access.');
        return;
      }

      await setSession({
        token: data.token,
        userId: data.userId,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
      });
      router.replace('/(admin)/AdminHome' as any);
    } catch (err: any) {
      if (err?.message === 'NETWORK_ERROR' || err?.message === 'TIMEOUT') {
        showConnectionError();
      } else {
        Alert.alert('Server Error', 'The server responded unexpectedly. Please try again shortly.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <LinearGradient
                colors={['#0F172A', '#1E293B']}
                style={styles.heroGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="shield-checkmark" size={36} color="#5EEAD4" />
                </View>
                <Text style={styles.brand}>PharmaLink Admin</Text>
                <Text style={styles.tagline}>Restricted access · Staff only</Text>
              </LinearGradient>
            </View>

            <GlassCard style={styles.card} glow>
              <Text style={styles.cardTitle}>Admin sign in</Text>
              <Text style={styles.cardSub}>Enter your administrator credentials</Text>

              <View style={styles.fields}>
                <GlassInput
                  label="Admin email"
                  icon="mail-outline"
                  onChangeText={(t) => { emailRef.current = t; }}
                  placeholder="admin@pharmalink.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <GlassInput
                  label="Password"
                  icon="lock-closed-outline"
                  onChangeText={(t) => { passwordRef.current = t; }}
                  placeholder="Enter your password"
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>

              <GlassButton label="Sign In" onPress={handleLogin} loading={loading} size="lg" />

              <TouchableOpacity style={styles.backRow} onPress={() => router.replace('/login')}>
                <Ionicons name="arrow-back" size={14} color={GlassTheme.colors.textMuted} />
                <Text style={styles.backText}>Back to patient login</Text>
              </TouchableOpacity>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  hero: { overflow: 'hidden' },
  heroGrad: {
    paddingTop: 60,
    paddingBottom: 44,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(94,234,212,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brand: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: 4 },
  card: { margin: 20, marginTop: -20, gap: 0 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: GlassTheme.colors.text },
  cardSub: { fontSize: 13, color: GlassTheme.colors.textMuted, marginTop: 3, marginBottom: 20 },
  fields: { gap: 14 },
  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
  backText: { fontSize: 13, color: GlassTheme.colors.textMuted, fontWeight: '600' },
});