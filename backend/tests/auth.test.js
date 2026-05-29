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

  it('returns 401 when token is invalid', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Token expired'));
    const req = { headers: { authorization: 'Bearer bad-token' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('POST /auth/login', () => {
  it('creates user on first login', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');

    const dbUser = await User.findById('test-uid-1');
    expect(dbUser).not.toBeNull();
    expect(dbUser.isAdmin).toBe(false);
  });

  it('returns existing user on subsequent login', async () => {
    await User.create({ _id: 'test-uid-1', email: 'test@example.com', displayName: 'Test User' });

    const res = await request(app)
      .post('/auth/login')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    const count = await User.countDocuments();
    expect(count).toBe(1);
  });
});
