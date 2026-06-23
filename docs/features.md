# Features

## Current Features (MVP)

### 1. Google Sign-In Authentication

Tenants authenticate using their Google account. Firebase Auth manages the identity lifecycle.

- **Mobile:** `@react-native-google-signin/google-signin` — native Google Sign-In dialog. Exchanges idToken for Firebase credential.
- **Web:** Firebase `signInWithPopup` with Google provider.
- **Backend:** Firebase Admin SDK verifies the ID token on every API request
- **Persistence:** User document created in MongoDB on first login (Firebase UID as `_id`)
- **Auth Guard:** `App.tsx` listens to `onAuthStateChanged`; redirects unauthenticated users to LoginScreen/LoginPage

**Screens:**
- `LoginScreen.tsx` / `LoginPage.tsx` — Google Sign-In button, app name "RentRate", tagline "Honest reviews from real tenants"
- `App.tsx` — Auth state listener, route guard logic

---

### 2. Property Search

Search rental properties by address substring.

- **Entry:** Home screen search bar
- **Backend:** Case-insensitive regex match on `formatted_address`
- **Trigger:** Minimum 3 characters typed
- **Results:** Up to 20 matching properties displayed as `PropertyCard` components
- **Empty state:** "Search an address to find reviews"

**Components:**
- `home.tsx` — `TextInput` search + `FlatList` of results
- `PropertyCard.tsx` — Card shows address, star rating, review count, landlord name

---

### 3. Add Review Flow

The core user flow: find a property, rate your landlord, write about your experience.

**Steps:**

1. **Address** — Manual address entry (or pre-selected from search). The app calls `POST /properties` to find-or-create the property in the database.

2. **Landlord name** (optional) — Debounced text input with fuzzy search suggestions as the tenant types. Existing landlords appear in a dropdown ranked by Levenshtein distance. If no match, typing a new name creates a new landlord entry.

3. **Rating** — Tappable 1–5 star selector (gold stars for active, grey for inactive).

4. **Review text** — Multi-line text input.

5. **Tenancy period** (optional) — Free-text "From" and "To" date fields (e.g. "Jan 2023").

6. **Submit** — `POST /reviews` creates the review and updates the property's average rating. On success, navigates back. On 409 (duplicate), shows "Already reviewed" alert. On network error, queued locally for offline sync.

**Screens:**
- `/review/add.tsx` — Full review form
- `LandlordSuggest.tsx` — Debounced landlord autocomplete component
- `StarRating.tsx` — Reusable 1–5 star component (input or display mode)

---

### 4. Property Detail Page

Shows property information, aggregated rating, and all tenant reviews.

- **Hero section:** Address, landlord name, big rating number, star rating visual
- **Write a Review button:** Navigates to add-review flow with property pre-selected
- **Review list:** Chronological list (newest first) of all reviews
- **Empty state:** "No reviews yet. Be the first!"
- **Loading state:** Activity indicator while data loads

**Screen:** `/property/[id].tsx`

---

### 5. Offline Review Queue

Reviews submitted without internet are queued locally and auto-submitted when connectivity returns.

- **Storage:** AsyncStorage with key `offline_review_queue`
- **Detection:** Network error on `POST /reviews` triggers `queueReview()` instead of raising an error
- **Sync trigger:** `AppState` change to `'active'` (app comes to foreground)
- **Sync logic:** `syncOfflineReviews()` — checks NetInfo, iterates queue, drops 409s
- **User feedback:** "Saved offline — your review will be submitted when you reconnect"

**Module:** `lib/offline.ts`

---

### 6. Profile & Sign Out

Simple profile screen showing the user's Google display name and email, with a sign-out button.

**Screen:** `profile.tsx`

---

### 7. Landlord Deduplication

Two-layer deduplication keeps landlord data clean without burdening tenants.

**Tenant layer:**
- Debounced `GET /landlords/search?q=` as tenant types
- Levenshtein distance ranks results by similarity
- Top 3 matches shown with name suggestions
- Tenant can pick existing or create new

**Admin layer:**
- `GET /admin/landlords/duplicates` — pairwise Levenshtein comparison of all canonical landlords
- Pairs within threshold (≤4 distance) returned sorted by similarity
- `POST /admin/landlords/merge` — sets `merged_into` on duplicates + re-points property references

**Utils:** `levenshtein.js` — pure function, case-insensitive

---

### 8. Admin Management

Lightweight admin functionality for moderation and data quality.

- **Duplicate detection:** Identify similar landlord names for review
- **Merge landlords:** Consolidate duplicate entries into a canonical record
- **Browse properties:** List all properties with landlord info
- **Delete reviews:** Remove abusive or inappropriate reviews

**Routes:** All under `/admin/*` with `adminOnly` middleware

**Admin bootstrap:** Run `node scripts/set-admin.js <email>` after the user has logged in once.

---

## Planned / Future Features

| Feature | Status | Notes |
|---|---|---|
| Google Places Autocomplete | Not implemented | Currently manual address entry only; client-side Places Autocomplete was part of the original design but not built in MVP |
| Admin Web UI | Not implemented | Admin endpoints exist but there's no frontend — accessible via curl/Postman |
| Sub-ratings | Deferred | Responsiveness, Maintenance, Value sub-scores (shown in original design mockup) |
| Property photos | Not implemented | Photo upload from tenant reviews |
| Flag/vote reviews | Not implemented | Community moderation |
| Landlord response | Not implemented | Landlord accounts and reply functionality |
| Push notifications | Not implemented | Notify when a property gets a new review |
| Search by landlord | Not implemented | Currently address-only search |
| EAS builds | Pending | Store-ready APK/IPA via EAS Build |
| Detox E2E tests | Pending | Named in design spec but not implemented |
| Web app | Not implemented | Originally considered as admin dashboard |

---

## Edge Cases & Behaviour

| Scenario | User Experience |
|---|---|
| Property not found in search | Empty state: "Search an address to find reviews" |
| No reviews for a property | "No reviews yet. Be the first!" CTA on detail page |
| Duplicate review attempt (same user + property) | HTTP 409 → "Already reviewed" alert |
| Network failure during submit | Queued to AsyncStorage → "Saved offline" alert → auto-sync on reconnect |
| Landlord not found during search | Empty suggestions dropdown → type new name → creates landlord on submit |
| Firebase token expired | API returns 401 → user redirected to login screen |
| Non-admin accessing admin route | 403 → not shown in mobile app (no admin UI in mobile) |
| Multiple users review same property | Allowed — one review per user. Reviews list shows all reviews |