import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { resetPassword } from '@/services/authService';
import { getPasswordError } from '@/utils/validation';

// Reached two ways:
//   1. The emailed deep link, pharmalink://reset-password?token=… , which
//      arrives here as a route param.
//   2. Manually, with the user pasting the code from the email.
//
// (2) exists because (1) cannot be relied on: `pharmalink://` is a custom URL
// scheme and mail clients only auto-linkify http(s), so in Gmail/Outlook/most
// webmail the link is unclickable plain text. This screen previously accepted
// ONLY the route param, which meant anyone whose mail client didn't handle
// the scheme hit a dead end with no way to finish resetting their password.
//
// Restyled 2026-08-04 to the redesigned auth language, along with the rest of
// the sign-in flow it's part of. The reset logic is unchanged.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  // Only used when the deep link didn't supply one.
  const [manualToken, setManualToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const token = (tokenParam ?? manualToken).trim();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    const nextPasswordError = getPasswordError(password);
    let nextConfirmError = '';

    if (!confirm) {
      nextConfirmError = 'Please confirm your password.';
    } else if (password && confirm !== password) {
      nextConfirmError = 'Passwords do not match.';
    }
    // Inline error rather than an Alert: when the code is typed on this
    // screen it's just another required field, so it should be validated like
    // one instead of popping a dialog.
    const nextTokenError = token ? '' : 'Paste the code from your reset email.';

    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);
    setTokenError(nextTokenError);
    if (nextPasswordError || nextConfirmError || nextTokenError) return;

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

            {done ? (
              <>
                <View style={[styles.badge, styles.badgeSuccess]}>
                  <Ionicons name="checkmark" size={44} color={GlassTheme.colors.textInverse} />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>Password updated</Text>
                  <Text style={styles.subtitle}>You can now sign in with your new password.</Text>
                </View>
                <PillButton label="Back to Login" onPress={() => router.replace('/login')} />
              </>
            ) : (
              <>
                <View style={styles.badge}>
                  <Ionicons name="key-outline" size={40} color={GlassTheme.colors.textInverse} />
                </View>

                <View style={styles.copy}>
                  <Text style={styles.title}>Set new password</Text>
                  <Text style={styles.subtitle}>
                    Use 8+ characters with uppercase, lowercase, a number, and a symbol.
                  </Text>
                </View>

                <View style={styles.fields}>
                  {/* Shown only when the deep link didn't already supply the
                      token — i.e. the user opened this screen manually after
                      copying the code out of the email. */}
                  {!tokenParam && (
                    <RoundedInput
                      label="Reset code"
                      value={manualToken}
                      onChangeText={(t) => { setManualToken(t); if (tokenError) setTokenError(''); }}
                      placeholder="Paste the code from your email"
                      autoCapitalize="none"
                      autoCorrect={false}
                      error={tokenError}
                    />
                  )}

                  <RoundedInput
                    label="New password"
                    value={password}
                    onChangeText={(t) => { setPassword(t); if (passwordError) setPasswordError(''); }}
                    placeholder="Enter new password"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    error={passwordError}
                  />

                  <RoundedInput
                    label="Confirm password"
                    value={confirm}
                    onChangeText={(t) => { setConfirm(t); if (confirmError) setConfirmError(''); }}
                    placeholder="Re-enter new password"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    returnKeyType="done"
                    onSubmitEditing={handleReset}
                    error={confirmError}
                  />
                </View>

                <PillButton label="Update Password" onPress={handleReset} loading={loading} />
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
  fields: {
    gap: 15,
  },
});
