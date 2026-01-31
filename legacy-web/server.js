const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT"]
    }
});

// Import and start the scheduler
const scheduler = require('./scheduler');

const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTH MIDDLEWARE ---
// For now, we are trusting the client to send the session token if using Supabase Auth directly,
// OR we can verify the JWT. Since we are proxying, we'll verify the Supabase JWT.
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access token required' });

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
}

// --- ROUTES ---

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Top of the Capital (Supabase) is running' });
});

// CHECK USER EXISTENCE
app.post('/api/check-user', async (req, res) => {
    const { displayName } = req.body;

    // Check profiles table (case insensitive would be best, but exact for now)
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', displayName)
        .single();

    // If we find a profile, they "exist" in the system
    if (data) {
        res.json({ exists: true });
    } else {
        // Not found or error
        res.json({ exists: false });
    }
});

// GET Leaderboard (Public)
app.get('/api/leaderboard', async (req, res) => {
    try {
        // Fetch from 'ladder_view'
        const { data, error } = await supabase
            .from('ladder_view')
            .select('*')
            .order('rank', { ascending: true });

        if (error) throw error;

        // Load Fargo Ratings from JSON file
        let fargoData = {};
        try {
            const fs = require('fs');
            if (fs.existsSync(path.join(__dirname, 'fargo_ratings.json'))) {
                fargoData = JSON.parse(fs.readFileSync(path.join(__dirname, 'fargo_ratings.json'), 'utf8'));
            }
        } catch (e) {
            logger.error('Error reading fargo_ratings.json', e);
        }

        // Map to expected format
        const leaderboard = data.map(item => {
            const fargoEntry = fargoData[item.name_shown] || {};
            
            return {
                rank: item.rank,
                displayName: item.name_shown, 
                wins: item.wins || 0,
                losses: item.losses || 0,
                rating: item.rating || 1500, // Internal Rating
                fargo: fargoEntry.rating || 'N/A',
                robustness: fargoEntry.robustness || 'N/A'
            };
        });

        res.json(leaderboard);
    } catch (error) {
        logger.error('Error fetching leaderboard', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// LOGIN (Proxy to Supabase Auth)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    let displayName = req.body.displayName;
    
    // Construct email if not provided
    let loginEmail = email;
    if (!loginEmail || !loginEmail.includes('@')) {
        if (!displayName) {
             // specific fallback if both are missing
             displayName = loginEmail; 
        }
        if (displayName) {
             loginEmail = `${displayName.replace(/\s+/g, '.').toLowerCase()}@topofthecapital.local`;
        } else {
             return res.status(400).json({ error: "Please provide a valid Name or Email." });
        }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password
    });

    if (error) return res.status(401).json({ error: error.message });

    // Fetch profile to get display name
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

    res.json({
        message: 'Login successful',
        token: data.session.access_token,
        user: {
            id: data.user.id,
            displayName: profile?.display_name || displayName || loginEmail,
            email: data.user.email,
            is_admin: profile?.is_admin
        }
    });
});

// REGISTER (Proxy to Supabase Auth)
app.post('/api/register', async (req, res) => {
    const { password, displayName } = req.body;
    let { email } = req.body;

    // Construct email from displayName if missing
    if (!email && displayName) {
        email = `${displayName.replace(/\s+/g, '.').toLowerCase()}@topofthecapital.local`;
    }

    if (!email || !password) {
        return res.status(400).json({ error: "Missing required fields (Name/Email, Password)" });
    }

    // Supabase Auth SignUp
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                display_name: displayName // Meta data
            }
        }
    });

    if (error) return res.status(400).json({ error: error.message });

    // Create Profile entry if not triggered automatically
    // (Assuming Supabase triggers handle this, but if not we might need to insert)
    /*
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, display_name: displayName });
    */

    res.status(201).json({
        message: 'Registration successful! Please check your email to confirm.',
        user: { id: data.user?.id, email: data.user?.email, displayName }
    });
});

// GET ME
app.get('/api/me', authenticateToken, async (req, res) => {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();

    if (error) return res.status(404).json({ error: 'Profile not found' });

    res.json({
        id: req.user.id,
        email: req.user.email,
        displayName: profile.display_name,
        is_admin: profile.is_admin,
        photo_url: profile.photo_url,
        phone_number: profile.phone_number // Include phone number in /api/me response
    });
});

// UPDATE USER PHONE NUMBER
app.put('/api/me/phone', authenticateToken, async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    const { error } = await supabase
        .from('profiles')
        .update({ phone_number: phoneNumber })
        .eq('id', req.user.id);

    if (error) {
        logger.error('Error updating phone number', error);
        return res.status(500).json({ error: 'Failed to update phone number' });
    }

    res.json({ message: 'Phone number updated successfully' });
});

// CHALLENGES - GET (Matches)
// We map Supabase 'matches' to the App's 'challenges' format
app.get('/api/challenges/:id', authenticateToken, async (req, res) => {
    const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', req.params.id)
        .single();

    if (error) return res.status(404).json({ error: 'Match not found' });

    // Adapter: Transform DB columns to App keys if needed
    // Assuming we adjusted App to use DB columns OR we transform here.
    // Transforming here is safer for frontend compatibility.
    const challenge = {
        id: data.id,
        challengerId: data.challenger_id,
        targetName: data.target_name, // You might need to join profiles to get names if only IDs stored
        challengerName: data.challenger_name || 'Unknown', // Ideally fetch from profile join
        structure_id: data.structure_id, // discipline
        status: data.status,
        score: data.score,
        winner: data.winner_name,
        currentProposal: data.proposal ? JSON.parse(data.proposal) : null
    };

    res.json(challenge);
});



// CHALLENGES - CREATE
app.post('/api/challenges', authenticateToken, async (req, res) => {
    const { targetPlayer, discipline, gamesToWin } = req.body;

    // 1. Get Challenger Profile (already have ID from token, need name?)
    //    Actually, we can insert just IDs. But for the UI to be fast, maybe we store names too or join.
    //    Let's assume 'matches' has: challenger_id, target_id, challenger_name, target_name, ...

    // Get Target ID (User sends Target Name)
    // We need to look up the target ID from 'profiles' or 'ladder_view'
    const { data: targetProfile, error: targetError } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', targetPlayer) // Assuming unique display names!
        .single();

    if (targetError || !targetProfile) {
        return res.status(404).json({ error: 'Target player not found' });
    }

    const startPacket = {
        challenger_id: req.user.id,
        target_id: targetProfile.id,
        challenger_name: req.user.displayName || req.user.email, // Fallback
        target_name: targetPlayer,
        structure_id: discipline, // reuse column
        score: `0-0`,
        status: 'pending',
        proposal: null, // JSON
        target_score: gamesToWin // recycle column or add new 'meta' column
    };

    const { data: match, error: insertError } = await supabase
        .from('matches')
        .insert(startPacket)
        .select()
        .single();

    if (insertError) {
        logger.error('Match insert error', insertError);
        return res.status(500).json({ error: 'Failed to create challenge' });
    }

    // Adapt for frontend
    const responseChallenge = {
        id: match.id,
        challengerId: match.challenger_id,
        targetName: match.target_name,
        challengerName: match.challenger_name,
        discipline: match.structure_id,
        status: match.status,
        createdAt: match.created_at
    };

    io.emit('challengeEvent', { type: 'created', challenge: responseChallenge });
    res.status(201).json({ message: 'Challenge sent', challenge: responseChallenge });
});

// CHALLENGES - RESPOND
app.post('/api/challenges/:id/respond', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { type, venue, time } = req.body;

    // Fetch match
    const { data: match, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single();

    if (!match) return res.status(404).json({ error: 'Match not found' });

    // Validate permission
    if (match.challenger_id !== req.user.id && match.target_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    const updates = {};
    if (type === 'accept') {
        updates.status = 'scheduled';
        updates.proposal = JSON.stringify({ venue, time, accepted: true });
        // Maybe store 'venue' in real column if exists?
        // updates.venue_id = ...
    } else {
        updates.status = 'negotiating';
        updates.proposal = JSON.stringify({ venue, time, last_proposer: req.user.id });
    }

    const { error: updateError } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', id);

    if (updateError) return res.status(500).json({ error: 'Update failed' });

    io.emit('challengeEvent', { type: 'updated', challengeId: id });
    res.json({ message: 'Response recorded' });
});

// CHALLENGES - COMPLETE
app.post('/api/challenges/:id/complete', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { winner, score } = req.body; // winner is NAME

    // Get match
    const { data: match } = await supabase.from('matches').select('*').eq('id', id).single();
    if (!match) return res.status(404).json({ error: 'Match not found' });

    // Identify Winner ID
    // We have names, but need IDs for rigorous data.
    // If winner === match.challenger_name -> winnerId = match.challenger_id
    let winnerId = (winner === match.challenger_name) ? match.challenger_id : match.target_id;

    // Update Match
    const { error } = await supabase
        .from('matches')
        .update({
            status: 'completed',
            winner_name: winner,
            winner_id: winnerId,
            score: score,
            completed_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) return res.status(500).json({ error: 'Failed to complete' });

    // TRIGGER RANKING UPDATE? 
    // Usually handled by Database Function (Postgres Trigger).
    // If not, we can call an RPC.
    // await supabase.rpc('update_rankings', { match_id: id });

    // For now, assume generic update success.

    io.emit('challengeEvent', { type: 'completed', challengeId: id, winner, score });
    // Trigger leaderboard refresh
    io.emit('databaseSeeded', {});

    res.json({ message: 'Match completed' });
});

// CHALLENGES - MARK PAID
app.post('/api/challenges/:id/pay', authenticateToken, async (req, res) => {
    const { id } = req.params;
    // We infer the user from the token (req.user.id)

    const { data: match, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single();

    if (!match) return res.status(404).json({ error: 'Match not found' });

    // Determine which player paid
    const update = {};
    if (req.user.id === match.challenger_id) {
        update.p1_paid = true;
    } else if (req.user.id === match.target_id) {
        update.p2_paid = true;
    } else {
        return res.status(403).json({ error: 'Not a participant in this match' });
    }

    const { error: updateError } = await supabase
        .from('matches')
        .update(update)
        .eq('id', id);

    if (updateError) return res.status(500).json({ error: 'Failed to record payment' });

    io.emit('challengeEvent', { type: 'payment', challengeId: id, userId: req.user.id });
    res.json({ success: true, message: 'Payment recorded' });
});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/create-payment-intent', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 500, // $5.00 in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

const { AccessToken } = require('livekit-server-sdk');

app.post('/api/live/token', authenticateToken, async (req, res) => {
    const { matchId, isStreamer } = req.body;

    if (!matchId) {
        return res.status(400).json({ error: 'Match ID is required' });
    }

    const roomName = `match-${matchId}`;
    const participantName = req.user.displayName || req.user.email;

    const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
        identity: participantName,
    });

    const permissions = {
        room: roomName,
        roomJoin: true,
        canPublish: isStreamer,
        canSubscribe: true,
    };

    at.addGrant(permissions);

    res.json({ token: at.toJwt() });
});

app.post('/api/matches/:id/go-live', authenticateToken, async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('matches')
        .update({ status: 'live' })
        .eq('id', id);

    if (error) {
        logger.error('Error setting match to live', error);
        return res.status(500).json({ error: 'Failed to update match status' });
    }

    io.emit('challengeEvent', { type: 'live', challengeId: id });
    res.json({ message: 'Match is now live' });
});

// Socket.IO
io.on('connection', (socket) => {
    // console.log('User connected:', socket.id);

    socket.on('joinRoom', (room) => {
        socket.join(room);
        // console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
        // console.log('User disconnected');
    });
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// START SERVER
// Check if server is already listening (unlikely in this script structure but safe to keep one)
server.listen(PORT, () => {
    logger.info(`Supabase-integrated Server running on port ${PORT}`);
    logger.info(`Access the application at: http://localhost:${PORT}`);
});
