import request from 'supertest';
import app from '../src/index';

describe('Pending documents endpoint', () => {
  it('should require authentication', async () => {
    const res = await request(app).get('/documents/pending');
    expect(res.status).toBe(401);
  });
});
