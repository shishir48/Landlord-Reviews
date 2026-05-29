const request = require('supertest');
const app = require('../src/app');
const Property = require('../src/models/Property');
const Review = require('../src/models/Review');
const db = require('./setup');

const mockVerifyIdToken = jest.fn().mockResolvedValue({ uid: 'user-1', email: 'a@b.com' });
jest.mock('../src/config/firebase', () => ({
  auth: () => ({ verifyIdToken: mockVerifyIdToken })
}));

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(db.clearDB);

const AUTH = { Authorization: 'Bearer mock-token' };
let propertyId;

beforeEach(async () => {
  mockVerifyIdToken.mockResolvedValue({ uid: 'user-1', email: 'a@b.com' });
  const p = await Property.create({
    place_id: 'place-test',
    formatted_address: '42 Maple St',
    normalized_address: '42 maple st',
    avg_rating: 0,
    review_count: 0,
  });
  propertyId = p._id.toString();
});

describe('POST /reviews', () => {
  it('creates a review and updates property avg_rating', async () => {
    const res = await request(app).post('/reviews').set(AUTH).send({
      property_id: propertyId,
      rating: 4,
      text: 'Good landlord',
    });

    expect(res.status).toBe(201);
    expect(res.body.review.rating).toBe(4);

    const prop = await Property.findById(propertyId);
    expect(prop.avg_rating).toBe(4);
    expect(prop.review_count).toBe(1);
  });

  it('updates avg_rating correctly with two reviews', async () => {
    await request(app).post('/reviews').set(AUTH).send({ property_id: propertyId, rating: 4, text: 'Good' });

    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-2', email: 'b@c.com' });
    await request(app).post('/reviews').set(AUTH).send({ property_id: propertyId, rating: 2, text: 'Bad' });

    const prop = await Property.findById(propertyId);
    expect(prop.avg_rating).toBe(3); // (4+2)/2
    expect(prop.review_count).toBe(2);
  });

  it('returns 409 if user already reviewed this property', async () => {
    await request(app).post('/reviews').set(AUTH).send({ property_id: propertyId, rating: 4, text: 'First' });
    const res = await request(app).post('/reviews').set(AUTH).send({ property_id: propertyId, rating: 3, text: 'Second' });
    expect(res.status).toBe(409);
  });
});

describe('GET /reviews', () => {
  it('lists reviews for a property', async () => {
    await request(app).post('/reviews').set(AUTH).send({ property_id: propertyId, rating: 5, text: 'Great' });
    const res = await request(app).get(`/reviews?property_id=${propertyId}`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.reviews.length).toBe(1);
  });
});

describe('PUT /reviews/:id', () => {
  it('allows user to edit own review and recalculates avg_rating', async () => {
    const createRes = await request(app).post('/reviews').set(AUTH)
      .send({ property_id: propertyId, rating: 4, text: 'Good' });
    const reviewId = createRes.body.review._id;

    const res = await request(app).put(`/reviews/${reviewId}`).set(AUTH)
      .send({ rating: 2, text: 'Actually bad' });

    expect(res.status).toBe(200);
    expect(res.body.review.rating).toBe(2);

    const prop = await Property.findById(propertyId);
    expect(prop.avg_rating).toBe(2);
  });

  it('returns 404 if review belongs to different user', async () => {
    const createRes = await request(app).post('/reviews').set(AUTH)
      .send({ property_id: propertyId, rating: 4, text: 'Good' });
    const reviewId = createRes.body.review._id;

    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-2', email: 'b@c.com' });
    const res = await request(app).put(`/reviews/${reviewId}`).set(AUTH)
      .send({ rating: 1 });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /reviews/:id', () => {
  it('deletes own review and updates avg_rating to 0', async () => {
    const createRes = await request(app).post('/reviews').set(AUTH)
      .send({ property_id: propertyId, rating: 5, text: 'Excellent' });
    const reviewId = createRes.body.review._id;

    const res = await request(app).delete(`/reviews/${reviewId}`).set(AUTH);
    expect(res.status).toBe(204);

    const prop = await Property.findById(propertyId);
    expect(prop.avg_rating).toBe(0);
    expect(prop.review_count).toBe(0);
  });
});
