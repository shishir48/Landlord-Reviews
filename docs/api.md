# API Reference

All API routes except `/health` require a valid Firebase ID token in the `Authorization` header:

```
Authorization: Bearer <firebase-id-token>
```

Admin routes additionally require `isAdmin: true` on the user document.

**Base URL:** `http://localhost:3000` (configurable via `PORT` env)

---

## Auth

### `POST /auth/login`

Create or fetch the user document from the Firebase ID token. Called once per app launch after Google sign-in completes.

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**

```json
{
  "user": {
    "_id": "firebase-uid",
    "email": "tenant@example.com",
    "displayName": "Tenant Name",
    "isAdmin": false,
    "createdAt": "2026-05-28T10:00:00.000Z"
  }
}
```

**Notes:**
- Uses `$setOnInsert` — subsequent logins return the existing document without modifying it
- `isAdmin` is always `false` on creation; set manually via `scripts/set-admin.js`

---

## Properties

### `POST /properties`

Upsert a property by `place_id`. If the `place_id` already exists, returns the existing document with status `200`. Otherwise creates a new entry with status `201`.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "place_id": "ChIJ...",           // optional (Google Places ID); null for manual entries
  "formatted_address": "42 Maple St, Austin TX",
  "lat": 30.2672,                  // optional
  "lng": -97.7431                  // optional
}
```

**Response `201` (created):**

```json
{
  "property": {
    "_id": "664a...",
    "place_id": "ChIJ...",
    "formatted_address": "42 Maple St, Austin TX",
    "normalized_address": "42 maple st austin tx",
    "lat": 30.2672,
    "lng": -97.7431,
    "landlord_id": null,
    "avg_rating": 0,
    "review_count": 0,
    "createdBy": "firebase-uid",
    "createdAt": "2026-05-28T10:00:00.000Z"
  }
}
```

**Response `200` (existing):** Same shape, status 200.

**Notes:**
- Deduplication by `place_id` first, then by `normalized_address` (lowercased, trimmed, punctuation-stripped address) if no `place_id` provided
- Manual entries without `place_id` are deduplicated by `normalized_address`

---

### `GET /properties`

Fetch a single property by `place_id` or MongoDB `_id`.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters (one required):**

| Param | Type | Description |
|---|---|---|
| `place_id` | string | Google Places ID |
| `_id` | string | MongoDB ObjectId |

**Response `200`:**

```json
{
  "property": {
    "_id": "664a...",
    "formatted_address": "42 Maple St, Austin TX",
    "avg_rating": 4.2,
    "review_count": 5,
    "landlord_id": {
      "_id": "664b...",
      "name": "John Davidson"
    }
  }
}
```

`landlord_id` is populated with the landlord's `_id` and `name` fields (Mongoose `.populate()`).

---

### `GET /properties/search`

Full-text search by address substring.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | `''` | Address search term (case-insensitive regex) |

**Response `200`:**

```json
{
  "properties": [
    {
      "_id": "664a...",
      "formatted_address": "42 Maple St, Austin TX",
      "avg_rating": 4.2,
      "review_count": 5,
      "landlord_id": { "_id": "664b...", "name": "John Davidson" }
    }
  ]
}
```

Max 20 results, populated with landlord data. Returns empty array `[]` for empty query.

---

## Reviews

### `POST /reviews`

Create a review for a property. One review per user per property (enforced by unique compound index).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "property_id": "664a...",
  "rating": 4,
  "text": "Responsive landlord, fixed issues quickly.",
  "tenancy_period": {
    "from": "2023-01-01",
    "to": "2024-12-31"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `property_id` | string | ✅ | MongoDB ObjectId of the property |
| `rating` | number | ✅ | 1–5 integer |
| `text` | string | ✅ | Free-text review |
| `tenancy_period` | object | ❌ | `{ from?: Date, to?: Date }` |

**Response `201`:**

```json
{
  "review": {
    "_id": "664c...",
    "property_id": "664a...",
    "user_id": "firebase-uid",
    "rating": 4,
    "text": "Responsive landlord, fixed issues quickly.",
    "tenancy_period": {
      "from": "2023-01-01T00:00:00.000Z",
      "to": "2024-12-31T00:00:00.000Z"
    },
    "createdAt": "2026-05-28T10:00:00.000Z"
  }
}
```

**Error `409`:**

```json
{ "error": "Already reviewed" }
```

**Side effect:** Recalculates `avg_rating` and `review_count` on the property.

---

### `GET /reviews`

List all reviews for a property, newest first.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `property_id` | string | ✅ | MongoDB ObjectId of the property |

**Response `200`:**

```json
{
  "reviews": [
    {
      "_id": "664c...",
      "user_id": "firebase-uid",
      "rating": 4,
      "text": "Responsive landlord, fixed issues quickly.",
      "createdAt": "2026-05-28T10:00:00.000Z"
    }
  ]
}
```

Reviews are returned as plain documents (not populated) — sorted by `createdAt` descending.

---

### `PUT /reviews/:id`

Edit your own review. Only the review's author can edit.

**Headers:** `Authorization: Bearer <token>`

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `id` | string | Review MongoDB ObjectId |

**Request Body (partial update — only changed fields):**

```json
{
  "rating": 3,
  "text": "Updated review text"
}
```

**Response `200`:**

```json
{
  "review": {
    "_id": "664c...",
    "property_id": "664a...",
    "user_id": "firebase-uid",
    "rating": 3,
    "text": "Updated review text",
    "createdAt": "2026-05-28T10:00:00.000Z"
  }
}
```

**Error `404`:** Review not found or not owned by the requesting user.

**Side effect:** Recalculates `avg_rating` and `review_count` on the property.

---

### `DELETE /reviews/:id`

Delete your own review. Only the review's author can delete.

**Headers:** `Authorization: Bearer <token>`

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `id` | string | Review MongoDB ObjectId |

**Response `204`:** No content.

**Error `404`:** Review not found or not owned by the requesting user.

**Side effect:** Recalculates `avg_rating` and `review_count` on the property.

---

## Landlords

### `POST /landlords`

Create a new landlord entry. The backend adds a normalized alias (lowercased, trimmed name) to the `aliases` array.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "name": "John Davidson"
}
```

**Response `201`:**

```json
{
  "landlord": {
    "_id": "664b...",
    "name": "John Davidson",
    "aliases": ["john davidson"],
    "merged_into": null,
    "createdAt": "2026-05-28T10:00:00.000Z"
  }
}
```

---

### `GET /landlords/search`

Fuzzy search landlords by name using Levenshtein distance. Returns top 3 closest matches.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | `''` | Search query (case-insensitive fuzzy match) |

**Response `200`:**

```json
{
  "landlords": [
    {
      "_id": "664b...",
      "name": "John Davidson",
      "aliases": ["john davidson"]
    }
  ]
}
```

Only returns landlords where `merged_into: null` (active/canonical entries). Returns empty array for empty query or no matches.

---

## Admin Routes (Protected)

All admin routes require `Authorization: Bearer <token>` **and** the requesting user must have `isAdmin: true`.

### `GET /admin/landlords/duplicates`

Finds landlord name pairs with Levenshtein distance ≤ 4 (configurable threshold). Only considers canonical landlords (`merged_into: null`).

**Response `200`:**

```json
{
  "pairs": [
    {
      "a": { "_id": "664b...", "name": "John Davidson" },
      "b": { "_id": "664c...", "name": "John Davdison" },
      "distance": 2
    },
    {
      "a": { "_id": "664d...", "name": "Maria Patel" },
      "b": { "_id": "664e...", "name": "Mario Patil" },
      "distance": 3
    }
  ]
}
```

Pairs sorted by distance (smallest first).

---

### `POST /admin/landlords/merge`

Merge duplicate landlords into a canonical entry.

**Request Body:**

```json
{
  "canonicalId": "664b...",
  "duplicateIds": ["664c...", "664d..."]
}
```

**Effects:**
- Sets `merged_into: canonicalId` on all duplicate landlord documents
- Updates `property.landlord_id` from duplicate IDs to canonical ID

**Response `200`:**

```json
{
  "merged": 2
}
```

---

### `GET /admin/properties`

List all properties, newest first, with populated landlord.

**Response `200`:**

```json
{
  "properties": [
    {
      "_id": "664a...",
      "formatted_address": "42 Maple St, Austin TX",
      "avg_rating": 4.2,
      "review_count": 5,
      "landlord_id": { "_id": "664b...", "name": "John Davidson" },
      "createdAt": "2026-05-28T10:00:00.000Z"
    }
  ]
}
```

---

### `DELETE /admin/reviews/:id`

Delete any review (abuse moderation). Unlike the user-facing DELETE endpoint, this does **not** check ownership.

**Path Parameters:**

| Param | Type | Description |
|---|---|---|
| `id` | string | Review MongoDB ObjectId |

**Response `204`:** No content.

**Error `404`:** Review not found.

**Side effect:** Recalculates `avg_rating` and `review_count` on the associated property.

---

## Health

### `GET /health`

No authentication required.

**Response `200`:**

```json
{ "ok": true }
```

---

## Error Response Format

All errors return JSON:

```json
{
  "error": "Human-readable error message"
}
```

| Status | Meaning |
|---|---|
| 400 | Bad request (missing required fields) |
| 401 | Missing or invalid Firebase token |
| 403 | Authenticated but not admin |
| 404 | Resource not found |
| 409 | Conflict (duplicate review) |
| 500 | Internal server error |