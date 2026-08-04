import { router } from 'expo-router';
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

import { AuthHeading } from '@/components/auth/AuthHeading';
import { AuthTabs } from '@/components/auth/AuthTabs';
import { DateOfBirthPicker, formatDateOfBirth } from '@/components/auth/DateOfBirthPicker';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { PillButton } from '@/components/auth/PillButton';
import { RoundedInput } from '@/components/auth/RoundedInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useConnectionError } from '@/hooks/useConnectionError';
import { googleSignIn, registerUser } from '@/services/authService';
import { getEmailError, getPasswordError, getPhoneNumberError } from '@/utils/validation';

const TABS = [
  { key: 'signup' as const, label: 'Sign Up' },
  { key: 'login' as const, label: 'Log In' },
];

export default function RegisterScreen() {
  const { setSession } = useAuth();
  const { showError } = useModal();
  const showConnectionError = useConnectionError();

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Date of birth is the one field that isn't a ref: it's set from the picker
  // rather than typed, so it has to re-render to show the chosen value.
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [errors, setErrors] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
  });

  // useRef: reading value only on submit, not on every keystroke. This
  // prevents the parent re-rendering on each character typed, which was
  // unmounting/remounting TextInput fields and jumping the cursor.
  const firstNameRef = useRef('');
  const lastNameRef  = useRef('');
  const emailRef     = useRef('');
  const phoneRef     = useRef('');
  const passwordRef  = useRef('');

  const clearError = (field: keyof typeof errors) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const validate = () => {
    const next = {
      firstName: firstNameRef.current.trim() ? '' : 'First name is required.',
      lastName:  lastNameRef.current.trim() ? '' : 'Last name is required.',
      email:     getEmailError(emailRef.current.trim()),
      phone:     getPhoneNumberError(phoneRef.current.trim()),
      password:  getPasswordError(passwordRef.current),
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await registerUser({
        firstName: firstNameRef.current.trim(),
        lastName:  lastNameRef.current.trim(),
        email:     emailRef.current.trim(),
        phoneNumber: phoneRef.current.trim(),
        password:  passwordRef.current,
        // Omitted rather than sent empty when never picked — the server
        // treats it as optional, and "" would fail its date parsing.
        ...(dateOfBirth ? { dateOfBirth } : {}),
      });

      // Registration deliberately returns no token: the account is created
      // but stays unusable until the code is confirmed. The code is texted to
      // the number above by default; channel/target say where it actually
      // went, since the server falls back to email on its own if SMS fails.
      if (data.requiresVerification && data.userId) {
        router.push({
          pathname: '/verify-email' as any,
          params: {
            userId: data.userId,
            email: data.email ?? emailRef.current.trim(),
            channel: data.verificationChannel,
            target: data.verificationTarget,
          },
        });
        return;
      }

      showError('Registration Failed', data.message || 'Something went wrong.');
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

  // Google accounts skip verification entirely — Google has already
  // confirmed the address, so this returns a usable session immediately.
  // Obtaining the ID token (and every way that can fail or be cancelled) is
  // GoogleSignInButton's job; this only handles the backend exchange.
  const handleGoogleIdToken = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const data = await googleSignIn(idToken);
      if (data.token) {
        await setSession({
          token:    data.token,
          userId:   data.userId!,
          fullName: data.fullName ?? '',
          email:    data.email!,
          role:     data.role!,
        });
        router.replace(
          data.role === 'PHARMACIST' ? '/(pharmacist)/PharmacistHome' as any :
          data.role === 'DRIVER' ? '/(driver)/DriverHome' as any :
          '/(tabs)',
        );
        return;
      }
      showError('Google Sign-In Failed', data.message || 'Could not complete sign-in.');
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

            <AuthHeading
              title="Get Started Now"
              subtitle="Create an account or log in to explore about our app"
            />

            <AuthTabs
              options={TABS}
              value="signup"
              // The Log In segment is navigation, not state — this screen has
              // no login form to swap in, and router.back() would be wrong
              // when register was opened directly (deep link, or after a
              // failed Google attempt).
              onChange={(next) => { if (next === 'login') router.replace('/login'); }}
            />

            <View style={styles.fields}>
              <View style={styles.nameRow}>
                <View style={styles.nameCol}>
                  <RoundedInput
                    label="First Name"
                    onChangeText={(t) => { firstNameRef.current = t; clearError('firstName'); }}
                    placeholder="Raj"
                    autoCapitalize="words"
                    autoComplete="given-name"
                    returnKeyType="next"
                    error={errors.firstName}
                  />
                </View>
                <View style={styles.nameCol}>
                  <RoundedInput
                    label="Last Name"
                    onChangeText={(t) => { lastNameRef.current = t; clearError('lastName'); }}
                    placeholder="Sarkar"
                    autoCapitalize="words"
                    autoComplete="family-name"
                    returnKeyType="next"
                    error={errors.lastName}
                  />
                </View>
              </View>

              <RoundedInput
                label="Email"
                onChangeText={(t) => { emailRef.current = t; clearError('email'); }}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                error={errors.email}
              />

              <RoundedInput
                label="Date of birth"
                value={formatDateOfBirth(dateOfBirth)}
                placeholder="DD/MM/YYYY"
                trailingIcon="calendar-outline"
                readOnlyPress={() => setPickerOpen(true)}
              />

              <RoundedInput
                label="Phone Number"
                onChangeText={(t) => { phoneRef.current = t; clearError('phone'); }}
                placeholder="+233 24 123 4567"
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="next"
                error={errors.phone}
              />

              <RoundedInput
                label="Set Password"
                onChangeText={(t) => { passwordRef.current = t; clearError('password'); }}
                placeholder="8+ chars, upper, lower, number, symbol"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                error={errors.password}
              />
            </View>

            <View style={styles.termsRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={GlassTheme.colors.success} />
              <Text style={styles.termsText}>Your data is encrypted and never shared.</Text>
            </View>

            <PillButton label="Sign Up" onPress={handleRegister} loading={loading} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or Sign Up With</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleSignInButton
              loading={googleLoading}
              onIdToken={handleGoogleIdToken}
              onUnavailable={(reason) => showError(
                'Google Sign-In Unavailable',
                reason === 'needsDevBuild'
                  ? 'Google sign-in needs a development build — it cannot run in Expo Go. Please create an account with the form above.'
                  : 'Google sign-in has not been set up for this build yet. Please create an account with the form above.',
              )}
              onError={(message) => showError('Google Sign-In Failed', message)}
            />

            <View style={styles.loginRow}>
              <Text style={styles.loginHint}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/login')} hitSlop={8}>
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <DateOfBirthPicker
        visible={pickerOpen}
        value={dateOfBirth}
        onCancel={() => setPickerOpen(false)}
        onConfirm={(iso) => { setDateOfBirth(iso); setPickerOpen(false); }}
      />
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
    gap: 20,
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
  fields: {
    gap: 15,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameCol: {
    flex: 1,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    paddingHorizontal: 4,
  },
  termsText: {
    fontSize: 12,
    color: GlassTheme.colors.textMuted,
    flex: 1,
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginHint: {
    color: GlassTheme.colors.textMuted,
    fontSize: 13,
  },
  loginLink: {
    color: GlassTheme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
