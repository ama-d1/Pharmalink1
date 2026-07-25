import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
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
import { verifyTwoFactorCode, resendTwoFactorCode } from '@/services/authService';

// Coming-soon roadmap item #9: reached from login.tsx/admin-login.tsx when
// loginUser() returns requires2FA=true — password was correct, but a code
// was just emailed instead of a token. userId/redirectTo are passed as
// route params so this one screen works for both the patient tabs and the
// admin dashboard's separate post-login destination.
export default function VerifyTwoFactorScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const { userId, redirectTo } = useLocalSearchParams<{ userId: string; redirectTo?: string }>();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [codeError, setCodeError] = useState('');

  const codeRef = useRef('');

  const handleVerify = async () => {
    const code = codeRef.current.trim();
    if (!code) {
      setCodeError('Enter the 6-digit code from your email.');
      return;
    }
    if (!userId) {
      Alert.alert('Something went wrong', 'Missing login session — please sign in again.');
      router.replace('/login');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyTwoFactorCode(userId, code);
      if (data.token) {
        // Mirrors admin-login.tsx's own role check — that screen can't do
        // it itself here since it never sees a token until this step
        // completes, so the same gate has to be repeated on this path too.
        if (String(redirectTo || '').startsWith('/(admin)') && data.role !== 'ADMIN') {
          Alert.alert('Access Denied', 'This account does not have admin access.');
          router.replace('/admin-login' as any);
          return;
        }
        await setSession({
          token: data.token,
          userId: data.userId,
          fullName: data.fullName,
          email: data.email,
          role: data.role,
        });
        router.replace((redirectTo as any) || '/(tabs)');
      } else {
        setCodeError(data.message || 'Invalid or expired code.');
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

  const handleResend = async () => {
    if (!userId || resending) return;
    setResending(true);
    try {
      await resendTwoFactorCode(userId);
      Alert.alert('Code sent', 'A new verification code has been emailed to you.');
    } finally {
      setResending(false);
    }
  };

  return (
    <GlassBackground>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <LinearGradient
                colors={GlassTheme.gradients.headerBg}
                style={styles.heroGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="mail-open-outline" size={36} color="#FFFFFF" />
                </View>
                <Text style={styles.brand}>Check your email</Text>
                <Text style={styles.tagline}>Enter the 6-digit code we just sent you</Text>
              </LinearGradient>
            </View>

            <GlassCard style={styles.card} glow>
              <GlassInput
                label="Verification code"
                icon="keypad-outline"
                onChangeText={(t) => { codeRef.current = t; if (codeError) setCodeError(''); }}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
                error={codeError}
              />

              <GlassButton
                label="Verify"
                onPress={handleVerify}
                loading={loading}
                size="lg"
                style={{ marginTop: 20 }}
              />

              <TouchableOpacity style={styles.resendRow} onPress={handleResend} disabled={resending}>
                <Text style={styles.resendText}>{resending ? 'Sending...' : "Didn't get a code? Resend"}</Text>
              </TouchableOpacity>
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
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  card: {
    margin: 20,
    marginTop: -20,
  },
  resendRow: {
    alignSelf: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 13,
    color: GlassTheme.colors.primary,
    fontWeight: '600',
  },
});
