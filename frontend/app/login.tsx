import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthHeading } from '@/components/auth/AuthHeading';
import { AuthTabs } from '@/components/auth/AuthTabs';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { PillButton } from '@/components/auth/PillButton';
import { RoundedInput } from '@/components/auth/RoundedInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useConnectionError } from '@/hooks/useConnectionError';
import { AuthResult, googleSignIn, loginUser } from '@/services/authService';
import { EMAIL_REGEX, getPhoneNumberError } from '@/utils/validation';

type Method = 'phone' | 'email';

const METHODS = [
  { key: 'phone' as const, label: 'Phone Number' },
  { key: 'email' as const, label: 'Email' },
];

// "Remember me" persists only the identifier, never the password — the point
// is to save retyping a phone number/email, and storing a password in
// AsyncStorage (plain text, readable on a rooted/jailbroken device) would be
// a real credential leak for a convenience that autofill already provides.
const REMEMBER_KEY = '@pharmalink_remembered_identifier';

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const { showError } = useModal();
  const showConnectionError = useConnectionError();

  const [method, setMethod] = useState<Method>('phone');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [initialIdentifier, setInitialIdentifier] = useState('');

  // useRef keeps the typed value without causing a re-render on every
  // keystroke. Re-renders were remounting the TextInput → cursor jumping to
  // the next field after each character.
  const identifierRef = useRef('');
  const passwordRef = useRef('');

  useEffect(() => {
    AsyncStorage.getItem(REMEMBER_KEY).then((saved) => {
      if (!saved) return;
      identifierRef.current = saved;
      setInitialIdentifier(saved);
      setRemember(true);
      // A saved value that looks like an email should land on the Email tab,
      // otherwise the field would be prefilled under the wrong heading.
      setMethod(saved.includes('@') ? 'email' : 'phone');
    });
  }, []);

  const validate = () => {
    const identifier = identifierRef.current.trim();
    const password = passwordRef.current;

    let nextIdentifierError = '';
    if (!identifier) {
      nextIdentifierError = method === 'email' ? 'Email is required.' : 'Phone number is required.';
    } else if (method === 'email') {
      // No allowed-provider check here, unlike sign-up: an existing account
      // shouldn't be locked out if that list changes after they registered.
      if (!EMAIL_REGEX.test(identifier)) nextIdentifierError = 'Enter a valid email address.';
    } else {
      nextIdentifierError = getPhoneNumberError(identifier);
    }

    const nextPasswordError = password ? '' : 'Password is required.';

    setIdentifierError(nextIdentifierError);
    setPasswordError(nextPasswordError);
    return !nextIdentifierError && !nextPasswordError;
  };

  // Both the password flow and the Google flow end here, since a session is
  // a session however it was obtained.
  const applyResult = async (data: AuthResult) => {
    // A PHARMACIST account lands in its own section instead of the
    // patient-facing tabs. Same for DRIVER. ADMIN isn't handled here since
    // admins use the separate /admin-login screen.
    const postLoginRoute =
      data.role === 'PHARMACIST' ? '/(pharmacist)/PharmacistHome' :
      data.role === 'DRIVER' ? '/(driver)/DriverHome' :
      '/(tabs)';

    // Signed up but never confirmed the emailed code — the server has just
    // re-sent one, so continue there rather than showing an error the user
    // can't act on.
    if (data.requiresVerification) {
      router.push({
        pathname: '/verify-email' as any,
        params: {
          userId: data.userId,
          email: data.email,
          channel: data.verificationChannel,
          target: data.verificationTarget,
          redirectTo: postLoginRoute,
        },
      });
      return;
    }

    if (data.requires2FA) {
      router.push({
        pathname: '/verify-2fa' as any,
        params: { userId: data.userId, redirectTo: postLoginRoute },
      });
      return;
    }

    if (data.token) {
      await setSession({
        token:    data.token,
        userId:   data.userId!,
        fullName: data.fullName ?? '',
        email:    data.email!,
        role:     data.role!,
      });
      router.replace(postLoginRoute as any);
      return;
    }

    showError('Login Failed', data.message || 'Invalid credentials.');
  };

  const handleLogin = async () => {
    if (!validate()) return;

    const identifier = identifierRef.current.trim();

    setLoading(true);
    try {
      const data = await loginUser(identifier, passwordRef.current);

      // Persisted before routing away, and only on a request that actually
      // reached the server — remembering a typo'd number helps nobody.
      if (remember) {
        await AsyncStorage.setItem(REMEMBER_KEY, identifier);
      } else {
        await AsyncStorage.removeItem(REMEMBER_KEY);
      }

      await applyResult(data);
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

  // Only the backend exchange lives here — obtaining the ID token (and every
  // way that can fail or be cancelled) is GoogleSignInButton's job.
  const handleGoogleIdToken = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      await applyResult(await googleSignIn(idToken));
    } catch (err: any) {
      if (err?.message === 'NETWORK_ERROR' || err?.message === 'TIMEOUT') {
        showConnectionError();
      } else {
        showError('Server Error', 'The server responded unexpectedly. Please try again shortly.');
      }
    } finally {
      setGoogleLoading(false);
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
            <AuthHeading title="Welcome Back" subtitle="Login to access your account" />

            <AuthTabs options={METHODS} value={method} onChange={(next) => {
              setMethod(next);
              // Clearing on switch avoids submitting an email under the Phone
              // tab (or vice-versa) with a stale validation message attached.
              identifierRef.current = '';
              setInitialIdentifier('');
              setIdentifierError('');
            }} />

            <View style={styles.fields}>
              <RoundedInput
                // Remounts on tab switch AND when the remembered identifier
                // finishes loading from AsyncStorage — defaultValue is only
                // read at mount, so without the second half of this key a
                // saved value that arrives after the first render (the normal
                // case) would never appear in the field.
                key={`${method}:${initialIdentifier}`}
                label={method === 'email' ? 'Email' : 'Phone Number'}
                defaultValue={initialIdentifier}
                onChangeText={(t) => { identifierRef.current = t; if (identifierError) setIdentifierError(''); }}
                placeholder={method === 'email' ? 'you@example.com' : '+233 24 123 4567'}
                keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={method === 'email' ? 'email' : 'tel'}
                returnKeyType="next"
                error={identifierError}
              />

              <RoundedInput
                label="Password"
                onChangeText={(t) => { passwordRef.current = t; if (passwordError) setPasswordError(''); }}
                placeholder="Enter your password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                error={passwordError}
              />
            </View>

            <View style={styles.optionsRow}>
              <Pressable
                style={styles.rememberRow}
                onPress={() => setRemember((prev) => !prev)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: remember }}
                hitSlop={8}
              >
                <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                  {remember && <Ionicons name="checkmark" size={13} color={GlassTheme.colors.textInverse} />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </Pressable>

              <TouchableOpacity onPress={() => router.push('/forgotpassword' as any)} hitSlop={8}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <PillButton label="Log In" onPress={handleLogin} loading={loading} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or Sign In With</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google only — Facebook was dropped from the reference design. */}
            <GoogleSignInButton
              loading={googleLoading}
              onIdToken={handleGoogleIdToken}
              onUnavailable={(reason) => showError(
                'Google Sign-In Unavailable',
                reason === 'needsDevBuild'
                  ? 'Google sign-in needs a development build — it cannot run in Expo Go. Please sign in with your phone number or email.'
                  : 'Google sign-in has not been set up for this build yet. Please sign in with your phone number or email.',
              )}
              onError={(message) => showError('Google Sign-In Failed', message)}
            />

            <View style={styles.registerRow}>
              <Text style={styles.registerHint}>Don&apos;t have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/register')} hitSlop={8}>
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.staffDivider} />
            <TouchableOpacity style={styles.staffRow} onPress={() => router.push('/admin-login' as any)}>
              <Text style={styles.staffText}>Staff / Admin sign in</Text>
            </TouchableOpacity>
            {/* Also offered from the connection-error dialog, but kept here as
                a standing entry point — someone who already knows the backend
                moved shouldn't have to fail a login first to get to it. */}
            <TouchableOpacity style={styles.staffRow} onPress={() => router.push('/server-settings' as any)}>
              <Text style={styles.staffText}>Server settings</Text>
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
    paddingTop: 28,
    paddingBottom: 40,
    gap: 22,
  },
  fields: {
    gap: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -6,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: GlassTheme.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: GlassTheme.colors.primary,
    borderColor: GlassTheme.colors.primary,
  },
  rememberText: {
    fontSize: 13,
    color: GlassTheme.colors.textMuted,
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 13,
    color: GlassTheme.colors.primary,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: -4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: GlassTheme.colors.divider,
  },
  dividerText: {
    fontSize: 12,
    color: GlassTheme.colors.textDim,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerHint: {
    color: GlassTheme.colors.textMuted,
    fontSize: 13,
  },
  registerLink: {
    color: GlassTheme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  staffDivider: {
    alignSelf: 'center',
    width: 40,
    height: 1,
    backgroundColor: GlassTheme.colors.divider,
    marginTop: 8,
  },
  staffRow: {
    alignSelf: 'center',
    marginTop: -10,
  },
  staffText: {
    fontSize: 12,
    color: GlassTheme.colors.textDim,
    fontWeight: '600',
  },
});
