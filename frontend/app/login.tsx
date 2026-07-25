import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import { loginUser } from '@/services/authService';
import { EMAIL_REGEX } from '@/utils/validation';

import logo from '../assets/images/logo-icon.png';

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // useRef keeps the typed value without causing a re-render on every keystroke.
  // Re-renders were remounting TextInput inside GlassCard → cursor jumping to
  // the next field after each character.
  const emailRef = useRef('');
  const passwordRef = useRef('');

  const validate = () => {
    const email = emailRef.current.trim();
    const password = passwordRef.current;

    let nextEmailError = '';
    let nextPasswordError = '';

    if (!email) {
      nextEmailError = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email)) {
      nextEmailError = 'Enter a valid email address.';
    }

    if (!password) {
      nextPasswordError = 'Password is required.';
    }

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    return !nextEmailError && !nextPasswordError;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    const email = emailRef.current.trim();
    const password = passwordRef.current;

    setLoading(true);
    try {
      const data = await loginUser(email, password);

      // Added 2026-07-23 — a PHARMACIST account lands in its own section
      // (app/(pharmacist)/) instead of the patient-facing tabs. Same for
      // DRIVER (app/(driver)/), added same day. ADMIN isn't handled here
      // since admins use the separate /admin-login screen, not this one, in
      // practice.
      const postLoginRoute =
        data.role === 'PHARMACIST' ? '/(pharmacist)/PharmacistHome' :
        data.role === 'DRIVER' ? '/(driver)/DriverHome' :
        '/(tabs)';

      if (data.requires2FA) {
        router.push({ pathname: '/verify-2fa' as any, params: { userId: data.userId, redirectTo: postLoginRoute } });
      } else if (data.token) {
        await setSession({
          token:    data.token,
          userId:   data.userId,
          fullName: data.fullName,
          email:    data.email,
          role:     data.role,
        });
        router.replace(postLoginRoute as any);
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials.');
      }
    } catch (err: any) {
      if (err?.message === 'NETWORK_ERROR') {
        Alert.alert('Connection Error', 'Could not reach the server. Check your network.');
      } else {
        Alert.alert('Server Error', 'The server responded unexpectedly. Please try again shortly.');
      }
    } finally {
      setLoading(false);
    }
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
                <Image source={logo} style={styles.logo} />
                <Text style={styles.brand}>PharmaLink</Text>
                <Text style={styles.tagline}>Smarter Pharmacy. Smarter Health.</Text>
              </LinearGradient>
            </View>

            {/* ── Login Card ── */}
            <GlassCard style={styles.card} glow>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSub}>Sign in to continue</Text>

              <View style={styles.fields}>
                <GlassInput
                  label="Email address"
                  icon="mail-outline"
                  onChangeText={(t) => { emailRef.current = t; if (emailError) setEmailError(''); }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  error={emailError}
                />
                <GlassInput
                  label="Password"
                  icon="lock-closed-outline"
                  onChangeText={(t) => { passwordRef.current = t; if (passwordError) setPasswordError(''); }}
                  placeholder="Enter your password"
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  error={passwordError}
                />
              </View>

              <TouchableOpacity
                style={styles.forgotRow}
                onPress={() => router.push('/forgotpassword' as any)}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <GlassButton
                label="Sign In"
                onPress={handleLogin}
                loading={loading}
                size="lg"
              />

              <View style={styles.registerRow}>
                <Text style={styles.registerHint}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={styles.registerLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>

            <View style={styles.staffDivider} />
            <TouchableOpacity style={styles.staffRow} onPress={() => router.push('/admin-login' as any)}>
              <Text style={styles.staffText}>Staff / Admin sign in</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  hero: {
    overflow: 'hidden',
  },
  heroGrad: {
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logo: {
    width: 132,
    height: 132,
    resizeMode: 'contain',
    marginBottom: 6,
  },
  brand: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: -10,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 4,
  },
  card: {
    margin: 20,
    marginTop: -20,
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
  fields: {
    gap: 14,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    color: GlassTheme.colors.primary,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
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
    marginTop: 20,
  },
  staffRow: {
    alignSelf: 'center',
    marginTop: 12,
  },
  staffText: {
    fontSize: 12,
    color: GlassTheme.colors.textDim,
    fontWeight: '600',
  },
});
