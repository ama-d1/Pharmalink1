import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/auth/PillButton';
import { RoundedInput } from '@/components/auth/RoundedInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useConnectionError } from '@/hooks/useConnectionError';
import { forgotPassword } from '@/services/authService';
import { EMAIL_REGEX } from '@/utils/validation';

// Restyled 2026-08-04 to the redesigned auth language (curved fields, pill
// buttons, no dark hero). Reached straight from the login screen's "Forgot
// password?" link, so leaving it on the old design would have been a visible
// seam one tap into the new flow. The reset logic itself is unchanged.
export default function ForgotPasswordScreen() {
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
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={20} color={GlassTheme.colors.text} />
              </TouchableOpacity>
            </View>

            {sent ? (
              <>
                <View style={[styles.badge, styles.badgeSuccess]}>
                  <Ionicons name="checkmark" size={44} color={GlassTheme.colors.textInverse} />
                </View>

                <View style={styles.copy}>
                  <Text style={styles.title}>Email sent</Text>
                  <Text style={styles.subtitle}>
                    Check your inbox at <Text style={styles.subtitleStrong}>{email}</Text> for a
                    reset code. The email also has a link, but it won&apos;t be tappable in every
                    mail app — copying the code works anywhere.
                  </Text>
                </View>

                {/* The primary path, because the emailed pharmalink:// link is
                    a custom scheme most mail clients won't linkify. */}
                <PillButton label="I have a code" onPress={() => router.push('/reset-password' as any)} />
                <PillButton label="Back to Login" variant="outline" onPress={() => router.back()} />
              </>
            ) : (
              <>
                <View style={styles.badge}>
                  <Ionicons name="lock-open-outline" size={40} color={GlassTheme.colors.textInverse} />
                </View>

                <View style={styles.copy}>
                  <Text style={styles.title}>Forgot your password?</Text>
                  <Text style={styles.subtitle}>
                    No worries — enter your email and we&apos;ll send you a reset code.
                  </Text>
                </View>

                <RoundedInput
                  label="Email"
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="send"
                  onSubmitEditing={sendResetLink}
                  error={emailError}
                />

                <PillButton label="Send Reset Code" onPress={sendResetLink} loading={loading} />

                <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
                  <Ionicons name="arrow-back" size={14} color={GlassTheme.colors.primary} />
                  <Text style={styles.backText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GlassTheme.colors.bgDeep,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 22,
  },
  topRow: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'center',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: GlassTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  badgeSuccess: {
    backgroundColor: GlassTheme.colors.success,
  },
  copy: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: GlassTheme.colors.text,
  },
  subtitle: {
    fontSize: 13.5,
    color: GlassTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  subtitleStrong: {
    color: GlassTheme.colors.text,
    fontWeight: '600',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -8,
  },
  backText: {
    color: GlassTheme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
