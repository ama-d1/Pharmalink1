import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';

// Unused leftover from the default Expo template (not imported anywhere in
// the app) — kept as a styled icon instead of the emoji it used to render,
// in case it's ever wired up.
export function HelloWave() {
  return (
    <Animated.View
      style={{
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      <Ionicons name="hand-right" size={28} color="#1F2937" />
    </Animated.View>
  );
}
