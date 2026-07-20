import React, { memo, useState } from 'react';
import {
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
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
};

export const GlassInput = memo(function GlassInput({
  label,
  icon,
  error,
  style,
  secureTextEntry,
  ...rest
}: Props) {
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.row,
          error && styles.rowError,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={GlassTheme.colors.textDim}
            style={styles.icon}
          />
        )}

        <TextInput
          {...rest}
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            style,
          ]}
          placeholderTextColor={GlassTheme.colors.textDim}
          secureTextEntry={hidden}
          autoCorrect={false}
          autoCapitalize="none"
          underlineColorAndroid="transparent"
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setHidden(!hidden)}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={GlassTheme.colors.textDim}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: GlassTheme.colors.textMuted,
    marginBottom: 6,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.sm,
    borderWidth: 1.5,
    borderColor: GlassTheme.colors.divider,
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
    marginTop: 4,
    fontSize: 11,
    color: GlassTheme.colors.danger,
  },
});