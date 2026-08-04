import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * How far a BOTTOM-ANCHORED, absolutely-positioned element has to move up to
 * stay clear of the keyboard.
 *
 * KeyboardAvoidingView is the right tool for inputs inside normal document
 * flow, but it can't help an element positioned `absolute; bottom: 0` — the
 * keyboard simply covers it. This returns the offset such an element should
 * apply itself.
 *
 * FIXED 2026-08-04 — this used to return 0 on Android unconditionally, on the
 * stated reasoning that "Expo runs with the keyboard in resize mode, so the
 * window shrinks and `bottom: 0` is ALREADY above the keyboard".
 *
 * That was true once, and is not true on Expo SDK 54 / React Native 0.81.
 * Android edge-to-edge is enabled by default there and, per Expo's own config
 * types, "can't be disabled anymore" (Android 16+ requires it). Under
 * edge-to-edge the app draws behind the system bars and the window no longer
 * resizes for the keyboard — so `bottom: 0` stays pinned to the physical
 * screen bottom, underneath the keyboard, exactly as on iOS. Returning 0
 * meant every bottom-anchored bar (most visibly the chat composer) sat under
 * the keyboard with no way to see what you were typing.
 *
 * Both platforms now get the real keyboard height. The remaining difference
 * is only which events to listen to:
 *
 *   • iOS emits the Will* pair ahead of the animation, so the element moves
 *     in step with the keyboard rather than snapping after it has landed.
 *   • Android only emits the Did* pair reliably (Will* fire solely when
 *     adjustResize is active, which edge-to-edge is precisely what removed).
 */
export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) =>
      setOffset(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setOffset(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return offset;
}
