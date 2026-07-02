import { router } from 'expo-router';
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
import { registerUser } from '@/services/authService';

export default function RegisterScreen() {
  const { setSession } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      return Alert.alert('Missing Fields', 'Please fill in all fields.');
    }
    if (password.length < 6) {
      return Alert.alert('Weak Password', 'Password must be at least 6 characters.');
    }
    setLoading(true);
    try {
      const data = await registerUser(fullName.trim(), email.trim(), password, phone.trim());
      if (data.token) {
        await setSession({
          token: data.token,
          userId: data.userId,
          fullName: data.fullName,
          email: data.email,
          role: data.role,
        });
        Alert.alert('Welcome!', 'Your account has been created.');
        router.replace('/(tabs)');
      } else {
        Alert.alert('Registration Failed', data.message || 'Something went wrong.');
      }
    } catch {
      Alert.alert('Connection Error', 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassBackground>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ── Header ── */}
            <LinearGradient
              colors={GlassTheme.gradients.headerBg}
              style={styles.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.logoCircle}>
                <Ionicons name="medkit" size={30} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle}>Create Account</Text>
              <Text style={styles.headerSub}>Join PharmaLink for smarter pharmacy care</Text>
            </LinearGradient>

            {/* ── Form Card ── */}
            <GlassCard style={styles.card} glow>

              <View style={styles.perksRow}>
                {[
                  { icon: 'notifications-outline' as const, text: 'Med reminders' },
                  { icon: 'chatbubble-outline' as const, text: 'Chat pharmacists' },
                  { icon: 'people-outline' as const, text: 'Join communities' },
                ].map((perk) => (
                  <View key={perk.text} style={styles.perk}>
                    <Ionicons name={perk.icon} size={16} color={GlassTheme.colors.primary} />
                    <Text style={styles.perkText}>{perk.text}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.fields}>
                <GlassInput
                  label="Full name"
                  icon="person-outline"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="John Mensah"
                  autoCapitalize="words"
                />
                <GlassInput
                  label="Phone number"
                  icon="call-outline"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+233-XX-XXX-XXXX"
                  keyboardType="phone-pad"
                />
                <GlassInput
                  label="Email address"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <GlassInput
                  label="Password"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  secureTextEntry
                />
              </View>

              <View style={styles.termsRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={GlassTheme.colors.success} />
                <Text style={styles.termsText}>
                  Your data is encrypted and never shared.
                </Text>
              </View>

              <GlassButton label="Create Account" onPress={handleRegister} loading={loading} size="lg" style={{ marginTop: 8 }} />

              <View style={styles.loginRow}>
                <Text style={styles.loginHint}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={styles.loginLink}>Sign In</Text>
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

  header: {
    paddingTop: 50,
    paddingBottom: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  card: { margin: 20, marginTop: -24 },

  perksRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 14,
    backgroundColor: GlassTheme.colors.primaryLight,
    borderRadius: GlassTheme.radius.md,
  },
  perk: { alignItems: 'center', gap: 6 },
  perkText: { fontSize: 11, color: GlassTheme.colors.primary, fontWeight: '600' },

  fields: { gap: 14 },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  termsText: { fontSize: 12, color: GlassTheme.colors.textMuted, flex: 1 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  loginHint: { color: GlassTheme.colors.textMuted, fontSize: 13 },
  loginLink: { color: GlassTheme.colors.primary, fontSize: 13, fontWeight: '700' },
});
