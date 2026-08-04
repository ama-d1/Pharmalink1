import { Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassTheme } from '@/constants/glassTheme';
import { GlassButton } from '@/components/glass/GlassButton';

// Replaces React Native's Alert.alert for user-facing messages.
//
// Why: Alert.alert renders the raw OS dialog, which (a) looks nothing like
// the rest of this app — no GlassTheme colors, no rounded card, no icon —
// and differs visually between iOS and Android, and (b) can't show anything
// beyond plain text. This is a single themed dialog used everywhere instead,
// so an error in checkout looks the same as an error in login.
//
// Styling deliberately mirrors TimePickerModal (same overlay tint, same
// white sheet, same radius/shadow tokens) so it reads as part of the same
// design system rather than a second, competing modal style.

export type ModalVariant = 'error' | 'success' | 'warning' | 'info' | 'confirm';

const VARIANT_STYLES: Record<
  ModalVariant,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  error: { icon: 'alert-circle', color: GlassTheme.colors.rose, bg: GlassTheme.colors.dangerLight },
  success: { icon: 'checkmark-circle', color: GlassTheme.colors.success, bg: GlassTheme.colors.successLight },
  warning: { icon: 'warning', color: GlassTheme.colors.amber, bg: GlassTheme.colors.amberLight },
  info: { icon: 'information-circle', color: GlassTheme.colors.primary, bg: GlassTheme.colors.primaryLight },
  confirm: { icon: 'help-circle', color: GlassTheme.colors.primary, bg: GlassTheme.colors.primaryLight },
};

type Props = {
  visible: boolean;
  variant?: ModalVariant;
  title: string;
  message?: string;
  /** Label for the main button. Defaults to "OK" (or "Confirm" when confirming). */
  confirmLabel?: string;
  /** Shown only when onCancel is provided — otherwise this is a single-button dialog. */
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

export function AppModal({
  visible,
  variant = 'info',
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  const v = VARIANT_STYLES[variant];
  const isDestructive = variant === 'error' || variant === 'confirm';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel ?? onConfirm}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={[styles.iconWrap, { backgroundColor: v.bg }]}>
            <Ionicons name={v.icon} size={28} color={v.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.actions}>
            {onCancel && (
              <GlassButton label={cancelLabel} variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
            )}
            <GlassButton
              label={confirmLabel ?? (onCancel ? 'Confirm' : 'OK')}
              variant={variant === 'error' ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: GlassTheme.radius.xl,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    ...GlassTheme.shadow.lg,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: GlassTheme.colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: GlassTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    alignSelf: 'stretch',
  },
});
