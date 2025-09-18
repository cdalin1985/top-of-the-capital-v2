/**
 * E2E: User Journey Flow
 * Verifies register → login → challenge → propose → confirm → start match → score → complete → recent + leaderboard
 */

const request = require('supertest');

// We import the running server app; server.js exports { app, server, io }
const { app, server } = require('../../server');

// Helpers
function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('E2E User Journey', () => {
  let userA = { email: 'userA@example.com', password: 'Password123', displayName: 'User A' };
  let userB = { email: 'userB@example.com', password: 'Password123', displayName: 'User B' };
  let tokenA, tokenB, userAId, userBId, challengeId, matchId;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    try { server && server.close && server.close(); } catch (_) {}
  });

  test('Register users A and B', async () => {
    const resA = await request(app).post('/api/auth/register').send(userA);
    expect([200, 201]).toContain(resA.status);
    expect(resA.body.success).toBe(true);
    expect(resA.body.data?.token).toBeDefined();
    tokenA = resA.body.data.token;
    userAId = resA.body.data.user.id;

    const resB = await request(app).post('/api/auth/register').send(userB);
    expect([200, 201]).toContain(resB.status);
    expect(resB.body.success).toBe(true);
    tokenB = resB.body.data.token;
    userBId = resB.body.data.user.id;
  });

  test('User A creates a challenge against User B', async () => {
    const res = await request(app)
      .post('/api/challenges')
      .set(auth(tokenA))
      .send({ targetUserId: userBId, discipline: 'Eight Ball', gamesToWin: 5 });

    expect([200, 201]).toContain(res.status);
    challengeId = res.body.id || res.body.data?.id;
    expect(challengeId).toBeDefined();
  });

  test('User B proposes venue/time', async () => {
    const res = await request(app)
      .post(`/api/challenges/${challengeId}/propose`)
      .set(auth(tokenB))
      .send({ venue: 'Valley Hub', scheduledAt: new Date().toISOString() });

    expect(res.status).toBe(200);
  });

  test('User A confirms challenge', async () => {
    const res = await request(app)
      .post(`/api/challenges/${challengeId}/confirm`)
      .set(auth(tokenA))
      .send();

    expect(res.status).toBe(200);
  });

  test('Start a match from challenge', async () => {
    const res = await request(app)
      .post(`/api/matches/start-from-challenge/${challengeId}`)
      .set(auth(tokenA))
      .send();

    expect([200, 201]).toContain(res.status);
    matchId = res.body.id || res.body.data?.id;
    expect(matchId).toBeDefined();
  });

  test('Score a few points and complete the match', async () => {
    // Score points for user A until completion
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post(`/api/matches/${matchId}/point`)
        .set(auth(tokenA))
        .send({ playerId: userAId });

      expect([200]).toContain(res.status);
    }
  });

  test('Fetch recent matches and leaderboard', async () => {
    const recent = await request(app)
      .get('/api/matches/recent')
      .set(auth(tokenA));
    expect([200]).toContain(recent.status);

    const board = await request(app)
      .get('/api/leaderboard')
      .set(auth(tokenA));
    expect([200]).toContain(board.status);
  });
});
