import { Platform } from 'react-native';

// Client IDs from Google Cloud Console → APIs & Services → Credentials.
// EXPO_PUBLIC_* is inlined at build time (Expo's convention for values the
// app bundle may contain). OAuth client IDs are public identifiers by
// design — they are not secrets, unlike a client *secret*, which this flow
// never uses.
//
// The same IDs must also be set server-side as GOOGLE_OAUTH_CLIENT_IDS, which
// is what actually enforces that a token was issued for THIS app. See
// auth-service's GoogleTokenVerifier, and docs/GOOGLE_SIGN_IN_SETUP.md for
// the walkthrough.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export type GoogleSignInResult =
  | { status: 'success'; idToken: string }
  | { status: 'cancelled' }
  /** No client ID configured for this platform. */
  | { status: 'unconfigured' }
  /** Running somewhere the native module doesn't exist — i.e. Expo Go. */
  | { status: 'needsDevBuild' }
  | { status: 'error'; message: string };

/**
 * Whether a client ID exists for the CURRENT platform.
 *
 * Android needs the WEB client ID, not the Android one — that is not a typo.
 * The Android OAuth client authorises the app by package name + signing
 * certificate, but the ID token it returns is minted for the *web* client, so
 * that is what has to be handed to configure() and what appears in the
 * token's `aud`. iOS uses its own iOS client ID for both.
 */
function isGoogleSignInConfigured(): boolean {
  return !!(Platform.OS === 'ios' ? IOS_CLIENT_ID : WEB_CLIENT_ID);
}

// configure() only needs to run once per app launch, but it's cheap and
// idempotent — this flag just avoids repeating it on every button tap.
let configured = false;

/**
 * Loads the native module lazily, inside a try/catch.
 *
 * A top-level `import` would be evaluated as soon as any screen importing
 * this file renders — and in Expo Go the native side of this library does not
 * exist, so that import throws and blanks the screen. (That is exactly how
 * the previous expo-auth-session wiring broke the login screen.) Requiring it
 * only at the moment of an actual sign-in attempt keeps every other path
 * working in Expo Go.
 */
function loadModule(): typeof import('@react-native-google-signin/google-signin') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin');
  } catch {
    return null;
  }
}

/**
 * Runs Google's native sign-in sheet and returns the resulting ID token.
 * Exchanging that token for a PharmaLink session is authService.googleSignIn()'s
 * job — this file deliberately knows nothing about our backend.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!isGoogleSignInConfigured()) {
    return { status: 'unconfigured' };
  }

  const module = loadModule();
  if (!module?.GoogleSignin) {
    return { status: 'needsDevBuild' };
  }

  const { GoogleSignin, statusCodes } = module;

  try {
    if (!configured) {
      GoogleSignin.configure({
        // Required on Android for a non-null idToken, and harmless on iOS.
        webClientId: WEB_CLIENT_ID,
        iosClientId: IOS_CLIENT_ID,
        // We only need identity, never Google APIs on the user's behalf, so
        // no refresh token is requested. Leaving this false also keeps
        // serverAuthCode out of the response entirely.
        offlineAccess: false,
      });
      configured = true;
    }

    // Android-only in practice; resolves immediately elsewhere. Surfaces a
    // Play-Services prompt rather than a cryptic failure on devices that
    // need an update.
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    // Sign out first so the account chooser always appears. Without this the
    // library silently reuses the last account, which makes "wrong account
    // signed in" impossible to recover from inside the app.
    try {
      await GoogleSignin.signOut();
    } catch {
      // Nothing was signed in — expected on the first attempt.
    }

    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      return { status: 'cancelled' };
    }

    const idToken = response.data?.idToken;
    if (!idToken) {
      // Almost always a missing/incorrect webClientId on Android — the sign-in
      // itself succeeds but no ID token is minted.
      return {
        status: 'error',
        message: 'Google did not return an ID token. Check that the web client ID is set correctly.',
      };
    }

    return { status: 'success', idToken };
  } catch (error: any) {
    if (error?.code === statusCodes?.SIGN_IN_CANCELLED) {
      return { status: 'cancelled' };
    }
    if (error?.code === statusCodes?.IN_PROGRESS) {
      return { status: 'error', message: 'A sign-in is already in progress.' };
    }
    if (error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      return { status: 'error', message: 'Google Play Services is not available on this device.' };
    }
    return { status: 'error', message: error?.message || 'Google sign-in failed.' };
  }
}
