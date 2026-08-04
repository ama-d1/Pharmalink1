# Google Sign-In Setup

Written for someone who has never touched Google Cloud Console. Follow it top
to bottom; every step says exactly what to click and what to copy.

**Cost: nothing.** Google OAuth for sign-in is free with no per-login charge
and no quota you can exhaust. You do **not** need to enable billing, and you
should not add a payment method. If any screen asks for one, you have wandered
into a different product — back out.

**Time: about 20 minutes**, plus a build.

---

## Before you start: two things that will otherwise confuse you

**1. Google sign-in does not work in Expo Go.** Expo removed its auth proxy in
SDK 48, and the library this app uses (`@react-native-google-signin/google-signin`)
has a native component that Expo Go does not contain. You need a
**development build** (step 7). Phone, email and password sign-in all work in
Expo Go exactly as they do now — only the Google button needs the build.

**2. Android uses the WEB client ID, not the Android one.** This trips up
almost everyone. You must still *create* an Android OAuth client — Google
won't issue a token without one — but the client ID you paste into the app for
Android is the **Web** one. The Android client authorises your app by its
package name and signing certificate; the ID token it hands back is minted for
the web client.

---

## Step 1 — Create a project

1. Go to https://console.cloud.google.com/
2. Sign in with the Google account that should own this app.
3. Click the project dropdown in the top bar (it may say "Select a project").
4. Click **New project**.
5. Name it `PharmaLink`. Leave "Location" as *No organisation*.
6. Click **Create**, then make sure the top bar now shows **PharmaLink**.

## Step 2 — Configure the consent screen

This is the "PharmaLink wants to access your Google Account" panel users see.

1. In the left menu: **APIs & Services → OAuth consent screen**.
2. User type: choose **External**. Click **Create**.
   - *External* just means "not restricted to a Google Workspace org". It's the
     right choice even for a private app.
3. Fill in the required fields only:
   - **App name**: `PharmaLink`
   - **User support email**: your email
   - **Developer contact information**: your email
4. Click **Save and continue**.
5. **Scopes** screen: click **Save and continue** without adding any. The
   default `email`/`profile`/`openid` scopes are automatic and are all this
   app uses.
6. **Test users** screen: click **+ Add users** and add every Google account
   you'll test with, including your own. Click **Save and continue**.
   - While the app is in *Testing* status, **only these accounts can sign in.**
     Anyone else gets "app is blocked". This is the single most common reason
     a correct setup appears broken.
7. Click **Back to dashboard**.

> **Publishing:** you can stay in *Testing* indefinitely for personal use (up
> to 100 test users). Only click **Publish app** when real users need access.
> Because this app requests just email/profile, publishing does **not** require
> Google's security review — that's only for sensitive/restricted scopes.

## Step 3 — Create the Web client

1. **APIs & Services → Credentials**.
2. **+ Create credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Name: `PharmaLink Web`.
5. Leave *Authorised JavaScript origins* and *Authorised redirect URIs* empty —
   the mobile app doesn't use them.
6. Click **Create**.
7. Copy the **Client ID** (ends in `.apps.googleusercontent.com`). Save it
   somewhere as **WEB_CLIENT_ID**. Ignore the client *secret* entirely; this
   app never uses one.

## Step 4 — Create the Android client

1. **+ Create credentials → OAuth client ID**.
2. Application type: **Android**.
3. Name: `PharmaLink Android`.
4. **Package name**: `com.adkusi34.Pharmalink`
   (this is `android.package` in `frontend/app.json` — if you ever change it
   there, you must create a new client here.)
5. **SHA-1 certificate fingerprint**: get it by running, in `frontend/`:

   ```
   npx eas credentials
   ```

   Choose **Android** → your profile → **Keystore: Manage everything...** →
   the SHA-1 fingerprint is printed in the keystore details. Copy it including
   the colons.

   - If EAS hasn't generated a keystore yet, let it create one when prompted.
   - Debug/dev builds use a *different* SHA-1. If you want Google sign-in to
     work in a local debug build too, add that fingerprint as a **second**
     Android OAuth client (same package name, different SHA-1).
6. Click **Create**. You never need to copy this client's ID — see the note at
   the top about Android using the web client ID.

## Step 5 — Create the iOS client

Skip this entirely if you're only shipping Android.

1. **+ Create credentials → OAuth client ID**.
2. Application type: **iOS**.
3. Name: `PharmaLink iOS`.
4. **Bundle ID**: `com.adkusi34.Pharmalink`
   - `frontend/app.json` currently has no `ios.bundleIdentifier`. Add one that
     matches what you type here, or EAS will generate a different value and
     sign-in will fail.
5. Click **Create**.
6. Copy the **Client ID** — save it as **IOS_CLIENT_ID**.

## Step 6 — Paste the IDs into the project

Four places. All four matter.

**a) `frontend/.env`** (create it if it doesn't exist — it's git-ignored):

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<WEB_CLIENT_ID>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<IOS_CLIENT_ID>
```

**b) The repo-root `.env`** (this is the server side, and it is what actually
enforces that a token was issued for *your* app — without it every Google
sign-in is rejected):

```
GOOGLE_OAUTH_CLIENT_IDS=<WEB_CLIENT_ID>,<IOS_CLIENT_ID>
```

Comma-separated, no spaces. Both are needed: Android tokens carry the web
client ID in their `aud` claim, iOS tokens carry the iOS one.

**c) `frontend/app.json`** — **iOS only, skip for Android.** Add this to the
`plugins` array:

```json
[
  "@react-native-google-signin/google-signin",
  { "iosUrlScheme": "com.googleusercontent.apps.<IOS_CLIENT_ID_SUFFIX>" }
]
```

Where `<IOS_CLIENT_ID_SUFFIX>` is the part of your iOS client ID *before*
`.apps.googleusercontent.com`. So `123-abc.apps.googleusercontent.com` becomes
`com.googleusercontent.apps.123-abc`.

> ⚠️ It must be the **two-element array form above**, with the options object.
> `npx expo install` adds this plugin as a bare string
> (`"@react-native-google-signin/google-signin"`), and that is not a harmless
> shorthand — with no options the plugin switches to its **Firebase** mode and
> demands `google-services.json` / `GoogleService-Info.plist`, which this
> project doesn't use. Your build then fails with a missing-Google-Services
> error that has nothing to do with what you were configuring. The bare entry
> was removed from `app.json` on 2026-08-04 for exactly this reason.
>
> **Android needs no plugin entry at all** — autolinking handles it, and the
> non-Firebase branch of this plugin only writes the iOS URL scheme.

**d) `frontend/eas.json`** — only when you make a real EAS build. `.env` files
aren't uploaded to EAS (the root `.gitignore` has `**/.env`, and EAS only
uploads git-tracked files), so the two `EXPO_PUBLIC_GOOGLE_*` values must be
repeated under `build.<profile>.env`, next to the existing
`EXPO_PUBLIC_API_BASE_URL`.

Then restart the backend so it picks up the new variable:

```
docker compose up -d --build auth-service
```

## Step 7 — Make a development build

Google sign-in cannot run in Expo Go. From `frontend/`:

```
npx eas build --profile development --platform android
```

Install the resulting APK on your device, then run `npx expo start` and open
the app from that build instead of Expo Go.

## Step 8 — Test

1. Open the app → **Log In** → **Google**.
2. Pick an account that you added as a **test user** in step 2.
3. You should land on the home screen signed in.

---

## When it doesn't work

| What you see | Cause |
|---|---|
| "Google sign-in needs a development build" | You're in Expo Go. Step 7. |
| "Google sign-in has not been set up for this build yet" | The `EXPO_PUBLIC_GOOGLE_*` values weren't in the environment when the app was bundled. Restart Metro with `npx expo start --clear`; for an EAS build, check step 6d. |
| "Access blocked: PharmaLink has not completed verification" | The account isn't in your test-user list. Step 2.6. |
| `DEVELOPER_ERROR` on Android | The SHA-1 or package name in the Android OAuth client doesn't match the build you're running. A debug build and an EAS build have different SHA-1s — you need a client for each. |
| "Google did not return an ID token" | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is missing or wrong. Android needs the **web** client ID. |
| "This Google sign-in was not issued for PharmaLink" | The backend's `GOOGLE_OAUTH_CLIENT_IDS` doesn't contain the ID the token was minted for. Step 6b, then restart auth-service. |
| Nothing happens / immediate silent return | The account chooser was dismissed. That's treated as a cancel, not an error, by design. |

---

## What this does NOT need

- **No billing account.** If you're asked for a credit card, you're in the
  wrong place.
- **No API to "enable".** People often enable the "Google+ API" or "People
  API" from old tutorials. Sign-in needs neither.
- **No client secret.** The mobile flow never uses one.
- **No Firebase.** It would work, but it only adds another console and SDK on
  top of the same OAuth clients.
