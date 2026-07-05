import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { API } from '@/constants/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendResetLink = async () => {
    if (!email.trim()) return Alert.alert('Required', 'Please enter your email address.');
    setLoading(true);
    try {
      const response = await fetch(`${API.auth}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      await response.text();
      setSent(true);
    } catch {
      Alert.alert('Error', 'Could not connect to server.');
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
              <View style={styles.heroBubble} />
              <View style={styles.heroIcon}>
                <Ionicons name="lock-open-outline" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>Reset Password</Text>
              <Text style={styles.heroSub}>We'll send a reset link to your email</Text>
            </LinearGradient>

            <GlassCard style={styles.card} glow>
              {sent ? (
                <View style={styles.sentState}>
                  <View style={styles.sentIcon}>
                    <Ionicons name="checkmark-circle" size={48} color={GlassTheme.colors.success} />
                  </View>
                  <Text style={styles.sentTitle}>Email Sent!</Text>
                  <Text style={styles.sentHint}>
                    Check your inbox at {email} for the reset link.
                  </Text>
                  <GlassButton label="Back to Login" onPress={() => router.back()} style={{ marginTop: 8 }} />
                </View>
              ) : (
                <>
                  <Text style={styles.cardTitle}>Forgot your password?</Text>
                  <Text style={styles.cardSub}>No worries, it happens to the best of us.</Text>
                  <GlassInput
                    label="Email address"
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
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
  heroBubble: {
    position: 'absolute', top: -40, right: -30,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
