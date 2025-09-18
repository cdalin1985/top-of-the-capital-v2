/**
 * Analytics Dashboard JavaScript
 * Handles all analytics dashboard functionality and Chart.js integration
 * Version 1.0 - Created 2025-09-15
 */

// Global variables
const analyticsCharts = {};
let currentPeriod = '30d';
let currentUser = null;
let analyticsSocket = null;
const updateThrottleTimers = {};
const performanceMetrics = {
  updateCount: 0,
  throttledUpdates: 0,
  lastUpdate: null,
  averageUpdateTime: 0
};

// Initialize analytics dashboard
function initAnalytics(user) {
  currentUser = user;

  // Set up event listeners
  setupAnalyticsEventListeners();

  // Initialize real-time connection
  setupAnalyticsSocket();

  // Load initial data
  loadAnalyticsData();

  console.log('Analytics dashboard initialized');
}

// Setup all event listeners
function setupAnalyticsEventListeners() {
  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      const tabName = e.currentTarget.dataset.tab;
      switchAnalyticsTab(tabName);
    });
  });

  // Period selector
  const periodSelector = document.getElementById('analytics-period');
  if (periodSelector) {
    periodSelector.addEventListener('change', e => {
      currentPeriod = e.target.value;
      refreshAnalyticsData();
    });
  }

  // Refresh button
  const refreshBtn = document.getElementById('refresh-analytics');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshAnalyticsData(true);
    });
  }

  // Activity filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      // Remove active class from all filter buttons
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      e.currentTarget.classList.add('active');

      // Filter activity feed
      const filter = e.currentTarget.dataset.filter;
      filterActivityFeed(filter);
    });
  });

  // Player controls
  const playerSegmentFilter = document.getElementById('player-segment-filter');
  const playerSearch = document.getElementById('player-search');

  if (playerSegmentFilter) {
    playerSegmentFilter.addEventListener('change', () => {
      loadPlayerList();
    });
  }

  if (playerSearch) {
    playerSearch.addEventListener(
      'input',
      debounce(() => {
        loadPlayerList();
      }, 300)
    );
  }

  // Sort controls
  const sortSelect = document.getElementById('sort-players');
  const sortOrderBtn = document.getElementById('sort-order');

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      loadPlayerList();
    });
  }

  if (sortOrderBtn) {
    sortOrderBtn.addEventListener('click', e => {
      const currentOrder = e.currentTarget.dataset.order;
      const newOrder = currentOrder === 'desc' ? 'asc' : 'desc';
      e.currentTarget.dataset.order = newOrder;
      e.currentTarget.textContent = newOrder === 'desc' ? '↓' : '↑';
      loadPlayerList();
    });
  }

  // Export buttons
  document.getElementById('export-csv')?.addEventListener('click', () => exportData('csv'));
  document.getElementById('export-pdf')?.addEventListener('click', () => exportData('pdf'));
  document.getElementById('schedule-report')?.addEventListener('click', () => scheduleReports());
}

// Switch analytics tabs
function switchAnalyticsTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update tab content
  document.querySelectorAll('.analytics-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');

  // Load tab-specific data
  switch (tabName) {
    case 'overview':
      loadOverviewData();
      break;
    case 'players':
      loadPlayersData();
      break;
    case 'competition':
      loadCompetitionData();
      break;
    case 'trends':
      loadTrendsData();
      break;
  }
}

// Main data loading function
async function loadAnalyticsData() {
  showLoadingState();

  try {
    // Load overview data by default
    await loadOverviewData();

    console.log('Analytics data loaded successfully');
  } catch (error) {
    console.error('Error loading analytics data:', error);
    showErrorState('Failed to load analytics data. Please try again.');
  } finally {
    hideLoadingState();
  }
}

// Load overview tab data
async function loadOverviewData() {
  try {
    // Fetch overview metrics
    const response = await fetch(`/api/analytics/overview/metrics?period=${currentPeriod}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('cl_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch overview metrics');
    }

    const data = await response.json();

    if (data.success) {
      updateOverviewMetrics(data.data);
      await loadActivityFeed();
      createOverviewCharts(data.data);
      updateLastUpdatedTime(data.data.generatedAt);
    } else {
      throw new Error(data.error || 'Failed to load metrics');
    }
  } catch (error) {
    console.error('Error loading overview data:', error);
    showFallbackMetrics();
  }
}

// Helper function to update league health metrics
function updateLeagueHealth(data) {
  const healthScore = data.leagueHealth?.score || 0;
  document.getElementById('league-health').textContent = healthScore;

  const healthTrend = document.getElementById('health-trend');
  const trend = data.leagueHealth?.trend || 'stable';
  healthTrend.querySelector('.trend-arrow').textContent = getTrendArrow(trend);
  healthTrend.querySelector('.trend-text').textContent = trend;

  // Update health indicator
  const healthIndicator = document.getElementById('health-indicator');
  const healthAngle = (healthScore / 100) * 360;
  healthIndicator.style.setProperty('--health-angle', `${healthAngle}deg`);
}

// Helper function to update active players metrics
function updateActivePlayersMetrics(data) {
  const activePlayers = data.activePlayers?.current || 0;
  document.getElementById('active-players').textContent = activePlayers;

  const playersChange = data.activePlayers?.change || 0;
  const playersTrend = document.getElementById('players-trend');
  const trendDirection = playersChange > 0 ? 'up' : playersChange < 0 ? 'down' : 'stable';
  playersTrend.querySelector('.trend-arrow').textContent = getTrendArrow(trendDirection);
  playersTrend.querySelector('.trend-text').textContent =
    `${playersChange > 0 ? '+' : ''}${playersChange}%`;
}

// Helper function to update player segments
function updatePlayerSegmentsDisplay(data) {
  const breakdown = data.activePlayers?.breakdown || {};
  const playerSegments = document.getElementById('player-segments');
  playerSegments.querySelector('.highly-active .segment-value').textContent =
    breakdown.highly_active || 0;
  playerSegments.querySelector('.moderate .segment-value').textContent =
    breakdown.moderately_active || 0;
  playerSegments.querySelector('.at-risk .segment-value').textContent = breakdown.at_risk || 0;
}

// Helper function to update pending challenges metrics
function updatePendingChallenges(data) {
  const pendingCount = data.pendingChallenges?.count || 0;
  document.getElementById('pending-challenges').textContent = pendingCount;
  document.getElementById('urgent-challenges').textContent =
    `${data.pendingChallenges?.urgent || 0} urgent`;

  const avgResponseTime = document.getElementById('avg-response-time');
  avgResponseTime.querySelector('.info-value').textContent =
    data.pendingChallenges?.avgResponseTime || '0 days';
}

// Helper function to update match completion metrics
function updateMatchCompletionMetrics(data) {
  const completionRate = data.matchCompletion?.rate || 0;
  document.getElementById('match-completion').textContent = `${completionRate}%`;

  const completionTrend = document.getElementById('completion-trend');
  const cTrend = data.matchCompletion?.trend || 'stable';
  completionTrend.querySelector('.trend-arrow').textContent = getTrendArrow(cTrend);
  completionTrend.querySelector('.trend-text').textContent = cTrend;

  const completedMatches = document.getElementById('completed-matches');
  completedMatches.querySelector('.info-value').textContent =
    data.matchCompletion?.completedThisPeriod || 0;
}

// Update overview metrics display
function updateOverviewMetrics(data) {
  updateLeagueHealth(data);
  updateActivePlayersMetrics(data);
  updatePlayerSegmentsDisplay(data);
  updatePendingChallenges(data);
  updateMatchCompletionMetrics(data);
}

// Load players tab data
async function loadPlayersData() {
  try {
    // Fetch player segments
    const response = await fetch('/api/analytics/players/segments', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('cl_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch player segments');
    }

    const data = await response.json();

    if (data.success) {
      updatePlayerSegments(data.data);
      await loadPlayerList();
      createPlayerCharts(data.data);
    } else {
      throw new Error(data.error || 'Failed to load player data');
    }
  } catch (error) {
    console.error('Error loading players data:', error);
    showFallbackPlayerData();
  }
}

// Update player segments display
function updatePlayerSegments(data) {
  const segments = data.segments || {};

  // Update segment counts
  document.getElementById('highly-active-count').textContent = segments.highly_active?.count || 0;
  document.getElementById('moderate-active-count').textContent =
    segments.moderately_active?.count || 0;
  document.getElementById('at-risk-count').textContent = segments.at_risk?.count || 0;
}

// Helper to collect player list filter parameters
function getPlayerListParams() {
  return {
    segment: document.getElementById('player-segment-filter')?.value || 'all',
    search: document.getElementById('player-search')?.value || '',
    sortBy: document.getElementById('sort-players')?.value || 'lastActive',
    sortOrder: document.getElementById('sort-order')?.dataset.order || 'desc'
  };
}

// Helper to make player list API request
async function fetchPlayerListData(params) {
  const urlParams = new URLSearchParams(params);
  const response = await fetch(`/api/analytics/players/list?${urlParams}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('cl_token')}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch player list');
  }

  return await response.json();
}

// Helper to handle player list error state
function showPlayerListError(error) {
  console.error('Error loading player list:', error);
  document.getElementById('analytics-player-list').innerHTML =
    '<div class="loading-spinner">Error loading players</div>';
}

// Load player list
async function loadPlayerList() {
  try {
    const params = getPlayerListParams();
    const data = await fetchPlayerListData(params);

    if (data.success) {
      displayPlayerList(data.data.players);
    } else {
      throw new Error(data.error || 'Failed to load player list');
    }
  } catch (error) {
    showPlayerListError(error);
  }
}

// Display player list
function displayPlayerList(players) {
  const container = document.getElementById('analytics-player-list');

  if (!players || players.length === 0) {
    container.innerHTML = '<div class="loading-spinner">No players found</div>';
    return;
  }

  const html = players
    .map(
      player => `
        <div class="player-item ${player.isAtRisk ? 'at-risk' : ''}">
            <div class="player-info">
                <div class="player-name">${escapeHtml(player.name)}</div>
                <div class="player-details">
                    Last active: ${formatDate(player.lastActive)} (${player.daysSinceActive} days ago)
                </div>
            </div>
            <div class="player-stats">
                <div class="stat">
                    <span class="stat-label">Challenges:</span>
                    <span class="stat-value">${player.challengeCount}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Matches:</span>
                    <span class="stat-value">${player.matchCount}</span>
                </div>
            </div>
            <div class="player-segment ${player.segment}">
                ${getSegmentIcon(player.segment)} ${formatSegment(player.segment)}
            </div>
        </div>
    `
    )
    .join('');

  container.innerHTML = html;
}

// Load competition tab data
async function loadCompetitionData() {
  try {
    // Fetch challenge flow data
    const response = await fetch('/api/analytics/competition/challenge-flow?period=7d', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('cl_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch competition data');
    }

    const data = await response.json();

    if (data.success) {
      updateChallengeFlow(data.data);
      createCompetitionCharts(data.data);
      loadVenuePerformance();
    } else {
      throw new Error(data.error || 'Failed to load competition data');
    }
  } catch (error) {
    console.error('Error loading competition data:', error);
    showFallbackCompetitionData();
  }
}

// Update challenge flow display
function updateChallengeFlow(data) {
  const funnel = data.funnel || {};

  document.getElementById('challenges-created').textContent = funnel.created?.count || 0;
  document.getElementById('challenges-accepted').textContent = funnel.accepted?.count || 0;
  document.getElementById('challenges-scheduled').textContent = funnel.scheduled?.count || 0;
  document.getElementById('challenges-completed').textContent = funnel.completed?.count || 0;

  // Update progress bars
  const total = funnel.created?.count || 1;
  document.getElementById('accepted-bar').style.width =
    `${((funnel.accepted?.count || 0) / total) * 100}%`;
  document.getElementById('scheduled-bar').style.width =
    `${((funnel.scheduled?.count || 0) / total) * 100}%`;
  document.getElementById('completed-bar').style.width =
    `${((funnel.completed?.count || 0) / total) * 100}%`;
}

// Load venue performance data
async function loadVenuePerformance() {
  // Mock data for now - would be implemented in backend
  const venues = [
    { name: 'Valley Hub', matches: 45, completion: 89, avgTime: '2.3h' },
    { name: 'Eagles 4040', matches: 32, completion: 94, avgTime: '1.8h' }
  ];

  displayVenuePerformance(venues);
}

// Display venue performance table
function displayVenuePerformance(venues) {
  const container = document.getElementById('venue-performance-table');

  const html = venues
    .map(
      venue => `
        <div class="table-row" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 0.5rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <div style="color: white; font-weight: 600;">${venue.name}</div>
            <div style="color: rgba(255,255,255,0.8);">${venue.matches}</div>
            <div style="color: rgba(255,255,255,0.8);">${venue.completion}%</div>
            <div style="color: rgba(255,255,255,0.8);">${venue.avgTime}</div>
        </div>
    `
    )
    .join('');

  container.innerHTML = html;
}

// Load trends tab data
async function loadTrendsData() {
  try {
    // Mock data for trends - would be implemented in backend
    createTrendsCharts();
    loadComparisonData();
  } catch (error) {
    console.error('Error loading trends data:', error);
  }
}

// Load comparison data
function loadComparisonData() {
  // Mock data for now
  const comparisonData = [
    { metric: 'Active Players', current: 34, previous: 31, change: '+9.7%' },
    { metric: 'Matches Played', current: 127, previous: 115, change: '+10.4%' },
    { metric: 'Challenge Acceptance', current: '78%', previous: '73%', change: '+5%' },
    { metric: 'Match Completion', current: '89%', previous: '91%', change: '-2%' }
  ];

  displayComparisonData(comparisonData);
}

// Display comparison table
function displayComparisonData(data) {
  const container = document.getElementById('comparison-table-body');

  const html = data
    .map(
      row => `
        <div class="table-row" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; padding: 0.5rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <div style="color: white; font-weight: 600;">${row.metric}</div>
            <div style="color: rgba(255,255,255,0.8);">${row.current}</div>
            <div style="color: rgba(255,255,255,0.8);">${row.previous}</div>
            <div style="color: ${row.change.startsWith('+') ? '#2ecc71' : row.change.startsWith('-') ? '#e74c3c' : 'rgba(255,255,255,0.8)'}; font-weight: 600;">${row.change}</div>
        </div>
    `
    )
    .join('');

  container.innerHTML = html;
}

// Load activity feed
async function loadActivityFeed() {
  try {
    const response = await fetch('/api/analytics/activity-feed?limit=20', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('cl_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch activity feed');
    }

    const data = await response.json();

    if (data.success) {
      displayActivityFeed(data.data.activities);
    } else {
      throw new Error(data.error || 'Failed to load activity feed');
    }
  } catch (error) {
    console.error('Error loading activity feed:', error);
    document.getElementById('analytics-activity-feed').innerHTML =
      '<div class="loading-spinner">Error loading activity</div>';
  }
}

// Display activity feed
function displayActivityFeed(activities) {
  const container = document.getElementById('analytics-activity-feed');

  if (!activities || activities.length === 0) {
    container.innerHTML = '<div class="loading-spinner">No recent activity</div>';
    return;
  }

  const html = activities
    .map(
      activity => `
        <div class="activity-item" data-type="${activity.type}">
            <div class="activity-icon">${getActivityIcon(activity.type)}</div>
            <div class="activity-content">
                <div class="activity-message">${escapeHtml(activity.message)}</div>
                <div class="activity-details">${escapeHtml(activity.details || '')}</div>
                <div class="activity-time">${formatDate(activity.timestamp)}</div>
            </div>
        </div>
    `
    )
    .join('');

  container.innerHTML = html;
}

// Chart creation functions
function createOverviewCharts(data) {
  // Activity Chart (placeholder data)
  createActivityChart();

  // Segments Chart
  if (data.activePlayers?.breakdown) {
    createSegmentsChart(data.activePlayers.breakdown);
  }
}

function createActivityChart() {
  const ctx = document.getElementById('activity-chart');
  if (!ctx) {
    return;
  }

  // Destroy existing chart if it exists
  if (analyticsCharts.activityChart) {
    analyticsCharts.activityChart.destroy();
  }

  // Mock activity data for 24 hours
  const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const data = Array.from({ length: 24 }, () => Math.floor(Math.random() * 10) + 1);

  analyticsCharts.activityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Activity',
          data: data,
          borderColor: '#d4af37',
          backgroundColor: 'rgba(212, 175, 55, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      }
    }
  });
}

function createSegmentsChart(breakdown) {
  const ctx = document.getElementById('segments-chart');
  if (!ctx) {
    return;
  }

  // Destroy existing chart if it exists
  if (analyticsCharts.segmentsChart) {
    analyticsCharts.segmentsChart.destroy();
  }

  analyticsCharts.segmentsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Highly Active', 'Moderate', 'At Risk'],
      datasets: [
        {
          data: [
            breakdown.highly_active || 0,
            breakdown.moderately_active || 0,
            breakdown.at_risk || 0
          ],
          backgroundColor: ['#e74c3c', '#f39c12', '#95a5a6'],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: 'rgba(255, 255, 255, 0.8)',
            padding: 20
          }
        }
      }
    }
  });
}

function createPlayerCharts(data) {
  createSegmentsChart(data.segments);
}

function createCompetitionCharts(data) {
  // Create match trends chart (mock data)
  createMatchTrendsChart();
  createDisciplinesChart();
}

function createMatchTrendsChart() {
  const ctx = document.getElementById('match-trends-chart');
  if (!ctx) {
    return;
  }

  if (analyticsCharts.matchTrendsChart) {
    analyticsCharts.matchTrendsChart.destroy();
  }

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = [12, 8, 15, 10, 18, 22, 16];

  analyticsCharts.matchTrendsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Matches',
          data: data,
          backgroundColor: '#d4af37',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      }
    }
  });
}

function createDisciplinesChart() {
  const ctx = document.getElementById('disciplines-chart');
  if (!ctx) {
    return;
  }

  if (analyticsCharts.disciplinesChart) {
    analyticsCharts.disciplinesChart.destroy();
  }

  analyticsCharts.disciplinesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Eight Ball', 'Nine Ball', 'Ten Ball'],
      datasets: [
        {
          data: [45, 35, 20],
          backgroundColor: ['#3498db', '#e74c3c', '#f39c12'],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: 'rgba(255, 255, 255, 0.8)',
            padding: 20
          }
        }
      }
    }
  });
}

function createTrendsCharts() {
  createGrowthChart();
}

function createGrowthChart() {
  const ctx = document.getElementById('growth-chart');
  if (!ctx) {
    return;
  }

  if (analyticsCharts.growthChart) {
    analyticsCharts.growthChart.destroy();
  }

  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  analyticsCharts.growthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Players',
          data: [25, 28, 31, 29, 34, 36],
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 3,
          fill: false
        },
        {
          label: 'Matches',
          data: [45, 52, 68, 61, 89, 95],
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderWidth: 3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: 'rgba(255, 255, 255, 0.8)'
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      }
    }
  });
}

// Utility functions
function refreshAnalyticsData(force = false) {
  const params = force ? '?refresh=true' : '';
  loadAnalyticsData();
}

function filterActivityFeed(filter) {
  const activities = document.querySelectorAll('.activity-item');
  activities.forEach(item => {
    const type = item.dataset.type;
    if (filter === 'all' || type === filter || type.includes(filter)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

function exportData(format) {
  console.log(`Exporting data as ${format}...`);
  // Would implement actual export functionality
  showToast(`Export ${format.toUpperCase()} started`, 'info', 3000);
}

function scheduleReports() {
  console.log('Opening report scheduling...');
  // Would implement report scheduling UI
  showToast('Report scheduling coming soon', 'info', 3000);
}

function getTrendArrow(trend) {
  switch (trend) {
    case 'up':
      return '↗️';
    case 'down':
      return '↘️';
    case 'stable':
      return '➡️';
    default:
      return '—';
  }
}

function getActivityIcon(type) {
  switch (type) {
    case 'challenge':
      return '⚔️';
    case 'match_completed':
      return '🏆';
    case 'new_user':
      return '👋';
    default:
      return '📊';
  }
}

function getSegmentIcon(segment) {
  switch (segment) {
    case 'highly_active':
      return '🔥';
    case 'moderately_active':
      return '📊';
    case 'at_risk':
      return '⚠️';
    default:
      return '👤';
  }
}

function formatSegment(segment) {
  return segment
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString();
}

function updateLastUpdatedTime(timestamp) {
  const element = document.getElementById('last-updated-time');
  if (element) {
    element.textContent = formatDate(timestamp);
  }
}

function showLoadingState() {
  // Could implement global loading indicator
}

function hideLoadingState() {
  // Could implement global loading indicator
}

function showErrorState(message) {
  console.error(message);
  showToast(message, 'error', 5000);
}

function showFallbackMetrics() {
  // Show placeholder data when API fails
  updateOverviewMetrics({
    leagueHealth: { score: 0, trend: 'unknown' },
    activePlayers: { current: 0, change: 0, breakdown: {} },
    pendingChallenges: { count: 0, urgent: 0, avgResponseTime: '0 days' },
    matchCompletion: { rate: 0, trend: 'unknown', completedThisPeriod: 0 }
  });
}

function showFallbackPlayerData() {
  updatePlayerSegments({
    segments: {
      highly_active: { count: 0 },
      moderately_active: { count: 0 },
      at_risk: { count: 0 }
    }
  });
}

function showFallbackCompetitionData() {
  updateChallengeFlow({
    funnel: {
      created: { count: 0 },
      accepted: { count: 0 },
      scheduled: { count: 0 },
      completed: { count: 0 }
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showToast(message, type = 'info', duration = 3000) {
  // Would integrate with existing toast system
  console.log(`Toast: ${type} - ${message}`);
}

// Setup Socket.IO connection for real-time analytics updates
function setupAnalyticsSocket() {
  if (typeof io === 'undefined') {
    console.warn('Socket.IO not available - real-time updates disabled');
    return;
  }

  // Create analytics-specific socket connection
  analyticsSocket = io(window.location.origin, {
    autoConnect: false,
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  // Set authentication
  analyticsSocket.auth = {
    token: localStorage.getItem('cl_token'),
    analyticsClient: true
  };

  // Connection event handlers
  analyticsSocket.on('connect', () => {
    console.log('Analytics real-time connection established');
    showConnectionStatus('connected');

    // Join analytics room for targeted updates
    analyticsSocket.emit('join-analytics-room');
  });

  analyticsSocket.on('connect_error', error => {
    console.warn('Analytics socket connection error:', error.message);
    showConnectionStatus('error');
  });

  analyticsSocket.on('disconnect', reason => {
    console.log('Analytics socket disconnected:', reason);
    showConnectionStatus('disconnected');
  });

  analyticsSocket.on('reconnect', () => {
    console.log('Analytics socket reconnected');
    showConnectionStatus('connected');
    // Refresh data after reconnection
    throttleRefresh(
      'reconnect',
      () => {
        refreshAnalyticsData(true);
      },
      2000
    );
  });

  // Analytics-specific event listeners
  setupAnalyticsSocketListeners();

  // Connect the socket
  analyticsSocket.connect();
}

// Setup real-time analytics event listeners
function setupAnalyticsSocketListeners() {
  if (!analyticsSocket) {
    return;
  }

  // League activity updates
  analyticsSocket.on('analytics:league-update', data => {
    throttleRefresh(
      'league-update',
      () => {
        handleLeagueUpdate(data);
      },
      5000
    ); // Throttle to max once per 5 seconds
  });

  // Player activity updates
  analyticsSocket.on('analytics:player-update', data => {
    throttleRefresh(
      'player-update',
      () => {
        handlePlayerUpdate(data);
      },
      3000
    );
  });

  // Match events
  analyticsSocket.on('analytics:match-update', data => {
    throttleRefresh(
      'match-update',
      () => {
        handleMatchUpdate(data);
      },
      2000
    );
  });

  // Challenge events
  analyticsSocket.on('analytics:challenge-update', data => {
    throttleRefresh(
      'challenge-update',
      () => {
        handleChallengeUpdate(data);
      },
      3000
    );
  });

  // New activity for feed
  analyticsSocket.on('analytics:activity-feed', activity => {
    handleNewActivity(activity);
  });

  // Metrics recalculation completed
  analyticsSocket.on('analytics:metrics-updated', data => {
    throttleRefresh(
      'metrics-updated',
      () => {
        handleMetricsUpdate(data);
      },
      10000
    ); // Throttle metrics updates to max once per 10 seconds
  });
}

// Throttle function to prevent excessive updates with performance monitoring
function throttleRefresh(key, callback, delay) {
  const now = performance.now();

  // Track throttled updates
  if (updateThrottleTimers[key]) {
    clearTimeout(updateThrottleTimers[key]);
    performanceMetrics.throttledUpdates++;
    console.debug(`Throttled update for ${key}`);
  }

  updateThrottleTimers[key] = setTimeout(() => {
    const startTime = performance.now();

    try {
      callback();

      // Track performance metrics
      const duration = performance.now() - startTime;
      performanceMetrics.updateCount++;
      performanceMetrics.lastUpdate = now;
      performanceMetrics.averageUpdateTime =
        (performanceMetrics.averageUpdateTime * (performanceMetrics.updateCount - 1) + duration) /
        performanceMetrics.updateCount;

      console.debug(`Analytics update ${key} completed in ${duration.toFixed(2)}ms`);

      // Log performance warning if update takes too long
      if (duration > 100) {
        console.warn(`Slow analytics update detected: ${key} took ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error(`Error in throttled update ${key}:`, error);
    }

    delete updateThrottleTimers[key];
  }, delay);
}

// Show connection status indicator
function showConnectionStatus(status) {
  const indicator = document.getElementById('connection-status');
  if (!indicator) {
    // Create status indicator if it doesn't exist
    const statusDiv = document.createElement('div');
    statusDiv.id = 'connection-status';
    statusDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            z-index: 9999;
            transition: all 0.3s ease;
        `;
    document.body.appendChild(statusDiv);
  }

  const statusElement = document.getElementById('connection-status');

  switch (status) {
    case 'connected':
      statusElement.textContent = '🟢 Live Updates';
      statusElement.style.backgroundColor = 'rgba(46, 204, 113, 0.9)';
      statusElement.style.color = 'white';
      // Hide after 3 seconds
      setTimeout(() => {
        statusElement.style.opacity = '0.7';
        statusElement.style.transform = 'scale(0.8)';
      }, 3000);
      break;
    case 'disconnected':
      statusElement.textContent = '🟡 Reconnecting...';
      statusElement.style.backgroundColor = 'rgba(241, 196, 15, 0.9)';
      statusElement.style.color = 'white';
      statusElement.style.opacity = '1';
      statusElement.style.transform = 'scale(1)';
      break;
    case 'error':
      statusElement.textContent = '🔴 Connection Lost';
      statusElement.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
      statusElement.style.color = 'white';
      statusElement.style.opacity = '1';
      statusElement.style.transform = 'scale(1)';
      break;
  }
}

// Cleanup socket connection when analytics is closed
function cleanupAnalyticsSocket() {
  if (analyticsSocket) {
    analyticsSocket.disconnect();
    analyticsSocket = null;
  }

  // Clear all throttle timers
  Object.keys(updateThrottleTimers).forEach(key => {
    clearTimeout(updateThrottleTimers[key]);
    delete updateThrottleTimers[key];
  });

  // Remove connection status indicator
  const statusElement = document.getElementById('connection-status');
  if (statusElement) {
    statusElement.remove();
  }
}

// Real-time update handlers
function handleLeagueUpdate(data) {
  console.log('League update received:', data);

  // Update league health if we're on overview tab
  const currentTab = document.querySelector('.nav-tab.active')?.dataset.tab;
  if (currentTab === 'overview') {
    // Refresh overview metrics with a visual indication
    showUpdateIndicator('League data updated');

    // Throttled refresh to prevent excessive API calls
    setTimeout(() => {
      loadOverviewData();
    }, 1000);
  }
}

function handlePlayerUpdate(data) {
  console.log('Player update received:', data);

  const currentTab = document.querySelector('.nav-tab.active')?.dataset.tab;

  // Update active player count in real-time
  if (currentTab === 'overview') {
    showUpdateIndicator('Player activity updated');

    // Update specific metrics without full refresh
    throttleRefresh(
      'player-metrics',
      () => {
        updatePlayerMetricsOnly();
      },
      5000
    );
  }

  // Update player list if on players tab
  if (currentTab === 'players') {
    throttleRefresh(
      'player-list',
      () => {
        loadPlayerList();
      },
      3000
    );
  }
}

function handleMatchUpdate(data) {
  console.log('Match update received:', data);

  const currentTab = document.querySelector('.nav-tab.active')?.dataset.tab;

  if (data.type === 'match_completed') {
    showUpdateIndicator('Match completed!');

    // Update completion metrics
    if (currentTab === 'overview') {
      throttleRefresh(
        'match-completion',
        () => {
          updateMatchCompletionMetrics();
        },
        2000
      );
    }

    // Update competition charts
    if (currentTab === 'competition') {
      throttleRefresh(
        'competition-charts',
        () => {
          loadCompetitionData();
        },
        3000
      );
    }

    // Add to activity feed
    const activity = {
      type: 'match_completed',
      message: 'Match completed',
      details: `Final score: ${Object.values(data.scores).join('-')}`,
      timestamp: data.timestamp,
      icon: '🏆'
    };
    addActivityToFeed(activity);
  }

  if (data.type === 'score_update') {
    // Real-time score updates (if we were showing live match details)
    updateLiveMatchProgress(data);
  }
}

function handleChallengeUpdate(data) {
  console.log('Challenge update received:', data);

  const currentTab = document.querySelector('.nav-tab.active')?.dataset.tab;

  // Update pending challenges count
  if (currentTab === 'overview') {
    showUpdateIndicator('Challenge status updated');

    throttleRefresh(
      'challenge-metrics',
      () => {
        updateChallengeMetricsOnly();
      },
      3000
    );
  }

  // Update challenge funnel
  if (currentTab === 'competition') {
    throttleRefresh(
      'challenge-funnel',
      () => {
        loadCompetitionData();
      },
      2000
    );
  }

  // Add to activity feed
  let activityMessage = 'Challenge activity';
  let activityIcon = '⚔️';

  if (data.type === 'challenge_created') {
    activityMessage = 'New challenge created';
    activityIcon = '🎯';
  } else if (data.type === 'challenge_confirmed') {
    activityMessage = 'Challenge confirmed';
    activityIcon = '✅';
  }

  const activity = {
    type: 'challenge',
    message: activityMessage,
    details: data.discipline ? `${data.discipline} - Race to ${data.gamesToWin}` : '',
    timestamp: data.timestamp,
    icon: activityIcon
  };
  addActivityToFeed(activity);
}

function handleNewActivity(activity) {
  console.log('New activity received:', activity);
  addActivityToFeed(activity);
}

function handleMetricsUpdate(data) {
  console.log('Metrics recalculated:', data);

  showUpdateIndicator('Analytics refreshed');

  // Full refresh of current tab data
  const currentTab = document.querySelector('.nav-tab.active')?.dataset.tab;

  switch (currentTab) {
    case 'overview':
      loadOverviewData();
      break;
    case 'players':
      loadPlayersData();
      break;
    case 'competition':
      loadCompetitionData();
      break;
    case 'trends':
      loadTrendsData();
      break;
  }
}

// Helper to update player count and trend display
function updatePlayerCountDisplay(activePlayersData) {
  const activePlayers = activePlayersData.current || 0;
  document.getElementById('active-players').textContent = activePlayers;

  const playersChange = activePlayersData.change || 0;
  const playersTrend = document.getElementById('players-trend');
  if (playersTrend) {
    const trendDirection = playersChange > 0 ? 'up' : playersChange < 0 ? 'down' : 'stable';
    playersTrend.querySelector('.trend-arrow').textContent = getTrendArrow(trendDirection);
    playersTrend.querySelector('.trend-text').textContent = `${playersChange > 0 ? '+' : ''}${playersChange}%`;
  }
}

// Helper to update player segments breakdown
function updatePlayerSegmentsMetrics(activePlayersData) {
  const breakdown = activePlayersData.breakdown || {};
  const playerSegments = document.getElementById('player-segments');
  if (playerSegments) {
    playerSegments.querySelector('.highly-active .segment-value').textContent =
      breakdown.highly_active || 0;
    playerSegments.querySelector('.moderate .segment-value').textContent =
      breakdown.moderately_active || 0;
    playerSegments.querySelector('.at-risk .segment-value').textContent =
      breakdown.at_risk || 0;
  }
}

// Helper to fetch metrics data
async function fetchMetricsData() {
  const response = await fetch(`/api/analytics/overview/metrics?period=${currentPeriod}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('cl_token')}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch metrics');
  }

  return await response.json();
}

// Helper functions for specific metric updates
async function updatePlayerMetricsOnly() {
  try {
    const data = await fetchMetricsData();
    
    if (data.success && data.data.activePlayers) {
      updatePlayerCountDisplay(data.data.activePlayers);
      updatePlayerSegmentsMetrics(data.data.activePlayers);
    }
  } catch (error) {
    console.warn('Failed to update player metrics:', error);
  }
}

async function updateChallengeMetricsOnly() {
  try {
    const response = await fetch(`/api/analytics/overview/metrics?period=${currentPeriod}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('cl_token')}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.pendingChallenges) {
        // Update only challenge-related metrics
        const pendingCount = data.data.pendingChallenges.count || 0;
        document.getElementById('pending-challenges').textContent = pendingCount;
        document.getElementById('urgent-challenges').textContent =
          `${data.data.pendingChallenges.urgent || 0} urgent`;

        const avgResponseTime = document.getElementById('avg-response-time');
        if (avgResponseTime) {
          avgResponseTime.querySelector('.info-value').textContent =
            data.data.pendingChallenges.avgResponseTime || '0 days';
        }
      }
    }
  } catch (error) {
    console.warn('Failed to update challenge metrics:', error);
  }
}

async function updateMatchCompletionMetrics() {
  try {
    const response = await fetch(`/api/analytics/overview/metrics?period=${currentPeriod}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('cl_token')}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.matchCompletion) {
        // Update match completion metrics
        const completionRate = data.data.matchCompletion.rate || 0;
        document.getElementById('match-completion').textContent = `${completionRate}%`;

        const completionTrend = document.getElementById('completion-trend');
        if (completionTrend) {
          const cTrend = data.data.matchCompletion.trend || 'stable';
          completionTrend.querySelector('.trend-arrow').textContent = getTrendArrow(cTrend);
          completionTrend.querySelector('.trend-text').textContent = cTrend;
        }

        const completedMatches = document.getElementById('completed-matches');
        if (completedMatches) {
          completedMatches.querySelector('.info-value').textContent =
            data.data.matchCompletion.completedThisPeriod || 0;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to update match completion metrics:', error);
  }
}

function updateLiveMatchProgress(data) {
  // This would update any live match displays
  // For now, just log it
  console.log('Live match progress:', data);
}

function addActivityToFeed(activity) {
  const feed = document.getElementById('analytics-activity-feed');
  if (!feed) {
    return;
  }

  // Create activity item
  const activityDiv = document.createElement('div');
  activityDiv.className = 'activity-item new-activity';
  activityDiv.dataset.type = activity.type;

  activityDiv.innerHTML = `
        <div class="activity-icon">${activity.icon || getActivityIcon(activity.type)}</div>
        <div class="activity-content">
            <div class="activity-message">${escapeHtml(activity.message)}</div>
            <div class="activity-details">${escapeHtml(activity.details || '')}</div>
            <div class="activity-time">${formatDate(activity.timestamp)}</div>
        </div>
    `;

  // Add at the top of the feed
  const firstChild = feed.firstChild;
  if (firstChild) {
    feed.insertBefore(activityDiv, firstChild);
  } else {
    feed.appendChild(activityDiv);
  }

  // Add animation
  setTimeout(() => {
    activityDiv.classList.remove('new-activity');
  }, 2000);

  // Remove old items if too many
  const items = feed.querySelectorAll('.activity-item');
  if (items.length > 20) {
    items[items.length - 1].remove();
  }
}

function showUpdateIndicator(message) {
  // Create a subtle update notification
  const indicator = document.createElement('div');
  indicator.style.cssText = `
        position: fixed;
        top: 60px;
        right: 10px;
        padding: 8px 16px;
        background: rgba(212, 175, 55, 0.9);
        color: white;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        z-index: 9998;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
  indicator.textContent = `📊 ${message}`;
  document.body.appendChild(indicator);

  // Animate in
  setTimeout(() => {
    indicator.style.transform = 'translateX(0)';
  }, 100);

  // Animate out and remove
  setTimeout(() => {
    indicator.style.transform = 'translateX(100%)';
    setTimeout(() => {
      indicator.remove();
    }, 300);
  }, 3000);
}

// Export for global access
window.initAnalytics = initAnalytics;
window.cleanupAnalyticsSocket = cleanupAnalyticsSocket;
