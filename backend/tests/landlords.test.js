const request = require('supertest');
const app = require('../src/app');
const Landlord = require('../src/models/Landlord');
const db = require('./setup');

jest.mock('../src/config/firebase', () => ({
  auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'u1', email: 'a@b.com' }) })
}));

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(db.clearDB);

const AUTH = { Authorization: 'Bearer mock-token' };

describe('GET /landlords/search', () => {
  beforeEach(async () => {
    await Landlord.create([
      { name: 'John Davidson', aliases: ['john davidson'] },
      { name: 'Maria Patel', aliases: ['maria patel'] },
      { name: 'Bob Smith', aliases: ['bob smith'] },
    ]);
  });

  it('returns fuzzy matches ranked by distance', async () => {
    const res = await request(app).get('/landlords/search?q=john+davdison').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.landlords[0].name).toBe('John Davidson');
  });

  it('returns up to 3 results', async () => {
    const res = await request(app).get('/landlords/search?q=john').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.landlords.length).toBeLessThanOrEqual(3);
  });

  it('returns empty array for empty query', async () => {
    const res = await request(app).get('/landlords/search').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.landlords).toEqual([]);
  });
});

describe('POST /landlords', () => {
  it('creates a new landlord', async () => {
    const res = await request(app).post('/landlords').set(AUTH)
      .send({ name: 'New Landlord' });
    expect(res.status).toBe(201);
    expect(res.body.landlord.name).toBe('New Landlord');
    expect(res.body.landlord.aliases).toContain('new landlord');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/landlords').set(AUTH).send({});
    expect(res.status).toBe(400);
  });
});
