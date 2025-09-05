/**
 * Capital Ladder App (Combined)
 * Combines features from:
 * - Top-of-the-Capital (leaderboard with ELO and live matches)
 * - Pool Challenge Hybrid (auth, challenges, notifications)
 * - PremiumLadder (modern patterns; no Redis required)
 */
const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
// --- PRISMA ---
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

require('dotenv').config();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'capital_ladder_jwt_dev_secret';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'capital_admin_seed_secret';


const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({timestamp, level, message})=>`${timestamp} ${level}: ${message}`)
  ),
  transports: [ new winston.transports.Console() ]
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, methods: ['GET','POST'], credentials: true } });

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

// Socket auth via cookie or handshake token
io.use((socket, next) => {
  try {
    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers?.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';').map(s=>s.trim());
      for (const c of cookies){ const [k,...rest] = c.split('='); if (k==='token'){ token = decodeURIComponent(rest.join('=')); break; } }
    }
    if (!token) return next(new Error('Missing token'));
    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = payload.userId;
    next();
  } catch (e){ return next(new Error('Auth error')); }
});

io.on('connection', (socket) => {
  logger.info('Socket connected ' + socket.id + ' user:' + (socket.userId||'unknown'));
  if (socket.userId) socket.join('user:'+socket.userId);
  socket.join('community');
});

function signToken(userId){ return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' }); }
function authMiddleware(req,res,next){
  const header = req.headers.authorization || '';
  let token = header.replace('Bearer ','');
  if (!token && req.cookies?.token) token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try { const p = jwt.verify(token, JWT_SECRET); req.userId = p.userId; next(); } catch { return res.status(401).json({ message: 'Invalid token' }); }
}

// ELO system (removed, will use FargoRate API in the future)

// --- Auth
app.post('/api/auth/register',
  body('email').isEmail(), body('password').isLength({min:8}),
  async (req,res)=>{
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e=>e.msg).join(', ') });
    const { email, password, displayName } = req.body;
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ message: 'Email already in use' });
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hash,
        displayName: displayName||'',
        avatar: null
      },
    });
    const token = signToken(user.id);
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV==='production' });
    res.status(201).json({ user: { id:user.id, email:user.email, displayName:user.displayName }, token });
  }
);

app.post('/api/auth/login', body('email').isEmail(), body('password').isLength({min:1}), async (req,res)=>{
  const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e=>e.msg).join(', ') });
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password); if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = signToken(user.id);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV==='production' });
  res.json({ user: { id:user.id, email:user.email, displayName:user.displayName }, token });
});

// --- Users & Leaderboard
app.get('/api/leaderboard', authMiddleware, async (req, res) => {
  // Fetch and sort by rank ascending (1 = top)
  const users = await prisma.user.findMany({ orderBy: { rank: "asc" } });
  res.json(users.map(u => ({ id: u.id, displayName: u.displayName || u.email, rank: u.rank })));
});

// --- Challenges
app.post('/api/challenges', authMiddleware,
  body('targetUserId').isString(), body('discipline').isIn(['Eight Ball','Nine Ball','10 Ball']), body('gamesToWin').isInt({min:5}),
  async (req, res) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e=>e.msg).join(', ') });
    const { targetUserId, discipline, gamesToWin } = req.body;
    // Check users exist (creator and target)
    const [challenger, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.userId } }),
      prisma.user.findUnique({ where: { id: targetUserId } })
    ]);
    if (!challenger || !target) return res.status(404).json({ message: 'User not found' });
    const ch = await prisma.challenge.create({
      data: {
        creatorId: req.userId,
        targetUserId,
        discipline,
        gamesToWin: Number(gamesToWin),
        status: 'pending',
        venue: null,
        scheduledAt: null,
        confirmedAt: null
      },
      include: { creator: true, targetUser: true }
    });
    // Notification object for future use (not persisted yet)
    const n = { type: 'challenge', challengeId: ch.id, to: targetUserId, from: req.userId, message: `${challenger.displayName || challenger.email} challenged ${target.displayName || target.email} (${discipline}, first to ${gamesToWin})`, createdAt: new Date().toISOString() };
    io.to('user:' + targetUserId).emit('notification', n); io.to('community').emit('notification', n);
    res.status(201).json(ch);
  }
);

app.post('/api/challenges/:id/propose', authMiddleware, body('venue').isString(), body('scheduledAt').isISO8601().optional({nullable:true}), async (req, res) => {
  const { id } = req.params; const { venue, scheduledAt } = req.body;
  const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e=>e.msg).join(', ') });
  const ch = await prisma.challenge.findUnique({ where: { id } });
  if (!ch) return res.status(404).json({ message: 'Challenge not found' });
  if (ch.targetUserId !== req.userId) return res.status(403).json({ message: 'Not authorized' });
  const updated = await prisma.challenge.update({
    where: { id },
    data: {
      venue,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: 'proposed'
    }
  });
  // For notifications, fetch display names for context
  const target = await prisma.user.findUnique({ where: { id: ch.targetUserId } });
  const creator = await prisma.user.findUnique({ where: { id: ch.creatorId } });
  const n = { type: 'proposal', challengeId: ch.id, to: ch.creatorId, from: req.userId, message: `${target.displayName || target.email} proposed ${venue} at ${scheduledAt}`, createdAt: new Date().toISOString() };
  io.to('user:' + ch.creatorId).emit('notification', n); io.to('community').emit('notification', n);
  res.json(updated);
});

app.post('/api/challenges/:id/confirm', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const ch = await prisma.challenge.findUnique({ where: { id } });
  if (!ch) return res.status(404).json({ message: 'Challenge not found' });
  if (ch.creatorId !== req.userId) return res.status(403).json({ message: 'Not authorized' });
  const updated = await prisma.challenge.update({
    where: { id },
    data: {
      status: 'scheduled',
      confirmedAt: new Date()
    }
  });
  const creator = await prisma.user.findUnique({ where: { id: ch.creatorId } });
  const n = { type: 'confirmed', challengeId: ch.id, to: ch.targetUserId, from: req.userId, message: `${creator.displayName || creator.email} confirmed ${ch.venue} at ${ch.scheduledAt}`, createdAt: new Date().toISOString() };
  io.to('user:' + ch.targetUserId).emit('notification', n); io.to('community').emit('notification', n);
  res.json(updated);
});

app.get('/api/notifications', authMiddleware, (req,res)=>{
  const db = readDB(); const mine = db.notifications.filter(n => n.to === req.userId || n.to === 'community'); res.json(mine.slice(-50).reverse());
});

// --- Live Matches & ELO updates
const activeMatches = new Map(); // matchId -> match object

app.post('/api/matches', authMiddleware, body('opponentId').isString(), body('gamesToWin').isInt({min:3, max:15}), (req,res)=>{
  const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e=>e.msg).join(', ') });
  const { opponentId, gamesToWin } = req.body; const db = readDB(); const p1 = db.users.find(u=>u.id===req.userId); const p2 = db.users.find(u=>u.id===opponentId); if (!p1||!p2) return res.status(404).json({ message:'Users not found' });
  const id = 'match_'+Date.now().toString();
  const match = { id, player1:p1.id, player1Name:p1.displayName||p1.email, player2:p2.id, player2Name:p2.displayName||p2.email, gamesToWin:Number(gamesToWin), scores:{ [p1.id]:0, [p2.id]:0 }, currentFrame:1, status:'active', createdAt:new Date().toISOString() };
  activeMatches.set(id, match); io.emit('matchCreated', match); res.status(201).json(match);
});

app.post('/api/matches/:id/point', authMiddleware, body('playerId').isString(), (req,res)=>{
  const { id } = req.params; const { playerId } = req.body; const match = activeMatches.get(id); if (!match) return res.status(404).json({ message: 'Match not found' });
  if (playerId!==match.player1 && playerId!==match.player2) return res.status(403).json({ message:'Not a player in this match' });
  match.scores[playerId]++; match.currentFrame++; io.emit('matchUpdate', match);
  const toWin = match.gamesToWin; if (match.scores[playerId] >= toWin){
    match.status='completed'; match.winner = playerId; match.completedAt = new Date().toISOString(); io.emit('matchCompleted', match);
    // ELO update (removed)
    activeMatches.delete(id);
  }
  res.json(match);
});

app.get('/api/matches/active', authMiddleware, (req,res)=>{ res.json(Array.from(activeMatches.values())); });

// --- Admin: seed players
app.post('/api/admin/seed', (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.body?.secret; 
  if (secret !== ADMIN_SECRET) return res.status(403).json({ message: 'Bad admin secret' });
  (async () => {
    let players = [];
    try {
      const externalPath = path.join(process.env.USERPROFILE || process.env.HOME || '', 'OneDrive', 'Desktop', 'top-of-the-capital-v2-main', 'db.json');
      const data = await fsp.readFile(externalPath, 'utf8');
      const ext = JSON.parse(data);
      if (Array.isArray(ext.leaderboard) && ext.leaderboard.length > 0) {
        players = ext.leaderboard.map((p, i) => ({ displayName: p.name || p.displayName || `Player ${i+1}`, email: `player${i+1}@capital.local` }));
      }
    } catch(e) { /* ignore */ }
    if (players.length === 0) {
      for (let i = 1; i <= 20; i++) { players.push({ displayName: `Player ${i}`, email: `player${i}@capital.local` }); }
    }
    // Check if users exist in DB
    const existingCount = await prisma.user.count();
    if (existingCount >= 10) return res.json({ ok: true, message: 'Users already present' });
    const users = await Promise.all(players.map(async p => {
      return await prisma.user.create({
        data: {
          email: p.email,
          password: await bcrypt.hash('password123', 10),
          displayName: p.displayName,
          avatar: null
        }
      });
    }));
    res.json({ ok: true, users: users.length });
  })().catch(err => { logger.error('Seed error ' + err.message); res.status(500).json({ message: 'Seed failed' }); });
});

// Fallback to SPA
app.get('*', (req,res)=>{ res.sendFile(path.join(__dirname, 'public', 'index.html')); });

server.listen(PORT, ()=> logger.info('Capital Ladder server listening on '+PORT));
