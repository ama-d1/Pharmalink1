import { useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { GlassTheme } from '@/constants/glassTheme';

type Props = {
  length: number;
  onChange: (code: string) => void;
  /** Fired when the last digit is filled — lets the screen auto-submit. */
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
  hasError?: boolean;
};

/**
 * The circular one-time-code field from the redesigned verification screen:
 * one round cell per digit, the active cell filled.
 *
 * Each cell is its own TextInput. The obvious alternative — one hidden input
 * behind fake cells — handles paste more cleanly, but loses the per-cell
 * caret and the system's own "from Messages" autofill on iOS, which is the
 * thing people actually use to enter these codes. Multi-digit input (paste,
 * or an autofill that lands entirely in cell 0) is handled explicitly in
 * handleChange instead.
 */
export function CodeInput({ length, onChange, onComplete, autoFocus, hasError }: Props) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''));
  const inputs = useRef<(TextInput | null)[]>([]);

  const commit = (next: string[]) => {
    setDigits(next);
    const code = next.join('');
    onChange(code);
    if (code.length === length && !next.includes('')) {
      onComplete?.(code);
    }
  };

  const handleChange = (raw: string, index: number) => {
    const value = raw.replace(/\D/g, '');
    if (!value) {
      // Deletion via onChangeText (rather than the keyPress path below),
      // which is what a soft keyboard's backspace reports on Android.
      const next = [...digits];
      next[index] = '';
      commit(next);
      return;
    }

    const next = [...digits];
    // A paste or an SMS autofill arrives as one multi-character change on a
    // single cell — spread it across the remaining cells rather than
    // truncating to the first character.
    const chars = value.split('');
    let cursor = index;
    for (const char of chars) {
      if (cursor >= length) break;
      next[cursor] = char;
      cursor += 1;
    }
    commit(next);

    const focusTarget = Math.min(cursor, length - 1);
    inputs.current[focusTarget]?.focus();
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key !== 'Backspace') return;
    if (digits[index]) return; // onChangeText already clears a filled cell
    if (index === 0) return;

    // Backspace on an empty cell steps back and clears the previous one —
    // without this, the caret sticks on cell N and the code can't be edited.
    const next = [...digits];
    next[index - 1] = '';
    commit(next);
    inputs.current[index - 1]?.focus();
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => { inputs.current[index] = ref; }}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType="number-pad"
          returnKeyType="done"
          // iOS reads the code out of an incoming SMS/email with this.
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          // Not maxLength={1}: that would silently drop every character but
          // the first of a pasted code before handleChange ever sees it.
          maxLength={length}
          autoFocus={autoFocus && index === 0}
          selectTextOnFocus
          style={[
            styles.cell,
            !!digit && styles.cellFilled,
            hasError && styles.cellError,
          ]}
          accessibilityLabel={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </View>
  );
}

const CELL_SIZE = 62;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    // Exactly half the size — a true circle, per the reference.
    borderRadius: CELL_SIZE / 2,
    borderWidth: 1.5,
    borderColor: GlassTheme.colors.glassBorder,
    backgroundColor: GlassTheme.colors.surface,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: GlassTheme.colors.text,
    // Android centres text vertically differently from iOS; padding 0 plus
    // the fixed height keeps the digit on the circle's centre line on both.
    padding: 0,
  },
  cellFilled: {
    backgroundColor: GlassTheme.colors.primary,
    borderColor: GlassTheme.colors.primary,
    color: GlassTheme.colors.textInverse,
  },
  cellError: {
    borderColor: GlassTheme.colors.danger,
  },
});
