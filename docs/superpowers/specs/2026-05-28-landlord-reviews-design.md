# Landlord Reviews App — Design Spec

**Date:** 2026-05-28
**Status:** Approved

---

## Overview

Mobile app where tenants can add rental properties, rate them 1–5 stars, and leave written reviews. Focuses on address-first entry (not landlord-first), with landlord deduplication handled via tenant fuzzy-match and admin merge.

---

## Stack

| Layer | Choice |
|---|---|
| Mobile | React Native + Expo (local builds; EAS only for store releases) |
| Auth | Firebase Auth — Google Sign-In only |
| Backend | Node.js + Express |
| Database | MongoDB |
| Address | Google Places API (client-side autocomplete) |
| Admin dashboard | Simple web UI served by the same Express app |

---

## Architecture

```
Mobile App (RN/Expo)
    │
    ├── Firebase Auth → Google Sign-In → Firebase ID token
    │
    └── REST API calls (Authorization: Bearer <firebase-id-token>)
              │
         Node.js / Express
              │
         ├── Verify token via Firebase Admin SDK (middleware)
         ├── /properties   — upsert by place_id, search
         ├── /reviews      — create, list, one-per-user constraint
         ├── /landlords    — create, fuzzy search, merge (admin only)
         └── MongoDB
```

All API routes require a valid Firebase token. Admin routes additionally require `isAdmin: true` on the user document.

---

## Data Model

```js
// properties
{
  _id: ObjectId,
  place_id: String,          // Google Places ID — unique index; null for manual entries
  formatted_address: String,
  lat: Number,
  lng: Number,
  landlord_id: ObjectId,     // nullable
  avg_rating: Number,        // denormalized; updated atomically on each review write
  review_count: Number,
  createdBy: String,         // Firebase UID
  createdAt: Date
}

// reviews
{
  _id: ObjectId,
  property_id: ObjectId,
  user_id: String,           // Firebase UID
  rating: Number,            // 1–5
  text: String,
  tenancy_period: {
    from: Date,              // optional
    to: Date                 // optional
  },
  createdAt: Date
}
// Unique index: { property_id: 1, user_id: 1 }

// landlords
{
  _id: ObjectId,
  name: String,
  aliases: [String],         // normalized name variants from tenant input
  merged_into: ObjectId,     // null = canonical; non-null = redirect to this ID
  createdAt: Date
}

// users
{
  _id: String,               // Firebase UID
  email: String,
  displayName: String,
  isAdmin: Boolean,
  createdAt: Date
}
```

---

## API Endpoints

```
POST   /auth/login              Create or update user record from Firebase token

GET    /properties?place_id=    Fetch property by place_id
GET    /properties/search?q=    Full-text search by address string
POST   /properties              Upsert property by place_id

GET    /reviews?property_id=    List reviews for a property
POST   /reviews                 Create review (409 if duplicate user+property)
PUT    /reviews/:id             Edit own review
DELETE /reviews/:id             Delete own review

GET    /landlords/search?q=     Fuzzy search landlord names (top 3 results)
POST   /landlords               Create new landlord

# Admin only
GET    /admin/landlords/duplicates    List landlords with high name similarity
POST   /admin/landlords/merge         { canonicalId, duplicateIds[] }
GET    /admin/properties              Browse all properties
DELETE /admin/reviews/:id             Remove abusive review
```

---

## Core Flows

### Add Property + Review (single flow)

1. Tenant taps "Add Review"
2. Types address → Google Places autocomplete
3. Selects result → `place_id` + `formatted_address` captured client-side
4. `POST /properties { place_id }` → backend upserts (find-or-create)
5. Types landlord name → debounced `GET /landlords/search?q=` → top 3 fuzzy matches
6. Tenant selects existing landlord or confirms new name
7. Picks 1–5 stars, writes review text, sets optional tenancy period dates
8. `POST /reviews` → saved; `avg_rating` and `review_count` updated atomically via `$inc`/`$set`

### Search

1. User types in search bar
2. Google Places Autocomplete returns address suggestions
3. User selects → `GET /properties?place_id=XYZ`
4. Found → navigate to property detail
5. Not found → prompt "Be the first to review this property"

### Landlord Deduplication

**Tenant side (at review time):**
- Debounced fuzzy search as tenant types landlord name
- Top 3 matches shown with property count
- Tenant selects existing or creates new

**Admin side:**
- Dashboard lists landlord pairs with Levenshtein distance below threshold
- Admin selects canonical + duplicates → `POST /admin/landlords/merge`
- Backend sets `merged_into` on duplicates, re-points all `property.landlord_id` to canonical ID

---

## Visibility & Access

- Reviews readable only by logged-in users (all API routes require Firebase token)
- Any logged-in user can add a property or review
- One review per user per property — enforced by unique DB index; 409 returns "edit your existing review" prompt
- Admin flag set manually in DB; no self-serve admin signup

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Property not in Google Places | Manual address entry fallback; dedup by normalized address string — lowercase, trim whitespace, strip punctuation (no `place_id`) |
| Duplicate review | 409 → app shows "Update your existing review" |
| Landlord name unmatched | Creates new landlord; admin merges later |
| Firebase token expired | 401 → app silently refreshes token, retries once |
| Offline | Queue review locally via AsyncStorage; sync on reconnect |

---

## Admin Panel

Lightweight web UI served by the Express app (not part of mobile app).

- List landlords flagged as potential duplicates
- Merge UI: pick canonical, select duplicates, confirm
- Browse all properties (flag / remove bad entries)
- Delete abusive reviews

First admin bootstrapped manually via a one-time DB script.

---

## Testing

- **Backend:** Jest + Supertest; real MongoDB via `mongodb-memory-server` (no DB mocking)
- **Auth middleware:** Firebase Admin SDK mocked only in unit tests for the middleware itself
- **Frontend:** Detox E2E for the add-review golden path
- Sub-ratings (Responsiveness, Maintenance, Value) are excluded from MVP. The design mockup shows them as a placeholder for a future iteration. MVP review has only: `rating`, `text`, `tenancy_period`.
