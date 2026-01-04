# FitFlow Mobile App

React Native mobile app built with Expo for the FitFlow AI health tracking platform.

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app on your mobile device (for development)

## Setup

1. **Install dependencies**
   ```bash
   cd mobile
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Supabase credentials and API URL.

3. **Start development server**
   ```bash
   npm start
   ```

4. **Run on device**
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth screens (login, onboarding)
│   ├── (tabs)/            # Main app tabs (dashboard, meals, chat, profile)
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry redirect
├── src/
│   ├── lib/               # Utilities and API clients
│   │   ├── api.ts         # Axios API client
│   │   ├── supabase.ts    # Supabase client with SecureStore
│   │   ├── storage.ts     # MMKV offline storage
│   │   └── utils.ts       # Helper functions
│   ├── store/             # Zustand state management
│   │   └── useStore.ts
│   └── theme/             # Design tokens
│       ├── colors.ts
│       ├── typography.ts
│       └── index.ts
├── assets/                # Images, icons, fonts
├── app.json               # Expo configuration
├── tailwind.config.js     # NativeWind config
└── package.json
```

## Features

- 🔐 Supabase authentication with secure token storage
- 📊 Dashboard with calorie tracking and daily stats
- 🎨 NativeWind (TailwindCSS) styling with dark theme
- 📱 Bottom tab navigation
- 💾 MMKV offline storage for data persistence
- 🔄 Zustand state management with persistence
- 📶 Network status detection

## Development Notes

- Uses Expo Router for file-based navigation
- NativeWind v4 for TailwindCSS-like styling
- MMKV replaces IndexedDB for fast key-value storage
- expo-secure-store for secure authentication token storage
