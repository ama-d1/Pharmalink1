import { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassTheme } from '@/constants/glassTheme';

type Props = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
};

export function GlassInput({ label, icon, error, style, secureTextEntry, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.row, focused && styles.rowFocused, !!error && styles.rowError]}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? GlassTheme.colors.primary : GlassTheme.colors.textDim}
            style={styles.icon}
          />
        )}
        <TextInput
          placeholderTextColor={GlassTheme.colors.textDim}
          style={[styles.input, icon && styles.inputWithIcon, style]}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setHidden(!hidden)} style={styles.eyeBtn}>
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={GlassTheme.colors.textDim}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 5 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: GlassTheme.colors.textMuted,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.sm,
    borderWidth: 1.5,
    borderColor: GlassTheme.colors.divider,
  },
  rowFocused: {
    borderColor: GlassTheme.colors.primary,
    backgroundColor: '#FFFFFF',
    ...GlassTheme.shadow.sm,
  },
  rowError: {
    borderColor: GlassTheme.colors.danger,
  },
  icon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    color: GlassTheme.colors.text,
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  error: {
    fontSize: 11,
    color: GlassTheme.colors.danger,
    marginTop: 2,
  },
});
