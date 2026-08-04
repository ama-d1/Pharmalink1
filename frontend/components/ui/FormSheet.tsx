import { ReactNode } from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassTheme } from '@/constants/glassTheme';
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset';

/**
 * A bottom-anchored form sheet built on React Native's own <Modal> and
 * <ScrollView>.
 *
 * Why this exists instead of reusing AppBottomSheet (@gorhom/bottom-sheet):
 * that library coordinates its own pan gesture with the scroll view, sizes
 * the sheet from measured content by default, and arbitrates drags between
 * sheet and list. Every one of those is useful for a draggable sheet and all
 * of them got in the way of the one thing this form needs — reliable,
 * ordinary vertical scrolling while typing. A plain ScrollView has no gesture
 * arbitration to lose, so it scrolls.
 *
 * Height behaviour, which is the whole point:
 *   • The sheet is a fixed share of the screen (default 70%) pinned to the
 *     bottom. Its TOP EDGE NEVER MOVES — no growing, no riding up with the
 *     keyboard.
 *   • When the keyboard opens on iOS, the sheet's bottom padding grows by the
 *     keyboard height, so the scrollable area shrinks to the space still
 *     visible above it. The field being typed into can always be scrolled
 *     into view. On Android the window is resized for us, so the offset is 0
 *     and this is a no-op (see useKeyboardOffset).
 */

type SheetAction = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Share of screen height the sheet occupies. Defaults to '70%'. */
  height?: `${number}%`;
  /** Primary action rendered in the title row, opposite the close button. */
  action?: SheetAction;
};

export function FormSheet({ visible, onClose, title, children, height = '70%', action }: Props) {
  const keyboardOffset = useKeyboardOffset();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Tap-outside-to-close. Sits behind the sheet, so it only catches
            taps on the dimmed area above it. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheet, { height, paddingBottom: keyboardOffset }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={19} color={GlassTheme.colors.text} />
            </TouchableOpacity>

            <Text style={styles.title} numberOfLines={1}>{title}</Text>

            {action ? (
              <TouchableOpacity
                onPress={action.onPress}
                disabled={action.loading || action.disabled}
                style={[styles.actionBtn, (action.loading || action.disabled) && styles.actionBtnDisabled]}
                activeOpacity={0.85}
              >
                {action.loading
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={styles.actionText}>{action.label}</Text>}
              </TouchableOpacity>
            ) : (
              // Balances the close button so the title stays optically centred.
              <View style={styles.closeBtn} />
            )}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,28,46,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: GlassTheme.colors.surface,
    borderTopLeftRadius: GlassTheme.radius.xl,
    borderTopRightRadius: GlassTheme.radius.xl,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GlassTheme.colors.divider,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GlassTheme.colors.divider,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: GlassTheme.colors.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    minWidth: 68,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: GlassTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  // flex:1 so the scroll view fills whatever is left under the header and
  // above the keyboard — that bounded height is what makes it scroll.
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
});
