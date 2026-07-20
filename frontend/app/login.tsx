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

import logo from '../assets/images/logo.png';


export default function LoginScreen() {


  const router = useRouter();
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  

  // useRef keeps the typed value without causing a re-render on every keystroke.
  // Re-renders were remounting TextInput inside GlassCard → cursor jumping to
  // the next field after each character.
  const emailRef    = useRef('');
  const passwordRef = useRef('');

  const handleLogin = async () => {
    const email    = emailRef.current.trim();
    const password = passwordRef.current;

    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(email, password);

      if (data.token) {
        await setSession({
          token:    data.token,
          userId:   data.userId,
          fullName: data.fullName,
          email:    data.email,
          role:     data.role,
        });
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials.');
      }
    } catch {
      Alert.alert('Connection Error', 'Could not reach the server. Check your network.');
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
                  onChangeText={(t) => { emailRef.current = t; }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <GlassInput
                  label="Password"
                  icon="lock-closed-outline"
                  onChangeText={(t) => { passwordRef.current = t; }}
                  placeholder="Enter your password"
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
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
    width: 180,
    height: 180,
    resizeMode: 'contain',
    marginBottom: 10,
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
});
