// Top of the Capital - Application Logic
let socket;
let currentUser = null;
let authToken = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
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
                if (player.displayName !== 'ADMIN') {
                    const option = document.createElement('option');
                    option.value = player.displayName;
                    option.textContent = player.displayName;
                    playerSelect.appendChild(option);
                }
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
            welcomeMessage.innerHTML = `Welcome back, <strong>${selectedPlayer}</strong>!  
Rating: ${result.user.rating}`;
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
        reader.onload = function(e) {
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
    loadNotifications();
}

// Update user status display
function updateUserStatus() {
    if (currentUser) {
        document.getElementById('currentUser').textContent = currentUser.displayName;
        document.getElementById('userRating').textContent = `Rating: ${currentUser.rating}`;
        document.getElementById('challengeForm').classList.remove('hidden');
    }
}

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

// Load notifications
async function loadNotifications() {
    if (!authToken) return;
    
    try {
        const response = await fetch('/api/notifications', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const notifications = await response.json();
        updateNotificationsDisplay(notifications);
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Update rankings display
function updateRankingsDisplay(players) {
    const rankingsContent = document.getElementById('rankingsContent');
    if (!rankingsContent) return;
    
    if (players.length === 0) {
        rankingsContent.innerHTML = '<div class="loading-message">No players found</div>';
        return;
    }
    
    const rankingsHTML = players.slice(0, 10).map((player, index) => {
        const isCurrentUser = currentUser && player.displayName === currentUser.displayName;
        const userIndicator = isCurrentUser ? ' [YOU]' : '';
        const challengeButton = !isCurrentUser && currentUser && player.displayName !== 'ADMIN' 
            ? `<button class="challenge-button" onclick="quickChallenge('${player.displayName}')">⚔️ CHALLENGE</button>` 
            : '';
        
        return `
            <div class="ranking-item">
                <div class="player-info">
                    <div class="player-name">${index + 1}. ${player.displayName}${userIndicator}</div>
                    <div class="player-stats">Rating: ${player.rating} | W:${player.wins} L:${player.losses}</div>
                </div>
                ${challengeButton}
            </div>
        `;
    }).join('');
    
    rankingsContent.innerHTML = rankingsHTML;
}

// Update notifications display
function updateNotificationsDisplay(notifications) {
    const notificationsContent = document.getElementById('notificationsContent');
    if (!notificationsContent) return;
    
    if (notifications.length === 0) {
        notificationsContent.innerHTML = '<div class="empty-state">No new correspondence</div>';
        return;
    }
    
    const notificationsHTML = notifications.slice(0, 5).map(notification => `
        <div class="notification-item">
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${new Date(notification.createdAt).toLocaleString()}</div>
        </div>
    `).join('');
    
    notificationsContent.innerHTML = notificationsHTML;
}

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
function addActivityMessage(message) {
    const activityContent = document.getElementById('activityContent');
    if (!activityContent) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const activityHTML = `
        <div class="activity-item">
            <div class="activity-message">${message}</div>
            <div class="activity-time">${timestamp}</div>
        </div>
    `;
    
    if (activityContent.innerHTML.includes('Activity feed quiet')) {
        activityContent.innerHTML = activityHTML;
    } else {
        activityContent.insertAdjacentHTML('afterbegin', activityHTML);
    }
    
    // Keep only last 10 activities
    const activities = activityContent.querySelectorAll('.activity-item');
    if (activities.length > 10) {
        activities[activities.length - 1].remove();
    }
}

// Show message function
function showMessage(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#d32f2f' : type === 'success' ? '#2e7d32' : '#1976d2'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-family: 'Cormorant Garamond', serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
});
