# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│              Web App (React + Vite)                  │
│  React 19 · React Router 7 · Firebase Auth           │
│                                                      │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Auth (Firebase│  │ API Client│  │ Offline Queue │  │
│  │ Google Sign-In│  │ (Axios)  │  │ (localStorage)│  │
│  └──────┬──────┘  └────┬─────┘  └───────┬───────┘  │
│         │              │                 │          │
└─────────┼──────────────┼─────────────────┼──────────┘
          │              │                 │
┌─────────────────────────────────────────────────────┐
│            Mobile App (bare React Native)             │
│  RN 0.86 · @react-navigation · GoogleSignIn           │
│                                                      │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Auth (Firebase│  │ API Client│  │ Offline Queue │  │
│  │ Google Sign-In│  │ (Axios)  │  │ (AsyncStorage)│  │
│  └──────┬──────┘  └────┬─────┘  └───────┬───────┘  │
│         │              │                 │          │
│         │     Firebase ID Token (Bearer) │          │
└─────────┼──────────────┼─────────────────┼──────────┘
          │              │                 │
          └──────────────┼─────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Node.js / Express Backend                │
│                                                      │
│  ┌──────────────┐  Middleware Stack                  │
│  │  CORS        │                                    │
│  │  JSON Parser │                                    │
│  │  Auth        │  ← verify Firebase ID token        │
│  │  Admin Only  │  ← check isAdmin flag (opt-in)     │
│  └──────┬───────┘                                    │
│         │                                            │
│  ┌──────┴─────────────────────────────┐              │
│  │           Route Handlers           │              │
│  │  POST /auth/login  ...             │              │
│  └──────┬─────────────────────────────┘              │
│         │                                            │
│  ┌──────┴──────────────┐                             │
│  │   Mongoose ODM      │                             │
│  └──────┬──────────────┘                             │
└─────────┼────────────────────────────────────────────┘
│  - Issues Firebase ID tokens after Google sign-in    │
│  - Mobile app injects token into every API request   │
│  - Backend verifies token via Firebase Admin SDK     │
└─────────────────────────────────────────────────────┘
          │
          │  HTTPS (REST JSON)
          ▼
┌─────────────────────────────────────────────────────┐
│              Node.js / Express Backend                │
│                                                      │
│  ┌──────────────┐  Middleware Stack                  │
│  │  CORS        │                                    │
│  │  JSON Parser │                                    │
│  │  Auth        │  ← verify Firebase ID token        │
│  │  Admin Only  │  ← check isAdmin flag (opt-in)     │
│  └──────┬───────┘                                    │
│         │                                            │
│  ┌──────┴─────────────────────────────┐              │
│  │           Route Handlers           │              │
│  │                                    │              │
│  │  POST /auth/login                  │              │
│  │  POST /properties  GET /properties │              │
│  │  POST /reviews     GET /reviews    │              │
│  │  PUT /reviews/:id  DELETE /reviews │              │
│  │  POST /landlords   GET /landlords  │              │
│  │  (admin) admin/landlords/...       │              │
│  └──────┬─────────────────────────────┘              │
│         │                                            │
│  ┌──────┴──────────────┐                             │
│  │   Mongoose ODM      │                             │
│  └──────┬──────────────┘                             │
└─────────┼────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────┐
│                 MongoDB                       │
│                                              │
│  Collections:                                │
│  ┌──────────┐  ┌──────────┐                 │
│  │ users    │  │ properties│                 │
│  ├──────────┤  ├──────────┤                 │
│  │ _id (uid)│  │ place_id │                 │
│  │ email    │  │ address  │                 │
│  │ isAdmin  │  │ landlord │                 │
│  └──────────┘  │ avg_r.   │                 │
│                └─────┬────┘                 │
│  ┌──────────┐  ┌─────┴────┐                 │
│  │ reviews  │  │landlords │                 │
│  ├──────────┤  ├──────────┤                 │
│  │ property │  │ name     │                 │
│  │ user     │  │ aliases  │                 │
│  │ rating   │  │ merged   │                 │
│  │ text     │  └──────────┘                 │
│  └──────────┘                               │
└──────────────────────────────────────────────┘
```

---

## Design Decisions

### Address-First Entry (Not Landlord-First)

The app is organised around **properties**, not landlords. Tenants search by address because that's the information they know for certain. Landlord names are secondary — fuzzy-matched at review time. This avoids the cold-start problem of "search for a landlord who doesn't exist yet."

### Denormalised Ratings

`avg_rating` and `review_count` are stored directly on the `Property` document and recalculated atomically on every review write (create, update, delete). An aggregation pipeline recomputes the values, then a single `findByIdAndUpdate` writes them:

```js
// On every review write:
const [agg] = await Review.aggregate([
  { $match: { property_id } },
  { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
]);
await Property.findByIdAndUpdate(property_id, {
  avg_rating: agg ? Math.round(agg.avg * 10) / 10 : 0,
  review_count: agg ? agg.count : 0,
});
```

This eliminates N+1 queries for listing pages while remaining consistent because writes are serialised per-property (one review per user).

### Offline-First Reviews

The mobile app stores queued reviews in AsyncStorage. When the app comes to the foreground, `syncOfflineReviews()` checks connectivity (via NetInfo) and submits pending reviews. The queue drops 409s (already reviewed) since those have already been persisted server-side.

### Landlord Deduplication

Two layers:

1. **Tenant-side (at review time):** Debounced fuzzy search as the tenant types the landlord name. Top 3 Levenshtein-ranked matches shown as suggestions. Tenant can select an existing landlord or create a new entry.
2. **Admin-side:** `GET /admin/landlords/duplicates` returns landlord name pairs within a similarity threshold. Admin picks a canonical entry and merges duplicates — `merged_into` flag is set on duplicate records, and `property.landlord_id` references are re-pointed to the canonical ID.

### Firebase Auth

- **Mobile:** `@react-native-google-signin/google-signin` for native Google Sign-In. Exchanges the Google idToken for a Firebase credential via `signInWithCredential`. `onAuthStateChanged` drives the auth guard in `App.tsx`.
- **Web:** Firebase `signInWithPopup` with Google provider. Same auth guard pattern.
- **Backend:** Firebase Admin SDK verifies the ID token on every request via `verifyToken` middleware. No session management — purely stateless JWT verification.

---

## Route Map

| Base Path | Middleware | Router File |
|---|---|---|
| `/auth` | `verifyToken` | `routes/auth.js` |
| `/properties` | `verifyToken` | `routes/properties.js` |
| `/reviews` | `verifyToken` | `routes/reviews.js` |
| `/landlords` | `verifyToken` | `routes/landlords.js` |
| `/admin` | `verifyToken` + `adminOnly` | `routes/admin.js` |
| `/health` | None | Inline in `app.js` |

---

## Mobile Navigation Structure

```
App.tsx
├── SafeAreaProvider
│   ├── StatusBar
│   └── AppNavigator
│       ├── [unauthenticated]
│       │   └── LoginScreen
│       └── [authenticated]
│           ├── MainTabs (bottom tab navigator)
│           │   ├── HomeTab → HomeScreen
│           │   └── ProfileTab → ProfileScreen
│           ├── PropertyDetail (native stack)
│           └── AddReview (native stack)
```

## Web Navigation Structure

```
App.tsx (BrowserRouter)
├── [unauthenticated]
│   └── / → LoginPage
├── [authenticated]
│   ├── / → Layout + HomePage
│   ├── /profile → Layout + ProfilePage
│   ├── /property/:id → Layout + PropertyDetailPage
│   └── /review/add → AddReviewPage (no nav bar)
└── * → Redirect to /
```

---

## Data Flow: Add Review

```
1. User taps "Add Review"                      → /review/add.tsx
2. User types address                          → (manual entry or pre-selected)
3. POST /properties { place_id, address }      → Backend upserts property
4. Types landlord name                         → GET /landlords/search?q= → fuzzy matches
5. Selects landlord (or types new)             → POST /landlords (if new)
6. Picks rating, writes text, optional dates
7. POST /reviews { property_id, rating, text } → Creates review + recalculates avg_rating
   │
   ├── 409 (duplicate)                         → Alert: already reviewed
   ├── Network error                           → Queue locally in AsyncStorage
   └── 201 (success)                           → Navigate back
```

---

## Data Flow: Offline Sync

```
1. App comes to foreground                     → AppState 'active' event
2. syncOfflineReviews()                        → Read AsyncStorage queue
3. NetInfo.fetch()                             → Check connectivity
4. For each queued review:
   ├── POST /reviews (success)                 → Drop from queue
   ├── POST /reviews (409)                     → Already on server, drop from queue
   └── POST /reviews (other error)             → Keep in queue, retry next time
5. Write remaining queue back to AsyncStorage
```

---

## Error Handling Strategy

| Layer | Error | Behaviour |
|---|---|---|
| Backend | Missing/invalid Firebase token | 401, `{ error: 'Missing token' }` or `'Invalid token'` |
| Backend | Not admin (admin route) | 403, `{ error: 'Admin only' }` |
| Backend | Duplicate review (unique index) | 409, `{ error: 'Already reviewed' }` |
| Backend | Missing required fields | 400 with specific error message |
| Backend | Internal errors | 500, `{ error: 'Internal server error' }` |
| Backend | Property not found | 404, `{ error: 'Not found' }` |
| Mobile | Network error on review submit | Queue locally, show "Saved offline" alert |
| Mobile | 409 on review submit | Show "Already reviewed" alert |