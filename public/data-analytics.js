// Data & Analytics System Module
// Performance analytics, ranking history, and head-to-head tracking

class DataAnalytics {
  constructor() {
    this.currentUser = null;
    this.analyticsData = null;
    this.charts = {};
    this.headToHeadCache = new Map();
    this.performanceMetrics = {};
    this.updateInterval = null;
    this.init();
  }

  init() {
    this.initPerformanceTracking();
    this.setupAnalyticsUI();
    console.log('Data & Analytics System initialized');
  }

  // === PERFORMANCE ANALYTICS ===
  initPerformanceTracking() {
    this.performanceMetrics = {
      winStreaks: [],
      lossStreaks: [],
      comebacks: 0,
      blowouts: 0,
      clutchWins: 0,
      averageMatchLength: 0,
      peakPerformanceTimes: {},
      consistencyScore: 0,
      improvementRate: 0
    };
  }

  async loadAnalyticsData(userId) {
    if (!userId) {
      return;
    }

    try {
      // Try to fetch real data from API
      const response = await fetch(`/api/player/${userId}/analytics`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('cl_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.analyticsData = await response.json();
      } else {
        // Generate comprehensive mock data
        this.analyticsData = this.generateMockAnalyticsData(userId);
      }

      return this.analyticsData;
    } catch (error) {
      console.warn('Analytics API not available, using mock data');
      this.analyticsData = this.generateMockAnalyticsData(userId);
      return this.analyticsData;
    }
  }

  generateMockAnalyticsData(userId) {
    const totalMatches = Math.floor(Math.random() * 150) + 50;
    const wins = Math.floor(totalMatches * (0.35 + Math.random() * 0.45)); // 35-80% win rate
    const losses = totalMatches - wins;

    // Generate historical data points
    const historyLength = 90; // 90 days
    const history = Array.from({ length: historyLength }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (historyLength - i));

      // Simulate ranking changes over time
      const baseRank = Math.floor(Math.random() * 30) + 10;
      const variation = Math.sin(i * 0.1) * 5 + Math.random() * 8 - 4;
      const rank = Math.max(1, Math.min(50, Math.floor(baseRank + variation)));

      // Simulate performance metrics
      const matchesPlayed = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
      const dailyWins =
        matchesPlayed > 0 ? Math.floor(matchesPlayed * (0.3 + Math.random() * 0.5)) : 0;

      return {
        date: date.toISOString().split('T')[0],
        rank: rank,
        matchesPlayed: matchesPlayed,
        wins: dailyWins,
        losses: matchesPlayed - dailyWins,
        avgMatchDuration: Math.floor(Math.random() * 25) + 15, // 15-40 minutes
        performanceScore: Math.floor(Math.random() * 40) + 60 // 60-100
      };
    });

    // Generate discipline-specific analytics
    const disciplines = ['8-Ball', '9-Ball', '10-Ball', 'Straight Pool'];
    const disciplineAnalytics = {};

    disciplines.forEach(discipline => {
      const disciplineMatches = Math.floor(totalMatches * (0.15 + Math.random() * 0.4));
      const disciplineWins = Math.floor(disciplineMatches * (0.3 + Math.random() * 0.5));

      disciplineAnalytics[discipline] = {
        totalMatches: disciplineMatches,
        wins: disciplineWins,
        losses: disciplineMatches - disciplineWins,
        winPercentage:
          disciplineMatches > 0 ? Math.round((disciplineWins / disciplineMatches) * 100) : 0,
        averageGameLength: Math.floor(Math.random() * 20) + 10,
        bestStreak: Math.floor(Math.random() * 8) + 1,
        recentForm: Array.from({ length: 10 }, () => (Math.random() > 0.5 ? 'W' : 'L')),
        skillProgression: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .substr(0, 7),
          skill: Math.max(20, Math.min(100, 40 + i * 3 + Math.random() * 15))
        }))
      };
    });

    // Generate head-to-head records
    const opponentCount = Math.floor(Math.random() * 20) + 10;
    const headToHeadRecords = Array.from({ length: opponentCount }, (_, i) => {
      const totalH2H = Math.floor(Math.random() * 15) + 3;
      const winsH2H = Math.floor(totalH2H * (0.2 + Math.random() * 0.6));

      return {
        opponentId: `opponent_${i}`,
        opponentName: `Player ${Math.floor(Math.random() * 1000)}`,
        totalMatches: totalH2H,
        wins: winsH2H,
        losses: totalH2H - winsH2H,
        winPercentage: Math.round((winsH2H / totalH2H) * 100),
        lastPlayed: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        longestWinStreak: Math.floor(Math.random() * 5) + 1,
        currentStreak: Math.floor(Math.random() * 8) - 4, // -4 to +3
        averageMatchScore: `${Math.floor(Math.random() * 5) + 5}-${Math.floor(Math.random() * 5) + 3}`,
        favoredDiscipline: disciplines[Math.floor(Math.random() * disciplines.length)]
      };
    });

    // Performance insights
    const insights = this.generatePerformanceInsights(
      history,
      disciplineAnalytics,
      headToHeadRecords
    );

    return {
      overview: {
        totalMatches,
        wins,
        losses,
        winPercentage: Math.round((wins / totalMatches) * 100),
        currentRank: history[history.length - 1].rank,
        peakRank: Math.min(...history.map(h => h.rank)),
        totalHoursPlayed: Math.floor(totalMatches * (0.4 + Math.random() * 1.2)),
        averageSessionLength: Math.floor(Math.random() * 60) + 30
      },
      history,
      disciplineAnalytics,
      headToHeadRecords,
      insights,
      performanceMetrics: {
        consistency: Math.floor(Math.random() * 40) + 50, // 50-90%
        clutchFactor: Math.floor(Math.random() * 50) + 40, // 40-90%
        improvement: Math.floor(Math.random() * 60) + 20, // 20-80%
        dominance: Math.floor(Math.random() * 70) + 15, // 15-85%
        adaptability: Math.floor(Math.random() * 50) + 40 // 40-90%
      },
      achievements: this.generateAchievements(wins, totalMatches, history),
      predictions: this.generatePredictions(history, disciplineAnalytics)
    };
  }

  generatePerformanceInsights(history, disciplineAnalytics, headToHead) {
    const insights = [];

    // Ranking trend analysis
    const recentHistory = history.slice(-30);
    const rankChange = recentHistory[0].rank - recentHistory[recentHistory.length - 1].rank;

    if (rankChange > 5) {
      insights.push({
        type: 'positive',
        category: 'Ranking',
        title: 'Rising Star',
        description: `You've climbed ${rankChange} ranks in the last 30 days! Keep up the momentum.`,
        icon: '📈'
      });
    } else if (rankChange < -3) {
      insights.push({
        type: 'warning',
        category: 'Ranking',
        title: 'Ranking Dip',
        description: `You've dropped ${Math.abs(rankChange)} ranks recently. Time to refocus your game.`,
        icon: '📉'
      });
    }

    // Best discipline analysis
    const bestDiscipline = Object.entries(disciplineAnalytics).sort(
      (a, b) => b[1].winPercentage - a[1].winPercentage
    )[0];

    if (bestDiscipline && bestDiscipline[1].winPercentage > 60) {
      insights.push({
        type: 'info',
        category: 'Strengths',
        title: 'Discipline Mastery',
        description: `${bestDiscipline[0]} is your strongest game with ${bestDiscipline[1].winPercentage}% win rate.`,
        icon: '🎯'
      });
    }

    // Activity pattern analysis
    const totalRecentMatches = recentHistory.reduce((sum, day) => sum + day.matchesPlayed, 0);
    if (totalRecentMatches > 60) {
      insights.push({
        type: 'positive',
        category: 'Activity',
        title: 'High Activity',
        description: `You've played ${totalRecentMatches} matches in 30 days. Great dedication!`,
        icon: '🔥'
      });
    } else if (totalRecentMatches < 15) {
      insights.push({
        type: 'suggestion',
        category: 'Activity',
        title: 'More Practice Needed',
        description: 'Consider playing more frequently to maintain your competitive edge.',
        icon: '💪'
      });
    }

    // Head-to-head insights
    const strongOpponents = headToHead.filter(h2h => h2h.winPercentage < 30).length;
    if (strongOpponents > 0) {
      insights.push({
        type: 'challenge',
        category: 'Competition',
        title: 'Tough Opponents',
        description: `You have ${strongOpponents} opponents with winning records against you. Focus on these matchups!`,
        icon: '⚔️'
      });
    }

    // Performance consistency
    const performanceVariance =
      history
        .slice(-30)
        .map(h => h.performanceScore)
        .reduce((acc, score, i, arr) => {
          if (i === 0) {
            return 0;
          }
          return acc + Math.abs(score - arr[i - 1]);
        }, 0) / 29;

    if (performanceVariance < 8) {
      insights.push({
        type: 'positive',
        category: 'Consistency',
        title: 'Steady Player',
        description: 'Your performance has been remarkably consistent lately.',
        icon: '🎯'
      });
    } else if (performanceVariance > 20) {
      insights.push({
        type: 'suggestion',
        category: 'Consistency',
        title: 'Work on Consistency',
        description: 'Your performance varies significantly. Focus on maintaining steady form.',
        icon: '⚖️'
      });
    }

    return insights;
  }

  generateAchievements(wins, totalMatches, history) {
    const achievements = [];

    // Win-based achievements
    if (wins >= 100) {
      achievements.push({
        name: 'Century Club',
        description: '100+ wins',
        icon: '💯',
        unlocked: true
      });
    }
    if (wins >= 50) {
      achievements.push({
        name: 'Half Century',
        description: '50+ wins',
        icon: '🏆',
        unlocked: true
      });
    }

    // Ranking achievements
    const bestRank = Math.min(...history.map(h => h.rank));
    if (bestRank <= 5) {
      achievements.push({
        name: 'Elite Player',
        description: 'Reached Top 5',
        icon: '👑',
        unlocked: true
      });
    }
    if (bestRank <= 10) {
      achievements.push({
        name: 'Top 10',
        description: 'Reached Top 10',
        icon: '🥇',
        unlocked: true
      });
    }

    // Streak achievements (simulated)
    const winPercentage = (wins / totalMatches) * 100;
    if (winPercentage >= 70) {
      achievements.push({
        name: 'Dominator',
        description: '70%+ win rate',
        icon: '⚡',
        unlocked: true
      });
    }

    // Participation achievements
    if (totalMatches >= 100) {
      achievements.push({
        name: 'Veteran',
        description: '100+ matches',
        icon: '🎖️',
        unlocked: true
      });
    }

    return achievements;
  }

  generatePredictions(history, disciplineAnalytics) {
    const recentPerformance = history.slice(-14).map(h => h.performanceScore);
    const avgRecentPerformance =
      recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length;

    const trend =
      recentPerformance.slice(-7).reduce((a, b) => a + b, 0) / 7 -
      recentPerformance.slice(0, 7).reduce((a, b) => a + b, 0) / 7;

    return {
      nextRankPrediction: Math.max(1, history[history.length - 1].rank + Math.round(trend / 10)),
      confidenceLevel: Math.min(95, Math.max(60, 75 + Math.abs(trend) * 2)),
      recommendedDiscipline: Object.entries(disciplineAnalytics).sort((a, b) => {
        const aGrowth =
          a[1].skillProgression[a[1].skillProgression.length - 1].skill -
          a[1].skillProgression[a[1].skillProgression.length - 3].skill;
        const bGrowth =
          b[1].skillProgression[b[1].skillProgression.length - 1].skill -
          b[1].skillProgression[b[1].skillProgression.length - 3].skill;
        return bGrowth - aGrowth;
      })[0][0],
      improvementAreas: this.identifyImprovementAreas(disciplineAnalytics)
    };
  }

  identifyImprovementAreas(disciplineAnalytics) {
    const areas = [];

    Object.entries(disciplineAnalytics).forEach(([discipline, data]) => {
      if (data.winPercentage < 45) {
        areas.push(`${discipline} needs work (${data.winPercentage}% win rate)`);
      }

      const recentForm = data.recentForm.slice(-5);
      const recentWins = recentForm.filter(result => result === 'W').length;
      if (recentWins <= 1) {
        areas.push(`Recent ${discipline} form is concerning`);
      }
    });

    return areas.slice(0, 3); // Top 3 improvement areas
  }

  // === HEAD-TO-HEAD ANALYSIS ===
  async loadHeadToHeadData(currentUserId, opponentId) {
    const cacheKey = `${currentUserId}_${opponentId}`;

    // Check cache first
    if (this.headToHeadCache.has(cacheKey)) {
      return this.headToHeadCache.get(cacheKey);
    }

    try {
      const response = await fetch(`/api/head-to-head/${currentUserId}/${opponentId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('cl_token')}`,
          'Content-Type': 'application/json'
        }
      });

      let h2hData;
      if (response.ok) {
        h2hData = await response.json();
      } else {
        // Generate mock head-to-head data
        h2hData = this.generateMockHeadToHead(currentUserId, opponentId);
      }

      // Cache the result
      this.headToHeadCache.set(cacheKey, h2hData);
      return h2hData;
    } catch (error) {
      console.warn('Head-to-head API not available, using mock data');
      const h2hData = this.generateMockHeadToHead(currentUserId, opponentId);
      this.headToHeadCache.set(cacheKey, h2hData);
      return h2hData;
    }
  }

  generateMockHeadToHead(userId1, userId2) {
    const totalMatches = Math.floor(Math.random() * 20) + 3;
    const user1Wins = Math.floor(totalMatches * (0.2 + Math.random() * 0.6));
    const user2Wins = totalMatches - user1Wins;

    // Generate match history
    const matchHistory = Array.from({ length: Math.min(totalMatches, 10) }, (_, i) => {
      const isUser1Win = Math.random() < user1Wins / totalMatches;
      const user1Score = isUser1Win
        ? Math.floor(Math.random() * 3) + 5
        : Math.floor(Math.random() * 7) + 2;
      const user2Score = isUser1Win
        ? Math.floor(Math.random() * 7) + 2
        : Math.floor(Math.random() * 3) + 5;

      return {
        date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
        discipline: ['8-Ball', '9-Ball', '10-Ball'][Math.floor(Math.random() * 3)],
        user1Score,
        user2Score,
        winner: isUser1Win ? userId1 : userId2,
        venue: ['Valley Hub', 'Eagles 4040', 'Downtown Billiards'][Math.floor(Math.random() * 3)],
        duration: Math.floor(Math.random() * 45) + 15
      };
    }).sort((a, b) => b.date - a.date);

    return {
      totalMatches,
      user1Wins,
      user2Wins,
      user1WinPercentage: Math.round((user1Wins / totalMatches) * 100),
      user2WinPercentage: Math.round((user2Wins / totalMatches) * 100),
      matchHistory,
      disciplineBreakdown: this.calculateDisciplineBreakdown(matchHistory, userId1),
      trends: this.calculateTrends(matchHistory, userId1),
      nextMatchPrediction: this.predictNextMatch(matchHistory, userId1, userId2)
    };
  }

  calculateDisciplineBreakdown(matches, userId) {
    const breakdown = {};

    matches.forEach(match => {
      if (!breakdown[match.discipline]) {
        breakdown[match.discipline] = { total: 0, wins: 0 };
      }
      breakdown[match.discipline].total++;
      if (match.winner === userId) {
        breakdown[match.discipline].wins++;
      }
    });

    // Calculate percentages
    Object.keys(breakdown).forEach(discipline => {
      const data = breakdown[discipline];
      data.winPercentage = data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0;
    });

    return breakdown;
  }

  calculateTrends(matches, userId) {
    if (matches.length < 5) {
      return { trend: 'insufficient_data' };
    }

    const recentMatches = matches.slice(0, 5);
    const olderMatches = matches.slice(5, 10);

    const recentWins = recentMatches.filter(m => m.winner === userId).length;
    const olderWins = olderMatches.filter(m => m.winner === userId).length;

    const recentWinRate = recentWins / recentMatches.length;
    const olderWinRate = olderMatches.length > 0 ? olderWins / olderMatches.length : recentWinRate;

    let trend;
    if (recentWinRate > olderWinRate + 0.2) {
      trend = 'improving';
    } else if (recentWinRate < olderWinRate - 0.2) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return {
      trend,
      recentWinRate: Math.round(recentWinRate * 100),
      olderWinRate: Math.round(olderWinRate * 100),
      momentum: recentMatches.slice(0, 3).filter(m => m.winner === userId).length
    };
  }

  predictNextMatch(matches, userId1, userId2) {
    if (matches.length === 0) {
      return { confidence: 50, favorite: null };
    }

    const user1Wins = matches.filter(m => m.winner === userId1).length;
    const winPercentage = user1Wins / matches.length;

    // Recent form weight
    const recentMatches = matches.slice(0, 3);
    const recentWins = recentMatches.filter(m => m.winner === userId1).length;
    const recentWeight = recentWins / recentMatches.length;

    // Weighted prediction
    const prediction = winPercentage * 0.7 + recentWeight * 0.3;

    return {
      favorite: prediction > 0.5 ? userId1 : userId2,
      confidence: Math.round(Math.abs(prediction - 0.5) * 200),
      prediction: Math.round(prediction * 100)
    };
  }

  // === ANALYTICS UI ===
  setupAnalyticsUI() {
    // Analytics will be integrated into the existing stats modal
    // This method sets up additional event handlers
    setTimeout(() => {
      this.enhanceStatsModal();
    }, 1000);
  }

  enhanceStatsModal() {
    const statsModal = document.getElementById('statsModal');
    if (!statsModal) {
      return;
    }

    // Add analytics tab to existing stats modal
    const tabsContainer = statsModal.querySelector('.stats-tabs');
    if (tabsContainer && !tabsContainer.querySelector('[data-tab="analytics"]')) {
      const analyticsTab = document.createElement('button');
      analyticsTab.className = 'stats-tab';
      analyticsTab.setAttribute('data-tab', 'analytics');
      analyticsTab.innerHTML = '📊 Analytics';
      tabsContainer.appendChild(analyticsTab);

      // Add analytics panel
      const contentContainer = statsModal.querySelector('.stats-content');
      const analyticsPanel = document.createElement('div');
      analyticsPanel.id = 'stats-analytics';
      analyticsPanel.className = 'stats-panel';
      analyticsPanel.innerHTML = `
                <div class="analytics-dashboard">
                    <div class="insights-section">
                        <h4>🔍 Performance Insights</h4>
                        <div id="performance-insights" class="insights-grid"></div>
                    </div>
                    
                    <div class="predictions-section">
                        <h4>🔮 Predictions & Recommendations</h4>
                        <div id="predictions-content" class="predictions-grid"></div>
                    </div>
                    
                    <div class="achievements-section">
                        <h4>🏆 Achievements</h4>
                        <div id="achievements-grid" class="achievements-container"></div>
                    </div>
                    
                    <div class="head-to-head-section">
                        <h4>⚔️ Head-to-Head Analysis</h4>
                        <div id="h2h-quick-stats" class="h2h-overview"></div>
                    </div>
                </div>
            `;
      contentContainer.appendChild(analyticsPanel);

      // Add event listener for the new tab
      analyticsTab.addEventListener('click', () => this.switchToAnalyticsTab());
    }
  }

  switchToAnalyticsTab() {
    // Switch to analytics tab
    document.querySelectorAll('.stats-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === 'analytics');
    });
    document.querySelectorAll('.stats-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'stats-analytics');
    });

    // Load analytics data
    if (this.currentUser) {
      this.renderAnalyticsDashboard();
    }
  }

  async renderAnalyticsDashboard() {
    if (!this.analyticsData) {
      await this.loadAnalyticsData(this.currentUser.info.id);
    }

    this.renderInsights();
    this.renderPredictions();
    this.renderAchievements();
    this.renderHeadToHeadOverview();
  }

  renderInsights() {
    const container = document.getElementById('performance-insights');
    if (!container || !this.analyticsData?.insights) {
      return;
    }

    container.innerHTML = this.analyticsData.insights
      .map(
        insight => `
            <div class="insight-card insight-${insight.type}">
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-content">
                    <div class="insight-category">${insight.category}</div>
                    <h5 class="insight-title">${insight.title}</h5>
                    <p class="insight-description">${insight.description}</p>
                </div>
            </div>
        `
      )
      .join('');
  }

  renderPredictions() {
    const container = document.getElementById('predictions-content');
    if (!container || !this.analyticsData?.predictions) {
      return;
    }

    const predictions = this.analyticsData.predictions;
    container.innerHTML = `
            <div class="prediction-card">
                <h5>🎯 Next Rank Prediction</h5>
                <div class="prediction-value">#${predictions.nextRankPrediction}</div>
                <div class="prediction-confidence">${predictions.confidenceLevel}% confidence</div>
            </div>
            
            <div class="prediction-card">
                <h5>🎱 Recommended Focus</h5>
                <div class="prediction-value">${predictions.recommendedDiscipline}</div>
                <div class="prediction-note">Best growth potential</div>
            </div>
            
            <div class="improvement-areas">
                <h5>📈 Areas to Improve</h5>
                <ul class="improvement-list">
                    ${predictions.improvementAreas.map(area => `<li>${area}</li>`).join('')}
                </ul>
            </div>
        `;
  }

  renderAchievements() {
    const container = document.getElementById('achievements-grid');
    if (!container || !this.analyticsData?.achievements) {
      return;
    }

    container.innerHTML = this.analyticsData.achievements
      .map(
        achievement => `
            <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
                ${achievement.unlocked ? '<div class="achievement-status">✅</div>' : '<div class="achievement-status">🔒</div>'}
            </div>
        `
      )
      .join('');
  }

  renderHeadToHeadOverview() {
    const container = document.getElementById('h2h-quick-stats');
    if (!container || !this.analyticsData?.headToHeadRecords) {
      return;
    }

    const records = this.analyticsData.headToHeadRecords.slice(0, 5);
    container.innerHTML = `
            <div class="h2h-summary">
                <p>Top 5 Most Played Opponents:</p>
            </div>
            ${records
              .map(
                record => `
                <div class="h2h-quick-stat">
                    <div class="h2h-opponent">${record.opponentName}</div>
                    <div class="h2h-record">${record.wins}-${record.losses} (${record.winPercentage}%)</div>
                    <div class="h2h-streak ${record.currentStreak >= 0 ? 'positive' : 'negative'}">
                        ${record.currentStreak > 0 ? `+${record.currentStreak}` : record.currentStreak}
                    </div>
                </div>
            `
              )
              .join('')}
        `;
  }

  // === HEAD-TO-HEAD MODAL ===
  async showHeadToHeadModal(opponentId, opponentName) {
    const h2hData = await this.loadHeadToHeadData(this.currentUser.info.id, opponentId);

    // Create head-to-head modal
    let modal = document.getElementById('headToHeadModal');
    if (!modal) {
      modal = this.createHeadToHeadModal();
    }

    // Populate with data
    this.populateHeadToHeadModal(modal, h2hData, opponentName);

    // Show modal
    modal.classList.remove('hidden');
  }

  createHeadToHeadModal() {
    const modal = document.createElement('div');
    modal.id = 'headToHeadModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content h2h-modal-content">
                <div class="modal-header">
                    <h3><span class="h2h-icon">⚔️</span> Head-to-Head Analysis</h3>
                    <button id="closeH2HModal" class="modal-close">×</button>
                </div>
                <div class="modal-body h2h-modal-body">
                    <div id="h2h-content">
                        <!-- Dynamic content will be loaded here -->
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Setup close handlers
    modal.getElementById('closeH2HModal')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });

    return modal;
  }

  populateHeadToHeadModal(modal, h2hData, opponentName) {
    const content = modal.querySelector('#h2h-content');
    content.innerHTML = `
            <div class="h2h-overview">
                <h4>vs ${opponentName}</h4>
                <div class="h2h-main-stats">
                    <div class="h2h-stat">
                        <div class="h2h-stat-value">${h2hData.totalMatches}</div>
                        <div class="h2h-stat-label">Total Matches</div>
                    </div>
                    <div class="h2h-stat">
                        <div class="h2h-stat-value">${h2hData.user1Wins}-${h2hData.user2Wins}</div>
                        <div class="h2h-stat-label">Record</div>
                    </div>
                    <div class="h2h-stat">
                        <div class="h2h-stat-value">${h2hData.user1WinPercentage}%</div>
                        <div class="h2h-stat-label">Win Rate</div>
                    </div>
                </div>
            </div>

            <div class="h2h-details">
                <div class="h2h-section">
                    <h5>📊 By Discipline</h5>
                    <div class="discipline-breakdown">
                        ${Object.entries(h2hData.disciplineBreakdown)
                          .map(
                            ([discipline, stats]) => `
                            <div class="discipline-stat">
                                <span class="discipline-name">${discipline}</span>
                                <span class="discipline-record">${stats.wins}-${stats.total - stats.wins}</span>
                                <span class="discipline-percentage">${stats.winPercentage}%</span>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>

                <div class="h2h-section">
                    <h5>📈 Recent Trend</h5>
                    <div class="trend-analysis">
                        <div class="trend-indicator trend-${h2hData.trends.trend}">
                            ${this.getTrendIcon(h2hData.trends.trend)} ${h2hData.trends.trend.toUpperCase()}
                        </div>
                        <div class="trend-details">
                            Recent: ${h2hData.trends.recentWinRate}% | 
                            Overall: ${h2hData.user1WinPercentage}%
                        </div>
                    </div>
                </div>

                <div class="h2h-section">
                    <h5>🎯 Next Match Prediction</h5>
                    <div class="prediction-box">
                        <div class="prediction-result">
                            ${h2hData.nextMatchPrediction.favorite === this.currentUser.info.id ? 'You are favored' : 'Opponent is favored'}
                        </div>
                        <div class="prediction-confidence">
                            ${h2hData.nextMatchPrediction.confidence}% confidence
                        </div>
                    </div>
                </div>

                <div class="h2h-section">
                    <h5>📅 Match History</h5>
                    <div class="match-history">
                        ${h2hData.matchHistory
                          .slice(0, 5)
                          .map(
                            match => `
                            <div class="history-match">
                                <div class="match-date">${match.date.toLocaleDateString()}</div>
                                <div class="match-score">${match.user1Score}-${match.user2Score}</div>
                                <div class="match-discipline">${match.discipline}</div>
                                <div class="match-result ${match.winner === this.currentUser.info.id ? 'win' : 'loss'}">
                                    ${match.winner === this.currentUser.info.id ? 'W' : 'L'}
                                </div>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
            </div>
        `;
  }

  getTrendIcon(trend) {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '❓';
    }
  }

  // === INTEGRATION METHODS ===
  setCurrentUser(user) {
    this.currentUser = user;
    if (user) {
      this.loadAnalyticsData(user.info.id);
    }
  }

  // Clear cache when needed
  clearCache() {
    this.headToHeadCache.clear();
    this.analyticsData = null;
  }

  // === PERIODIC UPDATES ===
  startPeriodicUpdates() {
    // Update analytics data every 10 minutes
    this.updateInterval = setInterval(
      () => {
        if (this.currentUser) {
          this.loadAnalyticsData(this.currentUser.info.id);
        }
      },
      10 * 60 * 1000
    );
  }

  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // === CLEANUP ===
  destroy() {
    this.stopPeriodicUpdates();
    this.clearCache();
    console.log('Data & Analytics System destroyed');
  }
}

// Global instance
window.dataAnalytics = new DataAnalytics();
