// Player Statistics Dashboard Module
// Comprehensive player performance analytics and metrics

class PlayerStats {
  constructor() {
    this.currentUser = null;
    this.statsData = null;
    this.charts = {};
    this.updateInterval = null;
  }

  init(user) {
    this.currentUser = user;
    this.loadPlayerStats();
    this.setupStatsUI();
    this.startPeriodicUpdates();
  }

  async loadPlayerStats() {
    if (!this.currentUser) {
      return;
    }

    try {
      const response = await fetch(`/api/player/${this.currentUser.info.id}/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('cl_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.statsData = await response.json();
      } else {
        // Generate mock stats for now until backend is implemented
        this.statsData = this.generateMockStats();
      }

      this.renderStatsOverview();
      this.renderPerformanceMetrics();
      this.renderDisciplineBreakdown();
      this.renderRecentForm();
      this.renderRankingHistory();
    } catch (error) {
      console.warn('Stats API not available, using mock data');
      this.statsData = this.generateMockStats();
      this.renderStatsOverview();
      this.renderPerformanceMetrics();
      this.renderDisciplineBreakdown();
      this.renderRecentForm();
      this.renderRankingHistory();
    }
  }

  generateMockStats() {
    const totalMatches = Math.floor(Math.random() * 100) + 20;
    const wins = Math.floor(totalMatches * (0.4 + Math.random() * 0.4)); // 40-80% win rate
    const losses = totalMatches - wins;

    return {
      overview: {
        totalMatches,
        wins,
        losses,
        winPercentage: Math.round((wins / totalMatches) * 100),
        currentRank: Math.floor(Math.random() * 50) + 1,
        currentStreak: Math.floor(Math.random() * 10),
        streakType: Math.random() > 0.5 ? 'win' : 'loss',
        hoursPlayed: Math.floor(totalMatches * (0.5 + Math.random() * 1.5)),
        averageMatchDuration: Math.floor(Math.random() * 30) + 15 // 15-45 minutes
      },
      disciplines: {
        '8-Ball': {
          matches: Math.floor(totalMatches * 0.4),
          wins: Math.floor(totalMatches * 0.4 * (0.3 + Math.random() * 0.5)),
          winPercentage: null
        },
        '9-Ball': {
          matches: Math.floor(totalMatches * 0.3),
          wins: Math.floor(totalMatches * 0.3 * (0.3 + Math.random() * 0.5)),
          winPercentage: null
        },
        '10-Ball': {
          matches: Math.floor(totalMatches * 0.2),
          wins: Math.floor(totalMatches * 0.2 * (0.3 + Math.random() * 0.5)),
          winPercentage: null
        },
        'Straight Pool': {
          matches: Math.floor(totalMatches * 0.1),
          wins: Math.floor(totalMatches * 0.1 * (0.3 + Math.random() * 0.5)),
          winPercentage: null
        }
      },
      performance: {
        avgRackTime: Math.floor(Math.random() * 60) + 30, // 30-90 seconds
        avgShotAccuracy: Math.floor(Math.random() * 30) + 60, // 60-90%
        longestRun: Math.floor(Math.random() * 8) + 3, // 3-10 balls
        safetyPlaySuccess: Math.floor(Math.random() * 40) + 50, // 50-90%
        breakSuccess: Math.floor(Math.random() * 30) + 60 // 60-90%
      },
      recentForm: Array.from({ length: 10 }, () => ({
        result: Math.random() > 0.5 ? 'W' : 'L',
        opponent: `Player ${Math.floor(Math.random() * 1000)}`,
        score: `${Math.floor(Math.random() * 10) + 5}-${Math.floor(Math.random() * 10) + 5}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        discipline: ['8-Ball', '9-Ball', '10-Ball'][Math.floor(Math.random() * 3)]
      })),
      rankingHistory: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        rank: Math.max(1, Math.floor(Math.random() * 50) + 1 + Math.sin(i * 0.3) * 10)
      })).reverse()
    };
  }

  setupStatsUI() {
    const statsButton = document.getElementById('showStats');
    if (statsButton) {
      statsButton.addEventListener('click', () => this.toggleStatsModal());
    }

    // Create stats modal if it doesn't exist
    if (!document.getElementById('statsModal')) {
      this.createStatsModal();
    }
  }

  createStatsModal() {
    const modal = document.createElement('div');
    modal.id = 'statsModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content stats-modal-content">
                <div class="modal-header">
                    <h3><span class="stats-icon">📊</span> Player Statistics</h3>
                    <button id="closeStatsModal" class="modal-close">×</button>
                </div>
                <div class="modal-body stats-modal-body">
                    <div class="stats-tabs">
                        <button class="stats-tab active" data-tab="overview">📈 Overview</button>
                        <button class="stats-tab" data-tab="performance">🎯 Performance</button>
                        <button class="stats-tab" data-tab="disciplines">🎱 By Game</button>
                        <button class="stats-tab" data-tab="history">📅 History</button>
                    </div>
                    
                    <div class="stats-content">
                        <div id="stats-overview" class="stats-panel active">
                            <div class="stats-overview-grid">
                                <div class="stat-card primary">
                                    <div class="stat-icon">🏆</div>
                                    <div class="stat-info">
                                        <div class="stat-value" id="total-matches">-</div>
                                        <div class="stat-label">Total Matches</div>
                                    </div>
                                </div>
                                <div class="stat-card success">
                                    <div class="stat-icon">✅</div>
                                    <div class="stat-info">
                                        <div class="stat-value" id="win-percentage">-%</div>
                                        <div class="stat-label">Win Rate</div>
                                    </div>
                                </div>
                                <div class="stat-card info">
                                    <div class="stat-icon">📈</div>
                                    <div class="stat-info">
                                        <div class="stat-value" id="current-rank">#-</div>
                                        <div class="stat-label">Current Rank</div>
                                    </div>
                                </div>
                                <div class="stat-card warning">
                                    <div class="stat-icon">🔥</div>
                                    <div class="stat-info">
                                        <div class="stat-value" id="current-streak">-</div>
                                        <div class="stat-label">Current Streak</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="stats-secondary-grid">
                                <div class="stat-detail">
                                    <span class="detail-label">Hours Played:</span>
                                    <span class="detail-value" id="hours-played">-</span>
                                </div>
                                <div class="stat-detail">
                                    <span class="detail-label">Avg Match Duration:</span>
                                    <span class="detail-value" id="avg-duration">-</span>
                                </div>
                                <div class="stat-detail">
                                    <span class="detail-label">Matches Won:</span>
                                    <span class="detail-value" id="total-wins">-</span>
                                </div>
                                <div class="stat-detail">
                                    <span class="detail-label">Matches Lost:</span>
                                    <span class="detail-value" id="total-losses">-</span>
                                </div>
                            </div>
                        </div>

                        <div id="stats-performance" class="stats-panel">
                            <div class="performance-metrics">
                                <div class="metric-card">
                                    <h4>🎯 Shot Accuracy</h4>
                                    <div class="metric-bar">
                                        <div class="metric-fill" id="shot-accuracy-bar"></div>
                                        <span class="metric-value" id="shot-accuracy">-</span>
                                    </div>
                                </div>
                                
                                <div class="metric-card">
                                    <h4>💥 Break Success</h4>
                                    <div class="metric-bar">
                                        <div class="metric-fill" id="break-success-bar"></div>
                                        <span class="metric-value" id="break-success">-</span>
                                    </div>
                                </div>
                                
                                <div class="metric-card">
                                    <h4>🛡️ Safety Play</h4>
                                    <div class="metric-bar">
                                        <div class="metric-fill" id="safety-success-bar"></div>
                                        <span class="metric-value" id="safety-success">-</span>
                                    </div>
                                </div>
                                
                                <div class="performance-details">
                                    <div class="perf-detail">
                                        <span class="perf-label">⏱️ Average Rack Time:</span>
                                        <span class="perf-value" id="avg-rack-time">-</span>
                                    </div>
                                    <div class="perf-detail">
                                        <span class="perf-label">🎱 Longest Run:</span>
                                        <span class="perf-value" id="longest-run">-</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="stats-disciplines" class="stats-panel">
                            <div class="disciplines-grid" id="disciplines-breakdown">
                                <!-- Dynamic content -->
                            </div>
                        </div>

                        <div id="stats-history" class="stats-panel">
                            <div class="history-section">
                                <div class="recent-form">
                                    <h4>Recent Form (Last 10 Matches)</h4>
                                    <div class="form-timeline" id="recent-form-timeline">
                                        <!-- Dynamic content -->
                                    </div>
                                </div>
                                
                                <div class="ranking-chart">
                                    <h4>📈 Ranking History (Last 30 Days)</h4>
                                    <div class="chart-container" id="ranking-chart">
                                        <!-- Chart will be rendered here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Setup event listeners
    document
      .getElementById('closeStatsModal')
      .addEventListener('click', () => this.hideStatsModal());

    // Tab switching
    modal.querySelectorAll('.stats-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchStatsTab(tab.dataset.tab));
    });

    // Modal backdrop close
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        this.hideStatsModal();
      }
    });

    // ESC key close
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        this.hideStatsModal();
      }
    });
  }

  toggleStatsModal() {
    const modal = document.getElementById('statsModal');
    if (modal.classList.contains('hidden')) {
      this.showStatsModal();
    } else {
      this.hideStatsModal();
    }
  }

  showStatsModal() {
    const modal = document.getElementById('statsModal');
    modal.classList.remove('hidden');
    this.loadPlayerStats(); // Refresh data when opening

    // Play sound if available
    if (window.audioManager) {
      window.audioManager.playButtonClick();
    }
  }

  hideStatsModal() {
    const modal = document.getElementById('statsModal');
    modal.classList.add('hidden');
  }

  switchStatsTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.stats-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update panels
    document.querySelectorAll('.stats-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `stats-${tabName}`);
    });

    // Play sound if available
    if (window.audioManager) {
      window.audioManager.playButtonHover();
    }
  }

  renderStatsOverview() {
    if (!this.statsData) {
      return;
    }

    const overview = this.statsData.overview;

    document.getElementById('total-matches').textContent = overview.totalMatches.toLocaleString();
    document.getElementById('win-percentage').textContent = `${overview.winPercentage}%`;
    document.getElementById('current-rank').textContent = `#${overview.currentRank}`;
    document.getElementById('current-streak').textContent =
      `${overview.currentStreak} ${overview.streakType === 'win' ? 'W' : 'L'}`;
    document.getElementById('hours-played').textContent = `${overview.hoursPlayed}h`;
    document.getElementById('avg-duration').textContent = `${overview.averageMatchDuration}min`;
    document.getElementById('total-wins').textContent = overview.wins.toLocaleString();
    document.getElementById('total-losses').textContent = overview.losses.toLocaleString();

    // Add streak color coding
    const streakEl = document.getElementById('current-streak');
    streakEl.style.color =
      overview.streakType === 'win' ? 'var(--color-success)' : 'var(--color-error)';
  }

  renderPerformanceMetrics() {
    if (!this.statsData) {
      return;
    }

    const performance = this.statsData.performance;

    this.updateMetricBar('shot-accuracy', performance.avgShotAccuracy);
    this.updateMetricBar('break-success', performance.breakSuccess);
    this.updateMetricBar('safety-success', performance.safetyPlaySuccess);

    document.getElementById('avg-rack-time').textContent = `${performance.avgRackTime}s`;
    document.getElementById('longest-run').textContent = `${performance.longestRun} balls`;
  }

  updateMetricBar(metricName, value) {
    const bar = document.getElementById(`${metricName}-bar`);
    const valueSpan = document.getElementById(metricName);

    if (bar && valueSpan) {
      bar.style.width = `${value}%`;
      valueSpan.textContent = `${value}%`;

      // Color code based on performance
      let color = 'var(--color-error)';
      if (value >= 80) {
        color = 'var(--color-success)';
      } else if (value >= 60) {
        color = 'var(--color-warning)';
      }

      bar.style.backgroundColor = color;
    }
  }

  renderDisciplineBreakdown() {
    if (!this.statsData) {
      return;
    }

    const container = document.getElementById('disciplines-breakdown');
    const disciplines = this.statsData.disciplines;

    // Calculate win percentages
    Object.values(disciplines).forEach(discipline => {
      discipline.winPercentage =
        discipline.matches > 0 ? Math.round((discipline.wins / discipline.matches) * 100) : 0;
    });

    container.innerHTML = Object.entries(disciplines)
      .map(
        ([name, data]) => `
            <div class="discipline-card">
                <div class="discipline-header">
                    <h4>${this.getDisciplineIcon(name)} ${name}</h4>
                    <span class="discipline-winrate ${this.getWinRateClass(data.winPercentage)}">${data.winPercentage}%</span>
                </div>
                <div class="discipline-stats">
                    <div class="discipline-stat">
                        <span class="stat-label">Matches:</span>
                        <span class="stat-value">${data.matches}</span>
                    </div>
                    <div class="discipline-stat">
                        <span class="stat-label">Wins:</span>
                        <span class="stat-value">${data.wins}</span>
                    </div>
                    <div class="discipline-stat">
                        <span class="stat-label">Losses:</span>
                        <span class="stat-value">${data.matches - data.wins}</span>
                    </div>
                </div>
                <div class="discipline-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${data.winPercentage}%; background-color: ${this.getWinRateColor(data.winPercentage)};"></div>
                    </div>
                </div>
            </div>
        `
      )
      .join('');
  }

  renderRecentForm() {
    if (!this.statsData) {
      return;
    }

    const timeline = document.getElementById('recent-form-timeline');
    const recentForm = this.statsData.recentForm;

    timeline.innerHTML = recentForm
      .map(
        match => `
            <div class="form-match ${match.result === 'W' ? 'win' : 'loss'}" title="${match.opponent} - ${match.discipline} (${match.score})">
                <span class="match-result">${match.result}</span>
                <div class="match-details">
                    <div class="match-opponent">${match.opponent}</div>
                    <div class="match-info">${match.discipline} • ${match.score}</div>
                    <div class="match-date">${this.formatDate(match.date)}</div>
                </div>
            </div>
        `
      )
      .join('');
  }

  renderRankingHistory() {
    if (!this.statsData) {
      return;
    }

    const container = document.getElementById('ranking-chart');
    const history = this.statsData.rankingHistory;

    // Create simple ASCII-style chart
    const maxRank = Math.max(...history.map(h => h.rank));
    const minRank = Math.min(...history.map(h => h.rank));
    const range = maxRank - minRank || 1;

    container.innerHTML = `
            <div class="simple-chart">
                <div class="chart-y-axis">
                    <span class="y-label">#${minRank}</span>
                    <span class="y-label">#${Math.round((maxRank + minRank) / 2)}</span>
                    <span class="y-label">#${maxRank}</span>
                </div>
                <div class="chart-area">
                    <svg class="ranking-svg" viewBox="0 0 300 150">
                        <polyline
                            points="${history
                              .map((point, index) => {
                                const x = (index / (history.length - 1)) * 290 + 5;
                                const y = 145 - ((point.rank - minRank) / range) * 140;
                                return `${x},${y}`;
                              })
                              .join(' ')}"
                            fill="none"
                            stroke="var(--color-gold)"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                        ${history
                          .map((point, index) => {
                            const x = (index / (history.length - 1)) * 290 + 5;
                            const y = 145 - ((point.rank - minRank) / range) * 140;
                            return `<circle cx="${x}" cy="${y}" r="3" fill="var(--color-gold)" stroke="var(--color-background)" stroke-width="1"/>`;
                          })
                          .join('')}
                    </svg>
                </div>
                <div class="chart-x-axis">
                    <span class="x-label">30 days ago</span>
                    <span class="x-label">Today</span>
                </div>
            </div>
            <div class="chart-summary">
                <div class="summary-stat">
                    <span class="summary-label">Best Rank:</span>
                    <span class="summary-value">#${minRank}</span>
                </div>
                <div class="summary-stat">
                    <span class="summary-label">Change:</span>
                    <span class="summary-value ${history[0].rank > history[history.length - 1].rank ? 'positive' : 'negative'}">
                        ${history[0].rank > history[history.length - 1].rank ? '↗' : '↘'} 
                        ${Math.abs(history[0].rank - history[history.length - 1].rank)} ranks
                    </span>
                </div>
            </div>
        `;
  }

  getDisciplineIcon(discipline) {
    const icons = {
      '8-Ball': '🎱',
      '9-Ball': '🟡',
      '10-Ball': '🔵',
      'Straight Pool': '🎯'
    };
    return icons[discipline] || '🎱';
  }

  getWinRateClass(percentage) {
    if (percentage >= 80) {
      return 'excellent';
    }
    if (percentage >= 60) {
      return 'good';
    }
    if (percentage >= 40) {
      return 'average';
    }
    return 'poor';
  }

  getWinRateColor(percentage) {
    if (percentage >= 80) {
      return 'var(--color-success)';
    }
    if (percentage >= 60) {
      return 'var(--color-warning)';
    }
    return 'var(--color-error)';
  }

  formatDate(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
  }

  startPeriodicUpdates() {
    // Refresh stats every 5 minutes
    this.updateInterval = setInterval(
      () => {
        if (!document.getElementById('statsModal').classList.contains('hidden')) {
          this.loadPlayerStats();
        }
      },
      5 * 60 * 1000
    );
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Global instance
window.playerStats = new PlayerStats();
