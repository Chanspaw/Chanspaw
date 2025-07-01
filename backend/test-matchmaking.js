const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('./server');

// Mock users
const user1 = { id: 'user1', username: 'Alice' };
const user2 = { id: 'user2', username: 'Bob' };
const JWT_SECRET = process.env.JWT_SECRET || 'e869dc2d5235673c96a5888153a95537770a79e7612848af25efa44691cd8f65';
const token1 = jwt.sign(user1, JWT_SECRET);
const token2 = jwt.sign(user2, JWT_SECRET);

describe('Matchmaking and Game Flow', () => {
  let matchId;

  it('User1 joins matchmaking', async () => {
    const res = await request(app)
      .post('/api/games/matchmaking/join')
      .set('Authorization', `Bearer ${token1}`)
      .send({ gameType: 'TIC_TAC_TOE', betAmount: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('User2 joins matchmaking and match is created', async () => {
    const res = await request(app)
      .post('/api/games/matchmaking/join')
      .set('Authorization', `Bearer ${token2}`)
      .send({ gameType: 'TIC_TAC_TOE', betAmount: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.matchId).toBeDefined();
    matchId = res.body.matchId;
  });

  it('User1 makes a move', async () => {
    const res = await request(app)
      .post(`/api/games/match/${matchId}/move`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ moveData: { index: 0 } });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('User2 makes a move', async () => {
    const res = await request(app)
      .post(`/api/games/match/${matchId}/move`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ moveData: { index: 1 } });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // Add more moves and test for match completion, payout, and audit log as needed
}); 