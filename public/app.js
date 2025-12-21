// Top of the Capital - Application Logic
let socket;
let currentUser = null;
let authToken = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeSocket();
    initializeEventListeners();
    populatePlayerDropdown();
    checkAuthStatus();
});

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    socket.on('challengeSent', (data) => {
        addActivityMessage(`${data.challenger} challenged ${data.target} to ${data.discipline}`);
    });

    socket.on('userRegistered', (data) => {
        addActivityMessage(`${data.displayName} joined the league`);
    });

    socket.on('userLoggedIn', (data) => {
        addActivityMessage(`${data.displayName} connected`);
    });

    socket.on('databaseSeeded', (data) => {
        addActivityMessage(`Database seeded with ${data.playersCount} players`);
        populatePlayerDropdown();
    });
}

// Initialize event listeners
function initializeEventListeners() {
    const playerSelect = document.getElementById('playerSelect');
    const authButton = document.getElementById('authButton');
    const adminSeed = document.getElementById('adminSeed');
    const logoutBtn = document.getElementById('logoutBtn');
    const sendChallenge = document.getElementById('sendChallenge');
    const targetPlayer = document.getElementById('targetPlayer');
    const avatarInput = document.getElementById('avatar');

    if (playerSelect) {
        playerSelect.addEventListener('change', handlePlayerSelection);
    }

    if (authButton) {
        authButton.addEventListener('click', handleAuthentication);
    }

    if (adminSeed) {
        adminSeed.addEventListener('click', handleAdminSeed);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    if (sendChallenge) {
        sendChallenge.addEventListener('click', handleSendChallenge);
    }

    if (targetPlayer) {
        targetPlayer.addEventListener('change', handleTargetSelection);
    }

    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarPreview);
    }
}

// Populate player dropdown
async function populatePlayerDropdown() {
    try {
        const response = await fetch('/api/leaderboard');
        const players = await response.json();

        const playerSelect = document.getElementById('playerSelect');
        const targetSelect = document.getElementById('targetPlayer');

        if (playerSelect) {
            // Clear existing options except the first one
            playerSelect.innerHTML = '<option value="">Choose your name...</option>';

            players.forEach(player => {
                // Allow ADMIN to login, so include in player select
                const option = document.createElement('option');
                option.value = player.displayName;
                option.textContent = player.displayName;
                playerSelect.appendChild(option);
            });
        }

        if (targetSelect && currentUser) {
            updateTargetDropdown(players);
        }

        updateRankingsDisplay(players);

    } catch (error) {
        console.error('Error populating player dropdown:', error);
    }
}

// Handle player selection
async function handlePlayerSelection() {
    const playerSelect = document.getElementById('playerSelect');
    const authForm = document.getElementById('authForm');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const authButton = document.getElementById('authButton');

    const selectedPlayer = playerSelect.value;

    if (!selectedPlayer) {
        authForm.classList.add('hidden');
        return;
    }

    try {
        // Check if user exists
        const response = await fetch('/api/check-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ displayName: selectedPlayer })
        });

        const result = await response.json();

        if (result.exists) {
            // Existing user - show login form
            welcomeMessage.innerHTML = `Welcome back, <strong>${selectedPlayer}</strong>!`;
            authButton.textContent = 'Login';
            authButton.onclick = () => handleLogin(selectedPlayer);
        } else {
            // New user - show signup form
            welcomeMessage.innerHTML = `Welcome, <strong>${selectedPlayer}</strong>!  
Let's create your account.`;
            authButton.textContent = 'Create Account';
            authButton.onclick = () => handleRegister(selectedPlayer);
        }

        authForm.classList.remove('hidden');

    } catch (error) {
        console.error('Error checking user:', error);
        showMessage('Error checking user status', 'error');
    }
}

// Handle authentication (login or register)
async function handleAuthentication() {
    const playerSelect = document.getElementById('playerSelect');
    const selectedPlayer = playerSelect.value;

    if (!selectedPlayer) {
        showMessage('Please select your name first', 'error');
        return;
    }

    const authButton = document.getElementById('authButton');
    if (authButton.textContent === 'Login') {
        await handleLogin(selectedPlayer);
    } else {
        await handleRegister(selectedPlayer);
    }
}

// Handle user login
async function handleLogin(displayName) {
    const password = document.getElementById('password').value;

    if (!password) {
        showMessage('Please enter your password', 'error');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ displayName, password })
        });

        const result = await response.json();

        if (response.ok) {
            currentUser = result.user;
            authToken = result.token;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            showDashboard();
            showMessage(`Welcome back, ${displayName}!`, 'success');
        } else {
            showMessage(result.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Login failed', 'error');
    }
}

// Handle user registration
async function handleRegister(displayName) {
    const password = document.getElementById('password').value;
    const avatarFile = document.getElementById('avatar').files[0];

    if (!password) {
        showMessage('Please enter a password', 'error');
        return;
    }

    let avatar = null;
    if (avatarFile) {
        avatar = await fileToBase64(avatarFile);
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ displayName, password, avatar })
        });

        const result = await response.json();

        if (response.ok) {
            currentUser = result.user;
            authToken = result.token;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            showDashboard();
            showMessage(`Account created successfully! Welcome, ${displayName}!`, 'success');
        } else {
            showMessage(result.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Registration failed', 'error');
    }
}

// Handle avatar preview
function handleAvatarPreview() {
    const avatarInput = document.getElementById('avatar');
    const avatarPreview = document.getElementById('avatarPreview');

    const file = avatarInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Avatar Preview">`;
        };
        reader.readAsDataURL(file);
    } else {
        avatarPreview.innerHTML = '';
    }
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Show dashboard
function showDashboard() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    updateUserStatus();
    populatePlayerDropdown(); // Refresh to update target dropdown
    loadNotificationsAndFeed();
}

// --- UPCOMING MATCHES & LIVE ARENA ---

// Load Upcoming Matches
async function loadUpcomingMatches() {
    if (!authToken || !currentUser) return;

    // We can reuse the notifications endpoint or filter locally if we had full list, 
    // but better to fetch fresh. For now, let's filter from local challenge list if available,
    // or fetch personal challenges.
    // Simulating "fetch scheduled" by filtering notifications or adding a specific endpoint would be best.
    // Let's rely on the notifications logic which already fetches challenges.
    // We will filter for 'scheduled' status.

    try {
        const response = await fetch('/api/notifications', { // This endpoint actually returns notifications, not full challenges
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        // Wait, notifications only reference challenges. We need to fetch challenges directly.
        // Let's use the /api/challenges endpoint if we have one for "my challenges", 
        // OR we can just fetch all notifications and for each challenge type, check status.
        // Optimization: Let's add a quick helper to app.js that iterates known challenges.

        // Let's allow clicking "Start" from the notification modal for now, OR
        // better: fetch specific challenge when opening the panel.

        // Simplified: Just clear the panel for now and populate when we find scheduled items in notifications?
        // No, that's unreliable. 
        // Let's fetch all challenges for the user. (Assuming we might need a new endpoint or reusing filtering).
        // For MVP, I will rely on the "Notifications" list which triggers `viewChallengeDetails`.
        // I will ALSO add a call to render "Upcoming" based on checking the last few notifications?
        // Better: Let's add `loadUpcomingMatches` to `updateUserStatus`.

        // Since I can't easily change the backend to add a new "my-matches" endpoint without risking stability,
        // I will use `GET /api/notifications` and then for any "negotiation" or "challenge" type, 
        // I'll peek at the challenge details.
        // actually that's too n+1. 
        // Let's just create the UI and rely on manual entry for now? No, user wants it in a panel.
        // I'll update `loadNotifications` (which I already have) to ALSO populate the upcoming panel side-effect.

    } catch (e) {
        console.error(e);
    }
}

// Side-effect: When loading notifications, also scan for SCHEDULED challenges to populate the upcoming panel
async function populateUpcomingPanel(notifications) {
    const upcomingContainer = document.getElementById('upcomingContent');
    const scheduledMatches = [];

    // This is inefficient but safe without backend changes: 
    // fetch details for unique challengeIDs found in notifications
    const uniueChallengeIds = [...new Set(notifications.map(n => n.challengeId).filter(id => id))];

    for (const id of uniueChallengeIds) {
        try {
            const res = await fetch(`/api/challenges/${id}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (res.ok) {
                const c = await res.json();
                if (c.status === 'scheduled') {
                    scheduledMatches.push(c);
                }
            }
        } catch (e) { }
    }

    if (scheduledMatches.length === 0) {
        upcomingContainer.innerHTML = '<div class="empty-state">No scheduled matches</div>';
    } else {
        upcomingContainer.innerHTML = scheduledMatches.map(m => `
            <div class="upcoming-match-item">
                <div class="match-info-mini">
                    <h4>vs ${m.challengerId === currentUser.id ? m.targetName : m.challengerName}</h4>
                    <p>${m.discipline} • Race to ${m.gamesToWin}</p>
                    <p style="font-size: 0.8rem; opacity: 0.8;">${m.currentProposal.venue} @ ${new Date(m.currentProposal.time).toLocaleString()}</p>
                </div>
                <button class="start-btn" onclick="openLiveMatch('${m.id}')">START MATCH</button>
            </div>
        `).join('');
    }
}


// --- LIVE MATCH FUNCTIONS ---

let currentStream = null;
let activeChallengeId = null;
let liveScores = { p1: 0, p2: 0 };

async function openLiveMatch(challengeId) {
    try {
        const response = await fetch(`/api/challenges/${challengeId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const challenge = await response.json();

        activeChallengeId = challengeId;
        liveScores = { p1: 0, p2: 0 };

        // Populate Modal
        document.getElementById('liveP1Name').textContent = challenge.challengerName;
        document.getElementById('liveP2Name').textContent = challenge.targetName;
        document.getElementById('liveP1Score').textContent = '0';
        document.getElementById('liveP2Score').textContent = '0';
        document.getElementById('liveRaceTo').textContent = challenge.gamesToWin;

        const modal = document.getElementById('liveMatchModal');
        const videoSection = modal.querySelector('.video-section');

        // CONDITIONAL STREAM LOGIN
        const enableVideo = confirm("Would you like to ENABLE LIVE STREAMING for this match?\n\n- Click OK to enable Camera\n- Click Cancel for Scoreboard Only");

        modal.classList.remove('hidden');

        if (enableVideo) {
            videoSection.style.display = 'block';
            startCamera();
        } else {
            videoSection.style.display = 'none';
        }

    } catch (e) {
        console.error('Error opening live match:', e);
        showMessage('Failed to load match details', 'error');
    }
}

function closeLiveMatch() {
    stopCamera();
    document.getElementById('liveMatchModal').classList.add('hidden');
    activeChallengeId = null;
}

async function startCamera() {
    try {
        const video = document.getElementById('liveVideo');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        currentStream = stream;
        video.srcObject = stream;
    } catch (e) {
        console.error('Camera error:', e);
        showMessage('Could not access camera. Ensure permissions are granted.', 'error');
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

function toggleCamera() {
    if (currentStream) {
        stopCamera();
    } else {
        startCamera();
    }
}

function updateLiveScore(player, delta) {
    if (player === 'p1') {
        liveScores.p1 = Math.max(0, liveScores.p1 + delta);
        document.getElementById('liveP1Score').textContent = liveScores.p1;
    } else {
        liveScores.p2 = Math.max(0, liveScores.p2 + delta);
        document.getElementById('liveP2Score').textContent = liveScores.p2;
    }
}

async function endLiveMatch() {
    if (!activeChallengeId) return;

    const p1Name = document.getElementById('liveP1Name').textContent;
    const p2Name = document.getElementById('liveP2Name').textContent;
    const scoreStr = `${liveScores.p1}-${liveScores.p2}`;

    // Determine winner based on score
    let winnerName = null;
    if (liveScores.p1 > liveScores.p2) winnerName = p1Name;
    else if (liveScores.p2 > liveScores.p1) winnerName = p2Name;
    else {
        showMessage('Cannot submit a tie! Play one more game.', 'error');
        return;
    }

    if (confirm(`End match? Winner: ${winnerName} (${scoreStr})`)) {
        try {
            // Reuse existing complete endpoint
            const response = await fetch(`/api/challenges/${activeChallengeId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ winner: winnerName, score: scoreStr })
            });

            if (handleAuthError(response)) return;

            if (response.ok) {
                showMessage('Match Report Submitted!', 'success');
                closeLiveMatch();
                toggleNotifications(); // Force refresh
                populatePlayerDropdown(); // Refresh feed/rankings
            } else {
                showMessage('Error submitting result', 'error');
            }
        } catch (e) {
            console.error(e);
        }
    }
}


// --- EXISTING FUNCTIONS UPDATED ---

// Update user status display
function updateUserStatus() {
    if (currentUser) {
        document.getElementById('currentUser').textContent = currentUser.displayName;
        document.getElementById('userRating').textContent = '';
        document.getElementById('challengeForm').classList.remove('hidden');
        document.getElementById('userControls').classList.remove('hidden');
        loadNotifications(); // Initial load
    } else {
        document.getElementById('userControls').classList.add('hidden');
    }
}

// Toggle Notifications Modal
async function toggleNotifications() {
    const modal = document.getElementById('notifModal');
    modal.classList.toggle('hidden');

    if (!modal.classList.contains('hidden')) {
        loadNotifications();
        document.getElementById('notifBadge').classList.add('hidden');

        // Mark as read on server
        try {
            await fetch('/api/notifications/read', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        } catch (e) {
            console.error('Failed to mark notifications read', e);
        }
    }
}

// Load Notifications (Appends to Feed + Updates Badge/Modal)
async function loadNotifications() {
    if (!authToken) return;

    try {
        const response = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const notifications = await response.json();

        // Populate Upcoming Panel (Side Effect)
        populateUpcomingPanel(notifications);

        const unreadCount = notifications.filter(n => !n.read).length;

        // Update Badge
        const badge = document.getElementById('notifBadge');
        badge.textContent = unreadCount;
        unreadCount > 0 ? badge.classList.remove('hidden') : badge.classList.add('hidden');

        // Update Modal Content
        const modalBody = document.getElementById('modalBody');
        if (notifications.length === 0) {
            modalBody.innerHTML = '<div class="empty-state">No new notifications</div>';
        } else {
            modalBody.innerHTML = notifications.map(n => renderNotificationItem(n)).join('');
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Render individual notification item
function renderNotificationItem(n) {
    let actionBtn = '';
    // Only show "View Details" if it's related to a challenge AND not just an info message
    // BUT we want to see details even for completed matches to confirm result?
    // Let's allow viewing details for all challenge types.
    if (n.challengeId) {
        actionBtn = `<button class="view-btn" onclick="viewChallengeDetails('${n.challengeId}')">View Details</button>`;
    }

    return `
        <div class="notif-item ${n.read ? '' : 'unread'}">
            <div class="notif-content">
                <p>${n.message}</p>
                <small style="color: #888;">${new Date(n.createdAt).toLocaleString()}</small>
            </div>
            <div class="notif-actions">
                ${actionBtn}
            </div>
        </div>
    `;
}

// View Challenge Details (Fetch current state and show negotiation UI)
async function viewChallengeDetails(challengeId) {
    try {
        const response = await fetch(`/api/challenges/${challengeId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (handleAuthError(response)) return;
        const challenge = await response.json();

        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = renderNegotiationUI(challenge);

    } catch (error) {
        console.error('Error fetching challenge details:', error);
    }
}

// Render Negotiation UI
function renderNegotiationUI(challenge) {
    const isChallenger = challenge.challengerId === currentUser.id;
    const opponentName = isChallenger ? challenge.targetName : challenge.challengerName;
    const lastActionByMe = challenge.lastActionBy === currentUser.id;

    // Default values for form
    const venueValue = challenge.currentProposal?.venue || 'Eagles 4040';
    const timeValue = challenge.currentProposal?.time || '';

    let actionSection = '';

    if (challenge.status === 'completed') {
        actionSection = `
            <div class="success-message" style="text-align: center; border-color: #ffd700;">
                <h4>MATCH FINALIZED</h4>
                <p>Winner: <span style="color: #ffd700; font-weight: bold;">${challenge.winner}</span></p>
                <p>Score: ${challenge.score}</p>
                <p style="font-size: 0.9rem; color: #888;">Recorded at: ${new Date(challenge.completedAt).toLocaleString()}</p>
            </div>
            <div style="text-align: center; margin-top: 15px;">
                <p style="color: #a8c090; font-style: italic;">No further action required.</p>
            </div>
        `;
    } else if (challenge.status === 'scheduled') {
        actionSection = `
            <div class="success-message">MATCH SCHEDULED for ${challenge.currentProposal.time} @ ${challenge.currentProposal.venue}</div>
            
            <div class="result-form" style="margin-top: 20px; border-top: 1px solid #87a96b; padding-top: 15px;">
                <button class="confirm-btn" onclick="openLiveMatch('${challenge.id}')" style="width: 100%; margin-bottom: 10px; background: linear-gradient(135deg, #f57f17 0%, #e65100 100%) !important; border-color: #ff9800;">🎥 START LIVE MATCH</button>
                
                <h4>Report Final Result</h4>
                <div class="form-group">
                    <label>Winner:</label>
                    <select id="resultWinner">
                        <option value="${challenge.challengerName}">${challenge.challengerName}</option>
                        <option value="${challenge.targetName}">${challenge.targetName}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Score (e.g. 7-5):</label>
                    <input type="text" id="resultScore" placeholder="Enter score" style="width: 100%; padding: 8px; background: rgba(30,30,30,0.95); border: 1px solid #87a96b; color: #f5f5dc; border-radius: 4px;">
                </div>
                <button class="confirm-btn" onclick="submitResult('${challenge.id}')" style="width: 100%;">Submit Result</button>
            </div>
        `;
    } else if (lastActionByMe && challenge.status !== 'pending') {
        actionSection = `<div class="waiting-message">Waiting for ${opponentName} to respond...</div>`;
    } else {
        // It's my turn to respond (or first time seeing it)
        actionSection = `
            <div class="proposal-form">
                <div class="form-group">
                    <label>Select Venue:</label>
                    <select id="proposalVenue">
                        <option value="Eagles 4040" ${venueValue === 'Eagles 4040' ? 'selected' : ''}>Eagles 4040</option>
                        <option value="Valley Hub" ${venueValue === 'Valley Hub' ? 'selected' : ''}>Valley Hub</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Select Time:</label>
                    <div class="date-inputs">
                        <input type="datetime-local" id="proposalTime" value="${timeValue}">
                    </div>
                </div>
                <div class="action-buttons">
                    <button class="counter-btn" onclick="submitProposal('${challenge.id}', 'propose')">Propose New Terms</button>
                    ${challenge.status === 'negotiating' ? `<button class="confirm-btn" onclick="submitProposal('${challenge.id}', 'accept')">Accept & Confirm</button>` : ''}
                </div>
            </div>
        `;
    }

    return `
        <div class="negotiation-card">
            <h3>Match vs ${opponentName}</h3>
            <div class="challenge-specs">
                <p><strong>Discipline:</strong> ${challenge.discipline}</p>
                <p><strong>Race:</strong> ${challenge.gamesToWin} wins</p>
                <p><strong>Status:</strong> ${challenge.status.toUpperCase()}</p>
            </div>
            ${actionSection}
            <button class="view-btn" style="margin-top: 15px;" onclick="loadNotifications()">← Back to List</button>
        </div>
    `;
}

// Submit Match Result
async function submitResult(challengeId) {
    const winner = document.getElementById('resultWinner').value;
    const score = document.getElementById('resultScore').value;

    if (!score) {
        showMessage('Please enter the final score', 'error');
        return;
    }

    if (confirm(`Confirm ${winner} won with score ${score}? This will update rankings.`)) {
        try {
            const response = await fetch(`/api/challenges/${challengeId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ winner, score })
            });

            if (handleAuthError(response)) return;
            const result = await response.json();

            if (response.ok) {
                showMessage('Match result submitted! Rankings updated.', 'success');
                toggleNotifications(); // Close modal
                populatePlayerDropdown(); // Refresh rankings on dashboard
            } else {
                showMessage(result.error || 'Failed to submit result', 'error');
            }
        } catch (error) {
            console.error('Error submitting result:', error);
            showMessage('Error submitting result', 'error');
        }
    }
}

// Submit Proposal/Acceptance
async function submitProposal(challengeId, type) {
    const venue = document.getElementById('proposalVenue').value;
    const time = document.getElementById('proposalTime').value;

    if (!time) {
        showMessage('Please select a date and time', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/challenges/${challengeId}/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ type, venue, time })
        });

        if (handleAuthError(response)) return;
        const result = await response.json();

        if (response.ok) {
            showMessage(type === 'accept' ? 'Match Confirmed!' : 'Proposal Sent!', 'success');
            loadNotifications(); // Go back to list
        } else {
            showMessage(result.error || 'Failed to submit', 'error');
        }
    } catch (error) {
        console.error('Error submitting proposal:', error);
    }
}

// Global error handler
window.addEventListener('error', function (e) {
    console.error('Global error:', e.error);
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', function (e) {
    console.error('Unhandled promise rejection:', e.reason);
});

// Update target dropdown for challenges
function updateTargetDropdown(players) {
    const targetSelect = document.getElementById('targetPlayer');
    if (!targetSelect || !currentUser) return;

    targetSelect.innerHTML = '<option value="">Choose opponent...</option>';

    const currentUserRank = players.findIndex(p => p.displayName === currentUser.displayName) + 1;

    players.forEach((player, index) => {
        const playerRank = index + 1;
        const rankDifference = Math.abs(playerRank - currentUserRank);

        if (player.displayName !== currentUser.displayName &&
            player.displayName !== 'ADMIN' &&
            rankDifference <= 5) {
            const option = document.createElement('option');
            option.value = player.displayName;
            option.textContent = `${player.displayName} (Rank #${playerRank})`;
            targetSelect.appendChild(option);
        }
    });
}

// Handle target selection
function handleTargetSelection() {
    const targetSelect = document.getElementById('targetPlayer');
    const targetInfo = document.getElementById('targetInfo');

    const selectedTarget = targetSelect.value;
    if (selectedTarget) {
        targetInfo.textContent = `TARGET ACQUIRED: ${selectedTarget.toUpperCase()}`;
        targetInfo.style.color = '#87a96b';
    } else {
        targetInfo.textContent = '';
    }
}

// Handle send challenge
async function handleSendChallenge() {
    const targetPlayer = document.getElementById('targetPlayer').value;
    const discipline = document.getElementById('discipline').value;
    const gamesToWin = document.getElementById('gamesToWin').value;

    if (!targetPlayer) {
        showMessage('Please select an opponent', 'error');
        return;
    }

    try {
        const response = await fetch('/api/challenges', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ targetPlayer, discipline, gamesToWin })
        });

        if (handleAuthError(response)) return;

        const result = await response.json();

        if (response.ok) {
            showMessage(`Challenge sent to ${targetPlayer}!`, 'success');
            document.getElementById('targetPlayer').value = '';
            document.getElementById('targetInfo').textContent = '';
        } else {
            showMessage(result.error || 'Failed to send challenge', 'error');
        }
    } catch (error) {
        console.error('Challenge error:', error);
        showMessage('Failed to send challenge', 'error');
    }
}

// Handle authorized fetch response
function handleAuthError(response) {
    if (response.status === 401 || response.status === 403) {
        showMessage('Session expired. Please log in again.', 'error');
        handleLogout();
        return true;
    }
    return false;
}

// Handle admin seed
async function handleAdminSeed() {
    if (confirm('This will populate the database with demo data. Continue?')) {
        try {
            const response = await fetch('/api/admin/seed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                showMessage(`Database seeded with ${result.playersAdded} players!`, 'success');
                populatePlayerDropdown();
            } else {
                showMessage(result.error || 'Failed to seed database', 'error');
            }
        } catch (error) {
            console.error('Seed error:', error);
            showMessage('Failed to seed database', 'error');
        }
    }
}

// Handle logout
function handleLogout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');

    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('authForm').classList.add('hidden');
    document.getElementById('playerSelect').value = '';
    document.getElementById('password').value = '';

    showMessage('Logged out successfully', 'success');
}

// Check authentication status on page load
function checkAuthStatus() {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');

    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }
}

// Load notifications and feed
async function loadNotificationsAndFeed() {
    if (!authToken) return;

    try {
        // Fetch notifications to interleave with activity
        const response = await fetch('/api/notifications', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const notifications = await response.json();

        // Add notifications to activity feed
        notifications.forEach(note => {
            addActivityMessage(note.message, 'notification');
        });

    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Update rankings display
function updateRankingsDisplay(players) {
    const rankingsContent = document.getElementById('rankingsContent');
    if (!rankingsContent) return;

    if (players.length === 0) {
        rankingsContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏆</div>
                <div>No players found</div>
            </div>`;
        return;
    }

    // Filter out ADMIN from rankings display
    const validPlayers = players.filter(p => p.displayName !== 'ADMIN');

    // Find current user's rank index among valid players
    let currentUserRankIndex = -1;
    if (currentUser) {
        currentUserRankIndex = validPlayers.findIndex(p => p.displayName === currentUser.displayName);
    }

    const rankingsHTML = validPlayers.slice(0, 70).map((player, index) => {
        const isCurrentUser = currentUser && player.displayName === currentUser.displayName;
        const userIndicator = isCurrentUser ? ' [YOU]' : '';
        const rowClass = isCurrentUser ? 'ranking-item current-user-rank' : 'ranking-item';

        // Calculate rank difference if current user is found
        let canChallenge = false;
        if (currentUser && !isCurrentUser && player.displayName !== 'ADMIN' && currentUserRankIndex !== -1) {
            const rankDiff = Math.abs(index - currentUserRankIndex);
            if (rankDiff <= 5) {
                canChallenge = true;
            }
        }

        const challengeButton = canChallenge
            ? `<button class="challenge-button" onclick="quickChallenge('${player.displayName}')">⚔️ CHALLENGE</button>`
            : '';

        return `
            <div class="${rowClass}">
                <div class="player-info">
                    <div class="player-name">${player.displayName}${userIndicator}</div>
                    <div class="player-stats">W:${player.wins} L:${player.losses}</div>
                </div>
                ${challengeButton}
            </div>
        `;
    }).join('');

    rankingsContent.innerHTML = rankingsHTML;
}

// function updateNotificationsDisplay(notifications) { ... } removed

// Quick challenge function
function quickChallenge(playerName) {
    if (!currentUser) {
        showMessage('Please log in first', 'error');
        return;
    }

    document.getElementById('targetPlayer').value = playerName;
    handleTargetSelection();

    // Scroll to challenge section
    document.querySelector('.challenge-panel').scrollIntoView({ behavior: 'smooth' });
}

// Add activity message
function addActivityMessage(message, type = null) {
    const activityContent = document.getElementById('activityContent');
    if (!activityContent) return;

    const timestamp = new Date().toLocaleTimeString();
    const activityHTML = `
        <div class="activity-item ${type ? 'activity-' + type : ''}">
            <div class="activity-message">${message}</div>
            <div class="activity-time">${timestamp}</div>
        </div>
    `;

    if (activityContent.innerHTML.includes('Activity feed quiet')) {
        activityContent.innerHTML = activityHTML;
    } else {
        activityContent.insertAdjacentHTML('afterbegin', activityHTML);
    }

    // Keep only last 20 activities
    const activities = activityContent.querySelectorAll('.activity-item');
    if (activities.length > 20) {
        activities[activities.length - 1].remove();
    }
}

// Show message function
function showMessage(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon based on type
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
        <span style="margin-right: 12px; font-size: 1.2rem;">${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 4000);
}

// Global error handler
window.addEventListener('error', function (e) {
    console.error('Global error:', e.error);
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', function (e) {
    console.error('Unhandled promise rejection:', e.reason);
});
