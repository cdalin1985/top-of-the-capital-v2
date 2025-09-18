document.addEventListener('DOMContentLoaded', () => {
  // Auto-detect host for cross-device compatibility
  const socket = io(window.location.origin, {
    autoConnect: false,
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });
  let currentUser = null;
  let leaderboardData = [];
  let challengeTargetId = null;

  const $ = id => document.getElementById(id);

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
    if (!res.ok) {
      throw new Error(json.message || `HTTP ${res.status}`);
    }
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
  document.body.addEventListener('mousemove', e => {
    const x = (e.clientX / window.innerWidth) * 100 - 50; // -50 to 50
    raysContainer.style.transform = `translateX(${-x / 4}px) rotate(${-x / 25}deg)`;
  });

  // --- Authentication & Scene Transition ---
  function setupAuthListeners() {
    $('btnRegister').addEventListener('click', () => handleAuth('register'));
    $('btnLogin').addEventListener('click', () => handleAuth('login'));
  }

  function setupLogoutListener() {
    const logoutBtn = $('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
  }

  function setupAnalyticsButton() {
    const analyticsBtn = $('openAnalytics');
    const closeAnalyticsBtn = $('closeAnalyticsModal');

    if (analyticsBtn) {
      analyticsBtn.addEventListener('click', () => {
        showModal('analyticsModal');

        // Initialize analytics dashboard when opened
        setTimeout(() => {
          const iframe = $('analyticsFrame');
          if (iframe && iframe.contentWindow && iframe.contentWindow.initAnalytics) {
            iframe.contentWindow.initAnalytics(currentUser);
          }
        }, 500);
      });
    }

    if (closeAnalyticsBtn) {
      closeAnalyticsBtn.addEventListener('click', () => {
        hideModal('analyticsModal');
      });
    }

    // Add ESC key handler for analytics modal
    const analyticsModal = $('analyticsModal');
    if (analyticsModal) {
      analyticsModal.addEventListener('click', e => {
        if (e.target === analyticsModal) {
          hideModal('analyticsModal');
        }
      });
    }
  }

  function handleLogout() {
    // Show confirmation toast
    showToast('Logging out...', 'info', 1500);

    // Clear authentication data
    localStorage.removeItem('cl_token');
    currentUser = null;

    // Disconnect socket
    if (socket) {
      socket.disconnect();
    }

    // Transition back to auth screen
    setTimeout(() => {
      const authContainer = $('auth-container');
      const appContainer = $('app-container');

      // Hide app container with fade effect
      appContainer.style.opacity = '0';
      appContainer.style.transform = 'scale(0.95)';

      setTimeout(() => {
        appContainer.classList.add('hidden');
        appContainer.classList.remove('visible');
        authContainer.classList.remove('hidden');

        // Reset auth container styles
        authContainer.style.opacity = '1';
        authContainer.style.transform = 'scale(1)';

        // Clear form fields
        $('email').value = '';
        $('password').value = '';
        $('displayName').value = '';
        $('authMsg').textContent = '';

        // Re-setup auth listeners
        setupAuthListeners();

        showToast('Logged out successfully', 'success', 2000);
      }, 500);
    }, 300);
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

  // --- Audio Integration ---
  function setupAudioIntegration() {
    // Wait for audio manager to be ready
    setTimeout(() => {
      if (window.audioManager) {
        // Add sound effects to buttons
        document.addEventListener('click', e => {
          if (e.target.matches('button, .btn')) {
            window.audioManager.playButtonClick();
          }
        });

        // Add hover sounds to interactive elements
        document.addEventListener('mouseover', e => {
          if (e.target.matches('button, .btn, .ziggurat-tier')) {
            window.audioManager.playButtonHover();
          }
        });
      }
    }, 1000);
  }

  // --- Player Stats Integration ---
  function setupPlayerStats() {
    // Wait for player stats to be ready
    setTimeout(() => {
      if (window.playerStats && currentUser) {
        window.playerStats.init(currentUser);
      }
    }, 1500);
  }

  // --- Visual Effects Integration ---
  function setupVisualEffects() {
    // Visual effects are initialized automatically
    // but we can trigger specific effects here
    setTimeout(() => {
      if (window.visualEffects) {
        // Trigger celebration for new user login
        document.body.classList.add('celebration-mode');
        setTimeout(() => {
          document.body.classList.remove('celebration-mode');
        }, 3000);
      }
    }, 2000);
  }

  // --- Data Analytics Integration ---
  function setupDataAnalytics() {
    // Wait for data analytics to be ready
    setTimeout(() => {
      if (window.dataAnalytics && currentUser) {
        window.dataAnalytics.setCurrentUser(currentUser);
      }
    }, 2000);
  }

  // --- Chat System Integration ---
  function setupChatSystem() {
    // Wait for chat system to be ready
    setTimeout(() => {
      if (window.chatSystem && currentUser) {
        window.chatSystem.setCurrentUser(currentUser);
      }
    }, 1500);
  }

  // --- Socket Connection ---
  function connectSocket() {
    socket.auth = { token: localStorage.getItem('cl_token') };

    // Clear any existing listeners to prevent duplicates
    socket.removeAllListeners();

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected');
      // Clear any connection error indicators
    });

    socket.on('connect_error', error => {
      // Silently handle connection errors during development
      if (error.message !== 'xhr poll error') {
        console.warn('Socket connection issue:', error.type);
      }
    });

    socket.on('disconnect', reason => {
      console.log('Socket disconnected:', reason);
    });

    // App event handlers
    socket.on('notification', n => {
      // Refresh all data when notifications arrive
      loadLeaderboard();
      fetchPendingChallenges();
      fetchAwaitingConfirmation();

      // Add to community feed
      if (n && n.message) {
        const icon =
          n.type === 'challenge'
            ? '🎯'
            : n.type === 'proposal'
              ? '🏆'
              : n.type === 'confirmed'
                ? '✅'
                : n.type === 'counter-proposal'
                  ? '🔄'
                  : '🎱';

        addCommunityNotification({
          icon: icon,
          message: n.message
        });

        // Show toast notification for the user
        showToast(n.message, 'info', 3000);
      }
    });

    socket.on('matchCreated', () => {
      refreshActiveMatches();
      fetchScheduledMatches();
    });

    socket.on('matchUpdate', matchData => {
      // Enhanced match update with animation
      refreshActiveMatches();
      if (matchData && currentUser) {
        const isPlayerInMatch =
          matchData.player1 === currentUser.info.id || matchData.player2 === currentUser.info.id;
        if (isPlayerInMatch) {
          // Show subtle notification for player
          showToast('Match updated', 'info', 1500);
        }
      }
    });

    socket.on('matchCompleted', completedMatch => {
      // Enhanced match completion with celebration
      refreshActiveMatches();
      fetchScheduledMatches();
      fetchRecentMatches();
      loadLeaderboard();

      if (completedMatch && currentUser) {
        const isPlayerInMatch =
          completedMatch.player1 === currentUser.info.id ||
          completedMatch.player2 === currentUser.info.id;
        if (isPlayerInMatch) {
          // Show match completion celebration
          showMatchCompletionCelebration(completedMatch);
        }
      }
    });

    // Connect after setting up listeners
    socket.connect();
  }

  // --- Data Loading & Rendering ---
  async function loadInitialData() {
    try {
      await loadLeaderboard();
      populateDisciplineGames();
      populateGamesToWin();
      initializeTipsAndDrills();
      initializeCommunityNotifications();
      setupAudioIntegration();
      setupPlayerStats();
      setupVisualEffects();
      setupDataAnalytics();
      setupChatSystem();
      setupPoolTableVisualization();
      setupLogoutListener();
      setupAnalyticsButton();
    } catch (error) {
      console.error('Failed to load initial data', error);
      // Handle error - maybe show a message
    }
  }

  async function loadLeaderboard() {
    leaderboardData = await api('/api/leaderboard');
    renderLeaderboard(leaderboardData);
    populateOpponentSelect();
    updateUserProfile();
  }

  function updateUserProfile() {
    if (!currentUser || !leaderboardData.length) {
      return;
    }

    const userProfile = leaderboardData.find(p => p.id === currentUser.info.id);
    const nameEl = $('myName');
    const ratingEl = $('myRating');

    if (nameEl && userProfile) {
      nameEl.textContent = userProfile.displayName || currentUser.info.displayName;
    }

    if (ratingEl && userProfile) {
      const rank = typeof userProfile.rank === 'number' ? `#${userProfile.rank}` : 'Unranked';
      ratingEl.textContent = `Current Ranking: ${rank}`;
    }
  }

  function renderLeaderboard(list) {
    const container = $('leaderboard');
    container.innerHTML = '';
    // Sort ranks ascending so #1 is the top, and enable scroll
    const sorted = list.slice().sort((a, b) => a.rank - b.rank);
    sorted.forEach((p, idx) => {
      const tier = document.createElement('div');
      const realRank = typeof p.rank === 'number' ? p.rank : idx + 1;
      tier.className =
        'ziggurat-tier' +
        (realRank === 1 ? ' top-1' : realRank === 2 ? ' top-2' : realRank === 3 ? ' top-3' : '');
      tier.style.animationDelay = `${idx * 100}ms`;
      tier.dataset.userId = p.id;
      tier.dataset.rank = realRank;
      tier.innerHTML = `
                <span class="rank">#${p.rank ?? idx + 1}</span>
                <span class="name">${p.displayName}</span>
                <span class="rating">${p.rank ? '' : 'Unranked'}</span>
            `;
      // Enable clicking leaderboard names to start challenge flow
      tier.addEventListener('click', e => {
        if (p.id === currentUser?.info?.id) {
          return;
        } // Can't challenge yourself

        // Check if shift key is held for head-to-head analysis
        if (e.shiftKey && window.dataAnalytics) {
          window.dataAnalytics.showHeadToHeadModal(p.id, p.displayName);
          return;
        }

        // Set challenge target and show visual feedback
        challengeTargetId = p.id;
        const selectedDiv = $('selectedTarget');
        if (selectedDiv) {
          selectedDiv.innerHTML = `
                        <div class="selected-challenge-target">
                            <div class="challenge-info">
                                <strong>Ready to challenge:</strong> ${p.displayName}
                                <button class="btn btn-small" onclick="challengeTargetId=null; this.parentElement.parentElement.parentElement.innerHTML=''">✕</button>
                            </div>
                            <div class="h2h-hint">💡 Hold Shift + Click for head-to-head analysis</div>
                        </div>
                    `;
        }

        // Auto-open challenge modal
        populateOpponentSelect();
        setChallengeModalTitle(`Challenge ${p.displayName}`);

        // Set the dropdown to match selection
        const select = $('challengeTargetSelect');
        if (select) {
          select.value = p.id;
        }

        // Hide venue/time fields for initial challenge
        hideVenueTimeFields();

        showModal('challengeModal');
        setupChallengeCreateHandlers();
      });
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
    // Discipline options are now hardcoded in HTML
    // This function kept for compatibility
  }

  function populateGamesToWin() {
    // Challenge gamesToWin options are now hardcoded in HTML
    // Still populate live match options
    const liveGames = Array.from({ length: 13 }, (_, i) => ({
      value: i + 3,
      label: `${i + 3} Games`
    }));
    if ($('liveGamesToWin')) {
      populateSelect($('liveGamesToWin'), liveGames);
    }
  }

  function showVenueTimeFields() {
    const venueTimeFields = $('venueTimeFields');
    if (venueTimeFields) {
      venueTimeFields.classList.remove('hidden');
    }
  }

  function hideVenueTimeFields() {
    const venueTimeFields = $('venueTimeFields');
    if (venueTimeFields) {
      venueTimeFields.classList.add('hidden');
    }
  }

  function populateOpponentSelect() {
    if (!currentUser) {
      return;
    }

    // For live matches: restrict to nearby ranks (competitive balance)
    const current = leaderboardData.find(p => p.id === currentUser.info.id);
    if (current && typeof current.rank === 'number') {
      const minRank = current.rank - 5;
      const maxRank = current.rank + 5;
      const liveOpponents = leaderboardData
        .filter(
          p =>
            p.id !== current.id &&
            typeof p.rank === 'number' &&
            p.rank >= minRank &&
            p.rank <= maxRank
        )
        .map(p => ({ value: p.id, label: `${p.displayName} (#${p.rank})` }));

      if ($('opponentSelect')) {
        populateSelect($('opponentSelect'), liveOpponents);
      }
    }

    // For challenges: allow challenging anyone (with ranking context)
    const allOpponents = leaderboardData
      .filter(p => p.id !== currentUser.info.id)
      .sort((a, b) => {
        // Sort by rank, with unranked at bottom
        const aRank = typeof a.rank === 'number' ? a.rank : 999;
        const bRank = typeof b.rank === 'number' ? b.rank : 999;
        return aRank - bRank;
      })
      .map(p => ({
        value: p.id,
        label:
          typeof p.rank === 'number'
            ? `${p.displayName} (#${p.rank})`
            : `${p.displayName} (Unranked)`
      }));

    if ($('challengeTargetSelect')) {
      const challengeSelect = $('challengeTargetSelect');
      challengeSelect.innerHTML = '<option value="">Select opponent...</option>';
      allOpponents.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.label;
        challengeSelect.appendChild(optionEl);
      });
    }
  }

  async function refreshActiveMatches() {
    const list = await api('/api/matches/active');
    renderActiveMatches(list);
  }

  let lastActiveMatches = [];

  async function fetchScheduledMatches() {
    try {
      const scheduled = await api('/api/matches/scheduled');
      renderScheduledMatches(scheduled);
    } catch (err) {
      renderScheduledMatches([]);
    }
  }

  function renderScheduledMatches(matches) {
    const container = $('#activeMatches'); // Using existing container
    if (!container) {
      return;
    }

    // Clear and add scheduled matches section
    let scheduledSection = document.getElementById('scheduledMatches');
    if (!scheduledSection) {
      scheduledSection = document.createElement('div');
      scheduledSection.id = 'scheduledMatches';
      container.appendChild(scheduledSection);
    }
    scheduledSection.innerHTML = '<h4>Upcoming Matches</h4>';

    if (!matches.length) {
      scheduledSection.innerHTML += '<p>No upcoming matches.</p>';
      return;
    }

    matches.forEach(match => {
      const div = document.createElement('div');
      div.className = 'card marble-card';
      const schedTime = new Date(match.scheduledAt).toLocaleString();
      div.innerHTML = `
                <h5>vs ${match.opponent}</h5>
                <div class="match-details">
                    <span>${match.discipline} - Race to ${match.gamesToWin}</span>
                    <span>📍 ${match.venue}</span>
                    <span>🕒 ${schedTime}</span>
                </div>
                <button class="btn" id="startMatch_${match.id}">Start Match</button>
            `;
      scheduledSection.appendChild(div);

      // Start match functionality
      div.querySelector(`#startMatch_${match.id}`).addEventListener('click', async () => {
        try {
          const liveMatch = await api(`/api/matches/start-from-challenge/${match.id}`, {
            method: 'POST'
          });
          showToast('Match started!', 'success');
          setTimeout(fetchScheduledMatches, 800);
          setTimeout(refreshActiveMatches, 800);
        } catch (err) {
          showToast('Could not start match: ' + (err.message || err), 'error');
        }
      });
    });
  }

  function renderActiveMatches(matches) {
    lastActiveMatches = matches || [];
    const container = $('#activeMatches');
    if (!container) {
      return;
    }

    // Clear and add live matches section
    let liveSection = document.getElementById('liveMatches');
    if (!liveSection) {
      liveSection = document.createElement('div');
      liveSection.id = 'liveMatches';
      container.appendChild(liveSection);
    }
    liveSection.innerHTML = '<h4>Live Matches</h4>';

    // My Matches filter
    const myOnly = $('myMatchesToggle')?.checked;
    const filtered =
      myOnly && currentUser
        ? matches.filter(
            m => m.player1 === currentUser.info.id || m.player2 === currentUser.info.id
          )
        : matches;

    if (!filtered.length) {
      liveSection.innerHTML += '<p>No live matches.</p>';
      return;
    }

    filtered.forEach(match => {
      const div = document.createElement('div');
      div.className = 'card marble-card live-match-card';
      const isPlayer =
        match.player1 === currentUser?.info?.id || match.player2 === currentUser?.info?.id;
      const isSpectator = !isPlayer;

      // Calculate progress
      const player1Score = match.scores[match.player1] || 0;
      const player2Score = match.scores[match.player2] || 0;
      const totalFrames = player1Score + player2Score;
      const player1Progress = (player1Score / match.gamesToWin) * 100;
      const player2Progress = (player2Score / match.gamesToWin) * 100;

      // Determine if we're close to winning
      const player1CloseToWin = player1Score >= match.gamesToWin - 1;
      const player2CloseToWin = player2Score >= match.gamesToWin - 1;

      div.innerHTML = `
                <div class="match-header">
                    <h5>${match.player1Name} vs ${match.player2Name}</h5>
                    ${isSpectator ? '<span class="spectator-badge">👁️ Spectating</span>' : '<span class="player-badge">🎱 Playing</span>'}
                </div>
                
                <div class="live-score">
                    <div class="score-display">
                        <div class="player-score-container ${player1CloseToWin ? 'close-to-win' : ''}">
                            <div class="player-name">${match.player1Name}</div>
                            <div class="player-score">${player1Score}</div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(player1Progress, 100)}%"></div>
                            </div>
                        </div>
                        
                        <div class="vs-separator">
                            <span class="vs">VS</span>
                            <div class="frame-info">Frame ${match.currentFrame || totalFrames + 1}</div>
                        </div>
                        
                        <div class="player-score-container ${player2CloseToWin ? 'close-to-win' : ''}">
                            <div class="player-name">${match.player2Name}</div>
                            <div class="player-score">${player2Score}</div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(player2Progress, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="match-info">
                        <span class="race-info">🏁 Race to ${match.gamesToWin}</span>
                        <span class="discipline-info">🎯 ${match.discipline || '8-Ball'}</span>
                        ${match.venue ? `<span class="venue-info">📍 ${match.venue}</span>` : ''}
                    </div>
                </div>
                
                ${
                  isPlayer
                    ? `
                    <div class="scoring-controls">
                        <button class="btn btn-score player-1-btn" data-match="${match.id}" data-player="${match.player1}" ${player1Score >= match.gamesToWin ? 'disabled' : ''}>
                            <span class="score-icon">🎱</span>
                            <span class="score-text">+1 ${match.player1Name}</span>
                        </button>
                        <button class="btn btn-score player-2-btn" data-match="${match.id}" data-player="${match.player2}" ${player2Score >= match.gamesToWin ? 'disabled' : ''}>
                            <span class="score-icon">🎱</span>
                            <span class="score-text">+1 ${match.player2Name}</span>
                        </button>
                    </div>
                `
                    : `
                    <div class="spectator-info">
                        <span class="live-indicator">🔴 Live</span>
                        <span class="update-time">Updates in real-time</span>
                    </div>
                `
                }
            `;
      liveSection.appendChild(div);

      // Add scoring functionality for players
      if (isPlayer) {
        div.querySelectorAll('.btn-score').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (btn.disabled) {
              return;
            }

            const matchId = btn.dataset.match;
            const playerId = btn.dataset.player;
            const playerName = btn.querySelector('.score-text').textContent.replace('+1 ', '');

            // Add loading state
            btn.disabled = true;
            btn.classList.add('scoring');
            const originalText = btn.querySelector('.score-text').textContent;
            btn.querySelector('.score-text').textContent = 'Scoring...';
            btn.querySelector('.score-icon').textContent = '⏳';

            try {
              await api(`/api/matches/${matchId}/point`, {
                method: 'POST',
                body: JSON.stringify({ playerId })
              });

              // Success feedback
              btn.classList.remove('scoring');
              btn.classList.add('scored');
              btn.querySelector('.score-text').textContent = 'Scored!';
              btn.querySelector('.score-icon').textContent = '✅';

              // Show toast notification
              showToast(`Point scored for ${playerName}!`, 'success');

              // Reset button after short delay (socket will update match state)
              setTimeout(() => {
                btn.classList.remove('scored');
                btn.querySelector('.score-text').textContent = originalText;
                btn.querySelector('.score-icon').textContent = '🎱';
                btn.disabled = false;
              }, 1500);
            } catch (err) {
              // Error feedback
              btn.classList.remove('scoring');
              btn.classList.add('error');
              btn.querySelector('.score-text').textContent = 'Failed';
              btn.querySelector('.score-icon').textContent = '❌';

              showToast('Could not score: ' + (err.message || err), 'error');

              // Reset button after delay
              setTimeout(() => {
                btn.classList.remove('error');
                btn.querySelector('.score-text').textContent = originalText;
                btn.querySelector('.score-icon').textContent = '🎱';
                btn.disabled = false;
              }, 2000);
            }
          });
        });
      }
    });
  }

  async function fetchRecentMatches() {
    try {
      const recent = await api('/api/matches/recent');
      renderRecentMatches(recent);
    } catch (e) {
      renderRecentMatches([]);
    }
  }

  function renderRecentMatches(matches) {
    const container = $('#recentMatches');
    if (!container) {
      return;
    }
    container.innerHTML = '<h4>Recent Matches</h4>';
    if (!matches.length) {
      container.innerHTML += '<p>No recent matches.</p>';
      return;
    }
    matches.forEach(m => {
      const div = document.createElement('div');
      div.className = 'card marble-card';
      const when = new Date(m.completedAt).toLocaleString();
      div.innerHTML = `
                <div><strong>${m.player1Name}</strong> ${m.scores[m.player1]} - ${m.scores[m.player2]} <strong>${m.player2Name}</strong></div>
                <div class="match-details"><span>${m.discipline || ''} • Race to ${m.gamesToWin}</span><span>📍 ${m.venue || ''}</span><span>🕒 ${when}</span></div>
            `;
      container.appendChild(div);
    });
  }

  // Toggle handler for My Matches
  const myToggle = $('myMatchesToggle');
  if (myToggle) {
    myToggle.addEventListener('change', () => renderActiveMatches(lastActiveMatches));
  }

  // Create Match handler for live matches
  const createMatchBtn = $('createMatch');
  if (createMatchBtn) {
    createMatchBtn.addEventListener('click', async () => {
      const opponent = $('opponentSelect')?.value;
      const gamesToWin = parseInt($('liveGamesToWin')?.value, 10) || 0;

      if (!opponent) {
        showToast('Please select an opponent', 'error');
        return;
      }
      if (gamesToWin < 3) {
        showToast('Please select games to win (minimum 3)', 'error');
        return;
      }

      createMatchBtn.disabled = true;
      createMatchBtn.textContent = 'Creating...';

      try {
        const payload = { opponent, gamesToWin };
        await api('/api/matches/create', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast('Live match created!', 'success');
        setTimeout(refreshActiveMatches, 800);
      } catch (err) {
        showToast('Could not create match: ' + (err.message || err), 'error');
      } finally {
        createMatchBtn.disabled = false;
        createMatchBtn.textContent = 'Create';
      }
    });
  }

  // --- App Initialization ---

  // ---- Pending Challenges Feed Polished Version ----
  async function fetchPendingChallenges() {
    try {
      const pending = await api('/api/challenges/pending');
      renderPendingChallenges(pending);
    } catch (err) {
      renderPendingChallenges([]);
    }
  }

  async function fetchAwaitingConfirmation() {
    try {
      const awaiting = await api('/api/challenges/awaiting-confirmation');
      renderAwaitingConfirmation(awaiting);
    } catch (err) {
      renderAwaitingConfirmation([]);
    }
  }

  function renderPendingChallenges(challenges) {
    const feed = $('feed');
    if (!feed) {
      return;
    }
    feed.innerHTML = '';

    if (!challenges.length) {
      feed.innerHTML =
        '<div class="card marble-card"><p>No pending challenges at this time.</p></div>';
      return;
    }

    challenges.forEach(ch => {
      const div = document.createElement('div');
      div.className = 'card marble-card';
      div.innerHTML = `
          <h4>Challenged by ${ch.from}</h4>
          <div class="challenge-details-row">
            <span>Game: <strong>${ch.discipline}</strong></span>
            <span>Race to <strong>${ch.gamesToWin}</strong></span>
          </div>
          <div class="challenge-details-row">
            <span>Issued: <strong>${new Date(ch.createdAt).toLocaleString()}</strong></span>
          </div>
          <div class="challenge-response-row">
            <button class="btn" id="proposeBtn_${ch.id}">Respond with date & venue</button>
          </div>
        `;
      feed.appendChild(div);
      // Attach click: show proposal form, wire up
      div.querySelector(`#proposeBtn_${ch.id}`).addEventListener('click', () => {
        setChallengeModalTitle('Propose Match Time');

        // Show venue/time fields for proposal
        showVenueTimeFields();

        // Set default values
        if ($('venueSelect')) {
          $('venueSelect').value = 'Valley Hub';
        }
        if ($('scheduledAt')) {
          $('scheduledAt').value = '';
        }

        showModal('challengeModal');
        setupChallengeProposalUI(ch.id);
      });
    });
  }

  function renderAwaitingConfirmation(challenges) {
    const notifications = $('notifications');
    if (!notifications) {
      return;
    }
    notifications.innerHTML = '';

    if (!challenges.length) {
      notifications.innerHTML =
        '<div class="card marble-card"><p>No proposals awaiting confirmation.</p></div>';
      return;
    }

    challenges.forEach(ch => {
      const div = document.createElement('div');
      div.className = 'card marble-card';
      const scheduledDate = new Date(ch.scheduledAt).toLocaleString();
      div.innerHTML = `
          <h4>Proposal from ${ch.from}</h4>
          <div class="challenge-details-row">
            <span>Game: <strong>${ch.discipline}</strong></span>
            <span>Race to <strong>${ch.gamesToWin}</strong></span>
          </div>
          <div class="challenge-details-row">
            <span>Venue: <strong>${ch.venue}</strong></span>
            <span>Time: <strong>${scheduledDate}</strong></span>
          </div>
          <div class="challenge-response-row" style="display: flex; gap: 10px;">
            <button class="btn" id="confirmBtn_${ch.id}">Confirm Match</button>
            <button class="btn btn-secondary" id="counterBtn_${ch.id}">Counter-propose</button>
          </div>
        `;
      notifications.appendChild(div);

      // Confirm button
      div.querySelector(`#confirmBtn_${ch.id}`).addEventListener('click', async () => {
        try {
          await api(`/api/challenges/${ch.id}/confirm`, { method: 'POST' });
          showToast('Match confirmed!', 'success');
          setTimeout(fetchAwaitingConfirmation, 800);
          setTimeout(fetchPendingChallenges, 800);
        } catch (err) {
          showToast('Could not confirm: ' + (err.message || err), 'error');
        }
      });

      // Counter-propose button
      div.querySelector(`#counterBtn_${ch.id}`).addEventListener('click', () => {
        setChallengeModalTitle('Counter-propose');

        // Show venue/time fields for counter-proposal
        showVenueTimeFields();

        // Pre-fill existing values
        if ($('venueSelect')) {
          $('venueSelect').value = ch.venue || 'Valley Hub';
        }
        if ($('scheduledAt')) {
          $('scheduledAt').value = formatForDatetimeLocal(ch.scheduledAt);
        }

        showModal('challengeModal');
        setupCounterProposalUI(ch.id);
      });
    });
  }
  function init() {
    const token = localStorage.getItem('cl_token');
    if (token) {
      // This assumes token is valid. A better approach would be a /api/auth/me endpoint.
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUser = { token, info: { id: payload.userId, displayName: payload.displayName } }; // Simplified
        unveilTheZiggurat();
        // Fetch all challenge/match data
        fetchPendingChallenges();
        fetchAwaitingConfirmation();
        fetchScheduledMatches();
        refreshActiveMatches();
        fetchRecentMatches();
      } catch (e) {
        localStorage.removeItem('cl_token');
        setupAuthListeners();
      }
    } else {
      setupAuthListeners();
    }
  }

  // ----- Challenge Proposal Logic (5-star polish) -----

  // Open Challenge button wiring
  const openChallengeBtn = $('openChallenge');
  if (openChallengeBtn) {
    openChallengeBtn.addEventListener('click', () => {
      populateOpponentSelect();
      const select = $('challengeTargetSelect');
      if (select) {
        // Add change listener to update challengeTargetId
        const existingHandler = select.onchange;
        select.onchange = function () {
          challengeTargetId = this.value;
          if (existingHandler) {
            existingHandler.call(this);
          }
        };
      }
      setChallengeModalTitle('New Challenge');

      // Clear any previous selection display
      const selectedDiv = $('selectedTarget');
      if (selectedDiv) {
        selectedDiv.innerHTML = '';
      }

      // Hide venue/time fields for initial challenge
      hideVenueTimeFields();

      showModal('challengeModal');
      setupChallengeCreateHandlers();
    });
  }

  function setChallengeModalTitle(text) {
    const h = document.querySelector('#challengeModal .modal-header h3');
    if (h) {
      h.textContent = text;
    }
  }

  function formatForDatetimeLocal(iso) {
    if (!iso) {
      return '';
    }
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Modal helpers and close wiring
  const closeChallengeModal = $('closeChallengeModal');
  if (closeChallengeModal) {
    closeChallengeModal.addEventListener('click', () => hideModal('challengeModal'));
  }

  // Add backdrop click handler
  const challengeModal = $('challengeModal');
  if (challengeModal) {
    challengeModal.addEventListener('click', e => {
      // Only close if clicking the backdrop (modal itself), not the content
      if (e.target === challengeModal) {
        hideModal('challengeModal');
      }
    });

    // Add ESC key handler
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !challengeModal.classList.contains('hidden')) {
        hideModal('challengeModal');
      }
    });
  }

  function showModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
    }
  }
  function hideModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
    }
  }

  function setupChallengeCreateHandlers() {
    const sendBtn = $('sendChallenge');
    const cancelBtn = $('cancelTarget');
    if (sendBtn) {
      const clone = sendBtn.cloneNode(true);
      sendBtn.parentNode.replaceChild(clone, sendBtn);
      const btn = $('sendChallenge');
      btn.addEventListener('click', async e => {
        e.preventDefault();

        // Get current form values
        const selectedOpponent = $('challengeTargetSelect')?.value;
        challengeTargetId = challengeTargetId || selectedOpponent;

        // Validate inputs
        if (!challengeTargetId || challengeTargetId === '') {
          showToast(
            'Please select an opponent from the dropdown or click a name on the leaderboard.',
            'error'
          );
          return;
        }

        const discipline = $('discipline')?.value || '';
        const gamesToWin = parseInt($('gamesToWin')?.value, 10) || 0;

        if (!discipline) {
          showToast('Please select a game discipline (Eight Ball, Nine Ball, etc.).', 'error');
          return;
        }

        if (gamesToWin < 5 || gamesToWin > 15) {
          showToast('Please select games to win (5-15 games).', 'error');
          return;
        }

        // Show loading state
        btn.disabled = true;
        btn.textContent = 'Sending...';

        try {
          await api('/api/challenges', {
            method: 'POST',
            body: JSON.stringify({ targetUserId: challengeTargetId, discipline, gamesToWin })
          });

          showToast('Challenge sent successfully!', 'success');
          hideModal('challengeModal');

          // Clear selections and reset form
          const selectedDiv = $('selectedTarget');
          if (selectedDiv) {
            selectedDiv.innerHTML = '';
          }
          challengeTargetId = null;

          // Reset form fields
          $('challengeTargetSelect').value = '';
          $('discipline').value = '';
          $('gamesToWin').value = '';

          // Refresh challenge lists and feeds
          setTimeout(() => {
            fetchPendingChallenges();
            fetchAwaitingConfirmation();
            loadLeaderboard(); // This will also trigger socket notification handling
          }, 500);
        } catch (err) {
          showToast('Could not send challenge: ' + (err.message || err), 'error');
        } finally {
          // Reset button state
          btn.disabled = false;
          btn.textContent = 'Send Challenge';
        }
      });
    }
    if (cancelBtn) {
      const cloneC = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(cloneC, cancelBtn);
      $('cancelTarget').addEventListener('click', e => {
        e.preventDefault();
        hideModal('challengeModal');
        $('selectedTarget').textContent = '';
        challengeTargetId = null;
      });
    }
  }

  // Helper function to extract form values
  function getChallengeFormData() {
    return {
      discipline: $('discipline')?.value || '',
      gamesToWin: parseInt($('gamesToWin')?.value, 10) || 0,
      venue: $('venueSelect')?.value || '',
      scheduledAt: $('scheduledAt')?.value || ''
    };
  }

  // Helper function to validate individual form fields
  function validateChallengeFields(data) {
    if (!data.discipline) return 'Please select a discipline';
    if (!data.venue) return 'Please select a venue';
    if (!data.scheduledAt) return 'Please select a scheduled time';
    if (isNaN(data.gamesToWin) || data.gamesToWin < 5 || data.gamesToWin > 15) {
      return 'Please select games to win (5-15)';
    }
    return null;
  }

  // Helper function to validate challenge proposal form
  function validateChallengeProposalForm() {
    const data = getChallengeFormData();
    const error = validateChallengeFields(data);
    
    if (error) {
      return { isValid: false, error };
    }

    return {
      isValid: true,
      data
    };
  }

  // Helper function to handle challenge proposal submission
  async function submitChallengeProposal(challengeId, payload) {
    await api(`/api/challenges/${challengeId}/propose`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Helper function to handle successful proposal submission
  function handleProposalSuccess() {
    showToast('Proposal sent!', 'success');
    setTimeout(() => {
      hideModal('challengeModal');
      hideMessages();
    }, 1300);
    setTimeout(fetchPendingChallenges, 1600);
    return true; // indicates closing state
  }

  function setupChallengeProposalUI(challengeId) {
    const proposeBtn = $('sendChallenge');
    if (!proposeBtn) {
      return;
    }
    // Remove old listeners with clone trick
    const clone = proposeBtn.cloneNode(true);
    proposeBtn.parentNode.replaceChild(clone, proposeBtn);
    const btn = $('sendChallenge');
    btn.disabled = false;
    btn.textContent = 'Send';

    let closing = false;
    btn.addEventListener('click', async event => {
      event.preventDefault();
      if (btn.disabled) {
        return;
      }
      
      btn.disabled = true;
      setLoading(true);
      hideMessages();

      // Validate form data
      const validation = validateChallengeProposalForm();
      if (!validation.isValid) {
        showToast(validation.error, 'error');
        btn.disabled = false;
        setLoading(false);
        return;
      }

      try {
        const payload = { venue: validation.data.venue, scheduledAt: validation.data.scheduledAt };
        await submitChallengeProposal(challengeId, payload);
        closing = handleProposalSuccess();
      } catch (err) {
        showToast('Could not propose challenge: ' + (err.message || err), 'error');
      } finally {
        if (!closing) {
          btn.disabled = false;
          setLoading(false);
        }
      }
    });
    // Keyboard a11y: focus first field, ESC close
    if ($('discipline')) {
      $('discipline').focus();
    }
    document.onkeydown = e => {
      if (e.key === 'Escape') {
        hideModal('challengeModal');
        hideMessages();
      }
    };
  }

  function hideMessages() {
    const e1 = document.getElementById('challengeError');
    const e2 = document.getElementById('challengeSuccess');
    if (e1) {
      e1.remove();
    }
    if (e2) {
      e2.remove();
    }
    hideToast();
  }
  function showToast(msg, type = 'success', duration = 2000) {
    let el = document.getElementById('challengeToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'challengeToast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = `toast toast-${type}`;
    el.style.position = 'fixed';
    el.style.top = '24px';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.padding = '12px 30px';
    el.style.zIndex = '1500';
    el.style.borderRadius = '20px';
    el.style.fontWeight = '600';
    el.style.fontSize = '1.1em';
    el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.14)';
    el.style.transition = 'all 0.3s ease';

    // Enhanced type-specific styling
    switch (type) {
      case 'success':
        el.style.background = 'linear-gradient(45deg, #2d6e3e, #4caf50)';
        break;
      case 'error':
        el.style.background = 'linear-gradient(45deg, #8b1538, #f44336)';
        break;
      case 'info':
        el.style.background = 'linear-gradient(45deg, #1976d2, #2196f3)';
        break;
      case 'warning':
        el.style.background = 'linear-gradient(45deg, #f57c00, #ff9800)';
        break;
      default:
        el.style.background = 'linear-gradient(45deg, #2d6e3e, #4caf50)';
    }

    el.style.color = 'white';
    el.style.opacity = '1';
    setTimeout(() => {
      hideToast();
    }, duration);
  }
  function hideToast() {
    const el = document.getElementById('challengeToast');
    if (el) {
      el.remove();
    }
  }

  // --- Match Completion Celebration ---
  // Helper function to determine match winner and user status
  function getMatchResult(match) {
    const player1Score = match.scores[match.player1] || 0;
    const player2Score = match.scores[match.player2] || 0;
    const winner = player1Score > player2Score ? match.player1 : match.player2;
    const winnerName = winner === match.player1 ? match.player1Name : match.player2Name;
    const loser = winner === match.player1 ? match.player2 : match.player1;
    const isWinner = currentUser.info.id === winner;
    const isLoser = currentUser.info.id === loser;

    return {
      player1Score,
      player2Score,
      winner,
      winnerName,
      loser,
      isWinner,
      isLoser
    };
  }

  // Helper function to create celebration modal HTML
  function createCelebrationHTML(match, matchResult) {
    const { player1Score, player2Score, winner, winnerName, isWinner, isLoser } = matchResult;
    
    return `
      <div class="celebration-backdrop"></div>
      <div class="celebration-content ${isWinner ? 'winner' : isLoser ? 'loser' : 'spectator'}">
          <div class="celebration-header">
              <div class="celebration-icon">${isWinner ? '🏆' : isLoser ? '😔' : '🎯'}</div>
              <h2 class="celebration-title">
                  ${isWinner ? 'Victory!' : isLoser ? 'Good Game!' : 'Match Complete!'}
              </h2>
          </div>
          
          <div class="celebration-body">
              <div class="final-score">
                  <div class="score-line ${winner === match.player1 ? 'winner-score' : ''}">
                      <span class="player">${match.player1Name}</span>
                      <span class="score">${player1Score}</span>
                  </div>
                  <div class="vs-divider">VS</div>
                  <div class="score-line ${winner === match.player2 ? 'winner-score' : ''}">
                      <span class="player">${match.player2Name}</span>
                      <span class="score">${player2Score}</span>
                  </div>
              </div>
              
              <div class="match-summary">
                  <div class="winner-announcement">
                      🎆 <strong>${winnerName}</strong> wins the match! 🎆
                  </div>
                  <div class="match-details">
                      ${match.discipline || '8-Ball'} • Race to ${match.gamesToWin} • ${match.venue || 'Unknown Venue'}
                  </div>
              </div>
          </div>
          
          <div class="celebration-footer">
              <button class="btn celebration-close">${isWinner ? 'Celebrate!' : 'Close'}</button>
          </div>
      </div>
    `;
  }

  // Helper function to get celebration CSS styles
  function getCelebrationStyles() {
    return `
      .celebration-modal { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; animation: celebrationFadeIn 0.5s ease; }
      .celebration-backdrop { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(5px); }
      .celebration-content { position: relative; background: linear-gradient(145deg, var(--color-marble-light), var(--color-marble-dark)); border: 2px solid var(--color-gold); border-radius: 15px; padding: 30px; max-width: 500px; width: 90%; text-align: center; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8); animation: celebrationSlideUp 0.6s ease; }
      .celebration-content.winner { border-color: var(--color-gold); box-shadow: 0 0 50px rgba(212, 175, 55, 0.5), 0 20px 60px rgba(0, 0, 0, 0.8); }
      .celebration-content.loser { border-color: #666; }
      .celebration-icon { font-size: 4em; margin-bottom: 15px; animation: celebrationBounce 1s ease infinite; }
      .celebration-title { font-family: var(--font-heading); color: var(--color-gold); font-size: 2.2em; margin-bottom: 25px; }
      .final-score { display: flex; align-items: center; justify-content: center; gap: 20px; margin: 25px 0; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1); }
      .score-line { display: flex; flex-direction: column; gap: 8px; flex: 1; }
      .score-line .player { font-size: 1.1em; color: var(--color-text-muted); }
      .score-line .score { font-size: 2.5em; font-weight: 700; font-family: var(--font-heading); color: var(--color-text); }
      .score-line.winner-score .score { color: var(--color-gold); text-shadow: 0 0 10px rgba(212, 175, 55, 0.5); }
      .vs-divider { font-size: 1.2em; color: var(--color-gold); font-weight: 700; }
      .winner-announcement { font-size: 1.3em; color: var(--color-gold); margin: 20px 0; animation: celebrationGlow 2s ease infinite alternate; }
      .match-details { color: var(--color-text-muted); margin-bottom: 25px; }
      .celebration-close { background: var(--color-gold); border-color: var(--color-gold); color: var(--color-background); padding: 12px 30px; font-size: 1.1em; font-weight: 600; }
      @keyframes celebrationFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes celebrationSlideUp { from { transform: translateY(50px) scale(0.9); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
      @keyframes celebrationBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      @keyframes celebrationGlow { from { text-shadow: 0 0 5px rgba(212, 175, 55, 0.5); } to { text-shadow: 0 0 20px rgba(212, 175, 55, 0.8); } }
    `;
  }

  // Helper function to setup celebration event handlers
  function setupCelebrationHandlers(celebration, styleElement) {
    // Close button handler
    celebration.querySelector('.celebration-close').addEventListener('click', () => {
      celebration.style.animation = 'celebrationFadeIn 0.3s ease reverse';
      setTimeout(() => {
        celebration.remove();
        styleElement.remove();
      }, 300);
    });

    // Auto-close after 8 seconds
    setTimeout(() => {
      if (document.body.contains(celebration)) {
        celebration.querySelector('.celebration-close').click();
      }
    }, 8000);
  }

  function showMatchCompletionCelebration(match) {
    const matchResult = getMatchResult(match);
    
    // Create celebration modal
    const celebration = document.createElement('div');
    celebration.className = 'celebration-modal';
    celebration.innerHTML = createCelebrationHTML(match, matchResult);

    // Add celebration styles
    const styleElement = document.createElement('style');
    styleElement.textContent = getCelebrationStyles();
    document.head.appendChild(styleElement);
    document.body.appendChild(celebration);

    // Add confetti for winners
    if (matchResult.isWinner) {
      createConfetti();
    }

    // Setup event handlers
    setupCelebrationHandlers(celebration, styleElement);
  }

  // --- Confetti Effect ---
  function createConfetti() {
    const confettiContainer = document.createElement('div');
    confettiContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;

    const colors = ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF', '#FF69B4'];

    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
                position: absolute;
                width: ${Math.random() * 10 + 5}px;
                height: ${Math.random() * 10 + 5}px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                top: -10px;
                left: ${Math.random() * 100}%;
                transform: rotate(${Math.random() * 360}deg);
                animation: confettiFall ${Math.random() * 3 + 2}s linear forwards;
            `;
      confettiContainer.appendChild(confetti);
    }

    const confettiStyles =
      '@keyframes confettiFall { to { transform: translateY(100vh) rotate(720deg); opacity: 0; } }';
    const confettiStyleElement = document.createElement('style');
    confettiStyleElement.textContent = confettiStyles;

    document.head.appendChild(confettiStyleElement);
    document.body.appendChild(confettiContainer);

    // Clean up after animation
    setTimeout(() => {
      confettiContainer.remove();
      confettiStyleElement.remove();
    }, 5000);
  }
  function setLoading(isLoading) {
    const btn = $('sendChallenge');
    if (btn) {
      btn.textContent = isLoading ? 'Sending…' : 'Send';
    }
  }

  // Helper function to handle counter-proposal submission
  async function submitCounterProposal(challengeId, payload) {
    await api(`/api/challenges/${challengeId}/counter-propose`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Helper function to handle successful counter-proposal submission
  function handleCounterProposalSuccess() {
    showToast('Counter-proposal sent!', 'success');
    setTimeout(() => {
      $('challengeForm').classList.add('hidden');
      hideMessages();
    }, 1300);
    setTimeout(fetchAwaitingConfirmation, 1600);
    setTimeout(fetchPendingChallenges, 1600);
    return true; // indicates closing state
  }

  function setupCounterProposalUI(challengeId) {
    const proposeBtn = $('sendChallenge');
    if (!proposeBtn) {
      return;
    }
    // Remove old listeners with clone trick
    const clone = proposeBtn.cloneNode(true);
    proposeBtn.parentNode.replaceChild(clone, proposeBtn);
    const btn = $('sendChallenge');
    btn.disabled = false;
    btn.textContent = 'Counter-propose';

    let closing = false;
    btn.addEventListener('click', async event => {
      event.preventDefault();
      if (btn.disabled) {
        return;
      }
      
      btn.disabled = true;
      setCounterLoading(true);
      hideMessages();

      // Validate form data using existing helper
      const validation = validateChallengeProposalForm();
      if (!validation.isValid) {
        showToast(validation.error, 'error');
        btn.disabled = false;
        setCounterLoading(false);
        return;
      }

      try {
        const payload = { venue: validation.data.venue, scheduledAt: validation.data.scheduledAt };
        await submitCounterProposal(challengeId, payload);
        closing = handleCounterProposalSuccess();
      } catch (err) {
        showToast('Could not counter-propose: ' + (err.message || err), 'error');
      } finally {
        if (!closing) {
          btn.disabled = false;
          setCounterLoading(false);
        }
      }
    });
    // Keyboard a11y: focus first field, ESC close
    if ($('discipline')) {
      $('discipline').focus();
    }
    document.onkeydown = e => {
      if (e.key === 'Escape') {
        $('challengeForm').classList.add('hidden');
        hideMessages();
      }
    };
  }

  function setCounterLoading(isLoading) {
    const btn = $('sendChallenge');
    if (btn) {
      btn.textContent = isLoading ? 'Sending…' : 'Counter-propose';
    }
  }

  // Initialize tips and community features
  function initializeTipsAndDrills() {
    const refreshTipsBtn = $('refreshTips');
    if (refreshTipsBtn) {
      refreshTipsBtn.addEventListener('click', refreshTips);
    }
  }

  function refreshTips() {
    const tipsContent = $('tips-content');
    if (!tipsContent) {
      return;
    }

    const tipPool = [
      {
        icon: '🔮',
        title: 'Power Break Mechanics',
        content:
          'Contact the 1-ball at 30% below center with maximum acceleration. Keep your bridge hand locked and follow through straight. The key is controlled power, not brute force.',
        source: 'Professional Pool Instructors Association'
      },
      {
        icon: '🎯',
        title: 'Position Play Mastery',
        content:
          'Use the "90-degree rule" for stop shots and "tangent line" for rolling shots. Plan 3 balls ahead, not just the next shot. Speed control is more important than perfect aim.',
        source: 'Billiards Digest Training Manual'
      },
      {
        icon: '🧠',
        title: 'Pattern Recognition',
        content:
          'Study common rack layouts and develop "muscle memory" for standard patterns. Practice the same runout 10 times to build neural pathways.',
        source: 'World Pool-Billiard Association'
      },
      {
        icon: '🔭',
        title: 'Advanced Safety Play',
        content:
          'When in doubt, play safe. Hide the cue ball behind the lowest numbered ball. Force your opponent into difficult angles and long shots.',
        source: 'Mosconi Cup Training Guidelines'
      },
      {
        icon: '🎱',
        title: 'Cue Ball Control',
        content:
          'Master the follow, draw, and stop shots first. Use center ball for straight shots, top spin for follow-through, and bottom spin for draw shots.',
        source: 'American Poolplayers Association'
      },
      {
        icon: '🔧',
        title: 'Bridge Fundamentals',
        content:
          'Keep your bridge hand stable and low. Form a solid "V" with your fingers. The bridge should be 6-8 inches from the cue ball for optimal accuracy.',
        source: 'Professional Billiards Tour Academy'
      },
      {
        icon: '⚙️',
        title: 'Stance & Alignment',
        content:
          'Stand with feet shoulder-width apart. Your shooting arm should swing like a pendulum. Keep your head still and eyes level during the shot.',
        source: 'International Pool Training Institute'
      },
      {
        icon: '👁️',
        title: 'Aiming Systems',
        content:
          'Use the "ghost ball" method: visualize where the cue ball needs to contact the object ball. The center of the ghost ball is your aiming point.',
        source: 'European Pool Championship Manual'
      },
      {
        icon: '📊',
        title: 'Speed Control',
        content:
          'Practice shooting at different speeds with the same stroke. Soft shots require finesse, while power shots need commitment. Never decelerate through impact.',
        source: 'Professional Pool Players Manual'
      },
      {
        icon: '🧘',
        title: 'Mental Preparation',
        content:
          'Develop a pre-shot routine and stick to it. Visualize the shot before executing. Stay calm under pressure and trust your fundamentals.',
        source: 'Sports Psychology Institute'
      },
      {
        icon: '🔄',
        title: 'Practice Drills',
        content:
          'Practice "straight pool" for position play, "9-ball ghost" for pattern recognition, and "line-up drills" for accurate shooting.',
        source: 'Championship Pool Training System'
      },
      {
        icon: '🎬',
        title: 'Shot Planning',
        content:
          'Before shooting, identify problem balls and plan your path around them. Always have a backup plan if your primary route fails.',
        source: 'Advanced Pool Strategy Guide'
      }
    ];

    // Select 4 random tips
    const shuffled = tipPool.sort(() => 0.5 - Math.random());
    const selectedTips = shuffled.slice(0, 4);

    // Update the content with animation
    tipsContent.style.opacity = '0.5';
    setTimeout(() => {
      tipsContent.innerHTML = selectedTips
        .map(
          tip => `
                <div class="tip-item advanced-tip">
                    <div class="tip-icon">${tip.icon}</div>
                    <div class="tip-content">
                        <h4>${tip.title}</h4>
                        <p>${tip.content}</p>
                        <div class="tip-source">Source: ${tip.source}</div>
                    </div>
                </div>
            `
        )
        .join('');
      tipsContent.style.opacity = '1';
    }, 200);

    showToast('Fresh tips loaded!', 'info', 1500);
  }

  function initializeCommunityNotifications() {
    // Load initial community notifications
    loadCommunityNotifications();

    // Set up periodic refresh
    setInterval(loadCommunityNotifications, 30000); // Refresh every 30 seconds
  }

  function loadCommunityNotifications() {
    // This will be enhanced once we fix the backend emission
    // For now, just maintain the welcome message
  }

  function addCommunityNotification(notification) {
    const communityFeed = $('community-feed');
    if (!communityFeed) {
      return;
    }

    const notificationItem = document.createElement('div');
    notificationItem.className = 'notification-item new';
    notificationItem.innerHTML = `
            <div class="notification-icon">${notification.icon || '🎯'}</div>
            <div class="notification-content">
                <span class="notification-text">${notification.message}</span>
                <span class="notification-time">${formatTimeAgo(new Date())}</span>
            </div>
        `;

    // Insert at the beginning
    const firstChild = communityFeed.firstChild;
    if (firstChild) {
      communityFeed.insertBefore(notificationItem, firstChild);
    } else {
      communityFeed.appendChild(notificationItem);
    }

    // Remove 'new' class after animation
    setTimeout(() => {
      notificationItem.classList.remove('new');
    }, 3000);

    // Keep only the latest 20 notifications
    const notifications = communityFeed.querySelectorAll('.notification-item');
    if (notifications.length > 20) {
      notifications[notifications.length - 1].remove();
    }
  }

  function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  }

  // --- Pool Table Visualization Integration ---
  function setupPoolTableVisualization() {
    // Wait for pool table visualization to be ready
    setTimeout(() => {
      if (window.poolTableViz && currentUser) {
        window.poolTableViz.setCurrentUser(currentUser);

        // Set up pool table button click handler
        const poolTableBtn = document.getElementById('openPoolTable');
        if (poolTableBtn) {
          poolTableBtn.addEventListener('click', () => {
            window.poolTableViz.showPoolTableModal();
          });
        }
      }
    }, 1500);
  }

  init();
});
