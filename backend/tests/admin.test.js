const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Landlord = require('../src/models/Landlord');
const Property = require('../src/models/Property');
const Review = require('../src/models/Review');
const db = require('./setup');

const mockVerify = jest.fn();
jest.mock('../src/config/firebase', () => ({
  auth: () => ({ verifyIdToken: mockVerify })
}));

beforeAll(db.connect);
afterAll(db.disconnect);
beforeEach(db.clearDB);

const AUTH = { Authorization: 'Bearer mock-token' };

describe('admin routes', () => {
  it('returns 403 for non-admin user', async () => {
    mockVerify.mockResolvedValue({ uid: 'regular-user', email: 'a@b.com' });
    await User.create({ _id: 'regular-user', email: 'a@b.com', isAdmin: false });

    const res = await request(app).get('/admin/landlords/duplicates').set(AUTH);
    expect(res.status).toBe(403);
  });

  describe('with admin user', () => {
    beforeEach(async () => {
      mockVerify.mockResolvedValue({ uid: 'admin-user', email: 'admin@b.com' });
      await User.create({ _id: 'admin-user', email: 'admin@b.com', isAdmin: true });
    });

    it('GET /admin/landlords/duplicates returns similar landlords', async () => {
      await Landlord.create([
        { name: 'John Davidson', aliases: ['john davidson'] },
        { name: 'John Davdison', aliases: ['john davdison'] },
        { name: 'Maria Patel', aliases: ['maria patel'] },
      ]);

      const res = await request(app).get('/admin/landlords/duplicates').set(AUTH);
      expect(res.status).toBe(200);
      expect(res.body.pairs.length).toBeGreaterThan(0);
      expect(res.body.pairs[0]).toHaveProperty('a');
      expect(res.body.pairs[0]).toHaveProperty('b');
      expect(res.body.pairs[0]).toHaveProperty('distance');
    });

    it('POST /admin/landlords/merge merges duplicates into canonical', async () => {
      const canonical = await Landlord.create({ name: 'John Davidson', aliases: ['john davidson'] });
      const dup = await Landlord.create({ name: 'John Davdison', aliases: ['john davdison'] });
      const prop = await Property.create({
        formatted_address: '42 Maple St',
        normalized_address: '42 maple st',
        landlord_id: dup._id,
      });

      const res = await request(app).post('/admin/landlords/merge').set(AUTH).send({
        canonicalId: canonical._id,
        duplicateIds: [dup._id],
      });

      expect(res.status).toBe(200);

      const updatedDup = await Landlord.findById(dup._id);
      expect(updatedDup.merged_into.toString()).toBe(canonical._id.toString());

      const updatedProp = await Property.findById(prop._id);
      expect(updatedProp.landlord_id.toString()).toBe(canonical._id.toString());
    });

    it('GET /admin/properties returns all properties', async () => {
      await Property.create([
        { formatted_address: '42 Maple St', normalized_address: '42 maple st' },
        { formatted_address: '890 Oak Ave', normalized_address: '890 oak ave' },
      ]);

      const res = await request(app).get('/admin/properties').set(AUTH);
      expect(res.status).toBe(200);
      expect(res.body.properties.length).toBe(2);
    });

    it('DELETE /admin/reviews/:id removes review and recalculates avg_rating', async () => {
      const prop = await Property.create({
        formatted_address: '42 Maple St',
        normalized_address: '42 maple st',
        avg_rating: 5,
        review_count: 1,
      });
      const review = await Review.create({
        property_id: prop._id,
        user_id: 'some-user',
        rating: 5,
        text: 'Great',
      });

      const res = await request(app).delete(`/admin/reviews/${review._id}`).set(AUTH);
      expect(res.status).toBe(204);

      const updatedProp = await Property.findById(prop._id);
      expect(updatedProp.avg_rating).toBe(0);
      expect(updatedProp.review_count).toBe(0);
    });
  });
});
