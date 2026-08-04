import { useState } from 'react';
import { signInWithGoogle } from '@/services/googleAuth';
import { GoogleButton } from './GoogleButton';

type Props = {
  /** External busy state — e.g. while the ID token is exchanged with our backend. */
  loading?: boolean;
  /** Called with a Google-issued ID token, ready to send to /api/auth/google. */
  onIdToken: (idToken: string) => void | Promise<void>;
  /** No Google client ID is configured for this platform. */
  onUnavailable: (reason: 'unconfigured' | 'needsDevBuild') => void;
  onError: (message: string) => void;
};

/**
 * Google sign-in button that is safe to render before Google is set up.
 *
 * Everything about loading the native module and running the sheet lives in
 * services/googleAuth.ts, behind a lazy require — Google's native module does
 * not exist in Expo Go, and touching it there blanks the screen. This
 * component only maps the result to the caller's callbacks.
 */
export function GoogleSignInButton({ loading, onIdToken, onUnavailable, onError }: Props) {
  const [prompting, setPrompting] = useState(false);

  const handlePress = async () => {
    setPrompting(true);
    try {
      const result = await signInWithGoogle();

      switch (result.status) {
        case 'success':
          await onIdToken(result.idToken);
          return;
        // Backing out of the Google sheet is a normal thing to do, not an
        // error worth interrupting them over.
        case 'cancelled':
          return;
        case 'unconfigured':
        case 'needsDevBuild':
          onUnavailable(result.status);
          return;
        case 'error':
          onError(result.message);
      }
    } finally {
      setPrompting(false);
    }
  };

  return <GoogleButton onPress={handlePress} loading={loading || prompting} />;
}
