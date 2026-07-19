# HomeRepairApp

An iOS app (Expo SDK 52 / React Native 0.76) that lets a user chat with the HomeRepairAgent backend about home repair issues — with photos, and voice input/output.

## Features

- Sign in with Apple
- Chat interface with photo attachments
- Voice input (speech-to-text) and spoken responses (text-to-speech)

## Requirements

- Node.js and npm
- Xcode (with a physical iPhone or simulator) for iOS builds
- CocoaPods (`sudo gem install cocoapods` if not already installed)
- An Apple Developer account for Sign in with Apple / device installs

## Setup

```bash
npm install
cd ios && pod install && cd ..
```

## Running the app

Start the Metro bundler:

```bash
npx expo start
```

Build and install onto a connected iPhone via Xcode:

```bash
npm run ios
```

Or build for Android:

```bash
npm run android
```

Since this project has a native `ios/` project (not pure Expo Go), after adding or updating any native module you must rebuild and reinstall from Xcode (open `ios/HomeRepair.xcworkspace`, not the `.xcodeproj`) for the change to take effect on a device — reloading JS alone is not enough.

## Project structure

```
App.tsx                    Root component (SafeAreaProvider + AuthProvider + Auth/Chat screen switch)
index.js                   Entry point
src/
  context/AuthContext.tsx  Auth state, sign in/out, token refresh
  services/api.ts          API calls: upload URL, S3 upload, chat
  screens/
    AuthScreen.tsx         Sign in with Apple
    ChatScreen.tsx         Chat list + input
  components/
    ChatInput.tsx          Text input, photo picker, voice input
    MessageBubble.tsx      Chat bubble, with text-to-speech playback for assistant replies
  types/index.ts           Shared TypeScript types
ios/                        Native iOS project (CocoaPods-managed)
```

## Backend / API contract

The app talks to `https://api.homerepairsus.com`. Every request after sign-in carries an Apple identity token as `Authorization: Bearer <token>`.

- `POST /upload-url` → `{ uploadUrl, imageKey }` — presigned S3 URL for uploading a photo
- `PUT <uploadUrl>` — upload the image directly to S3
- `POST /chat` with `{ message, sessionId?, imageKey? }` → `{ response, sessionId }`

Apple identity tokens expire after 10 minutes; the app re-authenticates silently on a 401 and retries the request once.

## Building for distribution

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) (see `eas.json`):

```bash
eas build --profile development-device --platform ios   # dev client for a physical device
eas build --profile preview --platform ios               # internal distribution
eas build --profile production --platform ios            # App Store
```

Set your own EAS project ID in `app.json` under `expo.extra.eas.projectId` before running builds.
