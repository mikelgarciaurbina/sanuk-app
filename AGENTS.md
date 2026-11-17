This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

For the Eco audio issue reported on November 17, 2026, keep debugging and validation local. The user explicitly asked not to generate EAS builds or upload to TestFlight during this review because the monthly build quota is limited. Verify the complete recording → Noi → recorded voice flow in the simulator; a generated WAV played in isolation is insufficient. The user confirmed hearing their voice in the simulator on November 17; validation on the physical iPhone with the new code is still pending. Do not initiate another EAS build or submission as part of this review.

After confirming the simulator result, the user explicitly requested build 5 and its upload to TestFlight on November 17, 2026. That specific build and submission are authorized; the earlier restriction applied to the local debugging phase.

Build 5 did not fix it on the iPhone. Later on November 17 the cause was found and fixed with local cable installs (see the README and the section below): the user confirmed on the physical iPhone 16 Pro that their voice in Eco now matches Noi's. That confirmation is for the local Release build. The user subsequently explicitly requested build 6 and its upload to TestFlight with those changes. That build and submission are authorized. iOS autolinking builds `expo-audio` from source so its native patch is included in the cloud build.

Build 6 was generated once and uploaded successfully on November 17. App Store Connect reports it as `VALID` and `IN_BETA_TESTING`. The EAS Xcode log confirms that `AudioStream.swift` compiled from the patched module sources. Listening validation of the TestFlight distribution is still pending; do not describe the earlier local device confirmation as a TestFlight check.

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Testing on a physical iPhone without EAS

Audio session behavior (microphone mode, ducking, output level) cannot be judged in the simulator. To hear a change on the device without spending EAS builds, install a local Release build over the cable. `ios/` is generated and git-ignored; `expo prebuild` rewrites the `android`/`ios` scripts in `package.json`, so restore that file afterwards.

```bash
npx expo prebuild --platform ios
cd ios && xcodebuild -workspace Sanuk.xcworkspace -scheme Sanuk -configuration Release -destination 'id=<device udid>' DEVELOPMENT_TEAM=54RSVZ573J CODE_SIGN_STYLE=Automatic -allowProvisioningUpdates -allowProvisioningDeviceRegistration build
xcrun devicectl device install app --device <device udid> ~/Library/Developer/Xcode/DerivedData/Sanuk-*/Build/Products/Release-iphoneos/Sanuk.app
```

This needs the iPhone connected, unlocked and in Developer Mode, and the owner's Apple account signed in to Xcode. It installs over the TestFlight build with the same bundle identifier and keeps the app's data. Recordings made by Eco can be read back for measurement with `xcrun devicectl device copy from --domain-type appDataContainer --domain-identifier app.sanuk.thai --source Library/Caches/AudioStream/<file>`; they are the owner's voice, so measure and delete, never keep or commit them.

## Rules

- `expo-audio` is patched (`patches/expo-audio+<version>.patch`, applied by `patch-package` on `postinstall` and again by `eas-build-post-install`): `AudioStream` must open the microphone with `mode: .default`, not `.measurement`. Never remove the patch or the two scripts. After upgrading `expo-audio`, re-apply the one-line change, regenerate with `npx patch-package expo-audio`, and have Eco checked by ear on a physical iPhone.

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
