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
    socket.on('connect', () => console.log('Connected to server'));
    socket.on('disconnect', () => console.log('Disconnected from server'));
    socket.on('challengeSent', data => addActivityMessage(`${data.challenger} challenged ${data.target} to ${data.discipline}`));
    socket.on('userRegistered', data => addActivityMessage(`${data.displayName} joined the league`));
    socket.on('userLoggedIn', data => addActivityMessage(`${data.displayName} connected`));
    socket.on('databaseSeeded', data => {
        addActivityMessage(`Database seeded with ${data.playersCount} players`);
        populatePlayerDropdown();
    });
}

// Initialize event listeners
function initializeEventListeners() {
    // Auth tabs
    document.getElementById('loginTab')?.addEventListener('click', () => showForm('login'));
    document.getElementById('registerTab')?.addEventListener('click', () => showForm('register'));

    // Auth buttons
    document.getElementById('loginButton')?.addEventListener('click', handleLogin);
    document.getElementById('registerButton')?.addEventListener('click', handleRegister);

    // Password toggles with keyboard support
    document.getElementById('toggleLoginPassword')?.addEventListener('click', () => togglePassword('loginPassword'));
    document.getElementById('toggleLoginPassword')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePassword('loginPassword');
        }
    });
    document.getElementById('toggleRegisterPassword')?.addEventListener('click', () => togglePassword('registerPassword'));
    document.getElementById('toggleRegisterPassword')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePassword('registerPassword');
        }
    });

    // Avatar preview
    document.getElementById('registerAvatar')?.addEventListener('change', handleAvatarPreview);

    // Form validation
    document.getElementById('registerDisplayName')?.addEventListener('input', validateDisplayName);
    document.getElementById('registerPassword')?.addEventListener('input', validatePassword);

    // Forgot password
    document.getElementById('forgotPassword')?.addEventListener('click', handleForgotPassword);

    // Other listeners
    document.getElementById('adminSeed')?.addEventListener('click', handleAdminSeed);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('sendChallenge')?.addEventListener('click', handleSendChallenge);
    document.getElementById('targetPlayer')?.addEventListener('change', handleTargetSelection);

    // Enter key support for forms
    document.getElementById('loginPassword')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('registerPassword')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
}

// Show the selected auth form (login or register)
function showForm(formName) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');

    if (formName === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginTab.classList.add('active');
        loginTab.setAttribute('aria-selected', 'true');
        registerTab.classList.remove('active');
        registerTab.setAttribute('aria-selected', 'false');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        loginTab.classList.remove('active');
        loginTab.setAttribute('aria-selected', 'false');
        registerTab.classList.add('active');
        registerTab.setAttribute('aria-selected', 'true');
    }
    
    // Clear any validation messages when switching forms
    const validationElements = document.querySelectorAll('.validation-message, .auth-status');
    validationElements.forEach(el => {
        el.textContent = '';
        el.className = el.className.replace(/show|success|error/g, '').trim();
    });
}

// Toggle password visibility
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(`toggle${inputId.charAt(0).toUpperCase() + inputId.slice(1)}`);
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleIcon.textContent = '👁️';
    }
}

// Populate player dropdown for login
async function populatePlayerDropdown() {
    try {
        const response = await fetch('/api/leaderboard');
        const players = await response.json();
        
        const loginPlayerSelect = document.getElementById('loginPlayerSelect');
        const targetSelect = document.getElementById('targetPlayer');
        
        if (loginPlayerSelect) {
            const currentSelection = loginPlayerSelect.value;
            loginPlayerSelect.innerHTML = '<option value="">Choose your name...</option>';
            players.forEach(player => {
                if (player.displayName !== 'ADMIN') {
                    const option = document.createElement('option');
                    option.value = player.displayName;
                    option.textContent = player.displayName;
                    loginPlayerSelect.appendChild(option);
                }
            });
            loginPlayerSelect.value = currentSelection;
        }
        
        if (targetSelect && currentUser) {
            updateTargetDropdown(players);
        }
        
        updateRankingsDisplay(players);
        
    } catch (error) {
        console.error('Error populating player dropdown:', error);
    }
}

// Handle user login
async function handleLogin() {
    const displayName = document.getElementById('loginPlayerSelect').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginButton = document.getElementById('loginButton');
    const loginStatus = document.getElementById('loginStatus');
    
    // Clear previous status
    loginStatus.textContent = '';
    
    if (!displayName) {
        showFormError('Please select your name', 'loginStatus');
        return;
    }
    if (!password) {
        showFormError('Please enter your password', 'loginStatus');
        return;
    }
    
    // Show loading state
    setButtonLoading(loginButton, true);
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentUser = result.user;
            authToken = result.token;
            
            // Handle remember me
            if (rememberMe) {
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                localStorage.setItem('rememberMe', 'true');
                localStorage.setItem('loginExpiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString()); // 30 days
            } else {
                // Session storage for temporary login
                sessionStorage.setItem('authToken', authToken);
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            
            showFormSuccess(`Welcome back, ${displayName}!`, 'loginStatus');
            setTimeout(() => {
                showDashboard();
            }, 1000);
        } else {
            showFormError(result.error || 'Invalid credentials. Please check your name and password.', 'loginStatus');
        }
    } catch (error) {
        console.error('Login error:', error);
        showFormError('Connection error. Please try again.', 'loginStatus');
    } finally {
        setButtonLoading(loginButton, false);
    }
}

// Handle user registration
async function handleRegister() {
    const displayName = document.getElementById('registerDisplayName').value;
    const password = document.getElementById('registerPassword').value;
    const avatarFile = document.getElementById('registerAvatar').files[0];
    const registerButton = document.getElementById('registerButton');
    const registerStatus = document.getElementById('registerStatus');
    
    // Clear previous status
    registerStatus.textContent = '';
    
    // Validate form
    if (!validateDisplayName() || !validatePassword()) {
        showFormError('Please fix the errors above', 'registerStatus');
        return;
    }
    
    if (!displayName) {
        showFormError('Please enter a display name', 'registerStatus');
        return;
    }
    if (!password) {
        showFormError('Please enter a password', 'registerStatus');
        return;
    }
    
    // Show loading state
    setButtonLoading(registerButton, true);
    
    let avatar = null;
    if (avatarFile) {
        if (avatarFile.size > 2 * 1024 * 1024) { // 2MB limit
            showFormError('Avatar file must be smaller than 2MB', 'registerStatus');
            setButtonLoading(registerButton, false);
            return;
        }
        avatar = await fileToBase64(avatarFile);
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName, password, avatar })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentUser = result.user;
            authToken = result.token;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showFormSuccess(`Account created successfully! Welcome, ${displayName}!`, 'registerStatus');
            setTimeout(() => {
                showDashboard();
            }, 1500);
        } else {
            showFormError(result.error || 'Registration failed. Please try again.', 'registerStatus');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showFormError('Connection error. Please try again.', 'registerStatus');
    } finally {
        setButtonLoading(registerButton, false);
    }
}

// Handle avatar preview for registration form
function handleAvatarPreview() {
    const avatarInput = document.getElementById('registerAvatar');
    const avatarPreview = document.getElementById('registerAvatarPreview');
    
    const file = avatarInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
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

// Show dashboard and hide auth section
function showDashboard() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    updateUserStatus();
    populatePlayerDropdown(); // Refresh to update target dropdown
    loadNotifications();
}

// Update user status display in dashboard
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
        
        if (player.displayName !== currentUser.displayName && player.displayName !== 'ADMIN' && rankDifference <= 5) {
            const option = document.createElement('option');
            option.value = player.displayName;
            option.textContent = `${player.displayName} (Rank #${playerRank})`;
            targetSelect.appendChild(option);
        }
    });
}

// Handle target selection for challenges
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

// Handle sending a challenge
async function handleSendChallenge() {
    const targetPlayer = document.getElementById('targetPlayer').value;
    const discipline = document.getElementById('discipline').value;
    const gamesToWin = document.getElementById('gamesToWin').value;
    
    if (!targetPlayer) return showMessage('Please select an opponent', 'error');
    
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

// Handle admin database seeding
async function handleAdminSeed() {
    if (confirm('This will populate the database with demo data. Continue?')) {
        try {
            const response = await fetch('/api/admin/seed', { method: 'POST' });
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

// Handle user logout
function handleLogout() {
    currentUser = null;
    authToken = null;
    
    // Clear all storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('loginExpiry');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');

    // Reset forms
    showForm('login');
    document.getElementById('loginPlayerSelect').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('rememberMe').checked = false;
    document.getElementById('registerDisplayName').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerAvatar').value = '';
    document.getElementById('registerAvatarPreview').innerHTML = '';
    
    // Clear validation messages
    const validationElements = document.querySelectorAll('.validation-message, .auth-status');
    validationElements.forEach(el => {
        el.textContent = '';
        el.className = el.className.replace(/show|success|error/g, '').trim();
    });
    
    showMessage('Logged out successfully', 'success');
}

// Check authentication status on page load
function checkAuthStatus() {
    // Check for remember me first
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    const rememberMe = localStorage.getItem('rememberMe');
    const loginExpiry = localStorage.getItem('loginExpiry');
    
    // Check session storage for temporary login
    const sessionToken = sessionStorage.getItem('authToken');
    const sessionUser = sessionStorage.getItem('currentUser');
    
    if (rememberMe && savedToken && savedUser && loginExpiry) {
        if (Date.now() < parseInt(loginExpiry)) {
            authToken = savedToken;
            currentUser = JSON.parse(savedUser);
            document.getElementById('rememberMe').checked = true;
            showDashboard();
            return;
        } else {
            // Expired, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('loginExpiry');
        }
    }
    
    if (sessionToken && sessionUser) {
        authToken = sessionToken;
        currentUser = JSON.parse(sessionUser);
        showDashboard();
    }
}

// Enhanced form validation functions
function validateDisplayName() {
    const displayName = document.getElementById('registerDisplayName').value;
    const validation = document.getElementById('nameValidation');
    
    if (!displayName) {
        showValidationMessage(validation, '', '');
        return false;
    }
    
    if (displayName.length < 3) {
        showValidationMessage(validation, 'Display name must be at least 3 characters', 'error');
        return false;
    }
    
    if (displayName.length > 20) {
        showValidationMessage(validation, 'Display name must be less than 20 characters', 'error');
        return false;
    }
    
    if (!/^[a-zA-Z0-9\s]+$/.test(displayName)) {
        showValidationMessage(validation, 'Display name can only contain letters, numbers, and spaces', 'error');
        return false;
    }
    
    showValidationMessage(validation, 'Display name looks good!', 'success');
    return true;
}

function validatePassword() {
    const password = document.getElementById('registerPassword').value;
    const validation = document.getElementById('passwordValidation');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    if (!password) {
        showValidationMessage(validation, '', '');
        updatePasswordStrength('', strengthBar, strengthText);
        return false;
    }
    
    if (password.length < 6) {
        showValidationMessage(validation, 'Password must be at least 6 characters', 'error');
        updatePasswordStrength('weak', strengthBar, strengthText);
        return false;
    }
    
    // Calculate password strength
    let strength = 'weak';
    if (password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) {
        strength = 'strong';
    } else if (password.length >= 6 && (/[A-Z]/.test(password) || /[0-9]/.test(password))) {
        strength = password.length >= 8 ? 'good' : 'fair';
    }
    
    updatePasswordStrength(strength, strengthBar, strengthText);
    showValidationMessage(validation, 'Password meets requirements', 'success');
    return true;
}

function updatePasswordStrength(strength, strengthBar, strengthText) {
    strengthBar.className = 'strength-bar';
    if (strength) {
        strengthBar.classList.add(strength);
    }
    
    const strengthTexts = {
        weak: 'Password strength: Weak',
        fair: 'Password strength: Fair',
        good: 'Password strength: Good',
        strong: 'Password strength: Strong'
    };
    
    strengthText.textContent = strengthTexts[strength] || 'Password strength: Weak';
}

function showValidationMessage(element, message, type) {
    if (!element) return;
    
    element.textContent = message;
    element.className = 'validation-message';
    
    if (message) {
        element.classList.add('show', type);
    }
}

function showFormError(message, elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.color = '#f44336';
    }
}

function showFormSuccess(message, elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.color = '#4caf50';
    }
}

function setButtonLoading(button, isLoading) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (isLoading) {
        button.disabled = true;
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
    } else {
        button.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
}

function handleForgotPassword(e) {
    e.preventDefault();
    showMessage('Password reset feature coming soon! Please contact an administrator for assistance.', 'info');
}

// Load notifications for the current user
async function loadNotifications() {
    if (!authToken) return;
    try {
        const response = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const notifications = await response.json();
        updateNotificationsDisplay(notifications);
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Update rankings display in the dashboard
function updateRankingsDisplay(players) {
    const rankingsContent = document.getElementById('rankingsContent');
    if (!rankingsContent) return;
    
    if (!players || players.length === 0) {
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

// Update notifications display in the dashboard
function updateNotificationsDisplay(notifications) {
    const notificationsContent = document.getElementById('notificationsContent');
    if (!notificationsContent) return;
    
    if (!notifications || notifications.length === 0) {
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

// Quick challenge function from rankings list
function quickChallenge(playerName) {
    if (!currentUser) return showMessage('Please log in first', 'error');
    
    document.getElementById('targetPlayer').value = playerName;
    handleTargetSelection();
    document.querySelector('.challenge-panel').scrollIntoView({ behavior: 'smooth' });
}

// Add a message to the activity feed
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
    
    const activities = activityContent.querySelectorAll('.activity-item');
    if (activities.length > 10) {
        activities[activities.length - 1].remove();
    }
}

// Show a toast message
function showMessage(message, type = 'info') {
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
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Global error handlers
window.addEventListener('error', e => console.error('Global error:', e.error));
window.addEventListener('unhandledrejection', e => console.error('Unhandled promise rejection:', e.reason));
