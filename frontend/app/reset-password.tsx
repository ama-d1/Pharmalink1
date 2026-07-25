import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { resetPassword } from '@/services/authService';
import { getPasswordError } from '@/utils/validation';

// Reached via the emailed reset link: pharmalink://reset-password?token=...
// (the backend currently emails a plain https:// link — that needs to become
// a deep link or universal link pointing here before this screen is reachable
// from the actual email. Once that's wired up, this screen is ready.)
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    let nextPasswordError = getPasswordError(password);
    let nextConfirmError = '';

    if (!confirm) {
      nextConfirmError = 'Please confirm your password.';
    } else if (password && confirm !== password) {
      nextConfirmError = 'Passwords do not match.';
    }

    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);
    if (nextPasswordError || nextConfirmError) return;

    if (!token) {
      Alert.alert('Invalid Link', 'This reset link is missing its token. Please request a new one.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      if (err?.message === 'NETWORK_ERROR') {
        Alert.alert('Connection Error', 'Could not reach the server. Check your network.');
      } else if (err?.message === 'SERVER_ERROR') {
        Alert.alert('Server Error', 'The server responded unexpectedly. Please try again shortly.');
      } else {
        Alert.alert('Reset Failed', err?.message || 'This link may have expired. Please request a new one.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassBackground>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            <LinearGradient
              colors={GlassTheme.gradients.headerBg}
              style={styles.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.heroIcon}>
                <Ionicons name="key-outline" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>Set New Password</Text>
              <Text style={styles.heroSub}>Choose a strong new password for your account</Text>
            </LinearGradient>

            <GlassCard style={styles.card} glow>
              {done ? (
                <View style={styles.sentState}>
                  <View style={styles.sentIcon}>
                    <Ionicons name="checkmark-circle" size={48} color={GlassTheme.colors.success} />
                  </View>
                  <Text style={styles.sentTitle}>Password updated!</Text>
                  <Text style={styles.sentHint}>You can now sign in with your new password.</Text>
                  <GlassButton label="Back to Login" onPress={() => router.replace('/login')} style={{ marginTop: 8 }} />
                </View>
              ) : (
                <>
                  <Text style={styles.cardTitle}>Create a new password</Text>
                  <Text style={styles.cardSub}>Use 8+ characters with uppercase, lowercase, a number, and a symbol.</Text>
                  <GlassInput
                    label="New password"
                    icon="lock-closed-outline"
                    value={password}
                    onChangeText={(t) => { setPassword(t); if (passwordError) setPasswordError(''); }}
                    placeholder="Enter new password"
                    secureTextEntry
                    error={passwordError}
                  />
                  <GlassInput
                    label="Confirm password"
                    icon="lock-closed-outline"
                    value={confirm}
                    onChangeText={(t) => { setConfirm(t); if (confirmError) setConfirmError(''); }}
                    placeholder="Re-enter new password"
                    secureTextEntry
                    onSubmitEditing={handleReset}
                    error={confirmError}
                  />
                  <GlassButton label="Update Password" onPress={handleReset} loading={loading} size="lg" />
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
    overflow: 'hidden',
  },
  heroIcon: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', paddingHorizontal: 20 },

  // NOTE: GlassCard renders its children inside an inner wrapper View, so a
  // `gap` passed in via `style` (as this used to have) never actually
  // reaches these children — it has zero effect. Spacing below is done with
  // explicit marginBottom/marginTop instead (same approach login.tsx uses),
  // which is what actually fixes the title/subtitle overlap.
  card: { margin: 20, marginTop: -24 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: GlassTheme.colors.text, marginBottom: 4 },
  cardSub: { fontSize: 13, color: GlassTheme.colors.textMuted, lineHeight: 18, marginBottom: 20 },

  sentState: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  sentIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: GlassTheme.colors.successLight,
    alignItems: 'center', justifyContent: 'center',
  },
  sentTitle: { fontSize: 22, fontWeight: '800', color: GlassTheme.colors.text },
  sentHint: { fontSize: 13, color: GlassTheme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
