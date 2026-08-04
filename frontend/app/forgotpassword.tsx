import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useConnectionError } from '@/hooks/useConnectionError';
import { forgotPassword } from '@/services/authService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const showConnectionError = useConnectionError();

  const sendResetLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email is required.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    setLoading(true);
    try {
      await forgotPassword(trimmed);
      setSent(true);
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
    <GlassBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            <LinearGradient
              colors={GlassTheme.gradients.headerBg}
              style={[styles.hero, { paddingTop: insets.top + 24 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.heroIcon}>
                <Ionicons name="lock-open-outline" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>Reset Password</Text>
              <Text style={styles.heroSub}>We&apos;ll send a reset link to your email</Text>
            </LinearGradient>

            <GlassCard style={styles.card} glow>
              {sent ? (
                <View style={styles.sentState}>
                  <View style={styles.sentIcon}>
                    <Ionicons name="checkmark-circle" size={48} color={GlassTheme.colors.success} />
                  </View>
                  <Text style={styles.sentTitle}>Email Sent!</Text>
                  <Text style={styles.sentHint}>
                    Check your inbox at {email} for a reset code. The email also has a
                    link, but it won&apos;t be tappable in every mail app — copying the
                    code works anywhere.
                  </Text>
                  {/* The primary path, because the emailed pharmalink:// link
                      is a custom scheme most mail clients won't linkify. */}
                  <GlassButton
                    label="I have a code"
                    onPress={() => router.push('/reset-password' as any)}
                    size="lg"
                    style={{ marginTop: 8 }}
                  />
                  <GlassButton label="Back to Login" variant="ghost" onPress={() => router.back()} />
                </View>
              ) : (
                <>
                  <Text style={styles.cardTitle}>Forgot your password?</Text>
                  <Text style={styles.cardSub}>No worries, it happens to the best of us.</Text>
                  <GlassInput
                    label="Email address"
                    icon="mail-outline"
                    value={email}
                    onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); }}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={emailError}
                  />
                  <GlassButton label="Send Reset Link" onPress={sendResetLink} loading={loading} size="lg" />
                  <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={14} color={GlassTheme.colors.primary} />
                    <Text style={styles.backText}>Back to Login</Text>
                  </TouchableOpacity>
                </>
              )}
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 40 },
  hero: {
    paddingTop: 60, paddingBottom: 48,
    alignItems: 'center', gap: 10,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden', position: 'relative',
  },
  heroIcon: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },

  card: { margin: 20, marginTop: -24, gap: 16 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: GlassTheme.colors.text },
  cardSub: { fontSize: 13, color: GlassTheme.colors.textMuted, marginTop: -8 },

  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  backText: { color: GlassTheme.colors.primary, fontSize: 13, fontWeight: '600' },

  sentState: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  sentIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: GlassTheme.colors.successLight,
    alignItems: 'center', justifyContent: 'center',
  },
  sentTitle: { fontSize: 22, fontWeight: '800', color: GlassTheme.colors.text },
  sentHint: { fontSize: 13, color: GlassTheme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
});