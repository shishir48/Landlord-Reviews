# Database Schema

## Overview

MongoDB with Mongoose ODM. The database uses four collections: `users`, `properties`, `reviews`, and `landlords`.

Default database name: `landlord-reviews` (configurable via `MONGODB_URI`).

---

## Users (`users`)

Tracks Firebase-authenticated users and admin status.

```javascript
{
  _id: String,                    // Firebase UID (not auto-generated — set explicitly)
  email: { type: String, required: true },
  displayName: String,            // From Google profile
  isAdmin: { type: Boolean, default: false },
  createdAt: Date                 // Auto (timestamps: true)
}

// No default indexes beyond _id
```

**Key behaviours:**
- `_id` is explicitly set to the Firebase UID (not auto-generated ObjectId)
- Created via `$setOnInsert` on first login — the document is never modified by subsequent logins
- `isAdmin` defaults to `false`; set to `true` manually via `scripts/set-admin.js` or direct DB update

---

## Properties (`properties`)

Represents a rental property/address.

```javascript
{
  _id: ObjectId,
  place_id: {                     // Google Places ID
    type: String,
    unique: true,
    sparse: true                  // Allows multiple null values (manual entries)
  },
  formatted_address: {            // Full address string from Google Places or user input
    type: String,
    required: true
  },
  normalized_address: String,     // Lowercased, trimmed, punctuation-stripped version
  lat: Number,                    // Latitude (from Google Places)
  lng: Number,                    // Longitude
  landlord_id: {                  // Reference to Landlord
    type: ObjectId,
    ref: 'Landlord',
    default: null
  },
  avg_rating: {                   // Denormalised — recalculated on each review write
    type: Number,
    default: 0
  },
  review_count: {
    type: Number,
    default: 0
  },
  createdBy: String,              // Firebase UID of the user who added this property
  createdAt: Date                 // Auto (timestamps: true, updatedAt: false)
}

// Indexes:
// { place_id: 1 } — unique, sparse (allows null)
```

**Deduplication strategy:**
1. If `place_id` is provided: find by unique `place_id` index → return existing or create new
2. If no `place_id` (manual entry): find by `normalized_address` → return existing or create new
3. `normalized_address` is computed client-side and server-side via `normalizeAddress(str)`:
   - Lowercase → trim whitespace → strip non-alphanumeric (except spaces) → collapse whitespace

---

## Reviews (`reviews`)

A tenant's 1–5 star review for a property. One review per user per property.

```javascript
{
  _id: ObjectId,
  property_id: {                  // Reference to Property (required)
    type: ObjectId,
    ref: 'Property',
    required: true
  },
  user_id: {                      // Firebase UID of reviewer (required)
    type: String,
    required: true
  },
  rating: {                       // 1–5 integer rating
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  text: {                         // Free-text review content
    type: String,
    required: true
  },
  tenancy_period: {               // Optional tenancy duration
    from: Date,                   // Start of tenancy
    to: Date                      // End of tenancy
  },
  createdAt: Date                 // Auto (timestamps: true, updatedAt: false)
}

// Indexes:
// { property_id: 1, user_id: 1 } — unique (one review per user per property)
```

**Key behaviours:**
- **Unique compound index** on `(property_id, user_id)` enforces one review per user per property. Violation returns a MongoDB error code `11000`, which the route handler translates to HTTP `409`
- **Rating recalculation:** Every create/update/delete triggers a MongoDB aggregation that recomputes `avg_rating` (rounded to 1 decimal) and `review_count` on the parent Property document
- Reviews have no `updatedAt` timestamp (only `createdAt`)

---

## Landlords (`landlords`)

Represents a landlord who owns/manages one or more properties. Supports deduplication via fuzzy matching and admin merge.

```javascript
{
  _id: ObjectId,
  name: {                         // Display name (e.g. "John Davidson")
    type: String,
    required: true
  },
  aliases: [String],              // Normalized name variants (e.g. ["john davidson"])
  merged_into: {                  // null = canonical entry
    type: ObjectId,
    ref: 'Landlord',
    default: null
  },
  createdAt: Date                 // Auto (timestamps: true, updatedAt: false)
}

// No additional indexes beyond _id
```

**Deduplication architecture:**

```
Layer 1 — Tenant-side (at review time):
  Tenant types landlord name
  → Debounced GET /landlords/search?q= (Levenshtein fuzzy match)
  → Top 3 matches shown as suggestions
  → Tenant selects existing or types new name
  → POST /landlords creates new entry (if new)

Layer 2 — Admin-side (periodic cleanup):
  GET /admin/landlords/duplicates
  → All canonical landlords (merged_into: null) compared pairwise
  → Pairs with Levenshtein distance ≤ 4 returned
  → Admin selects canonical + duplicates
  → POST /admin/landlords/merge
    → Sets merged_into: canonicalId on duplicates
    → Re-points property.landlord_id from duplicates → canonical
```

**Merge behaviour:**
- Duplicate landlord documents remain in the database (not deleted) with `merged_into` pointing to the canonical ID
- All properties that referenced the duplicate landlord are updated to reference the canonical one
- Future searches/exists checks only consider landlords with `merged_into: null`

---

## Rating Recalculation Flow

```
Review Created/Updated/Deleted
         │
         ▼
  Review.aggregate([
    { $match: { property_id } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
  ])
         │
         ├── agg exists → avg = Math.round(agg.avg * 10) / 10
         │                 count = agg.count
         └── no reviews  → avg = 0, count = 0
         │
         ▼
  Property.findByIdAndUpdate(property_id, {
    avg_rating: avg,
    review_count: count
  })
```

This is called by every review mutation route (`POST`, `PUT`, `DELETE` on `/reviews`). On `DELETE /admin/reviews/:id`, the same logic runs inline.

---

## Relationship Diagram

```
users                        properties                    reviews
─────                        ──────────                    ──────
_id (uid) ◄────────────────── createdBy              
email                                                        
displayName                  _id ◄─────────────────── property_id
isAdmin                      place_id                         
                             formatted_address       user_id ◄──── (not populated — just a string)
landlords                    normalized_address              
──────                       lat/lng                  rating
_id                          landlord_id ◄─────────── text
name                         avg_rating               tenancy_period
aliases                      review_count             createdAt
merged_into ► (self-ref)     createdAt
```

**Notes on relationships:**
- `reviews.user_id` is a plain string (Firebase UID), not a Mongoose ref — there's no `.populate()` for users on reviews
- `properties.createdBy` is also a plain string
- `properties.landlord_id` is a true Mongoose ObjectId ref to `Landlord` — supports `.populate('landlord_id')`
- `reviews.property_id` is a Mongoose ObjectId ref to `Property` — supports `.populate('property_id')`
- Landlord merging uses `merged_into` as a self-referential ObjectId to track duplicates