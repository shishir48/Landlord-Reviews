# 🏠 Landlord Reviews (RentRate)

**Honest reviews from real tenants.** A web app + Android app where tenants in India can search rental properties, rate their landlords, and share their tenancy experiences.

Tenants search by property address, identify their landlord, and leave a 1–5 star review with written feedback. The platform handles landlord name deduplication (fuzzy match + admin merge) and works offline — reviews queued without connectivity sync automatically when the device reconnects.

---

## Quick Links

| Document | Description |
|---|---|
| [Setup Guide](setup.md) | Local dev setup — backend + mobile |
| [Architecture](architecture.md) | System design, stack, data flow |
| [API Reference](api.md) | All REST endpoints |
| [Database Schema](database.md) | Data model and indexes |
| [Features](features.md) | Feature documentation and flows |
| [Design Spec](./superpowers/specs/2026-05-28-landlord-reviews-design.md) | Original design specification |

---

## Stack

| Layer | Technology |
|---|---|
| **Web App** | React 19 + Vite 5 + React Router 7 |
| **Mobile (Android)** | React Native 0.86 + bare RN (no Expo) + @react-navigation |
| **Auth** | Firebase Auth — Google Sign-In |
| **Backend** | Node.js + Express 4 |
| **Database** | MongoDB via Mongoose 8 |
| **Admin** | Admin routes through the same Express app (no separate admin UI built yet) |
| **CI/CD** | GitHub Actions |
| **Offline** | Mobile: AsyncStorage · Web: localStorage — review queue, auto-sync on reconnect |

---

## Repository Structure

```
landlord-reviews/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection, Firebase Admin init
│   │   ├── middleware/       # Auth (Firebase ID token), admin-only guard
│   │   ├── models/          # Mongoose schemas (User, Property, Review, Landlord)
│   │   ├── routes/          # Express route handlers
│   │   └── utils/           # Levenshtein distance, address normalization
│   ├── tests/               # Jest + Supertest + mongodb-memory-server
│   └── scripts/             # One-time admin grant script
├── mobile/                  # Bare React Native (no Expo)
│   ├── android/             # Native Android build (Gradle)
│   ├── src/                 # Screen components (Login, Home, Profile, etc.)
│   ├── components/          # StarRating, PropertyCard, LandlordSuggest
│   ├── lib/                 # Auth, API client, offline queue
│   └── constants/           # Color palette, config
├── web/                     # React + Vite web app
│   └── src/
│       ├── pages/           # Page components
│       ├── components/      # Shared UI components
│       └── lib/             # Auth, API client, offline queue
└── docs/                    # Documentation
```

---

### Quickstart

#### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Firebase project with Authentication (Google Sign-In) enabled
- Android SDK (for mobile builds)
- Expo CLI (`npx expo`) is **NOT used** — this is bare React Native

#### Backend

```bash
cd backend
cp .env.example .env     # Fill in your Firebase Admin credentials + MongoDB URI
npm install
npm run dev               # Starts on http://localhost:3000
npm test                  # Runs all backend tests (in-memory MongoDB)
```

#### Mobile (Android)

```bash
cd mobile
npm install
# Edit constants/Config.ts with your Firebase + Google OAuth values
cd android && ./gradlew assembleDebug   # Build debug APK
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

#### Web App

```bash
cd web
npm install
# Create web/.env with VITE_API_URL, VITE_FIREBASE_* values
npm run dev               # Starts on http://localhost:5173
npm run build             # Production build → web/dist/
```

### Grant Admin Access

```bash
cd backend
MONGODB_URI=<uri> node scripts/set-admin.js admin@example.com
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `MONGODB_URI` | MongoDB connection string |
| `FIREBASE_PROJECT_ID` | Firebase Admin project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key |

### Mobile (`mobile/constants/Config.ts`)

Edit `constants/Config.ts` directly:

| Variable | Description |
|---|---|
| `API_URL` | Backend URL (Android emulator: `http://10.0.2.2:3000`, device: your LAN IP) |
| `FIREBASE_API_KEY` | Firebase Web API key |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID (for @react-native-google-signin) |

### Web (`web/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (e.g. `http://localhost:3000`) |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |

---

## GitHub

Repository: [github.com/shishir48/Landlord-Reviews](https://github.com/shishir48/Landlord-Reviews)
