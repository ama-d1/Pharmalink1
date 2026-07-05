import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { loginUser } from '@/services/authService';

const DEMO_ACCOUNTS = [
  {
    label: 'Patient Demo',
    email: 'demo.patient@pharmalink.com',
    password: 'Demo1234!',
    role: 'Patient',
    color: GlassTheme.colors.primary,
    icon: 'person-outline' as const,
  },
  {
    label: 'Pharmacist Demo',
    email: 'pharm.kwame@pharmalink.com',
    password: 'password123',
    role: 'Pharmacist',
    color: GlassTheme.colors.accent,
    icon: 'medical-outline' as const,
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async (e: string, p: string) => {
    setLoading(true);
    try {
      const data = await loginUser(e, p);
      if (data.token) {
        await setSession({
          token: data.token,
          userId: data.userId,
          fullName: data.fullName,
          email: data.email,
          role: data.role,
        });
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch {
      Alert.alert('Connection Error', 'Could not reach the server. Check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('Missing Fields', 'Please enter your email and password.');
    }
    doLogin(email.trim(), password);
  };

  const handleDemo = (demo: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(demo.email);
    setPassword(demo.password);
    doLogin(demo.email, demo.password);
  };

  return (
    <GlassBackground>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Hero Header ── */}
            <View style={styles.hero}>
              <LinearGradient
                colors={GlassTheme.gradients.headerBg}
                style={styles.heroGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.logoCircle}>
                  <Ionicons name="medkit" size={36} color="#FFFFFF" />
                </View>
                <Text style={styles.brand}>PharmaLink</Text>
                <Text style={styles.tagline}>Your personal pharmacy companion</Text>
              </LinearGradient>
            </View>

            {/* ── Sign In Card ── */}
            <GlassCard style={styles.card} glow>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSub}>Sign in to continue</Text>

              <View style={styles.fields}>
                <GlassInput
                  label="Email address"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <GlassInput
                  label="Password"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.forgotRow}
                onPress={() => router.push("/forgot-password" as any)}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <GlassButton label="Sign In" onPress={handleLogin} loading={loading} size="lg" />

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ── Demo Login Buttons ── */}
              <Text style={styles.demoLabel}>Try a demo account</Text>
              <View style={styles.demoRow}>
                {DEMO_ACCOUNTS.map((demo) => (
                  <TouchableOpacity
                    key={demo.email}
                    style={[styles.demoBtn, { borderColor: demo.color }]}
                    onPress={() => handleDemo(demo)}
                    disabled={loading}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.demoIcon, { backgroundColor: `${demo.color}18` }]}>
                      <Ionicons name={demo.icon} size={18} color={demo.color} />
                    </View>
                    <View>
                      <Text style={[styles.demoBtnLabel, { color: demo.color }]}>{demo.label}</Text>
                      <Text style={styles.demoRoleText}>{demo.role}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={14} color={demo.color} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.registerRow}>
                <Text style={styles.registerHint}>Don&apos;t have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={styles.registerLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 40 },

  hero: { overflow: 'hidden' },
  heroGrad: {
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 10,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  brand: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  card: {
    margin: 20,
    marginTop: -24,
    gap: 0,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: GlassTheme.colors.text,
  },
  cardSub: {
    fontSize: 13,
    color: GlassTheme.colors.textMuted,
    marginTop: 3,
    marginBottom: 20,
  },
  fields: { gap: 14 },

  forgotRow: { alignSelf: 'flex-end', marginTop: 8, marginBottom: 16 },
  forgotText: { fontSize: 13, color: GlassTheme.colors.primary, fontWeight: '600' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: GlassTheme.colors.divider },
  dividerText: { color: GlassTheme.colors.textDim, fontSize: 12, fontWeight: '600' },

  demoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: GlassTheme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  demoRow: { gap: 10 },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: GlassTheme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  demoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoBtnLabel: { fontSize: 14, fontWeight: '700' },
  demoRoleText: { fontSize: 11, color: GlassTheme.colors.textMuted, marginTop: 1 },

  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  registerHint: { color: GlassTheme.colors.textMuted, fontSize: 13 },
  registerLink: { color: GlassTheme.colors.primary, fontSize: 13, fontWeight: '700' },
});
