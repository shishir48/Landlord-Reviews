const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const db = require('./setup');

const mockVerifyIdToken = jest.fn();
jest.mock('../src/config/firebase', () => ({
  auth: () => ({ verifyIdToken: mockVerifyIdToken })
}));

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(async () => {
  await db.clearDB();
  mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid-1', email: 'test@example.com', name: 'Test User' });
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('auth middleware', () => {
  const { verifyToken } = require('../src/middleware/auth');

  it('calls next() and sets req.user when token is valid', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-1', email: 'a@b.com' });
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ uid: 'user-1', email: 'a@b.com' });
  });

  it('returns 401 when no token provided', async () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
