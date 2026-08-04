import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassInput } from '@/components/glass/GlassInput';
import {
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  hasApiBaseUrlOverride,
  normalizeBaseUrl,
  setApiBaseUrlOverride,
} from '@/constants/api';
import { GlassTheme } from '@/constants/glassTheme';
import { useModal } from '@/context/ModalContext';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

// Lets the backend address be changed without a rebuild.
//
// Added 2026-08-04 alongside the preview-build connection fix. The base URL
// is baked in at build time from eas.json (see constants/api.ts), which is
// fine until the address changes — and it changes often in this project: a
// Cloudflare quick-tunnel gets a new hostname every restart, and a LAN IP
// moves with DHCP. Without this screen each change means another ~15-minute
// EAS build just to edit one string.
//
// Reachable from the connection-error dialog on the login screen, which is
// exactly where someone is standing when they discover the URL is stale.

export default function ServerSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showError, showSuccess } = useModal();

  const [url, setUrl] = useState(getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isOverridden, setIsOverridden] = useState(hasApiBaseUrlOverride());

  const defaultUrl = getDefaultApiBaseUrl();

  // Hits an endpoint that exists and needs no auth. A 4xx here is a SUCCESS
  // signal: it means a PharmaLink gateway answered. Only a transport-level
  // failure (bad host, wrong port, blocked cleartext, tunnel down) means the
  // address is wrong, so the check is "did anything answer", not "was it 2xx".
  const testConnection = async () => {
    const candidate = normalizeBaseUrl(url);
    if (!candidate) {
      showError('Missing URL', 'Enter a server address first.');
      return;
    }

    setTesting(true);
    try {
      const res = await fetchWithTimeout(
        `${candidate}/api/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: '', password: '' }),
        },
        8000
      );
      showSuccess('Server Reachable', `${candidate} answered with HTTP ${res.status}.`);
    } catch {
      showError(
        'No Response',
        `Nothing answered at ${candidate}.\n\nCheck the backend is running, the tunnel is up, and — for a plain http:// address — that the phone is on the same network.`
      );
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    const candidate = normalizeBaseUrl(url);
    if (!candidate) {
      showError('Missing URL', 'Enter a server address first.');
      return;
    }

    setSaving(true);
    try {
      await setApiBaseUrlOverride(candidate);
      setUrl(candidate);
      setIsOverridden(true);
      showSuccess('Saved', `The app will now talk to ${candidate}.`, {
        confirmLabel: 'Back to sign in',
        onConfirm: () => router.back(),
      });
    } catch {
      showError('Could Not Save', 'Writing the server address to storage failed.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await setApiBaseUrlOverride(null);
      setUrl(getApiBaseUrl());
      setIsOverridden(false);
      showSuccess('Reset', `Back to the address built into this app: ${defaultUrl}`);
    } catch {
      showError('Could Not Reset', 'Clearing the saved server address failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            <LinearGradient
              colors={GlassTheme.gradients.headerBg}
              style={[styles.hero, { paddingTop: insets.top + 24 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.heroIcon}>
                <Ionicons name="server-outline" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>Server Settings</Text>
              <Text style={styles.heroSub}>Point the app at your backend</Text>
            </LinearGradient>

            <GlassCard style={styles.card} glow>
              <Text style={styles.cardTitle}>Backend address</Text>
              <Text style={styles.cardSub}>
                The base URL only — no /api path. Both a tunnel hostname and a
                LAN address work.
              </Text>

              <GlassInput
                label="Server URL"
                icon="globe-outline"
                value={url}
                onChangeText={setUrl}
                placeholder="https://your-tunnel.trycloudflare.com"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
              />

              <View style={styles.statusRow}>
                <Ionicons
                  name={isOverridden ? 'pencil' : 'cube-outline'}
                  size={13}
                  color={GlassTheme.colors.textDim}
                />
                <Text style={styles.statusText}>
                  {isOverridden
                    ? 'Using a custom address saved on this device.'
                    : `Using the address built into this app: ${defaultUrl}`}
                </Text>
              </View>

              <GlassButton
                label="Test Connection"
                variant="outline"
                onPress={testConnection}
                loading={testing}
              />
              <GlassButton label="Save" onPress={save} loading={saving} size="lg" />
              {isOverridden && (
                <GlassButton label="Reset to app default" variant="ghost" onPress={reset} />
              )}

              <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={14} color={GlassTheme.colors.primary} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            </GlassCard>

            <Text style={styles.footnote}>
              Chat&apos;s realtime connection follows this address too — an https
              URL is upgraded to wss automatically.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 40 },
  hero: {
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 10,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },

  card: { margin: 20, marginTop: -24, gap: 14 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: GlassTheme.colors.text },
  cardSub: {
    fontSize: 13,
    color: GlassTheme.colors.textMuted,
    marginTop: -8,
    lineHeight: 19,
  },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 },
  statusText: { flex: 1, fontSize: 11, color: GlassTheme.colors.textDim, lineHeight: 16 },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  backText: { color: GlassTheme.colors.primary, fontSize: 13, fontWeight: '600' },

  footnote: {
    fontSize: 11,
    color: GlassTheme.colors.textDim,
    textAlign: 'center',
    marginHorizontal: 32,
    lineHeight: 16,
  },
});
