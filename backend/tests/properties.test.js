const request = require('supertest');
const app = require('../src/app');
const db = require('./setup');

jest.mock('../src/config/firebase', () => ({
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-1', email: 'a@b.com' })
  })
}));

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(db.clearDB);

const AUTH = { Authorization: 'Bearer mock-token' };

describe('POST /properties', () => {
  it('creates a new property by place_id', async () => {
    const res = await request(app)
      .post('/properties')
      .set(AUTH)
      .send({ place_id: 'place-abc', formatted_address: '42 Maple St, Austin TX', lat: 30.2, lng: -97.7 });

    expect(res.status).toBe(201);
    expect(res.body.property.place_id).toBe('place-abc');
    expect(res.body.property.avg_rating).toBe(0);
  });

  it('returns existing property on duplicate place_id', async () => {
    await request(app).post('/properties').set(AUTH)
      .send({ place_id: 'place-abc', formatted_address: '42 Maple St, Austin TX', lat: 30.2, lng: -97.7 });

    const res = await request(app).post('/properties').set(AUTH)
      .send({ place_id: 'place-abc', formatted_address: '42 Maple St, Austin TX', lat: 30.2, lng: -97.7 });

    expect(res.status).toBe(200);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/properties')
      .send({ place_id: 'x', formatted_address: 'y', lat: 0, lng: 0 });
    expect(res.status).toBe(401);
  });
});

describe('GET /properties', () => {
  it('finds property by place_id', async () => {
    await request(app).post('/properties').set(AUTH)
      .send({ place_id: 'place-xyz', formatted_address: '890 Oak Ave', lat: 30.3, lng: -97.8 });

    const res = await request(app).get('/properties?place_id=place-xyz').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.property.formatted_address).toBe('890 Oak Ave');
  });

  it('finds property by _id', async () => {
    const createRes = await request(app).post('/properties').set(AUTH)
      .send({ place_id: 'place-id-test', formatted_address: '123 Test St', lat: 30.0, lng: -97.0 });
    const id = createRes.body.property._id;

    const res = await request(app).get(`/properties?_id=${id}`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.property.formatted_address).toBe('123 Test St');
  });

  it('returns 404 when not found', async () => {
    const res = await request(app).get('/properties?place_id=nonexistent').set(AUTH);
    expect(res.status).toBe(404);
  });
});

describe('GET /properties/search', () => {
  it('returns properties matching address substring', async () => {
    await request(app).post('/properties').set(AUTH)
      .send({ place_id: 'p1', formatted_address: '42 Maple St, Austin TX', lat: 30.2, lng: -97.7 });
    await request(app).post('/properties').set(AUTH)
      .send({ place_id: 'p2', formatted_address: '890 Oak Ave, Austin TX', lat: 30.3, lng: -97.8 });

    const res = await request(app).get('/properties/search?q=Maple').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.properties.length).toBe(1);
    expect(res.body.properties[0].formatted_address).toContain('Maple');
  });
});
