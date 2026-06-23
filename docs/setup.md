# Setup Guide

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20+ | LTS recommended |
| npm | 10+ | Ships with Node 20+ |
| MongoDB | 7+ | Local install or MongoDB Atlas |
| Android SDK | Latest | Via Android Studio command-line tools |
| Firebase project | — | With Authentication (Google Sign-In) enabled |

---

## 1. Clone & Install

```bash
git clone https://github.com/shishir48/Landlord-Reviews.git
cd Landlord-Reviews
```

### Backend

```bash
cd backend
npm install
```

### Mobile (Android)

```bash
cd mobile
npm install
```

### Web App

```bash
cd web
npm install
```

---

## 2. Firebase Project Setup

### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or reuse an existing one)
3. Enable **Authentication** → **Sign-in method** → **Google**

### Get Web App Configuration

1. Project Settings → General → Your apps → Add app → Web
2. Copy the `firebaseConfig` values (`apiKey`, `authDomain`, `projectId`)

### Generate Firebase Admin Credentials

1. Project Settings → Service accounts → Firebase Admin SDK
2. Click **Generate new private key**
3. Save the JSON file — you'll need `project_id`, `client_email`, and `private_key`

### Set Up Google OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials → Create Credentials → OAuth client ID
3. Application type: **Web application**
4. Under **Authorized redirect URIs**, add:
   - `https://auth.firebase.com/__/auth/handler`
   - `https://<project-id>.firebaseapp.com/__/auth/handler`
5. Copy the **Client ID** — this goes into `mobile/.env` as `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

---

## 3. MongoDB Setup

### Option A: Local MongoDB

```bash
# macOS (Homebrew)
brew install mongodb-community
brew services start mongodb-community
# Default URI: mongodb://localhost:27017
```

### Option B: MongoDB Atlas

1. Create a cluster at [cloud.mongodb.com](https://cloud.mongodb.com/)
2. Create a database user (username + password)
3. Whitelist your IP address
4. Get the connection string (e.g. `mongodb+srv://<user>:<pass>@cluster.xxxxx.mongodb.net/`)

---

## 4. Environment Configuration

### Backend (`backend/.env`)

```env
PORT=3000
MONGODB_URI=mongodb://localhost:***@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXX\n-----END PRIVATE KEY-----\n"
```

> **Important:** The `FIREBASE_PRIVATE_KEY` must have `\n` literally in the string (not actual newlines). Firebase Admin SDK replaces `\\n` with actual newlines at runtime (see `config/firebase.js`).

### Mobile (`mobile/constants/Config.ts`)

Edit the config file directly (no `.env`):

```ts
export const Config = {
  API_URL: 'http://10.0.2.2:3000',   // Android emulator
  FIREBASE_API_KEY: 'AIzaSy...',
  FIREBASE_AUTH_DOMAIN: 'your-project.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'your-project-id',
  GOOGLE_WEB_CLIENT_ID: 'xxx.apps.googleusercontent.com',
};
```

> **Note:** For a physical device, use your machine's LAN IP (e.g. `http://192.168.1.5:3000`).

### Web (`web/.env`)

```env
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

---

## 5. Run the Backend

```bash
cd backend
npm run dev
# Starts with nodemon on port 3000
# Verify: curl http://localhost:3000/health → {"ok":true}
```

For production:

```bash
npm start
```

---

## 6. Build & Run the Mobile App

```bash
cd mobile
npx react-native start              # Start Metro bundler (keep this running in a terminal)
```

In another terminal, build and install the APK:

```bash
cd mobile/android && ./gradlew assembleDebug
# APK at: app/build/outputs/apk/debug/app-debug.apk
# Install on emulator:
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 7. Run the Web App

```bash
cd web
npm run dev
# Opens at http://localhost:5173
```

Production build:

```bash
cd web
npm run build
# Output: web/dist/
```

---

## 7. Running Tests

### Backend Tests

```bash
cd backend
npm test
# Runs all test suites with --runInBand --forceExit
# Uses mongodb-memory-server (no real MongoDB needed)
```

The test suite includes:
- **Auth test** — middleware unit tests + `/auth/login` e2e
- **Properties test** — CRUD + search
- **Reviews test** — CRUD + denormalised rating recalculation + duplicate prevention
- **Landlords test** — fuzzy search + create
- **Admin test** — duplicate detection + merge + admin CRUD
- **Utils test** — Levenshtein distance + address normalization

### Run a Single Test File

```bash
npm test -- tests/reviews.test.js
```

---

## 8. Grant Admin Access

Admin flag is set manually. The user must log in first (to create their user document), then:

```bash
cd backend
MONGODB_URI=mongodb://localhost:27017/landlord-reviews node scripts/set-admin.js admin@example.com
```

Or connect directly to MongoDB:

```javascript
db.users.updateOne({ email: "admin@example.com" }, { $set: { isAdmin: true } });
```

---

## 9. Common Issues

### "Firebase ID token verification failed"

- Ensure `FIREBASE_PRIVATE_KEY` has literal `\n` in the `.env` string (the JS code replaces `\\n` with actual newlines)
- Check Firebase project ID matches
- Ensure the mobile app is using the correct Firebase project

### "MongoDB connection refused"

- Ensure MongoDB is running (`brew services start mongodb-community`)
- Check `MONGODB_URI` in backend `.env`
- For Atlas, ensure IP whitelist includes your current IP

### "Google Sign-In not working"

- Ensure OAuth client ID in `mobile/.env` matches the one in Google Cloud Console
- Add redirect URIs to the OAuth client configuration (see section 2 above)
- On web preview, Google Sign-In may not work — test on a simulator or device

### "CORS errors from mobile app"

- Ensure backend is running on the port specified in `EXPO_PUBLIC_API_URL`
- Backend has `cors()` enabled globally

### "Offline reviews not syncing"

- The app syncs on `AppState` change to `'active'` (coming to foreground)
- Ensure `@react-native-community/netinfo` is installed
- Check network connectivity