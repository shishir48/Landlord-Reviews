# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.



dont put claude as coauther or contributor anywhere.

github repo - https://github.com/shishir48/Landlord-Reviews

|you are a senior developer of 20+ years experience .

---

## Project: Landlord Reviews (RentRate)

**Backend:** Express 4 · MongoDB/Mongoose 8 · Firebase Admin SDK
**Mobile (Android):** React Native 0.86 · bare RN (no Expo) · @react-navigation · @react-native-google-signin
**Web:** React 19 · Vite 5 · React Router 7 · Firebase Auth
**GitHub:** https://github.com/shishir48/Landlord-Reviews

### Backend Conventions

- All API routes (except `/health`) require Firebase ID token in `Authorization: Bearer <token>` header
- Tests use Jest + Supertest with `mongodb-memory-server` — no real MongoDB needed for testing
- Firebase Admin SDK is **mocked in tests** — see `tests/setup.js` for the mock pattern
- `avg_rating` and `review_count` are **denormalised on Property** — recalculated atomically on every review write via aggregation pipeline
- Unique index on `(property_id, user_id)` enforces one review per user per property (409 on violation)
- Landlord dedup via Levenshtein fuzzy search (tenant-side) + admin merge endpoint (sets `merged_into` + re-points property refs)

### Mobile Conventions (bare React Native — NO Expo)

- `App.tsx` is the root — `SafeAreaProvider` > `NavigationContainer` > `Stack.Navigator`
- Navigation: `@react-navigation/native` + `native-stack` + `bottom-tabs`
- Auth: `@react-native-google-signin/google-signin` → Firebase credential
- API client (`lib/api.ts`) auto-injects Firebase ID token on every request
- Offline review queue in AsyncStorage (`lib/offline.ts`) — syncs on app foreground
- Colors in `constants/Colors.ts`: primary `#4f46e5`, bg `#f8fafc`, card `#ffffff`
- Screen files in `src/` — `LoginScreen`, `HomeScreen`, `ProfileScreen`, `PropertyDetailScreen`, `AddReviewScreen`
- Build: `cd mobile/android && ./gradlew assembleDebug`

### Web Conventions

- React 19 + Vite 5 + React Router 7 — `web/` directory
- Auth: Firebase `signInWithPopup` (Google provider)
- API client (`web/src/lib/api.ts`) auto-injects Firebase ID token
- CSS in `src/index.css` — no CSS-in-JS or Tailwind
- Build: `cd web && npm run build`

### If you need to:

- **Run backend tests:** `cd backend && npm test`
- **Run a single test:** `cd backend && npm test -- tests/reviews.test.js`
- **Start backend:** `cd backend && npm run dev`
- **Build Android APK:** `cd mobile/android && ./gradlew assembleDebug`
- **Build web:** `cd web && npm run build`
- **Check docs:** See `docs/` for README, setup, architecture, API, database, features

### Architecture (at a glance)

```
Mobile (RN bare) ──┐
                   ├── Firebase Auth → REST API (Express) → MongoDB
Web (React/Vite) ──┘       │
                            └── Firebase Admin SDK (token verification)
     │                              │
     ├── Mobile: offline queue (AsyncStorage)
     └── Web: offline queue (localStorage)
```

Entities: User, Property, Review, Landlord. Landlord dedup uses `merged_into` self-ref pattern.

