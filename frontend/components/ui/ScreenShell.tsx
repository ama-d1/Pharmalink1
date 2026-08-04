import { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassTheme } from '@/constants/glassTheme';

// The two halves of the ui_ref layout, kept in one file because they only
// ever make sense together: a dark "ink" header that runs edge-to-edge under
// the status bar, and a white sheet with large rounded top corners that
// overlaps its bottom edge. Every main screen is built from this pair, which
// is what makes them read as one product rather than a pile of screens.
//
// The header owns its own safe-area top inset, so screens using it must NOT
// also wrap in <SafeAreaView edges={['top']}> — that would push the dark
// header down and leave a white strip above it.

const OVERLAP = 20;

type HeaderProps = {
  onBack?: () => void;
  /** Small centred title in the button row. */
  title?: string;
  /** Large left-aligned heading below the button row. */
  heading?: string;
  /** Muted line above `heading`. */
  eyebrow?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  /** Count bubble on the right button (e.g. cart items). Hidden when 0. */
  rightBadge?: number;
  search?: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    onSubmit?: () => void;
    onClear?: () => void;
  };
  /** Renders the separate circular filter button beside the search field. */
  onFilterPress?: () => void;
  children?: ReactNode;
};

export function DarkHeader({
  onBack,
  title,
  heading,
  eyebrow,
  rightIcon,
  onRightPress,
  rightBadge,
  search,
  onFilterPress,
  children,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={GlassTheme.gradients.headerBg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      {(onBack || title || rightIcon) && (
        <View style={styles.buttonRow}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.circleBtn} hitSlop={6}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.circleBtnPlaceholder} />
          )}

          {!!title && <Text style={styles.title}>{title}</Text>}

          {rightIcon ? (
            <TouchableOpacity onPress={onRightPress} style={styles.circleBtn} hitSlop={6}>
              <Ionicons name={rightIcon} size={19} color="#FFFFFF" />
              {!!rightBadge && rightBadge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{rightBadge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.circleBtnPlaceholder} />
          )}
        </View>
      )}

      {(!!heading || !!eyebrow) && (
        <View style={styles.headingBlock}>
          {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
          {!!heading && <Text style={styles.heading}>{heading}</Text>}
        </View>
      )}

      {!!search && (
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <Ionicons name="search" size={17} color="rgba(255,255,255,0.55)" />
            <TextInput
              value={search.value}
              onChangeText={search.onChangeText}
              onSubmitEditing={search.onSubmit}
              placeholder={search.placeholder}
              placeholderTextColor="rgba(255,255,255,0.5)"
              returnKeyType="search"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              underlineColorAndroid="transparent"
            />
            {!!search.value && !!search.onClear && (
              <TouchableOpacity onPress={search.onClear} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.55)" />
              </TouchableOpacity>
            )}
          </View>

          {!!onFilterPress && (
            <TouchableOpacity onPress={onFilterPress} style={styles.circleBtn} hitSlop={6}>
              <Ionicons name="options-outline" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {children}
    </LinearGradient>
  );
}

/**
 * The white content sheet. Pulls up over the header's bottom edge so the
 * rounded corners cut into the dark area, exactly as in the reference.
 */
export function SheetBody({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.sheet, style]}>{children}</View>;
}

/** Root wrapper — dark behind the header so the status bar area is never white. */
export function ScreenRoot({ children }: { children: ReactNode }) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GlassTheme.colors.ink,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: OVERLAP + 18,
    gap: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: GlassTheme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headingBlock: {
    gap: 3,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 46,
    paddingHorizontal: 15,
    borderRadius: GlassTheme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    padding: 0,
  },
  sheet: {
    flex: 1,
    backgroundColor: GlassTheme.colors.surface,
    borderTopLeftRadius: GlassTheme.radius.xl,
    borderTopRightRadius: GlassTheme.radius.xl,
    marginTop: -OVERLAP,
    paddingTop: 18,
  },
});
