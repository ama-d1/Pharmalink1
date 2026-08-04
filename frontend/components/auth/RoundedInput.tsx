import React, { memo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassTheme } from '@/constants/glassTheme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  /** Trailing icon button — the calendar affordance on Date of birth. */
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onTrailingIconPress?: () => void;
  /**
   * Renders the field as a button instead of a keyboard target (Date of
   * birth opens the picker rather than accepting typing). The TextInput is
   * kept underneath so the value, placeholder and error styling stay
   * identical to every other field — only the interaction changes.
   */
  readOnlyPress?: () => void;
};

/**
 * The curved field from the redesigned auth screens: label above, deeply
 * rounded outline, no fill, generous height.
 *
 * Kept separate from GlassInput rather than restyling it — GlassInput's
 * flatter, tighter shape is used on ~30 other screens that aren't part of
 * this redesign, so changing it there would be an unrequested change to
 * every one of them.
 *
 * memo + the parent's useRef-not-useState pattern (see the auth screens) is
 * what keeps the cursor from jumping between fields: a parent re-render on
 * each keystroke was remounting the TextInput.
 */
export const RoundedInput = memo(function RoundedInput({
  label,
  error,
  style,
  secureTextEntry,
  trailingIcon,
  onTrailingIconPress,
  readOnlyPress,
  ...rest
}: Props) {
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const [focused, setFocused] = useState(false);

  const field = (
    <View style={[styles.row, focused && styles.rowFocused, !!error && styles.rowError]}>
      <TextInput
        {...rest}
        style={[styles.input, style]}
        placeholderTextColor={GlassTheme.colors.textDim}
        secureTextEntry={hidden}
        underlineColorAndroid="transparent"
        editable={readOnlyPress ? false : rest.editable}
        // Without this the disabled field renders grey on Android, which
        // would make Date of birth look broken rather than tappable.
        pointerEvents={readOnlyPress ? 'none' : 'auto'}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
      />

      {secureTextEntry && (
        <TouchableOpacity
          onPress={() => setHidden(!hidden)}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
        >
          <Ionicons
            name={hidden ? 'eye-off-outline' : 'eye-outline'}
            size={19}
            color={GlassTheme.colors.textDim}
          />
        </TouchableOpacity>
      )}

      {trailingIcon && !secureTextEntry && (
        <TouchableOpacity
          onPress={onTrailingIconPress}
          disabled={!onTrailingIconPress}
          style={styles.iconBtn}
          accessibilityRole="button"
        >
          <Ionicons name={trailingIcon} size={19} color={GlassTheme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      {readOnlyPress ? (
        <Pressable onPress={readOnlyPress} accessibilityRole="button" accessibilityLabel={label}>
          {field}
        </Pressable>
      ) : (
        field
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: GlassTheme.colors.text,
    marginLeft: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GlassTheme.colors.surface,
    borderRadius: GlassTheme.radius.field,
    borderWidth: 1.5,
    borderColor: GlassTheme.colors.glassBorder,
    minHeight: 54,
  },
  rowFocused: {
    borderColor: GlassTheme.colors.primary,
  },
  rowError: {
    borderColor: GlassTheme.colors.danger,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 15,
    color: GlassTheme.colors.text,
  },
  iconBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  error: {
    marginLeft: 6,
    fontSize: 11,
    color: GlassTheme.colors.danger,
  },
});
