import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
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

import { CodeInput } from '@/components/auth/CodeInput';
import { PillButton } from '@/components/auth/PillButton';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useConnectionError } from '@/hooks/useConnectionError';
import { VerificationChannel, resendVerificationCode, verifyEmailCode } from '@/services/authService';

// Must match auth-service's issueAndSendVerificationCode(), which formats
// the code as %04d.
const CODE_LENGTH = 4;

/**
 * Sign-up verification (auth redesign, 2026-08-04). Reached from register.tsx
 * — which no longer receives a token — and from login.tsx when an existing
 * account turns out never to have confirmed its address.
 *
 * Separate screen from verify-2fa.tsx despite the near-identical layout: the
 * two verify different things against different endpoints, and merging them
 * would mean a mode flag threaded through every branch for no real saving.
 */
export default function VerifyEmailScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const { showError, showSuccess } = useModal();
  const showConnectionError = useConnectionError();
  const { userId, email, redirectTo, channel: initialChannel, target: initialTarget } =
    useLocalSearchParams<{
      userId: string;
      email?: string;
      redirectTo?: string;
      channel?: string;
      target?: string;
    }>();

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Where the code went. Starts from what the server reported (register/login
  // pass it through as route params) and updates when the user switches
  // channel — the server's resend response is deliberately generic, so this
  // tracks what was asked for.
  const [channel, setChannel] = useState<VerificationChannel>(
    initialChannel === 'EMAIL' ? 'EMAIL' : 'SMS',
  );
  const [target, setTarget] = useState<string>(initialTarget || email || '');

  const codeRef = useRef('');

  const handleVerify = async (submitted?: string) => {
    // The auto-submit path passes the completed code directly: the ref is
    // written in the same tick and reading it back would race.
    const code = (submitted ?? codeRef.current).trim();

    if (code.length < CODE_LENGTH) {
      setCodeError(`Enter the ${CODE_LENGTH}-digit code we sent you.`);
      return;
    }
    if (!userId) {
      showError('Something went wrong', 'Missing sign-up session — please register again.');
      router.replace('/register');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyEmailCode(userId, code);

      if (data.token) {
        await setSession({
          token:    data.token,
          userId:   data.userId!,
          fullName: data.fullName ?? '',
          email:    data.email!,
          role:     data.role!,
        });
        // The modal lives at the root (above the Stack), so it stays on
        // screen across this navigation and greets the user on the home tab.
        showSuccess('Welcome!', 'Your account is ready.');
        router.replace((redirectTo as any) || '/(tabs)');
        return;
      }

      setCodeError(data.message || 'Invalid or expired code.');
    } catch (err: any) {
      if (err?.message === 'NETWORK_ERROR' || err?.message === 'TIMEOUT') {
        showConnectionError();
      } else {
        showError('Server Error', 'The server responded unexpectedly. Please try again shortly.');
      }
    } finally {
      setLoading(false);
    }
  };

  // One handler for both "Resend" (same channel) and "Send to my email
  // instead" (switch channel) — the only difference is which channel is asked
  // for, so splitting them would duplicate everything else.
  const sendCode = async (nextChannel: VerificationChannel) => {
    if (!userId || resending) return;
    setResending(true);
    try {
      await resendVerificationCode(userId, nextChannel);
      setChannel(nextChannel);
      // The server answers generically to avoid confirming the account
      // exists, so there's no fresh masked target to show — clear the stale
      // one rather than claim the code went somewhere it didn't.
      if (nextChannel !== channel) setTarget('');
      setCodeError('');
      showSuccess(
        'Code sent',
        nextChannel === 'SMS'
          ? 'A new verification code is on its way by text message.'
          : 'A new verification code is on its way to your inbox.',
      );
    } finally {
      setResending(false);
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
              <Text style={styles.topTitle}>Verification</Text>
              {/* Balances the back button so the title stays centred. */}
              <View style={styles.backBtn} />
            </View>

            <View style={styles.badge}>
              <Ionicons
                name={channel === 'SMS' ? 'chatbubble-ellipses-outline' : 'mail-open-outline'}
                size={40}
                color={GlassTheme.colors.textInverse}
              />
            </View>

            <View style={styles.copy}>
              <Text style={styles.title}>Verification code</Text>
              <Text style={styles.subtitle}>
                Enter the verification code we&apos;ve sent
                {channel === 'SMS' ? ' by text message' : ' to your email'}
                {target ? '\n' : ''}
                {target ? <Text style={styles.subtitleStrong}>{target}</Text> : null}
              </Text>
            </View>

            <CodeInput
              length={CODE_LENGTH}
              autoFocus
              hasError={!!codeError}
              onChange={(code) => { codeRef.current = code; if (codeError) setCodeError(''); }}
              onComplete={handleVerify}
            />

            {!!codeError && <Text style={styles.error}>{codeError}</Text>}

            <PillButton label="Confirm" onPress={() => handleVerify()} loading={loading} />

            <View style={styles.resendRow}>
              <Text style={styles.resendHint}>Didn&apos;t receive the code? </Text>
              <TouchableOpacity onPress={() => sendCode(channel)} disabled={resending} hitSlop={8}>
                <Text style={styles.resendLink}>{resending ? 'Sending…' : 'Resend'}</Text>
              </TouchableOpacity>
            </View>

            {/* The escape hatch when the text doesn't arrive — a wrong number,
                no signal, or a carrier dropping it. Flips back and forth so
                neither channel is a one-way door. */}
            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => sendCode(channel === 'SMS' ? 'EMAIL' : 'SMS')}
              disabled={resending}
              hitSlop={8}
            >
              <Ionicons
                name={channel === 'SMS' ? 'mail-outline' : 'chatbubble-ellipses-outline'}
                size={15}
                color={GlassTheme.colors.primary}
              />
              <Text style={styles.switchText}>
                {channel === 'SMS' ? 'Send to my email instead' : 'Send to my phone instead'}
              </Text>
            </TouchableOpacity>
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
    gap: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  topTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: GlassTheme.colors.text,
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
  copy: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
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
  error: {
    textAlign: 'center',
    fontSize: 12,
    color: GlassTheme.colors.danger,
    marginTop: -12,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: -8,
  },
  resendHint: {
    fontSize: 13,
    color: GlassTheme.colors.textMuted,
  },
  resendLink: {
    fontSize: 13,
    color: GlassTheme.colors.primary,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -14,
  },
  switchText: {
    fontSize: 13,
    color: GlassTheme.colors.primary,
    fontWeight: '600',
  },
});
