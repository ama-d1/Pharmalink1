import { ReactNode, useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { GlassTheme } from '@/constants/glassTheme';
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset';

// Shared bottom-sheet chrome (handle, rounded top, backdrop, title row) so
// every sheet in the app — location picker, add-medication form, pharmacy
// results/filters — looks and behaves the same way instead of each screen
// hand-rolling its own <Modal> + slide animation.
//
// Sheets render NOTHING while `visible` is false. They used to stay mounted
// at index={-1} and open/close from a useEffect, which meant gorhom still
// laid a closed sheet out on every host screen and could settle it visibly —
// that was the location picker flashing up from the bottom of the Order
// screen unprompted. Not rendering makes that structurally impossible rather
// than dependent on animation timing.
//
// Closing still animates: the drag handle, the backdrop tap and the header
// close button all drive gorhom's own close animation, and gorhom fires
// `onClose` only once the sheet has finished animating out — that's what
// flips `visible` and unmounts us, so the exit is never cut short.
//
// Needs a <GestureHandlerRootView> mounted once at the root (see
// app/_layout.tsx) for the pan-down-to-close gesture to work at all.

type HeaderAction = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  snapPoints?: (string | number)[];
  title?: string;
  scrollable?: boolean;
  /** Pass 'interactive' for sheets containing text inputs — lets the sheet
   * ride up above the keyboard instead of the keyboard just covering it. */
  keyboardBehavior?: 'interactive' | 'extend' | 'fillParent';
  /**
   * Primary action for form sheets, rendered in the title row.
   *
   * Deliberately here rather than in a pinned bottom footer. Two earlier
   * attempts put the Save/Cancel pair at the bottom of the sheet — first as a
   * flex sibling, then via gorhom's BottomSheetFooter — and in both cases the
   * buttons rendered outside the visible area. The header is the sheet's
   * first child and takes its natural height, so a control placed here cannot
   * be pushed off-screen by any flex or measurement behaviour. It also
   * matches the standard iOS form-sheet pattern (Cancel · Title · Save).
   */
  headerAction?: HeaderAction;
};

export function AppBottomSheet({
  visible,
  onClose,
  children,
  snapPoints,
  title,
  scrollable = false,
  keyboardBehavior,
  headerAction,
}: Props) {
  const ref = useRef<GorhomBottomSheet>(null);
  const points = useMemo(() => snapPoints ?? ['60%', '90%'], [snapPoints]);
  // The sheet deliberately holds its position when the keyboard opens, so on
  // iOS the keyboard simply covers its lower half. Padding the scroll by that
  // height is what lets the fields underneath still be scrolled into view.
  // It's 0 on Android, where the sheet's own viewport is resized instead.
  const keyboardOffset = useKeyboardOffset();

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close" />
    ),
    []
  );

  // Every hook above this line — the early return must not change hook order.
  if (!visible) return null;

  const Body = scrollable ? BottomSheetScrollView : BottomSheetView;
  const showHeader = !!title || !!headerAction;

  return (
    <GorhomBottomSheet
      ref={ref}
      index={0}
      snapPoints={points}
      // gorhom v5 turns `enableDynamicSizing` ON by default: it measures the
      // content and sizes the sheet to it, adding its own content-height snap
      // point. That fights the explicit snapPoints every caller here passes,
      // and leaves the content container height content-driven so `flex: 1`
      // children have nothing definite to fill.
      enableDynamicSizing={false}
      // Scrollable sheets hand ALL vertical gestures in the content area to
      // the scroll view. gorhom's content-panning gesture otherwise competes
      // with it for the same drag, and with a single snap point there's no
      // taller position for the sheet to expand into — so the pan can swallow
      // the gesture and the form simply refuses to scroll. The sheet is still
      // fully dismissable: drag the handle, tap the backdrop, or hit ✕.
      enableContentPanningGesture={!scrollable}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.background}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior="restore"
      // Lets Android shrink the sheet's own viewport for the keyboard rather
      // than panning the whole window up under it.
      android_keyboardInputMode="adjustResize"
    >
      {showHeader && (
        <View style={styles.header}>
          {/* close() rather than onClose() so gorhom animates the sheet out
              first and then reports back — calling onClose directly would
              unmount mid-animation. */}
          <TouchableOpacity onPress={() => ref.current?.close()} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={19} color={GlassTheme.colors.text} />
          </TouchableOpacity>

          <Text style={styles.title} numberOfLines={1}>{title}</Text>

          {headerAction ? (
            <TouchableOpacity
              onPress={headerAction.onPress}
              disabled={headerAction.loading || headerAction.disabled}
              style={[
                styles.actionBtn,
                (headerAction.loading || headerAction.disabled) && styles.actionBtnDisabled,
              ]}
              activeOpacity={0.85}
            >
              {headerAction.loading
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.actionText}>{headerAction.label}</Text>}
            </TouchableOpacity>
          ) : (
            // Keeps the title optically centred against the close button.
            <View style={styles.closeBtn} />
          )}
        </View>
      )}

      <Body
        // `flex: 1` is required, not incidental: the header is a sibling in a
        // column container, so without it the scroll view would size to its
        // own content, overflow the sheet, and never scroll. (gorhom's docs
        // example omits flex only because the scroll view is its sole child.)
        // This works now that enableDynamicSizing is off and the container
        // therefore has a definite height to divide up.
        style={styles.body}
        contentContainerStyle={
          scrollable
            ? [styles.scrollContent, { paddingBottom: 48 + keyboardOffset }]
            : undefined
        }
        {...(scrollable
          ? {
              showsVerticalScrollIndicator: true,
              keyboardDismissMode: 'on-drag' as const,
              keyboardShouldPersistTaps: 'handled' as const,
            }
          : {})}
      >
        {children}
      </Body>
    </GorhomBottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: GlassTheme.colors.surface,
    borderTopLeftRadius: GlassTheme.radius.xl,
    borderTopRightRadius: GlassTheme.radius.xl,
    ...GlassTheme.shadow.lg,
  },
  handle: {
    backgroundColor: GlassTheme.colors.divider,
    width: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // Matches `body`'s horizontal padding so the title row lines up with the
    // form fields underneath it rather than sitting 4px proud of them.
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GlassTheme.colors.divider,
    marginBottom: 14,
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
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    // paddingBottom is applied inline so it can grow with the keyboard.
    flexGrow: 1,
  },
});
