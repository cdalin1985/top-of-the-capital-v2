


document.addEventListener('DOMContentLoaded', () => {
    const socket = io({ autoConnect: false });
    let currentUser = null;
    let leaderboardData = [];

    const $ = (id) => document.getElementById(id);

    // --- API Abstraction ---
    async function api(path, opts = {}) {
        const token = localStorage.getItem('cl_token');
        const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        opts.headers = headers;
        opts.credentials = 'include';

        const res = await fetch(path, opts);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
        return json;
    }

    // --- God Rays Effect ---
    const raysContainer = document.querySelector('.god-rays-container');
    const numRays = 25;
    for (let i = 0; i < numRays; i++) {
        const ray = document.createElement('div');
        ray.className = 'god-ray';
        const angle = Math.random() * 140 - 70; // -70 to 70 degrees
        const scale = Math.random() * 1.5 + 1;
        ray.style.transform = `rotate(${angle}deg) scaleY(${scale})`;
        ray.style.opacity = Math.random() * 0.15;
        raysContainer.appendChild(ray);
    }
    document.body.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 100 - 50; // -50 to 50
        raysContainer.style.transform = `translateX(${-x / 4}px) rotate(${-x / 25}deg)`;
    });

    // --- Authentication & Scene Transition ---
    function setupAuthListeners() {
        $('btnRegister').addEventListener('click', () => handleAuth('register'));
        $('btnLogin').addEventListener('click', () => handleAuth('login'));
    }

    async function handleAuth(type) {
        $('authMsg').textContent = 'Working...';
        try {
            const email = $('email').value.trim();
            const password = $('password').value;
            const displayName = $('displayName').value.trim();
            const payload = type === 'register' ? { email, password, displayName } : { email, password };

            const res = await api(`/api/auth/${type}`, { method: 'POST', body: JSON.stringify(payload) });

            localStorage.setItem('cl_token', res.token);
            currentUser = { token: res.token, info: res.user };
            unveilTheZiggurat();
        } catch (e) {
            $('authMsg').textContent = e.message;
        }
    }

    function unveilTheZiggurat() {
        const authContainer = $('auth-container');
        const appContainer = $('app-container');

        authContainer.style.opacity = 0;
        authContainer.style.transform = 'scale(0.8)';

        setTimeout(() => {
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            appContainer.classList.add('visible');
            connectSocket();
            loadInitialData();
        }, 1500);
    }

    // --- Socket Connection ---
    function connectSocket() {
        socket.auth = { token: localStorage.getItem('cl_token') };
        socket.connect();
        socket.on('notification', (n) => {
            // Add sophisticated notification rendering
            loadLeaderboard();
        });
         socket.on('matchCreated', refreshActiveMatches);
        socket.on('matchUpdate', refreshActiveMatches);
        socket.on('matchCompleted', () => {
            refreshActiveMatches();
            loadLeaderboard();
        });
    }

    // --- Data Loading & Rendering ---
    async function loadInitialData() {
        try {
            await loadLeaderboard();
            populateDisciplineGames();
            populateGamesToWin();
        } catch (error) {
            console.error("Failed to load initial data", error);
            // Handle error - maybe show a message
        }
    }

    async function loadLeaderboard() {
        leaderboardData = await api('/api/leaderboard');
        renderLeaderboard(leaderboardData);
        populateOpponentSelect();
    }

function renderLeaderboard(list) {
        const container = $('leaderboard');
        container.innerHTML = '';
        // Sort ranks ascending so #1 is the top, and enable scroll
        list.slice().sort((a, b) => a.rank - b.rank).forEach((p, idx) => {
            const tier = document.createElement('div');
            tier.className = 'ziggurat-tier';
            tier.style.width = `${100 - (idx * 4)}%`; // Taper the ziggurat
            tier.style.animationDelay = `${idx * 100}ms`;
tier.innerHTML = `
                <span class="rank">#${p.rank ?? (idx + 1)}</span>
                <span class="name">${p.displayName}</span>
                <span class="rating">${p.rank ? '' : 'Unranked'}</span>
            `;
            container.appendChild(tier);
        });
    }
    
    // --- Form Population ---
    function populateSelect(el, options) {
        el.innerHTML = '';
        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt.value;
            optionEl.textContent = opt.label;
            el.appendChild(optionEl);
        });
    }

    function populateDisciplineGames() {
        const disciplines = ['Eight Ball', 'Nine Ball', 'Ten Ball'].map(d => ({ value: d, label: d }));
        populateSelect($('discipline'), disciplines);
    }

    function populateGamesToWin() {
        const games = Array.from({ length: 11 }, (_, i) => ({ value: i + 5, label: `${i + 5} Games` }));
        populateSelect($('gamesToWin'), games);
        const liveGames = Array.from({ length: 13 }, (_, i) => ({ value: i + 3, label: `${i + 3} Games` }));
        populateSelect($('liveGamesToWin'), liveGames);
    }
    
    function populateOpponentSelect() {
        if (!currentUser) return;
        const opponents = leaderboardData
            .filter(p => p.id !== currentUser.info.id)
            .map(p => ({ value: p.id, label: p.displayName }));
        populateSelect($('opponentSelect'), opponents);
    }
    
    async function refreshActiveMatches(){
        const list = await api('/api/matches/active');
        // renderActiveMatches(list);
    }

    // --- App Initialization ---
    function init() {
        const token = localStorage.getItem('cl_token');
        if (token) {
            // This assumes token is valid. A better approach would be a /api/auth/me endpoint.
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                currentUser = { token, info: { id: payload.userId, displayName: payload.displayName } }; // Simplified
                unveilTheZiggurat();
            } catch(e) {
                localStorage.removeItem('cl_token');
                setupAuthListeners();
            }
        } else {
            setupAuthListeners();
        }
    }

    init();
});

