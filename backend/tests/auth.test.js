const request = require('supertest');
const app = require('../src/app');
const db = require('./setup');

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(db.clearDB);

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
