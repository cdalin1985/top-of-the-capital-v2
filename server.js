const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'top-of-the-capital-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database file path
const DB_FILE = path.join(__dirname, 'db.json');

// Initialize database
function initializeDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            users: [],
            challenges: [],
            notifications: [],
            leaderboard: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
}

// Read database
function readDatabase() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { users: [], challenges: [], notifications: [], leaderboard: [] };
    }
}

// Write database
function writeDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing database:', error);
        return false;
    }
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Initialize database on startup
initializeDatabase();

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Top of the Capital server is running' });
});

// Get leaderboard (public endpoint for dropdown population)
app.get('/api/leaderboard', (req, res) => {
    try {
        const db = readDatabase();
        res.json(db.leaderboard || []);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Check if user exists
app.post('/api/check-user', (req, res) => {
    try {
        const { displayName } = req.body;
        const db = readDatabase();

        const existingUser = db.users.find(user => user.displayName === displayName);

        if (existingUser) {
            res.json({
                exists: true,
                user: {
                    id: existingUser.id,
                    displayName: existingUser.displayName,
                    email: existingUser.email,
                    rating: existingUser.rating,
                    avatar: existingUser.avatar
                }
            });
        } else {
            res.json({ exists: false });
        }
    } catch (error) {
        console.error('Error checking user:', error);
        res.status(500).json({ error: 'Failed to check user' });
    }
});

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { displayName, password, avatar } = req.body;

        if (!displayName || !password) {
            return res.status(400).json({ error: 'Display name and password are required' });
        }

        const db = readDatabase();

        // Check if user already exists
        const existingUser = db.users.find(user => user.displayName === displayName);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Find player in leaderboard
        const player = db.leaderboard.find(p => p.displayName === displayName);
        if (!player) {
            return res.status(400).json({ error: 'Player not found in rankings' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = {
            id: Date.now().toString(),
            displayName,
            email: `${displayName.toLowerCase().replace(/\s+/g, '.')}.${Math.random().toString(36).substr(2, 4)}@topofthecapital.local`,
            password: hashedPassword,
            rating: player.rating,
            wins: player.wins,
            losses: player.losses,
            avatar: avatar || null,
            createdAt: new Date().toISOString()
        };

        db.users.push(newUser);
        writeDatabase(db);

        // Generate JWT token
        const token = jwt.sign(
            { id: newUser.id, displayName: newUser.displayName },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return user data without password
        const { password: _, ...userWithoutPassword } = newUser;

        res.status(201).json({
            message: 'User registered successfully',
            user: userWithoutPassword,
            token
        });

        // Emit user registration event
        io.emit('userRegistered', { displayName: newUser.displayName });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { displayName, password } = req.body;

        if (!displayName || !password) {
            return res.status(400).json({ error: 'Display name and password are required' });
        }

        const db = readDatabase();
        const user = db.users.find(u => u.displayName === displayName);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, displayName: user.displayName },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: 'Login successful',
            user: userWithoutPassword,
            token
        });

        // Emit user login event
        io.emit('userLoggedIn', { displayName: user.displayName });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
app.get('/api/me', authenticateToken, (req, res) => {
    try {
        const db = readDatabase();
        const user = db.users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// Get notifications
app.get('/api/notifications', authenticateToken, (req, res) => {
    try {
        const db = readDatabase();
        const userNotifications = db.notifications.filter(n => n.userId === req.user.id);
        res.json(userNotifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Send challenge
app.post('/api/challenges', authenticateToken, (req, res) => {
    try {
        const { targetPlayer, discipline, gamesToWin } = req.body;

        if (!targetPlayer || !discipline || !gamesToWin) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const db = readDatabase();
        const challenger = db.users.find(u => u.id === req.user.id);
        const target = db.leaderboard.find(p => p.displayName === targetPlayer);

        if (!challenger || !target) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const challenge = {
            id: Date.now().toString(),
            challengerId: challenger.id,
            challengerName: challenger.displayName,
            targetName: targetPlayer,
            discipline,
            gamesToWin: parseInt(gamesToWin),
            status: 'pending',
            currentProposal: null,
            lastActionBy: null, // No action yet, just created
            createdAt: new Date().toISOString()
        };

        db.challenges.push(challenge);

        // Create notification for target player
        const targetUser = db.users.find(u => u.displayName === targetPlayer);
        if (targetUser) {
            const notification = {
                id: Date.now().toString() + '_notif',
                userId: targetUser.id,
                type: 'challenge',
                message: `${challenger.displayName} has challenged you to ${discipline}`,
                challengeId: challenge.id,
                read: false,
                createdAt: new Date().toISOString()
            };
            db.notifications.push(notification);
        }

        writeDatabase(db);

        res.status(201).json({
            message: 'Challenge sent successfully',
            challenge
        });

        io.emit('challengeEvent', { type: 'created', challenge });

    } catch (error) {
        console.error('Error sending challenge:', error);
        res.status(500).json({ error: 'Failed to send challenge' });
    }
});

// Respond to challenge (Negotiation)
app.post('/api/challenges/:id/respond', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const { type, venue, time } = req.body; // type: 'propose' | 'accept'

        const db = readDatabase();
        const challenge = db.challenges.find(c => c.id === id);

        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        // Verify user is part of the challenge
        if (challenge.challengerId !== req.user.id && challenge.targetName !== req.user.displayName) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Determine opponent
        const isChallenger = challenge.challengerId === req.user.id;
        const opponentName = isChallenger ? challenge.targetName : challenge.challengerName;
        const opponentUser = db.users.find(u => u.displayName === opponentName);

        // Update Challenge
        challenge.lastActionBy = req.user.id;
        challenge.currentProposal = { venue, time };

        let notifMessage = '';

        if (type === 'accept') {
            challenge.status = 'scheduled';
            notifMessage = `${req.user.displayName} ACCEPTED the match! Scheduled: ${venue} @ ${time}`;
        } else {
            challenge.status = 'negotiating';
            notifMessage = `${req.user.displayName} PROPOSES: ${venue} @ ${time}`;
        }

        // Notify Opponent
        if (opponentUser) {
            db.notifications.push({
                id: Date.now().toString() + '_notif',
                userId: opponentUser.id,
                type: 'negotiation',
                message: notifMessage,
                challengeId: challenge.id,
                read: false,
                createdAt: new Date().toISOString()
            });
        }

        writeDatabase(db);

        res.json({ message: 'Response recorded', challenge });

        // Real-time update
        io.emit('challengeEvent', { type: 'updated', challengeId: id });

    } catch (error) {
        console.error('Error responding:', error);
        res.status(500).json({ error: 'Failed to process response' });
    }
});

// Get single challenge details
app.get('/api/challenges/:id', authenticateToken, (req, res) => {
    try {
        const db = readDatabase();
        const challenge = db.challenges.find(c => c.id === req.params.id);
        if (!challenge) return res.status(404).json({ error: 'Not found' });
        res.json(challenge);
    } catch (e) {
        res.status(500).json({ error: 'Error fetching challenge' });
    }
});

// Mark notifications as read
app.put('/api/notifications/read', authenticateToken, (req, res) => {
    try {
        const db = readDatabase();
        let updated = false;

        db.notifications.forEach(n => {
            if (n.userId === req.user.id && !n.read) {
                n.read = true;
                updated = true;
            }
        });

        if (updated) {
            writeDatabase(db);
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error updating notifications' });
    }
});

// Complete Match & Update Rankings
app.post('/api/challenges/:id/complete', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const { winner, score } = req.body;

        const db = readDatabase();
        const challenge = db.challenges.find(c => c.id === id);

        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        // Find players
        const challengerIndex = db.leaderboard.findIndex(p => p.displayName === challenge.challengerName);
        const targetIndex = db.leaderboard.findIndex(p => p.displayName === challenge.targetName);

        if (challengerIndex === -1 || targetIndex === -1) {
            return res.status(500).json({ error: 'Players not found in rankings' });
        }

        const challenger = db.leaderboard[challengerIndex];
        const target = db.leaderboard[targetIndex];

        // Update W/L records
        if (winner === challenge.challengerName) {
            challenger.wins++;
            target.losses++;
        } else {
            target.wins++;
            challenger.losses++;
        }

        // RANKING UPDATE LOGIC (Leapfrog)
        // Only change ranks if Challenger (lower rank/higher index) defeats Target (higher rank/lower index)
        let rankUpdateMsg = 'Rankings unchanged.';
        if (winner === challenge.challengerName && challengerIndex > targetIndex) {
            // Remove challenger from current position
            const [winnerObj] = db.leaderboard.splice(challengerIndex, 1);
            // Insert at target position (target pushes down)
            db.leaderboard.splice(targetIndex, 0, winnerObj);

            // Re-assign 'rank' property for all users based on new array order
            db.leaderboard.forEach((p, i) => {
                if (p.displayName !== 'ADMIN') { // Admin rank 0 logic handles separate
                    p.rank = i + 1; // Assuming ADMIN is index 0 in filtered list, but here db.leaderboard HAS admin
                    // Actually, ADMIN is usually at index 0. Let's preserve that safe logic if ADMIN is 0.
                }
            });
            rankUpdateMsg = `${winner} takes rank #${targetIndex} (was #${challengerIndex})!`;
        }

        // Update Challenge
        challenge.status = 'completed';
        challenge.winner = winner;
        challenge.score = score;
        challenge.completedAt = new Date().toISOString();

        // Notification
        const loserName = winner === challenge.challengerName ? challenge.targetName : challenge.challengerName;
        const loser = db.users.find(u => u.displayName === loserName);

        if (loser) {
            db.notifications.push({
                id: Date.now().toString() + '_notif',
                userId: loser.id,
                type: 'info',
                message: `Match Complete: ${winner} def. You ${score}. ${rankUpdateMsg}`,
                read: false,
                createdAt: new Date().toISOString()
            });
        }

        writeDatabase(db);

        res.json({ message: 'Result submitted', rankUpdate: rankUpdateMsg });

        // Broadcast updates
        io.emit('challengeEvent', { type: 'completed', challengeId: id, winner, score });
        io.emit('databaseSeeded', { playersCount: db.leaderboard.length }); // Reuse this to trigger client-side leaderboard refresh

    } catch (e) {
        console.error('Error completing match:', e);
        res.status(500).json({ error: 'Failed to complete match' });
    }
});

// Admin seed data
app.post('/api/admin/seed', (req, res) => {
    try {
        const db = readDatabase();

        // Seed leaderboard with 70 real players
        const players = [
            { rank: 1, displayName: "Dan Hamper", rating: 2100, wins: 45, losses: 8 },
            { rank: 2, displayName: "David Smith", rating: 2080, wins: 42, losses: 10 },
            { rank: 3, displayName: "Chase Dalin", rating: 2060, wins: 40, losses: 12 },
            { rank: 4, displayName: "Frank Kincl", rating: 2040, wins: 38, losses: 14 },
            { rank: 5, displayName: "Dave Alderman", rating: 2020, wins: 36, losses: 16 },
            { rank: 6, displayName: "Mike Zahn", rating: 2000, wins: 34, losses: 18 },
            { rank: 7, displayName: "Mike Paliga", rating: 1980, wins: 32, losses: 20 },
            { rank: 8, displayName: "Tim Webster", rating: 1960, wins: 30, losses: 22 },
            { rank: 9, displayName: "Jerry Sabol", rating: 1940, wins: 28, losses: 24 },
            { rank: 10, displayName: "Thomas E. Kingston", rating: 1920, wins: 26, losses: 26 },
            { rank: 11, displayName: "Timmy Squires", rating: 1900, wins: 25, losses: 27 },
            { rank: 12, displayName: "Joel Selzer", rating: 1880, wins: 24, losses: 28 },
            { rank: 13, displayName: "Josh Fava", rating: 1860, wins: 23, losses: 29 },
            { rank: 14, displayName: "Eric Croft", rating: 1840, wins: 22, losses: 30 },
            { rank: 15, displayName: "Louise Broksle", rating: 1820, wins: 21, losses: 31 },
            { rank: 16, displayName: "Kurt Kubicka", rating: 1800, wins: 20, losses: 32 },
            { rank: 17, displayName: "George Cotton", rating: 1780, wins: 19, losses: 33 },
            { rank: 18, displayName: "Vern Carpenter", rating: 1760, wins: 18, losses: 34 },
            { rank: 19, displayName: "Mike Churchill", rating: 1740, wins: 17, losses: 35 },
            { rank: 20, displayName: "Chris Gomez", rating: 1720, wins: 16, losses: 36 },
            { rank: 21, displayName: "Matt Gilbert", rating: 1700, wins: 15, losses: 37 },
            { rank: 22, displayName: "Gurn Blanston", rating: 1680, wins: 14, losses: 38 },
            { rank: 23, displayName: "Rob Millions", rating: 1660, wins: 13, losses: 39 },
            { rank: 24, displayName: "Walker Hopkins", rating: 1640, wins: 12, losses: 40 },
            { rank: 25, displayName: "Janice Osborne", rating: 1620, wins: 11, losses: 41 },
            { rank: 26, displayName: "Anthony Jacobs", rating: 1600, wins: 10, losses: 42 },
            { rank: 27, displayName: "Patrick Donald", rating: 1580, wins: 9, losses: 43 },
            { rank: 28, displayName: "Tim Gregor", rating: 1560, wins: 8, losses: 44 },
            { rank: 29, displayName: "James McMasters", rating: 1540, wins: 7, losses: 45 },
            { rank: 30, displayName: "Joe Mackay", rating: 1520, wins: 6, losses: 46 },
            { rank: 31, displayName: "Steve Adsem", rating: 1500, wins: 15, losses: 35 },
            { rank: 32, displayName: "Samantha Chase", rating: 1480, wins: 14, losses: 36 },
            { rank: 33, displayName: "Lea Hightshoe", rating: 1460, wins: 13, losses: 37 },
            { rank: 34, displayName: "Courtney Norman", rating: 1440, wins: 12, losses: 38 },
            { rank: 35, displayName: "Marc Sanche", rating: 1420, wins: 11, losses: 39 },
            { rank: 36, displayName: "Kenny Thurman", rating: 1400, wins: 10, losses: 40 },
            { rank: 37, displayName: "Roger Simmons", rating: 1380, wins: 9, losses: 41 },
            { rank: 38, displayName: "Christina Talbot", rating: 1360, wins: 8, losses: 42 },
            { rank: 39, displayName: "Jon Nash", rating: 1340, wins: 7, losses: 43 },
            { rank: 40, displayName: "Sady Garrison", rating: 1320, wins: 6, losses: 44 },
            { rank: 41, displayName: "Justin Cavazos", rating: 1300, wins: 15, losses: 35 },
            { rank: 42, displayName: "Sean Royston", rating: 1280, wins: 14, losses: 36 },
            { rank: 43, displayName: "James Smith", rating: 1260, wins: 13, losses: 37 },
            { rank: 44, displayName: "Zach Ledesma", rating: 1240, wins: 12, losses: 38 },
            { rank: 45, displayName: "Clayton Carter", rating: 1220, wins: 11, losses: 39 },
            { rank: 46, displayName: "Ryan Fields", rating: 1200, wins: 10, losses: 40 },
            { rank: 47, displayName: "Kris Vladic", rating: 1180, wins: 9, losses: 41 },
            { rank: 48, displayName: "Nate Welch", rating: 1160, wins: 8, losses: 42 },
            { rank: 49, displayName: "Josh Hill", rating: 1140, wins: 7, losses: 43 },
            { rank: 50, displayName: "Josh Waples", rating: 1120, wins: 6, losses: 44 },
            { rank: 51, displayName: "Steven Ross Brandenburg", rating: 1100, wins: 15, losses: 35 },
            { rank: 52, displayName: "Troy Jacobs", rating: 1080, wins: 14, losses: 36 },
            { rank: 53, displayName: "Makayla Ledford", rating: 1060, wins: 13, losses: 37 },
            { rank: 54, displayName: "Sarah Urbaniak VanCleave", rating: 1040, wins: 12, losses: 38 },
            { rank: 55, displayName: "Jennifer Lynn", rating: 1020, wins: 11, losses: 39 },
            { rank: 56, displayName: "Walter Ryan Isenhour", rating: 1000, wins: 10, losses: 40 },
            { rank: 57, displayName: "Craig Rogers", rating: 980, wins: 9, losses: 41 },
            { rank: 58, displayName: "Jesse Chandler", rating: 960, wins: 8, losses: 42 },
            { rank: 59, displayName: "Tizer Rushford", rating: 940, wins: 7, losses: 43 },
            { rank: 60, displayName: "Randy Hoag", rating: 920, wins: 6, losses: 44 },
            { rank: 61, displayName: "Justin Whittenberg", rating: 900, wins: 5, losses: 45 },
            { rank: 62, displayName: "Kenrick Leistiko", rating: 880, wins: 4, losses: 46 },
            { rank: 63, displayName: "Richard Frankforter", rating: 860, wins: 3, losses: 47 },
            { rank: 64, displayName: "Brandon Lucas Parker", rating: 840, wins: 2, losses: 48 },
            { rank: 65, displayName: "James Ellington", rating: 820, wins: 1, losses: 49 },
            { rank: 66, displayName: "Anita Scharf", rating: 800, wins: 6, losses: 44 },
            { rank: 67, displayName: "Ileana Hernandez", rating: 780, wins: 5, losses: 45 },
            { rank: 68, displayName: "Heather Jarvis", rating: 760, wins: 4, losses: 46 },
            { rank: 69, displayName: "Keenen Blackbird", rating: 740, wins: 3, losses: 47 },
            { rank: 70, displayName: "Kelly Smail", rating: 720, wins: 2, losses: 48 }
        ];

        // Add admin user
        const adminUser = {
            rank: 0,
            displayName: "ADMIN",
            rating: 2200,
            wins: 50,
            losses: 5
        };

        db.leaderboard = [adminUser, ...players];

        writeDatabase(db);

        res.json({
            message: 'Database seeded successfully',
            playersAdded: players.length + 1
        });

        // Emit seed event
        io.emit('databaseSeeded', { playersCount: players.length + 1 });

    } catch (error) {
        console.error('Error seeding database:', error);
        res.status(500).json({ error: 'Failed to seed database' });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
    });
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, () => {
    console.log(`🎱 Top of the Capital server running on port ${PORT}`);
    console.log(`🌐 Access the application at: http://localhost:${PORT}`);
});

module.exports = app;
