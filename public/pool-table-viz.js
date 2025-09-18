/**
 * Pool Table Visualization System
 * Interactive 3D pool table with point-and-click ball placement
 */

class PoolTableVisualization {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.tableWidth = 800;
    this.tableHeight = 400;
    this.ballRadius = 12;
    this.selectedBall = null;
    this.isDragging = false;
    this.currentUser = null;
    this.savedSetups = new Map();

    // Ball configurations for different games
    this.ballSets = {
      'eight-ball': [
        // Cue ball positioned at the head of the table
        { id: 'cue', number: '', color: '#f8f8ff', position: { x: 200, y: 200 }, type: 'cue' },

        // Standard 8-ball rack formation based on the reference image:
        // Row 1 (front): 1-ball at the point
        { id: '1', number: '1', color: '#ffd700', position: { x: 600, y: 200 }, type: 'solid' },

        // Row 2: 2 balls
        { id: '2', number: '2', color: '#0000ff', position: { x: 625, y: 187 }, type: 'solid' },
        { id: '3', number: '3', color: '#ff0000', position: { x: 625, y: 213 }, type: 'solid' },

        // Row 3: 3 balls (8-ball in center)
        { id: '4', number: '4', color: '#800080', position: { x: 650, y: 174 }, type: 'solid' },
        { id: '8', number: '8', color: '#000000', position: { x: 650, y: 200 }, type: 'eight' },
        { id: '5', number: '5', color: '#ff8c00', position: { x: 650, y: 226 }, type: 'solid' },

        // Row 4: 4 balls
        { id: '6', number: '6', color: '#008000', position: { x: 675, y: 161 }, type: 'solid' },
        { id: '7', number: '7', color: '#8b0000', position: { x: 675, y: 187 }, type: 'solid' },
        { id: '9', number: '9', color: '#ffd700', position: { x: 675, y: 213 }, type: 'stripe' },
        { id: '10', number: '10', color: '#0000ff', position: { x: 675, y: 239 }, type: 'stripe' },

        // Row 5: 5 balls (back row)
        { id: '11', number: '11', color: '#ff0000', position: { x: 700, y: 148 }, type: 'stripe' },
        { id: '12', number: '12', color: '#800080', position: { x: 700, y: 174 }, type: 'stripe' },
        { id: '13', number: '13', color: '#ff8c00', position: { x: 700, y: 200 }, type: 'stripe' },
        { id: '14', number: '14', color: '#008000', position: { x: 700, y: 226 }, type: 'stripe' },
        { id: '15', number: '15', color: '#8b0000', position: { x: 700, y: 252 }, type: 'stripe' }
      ],
      'nine-ball': [
        { id: 'cue', number: '', color: '#f8f8ff', position: { x: 200, y: 200 }, type: 'cue' },
        { id: '1', number: '1', color: '#ffd700', position: { x: 600, y: 200 }, type: 'solid' },
        { id: '2', number: '2', color: '#0000ff', position: { x: 620, y: 190 }, type: 'solid' },
        { id: '3', number: '3', color: '#ff0000', position: { x: 620, y: 210 }, type: 'solid' },
        { id: '4', number: '4', color: '#800080', position: { x: 640, y: 180 }, type: 'solid' },
        { id: '5', number: '5', color: '#ff8c00', position: { x: 640, y: 200 }, type: 'solid' },
        { id: '6', number: '6', color: '#008000', position: { x: 640, y: 220 }, type: 'solid' },
        { id: '7', number: '7', color: '#8b0000', position: { x: 660, y: 190 }, type: 'solid' },
        { id: '8', number: '8', color: '#000000', position: { x: 660, y: 210 }, type: 'solid' },
        { id: '9', number: '9', color: '#ffd700', position: { x: 680, y: 200 }, type: 'nine' }
      ]
    };

    this.currentBallSet = 'eight-ball';
    this.balls = [...this.ballSets[this.currentBallSet]];

    this.init();
  }

  init() {
    console.log('Pool Table Visualization initialized');
    this.setupPoolTableButton();

    // Wait for app to be ready
    setTimeout(() => {
      this.setupEventListeners();
      this.loadSavedSetups();
    }, 1000);
  }

  setCurrentUser(user) {
    this.currentUser = user;
    this.loadSavedSetups();
  }

  setupPoolTableButton() {
    // Add pool table button to challenge card
    const challengeCard = document.getElementById('challenge-card');
    if (challengeCard) {
      const themeBtn = challengeCard.querySelector('#themeSettings');
      if (themeBtn) {
        const poolTableBtn = document.createElement('button');
        poolTableBtn.id = 'poolTableViz';
        poolTableBtn.className = 'btn btn-secondary';
        poolTableBtn.innerHTML = '🎱 Pool Table';
        poolTableBtn.style.fontSize = '0.9em';
        poolTableBtn.style.marginTop = '10px';

        // Insert after theme button
        themeBtn.parentNode.insertBefore(poolTableBtn, themeBtn.nextSibling);
      }
    }
  }

  setupEventListeners() {
    document.addEventListener('click', e => {
      if (e.target.id === 'poolTableViz') {
        this.showPoolTableModal();
      } else if (e.target.id === 'resetRack') {
        this.resetToRack();
      } else if (e.target.id === 'clearTable') {
        this.clearAllBalls();
      } else if (e.target.id === 'saveSetup') {
        this.showSaveSetupModal();
      } else if (e.target.id === 'loadSetup') {
        this.showLoadSetupModal();
      } else if (e.target.id === 'shareSetup') {
        this.shareCurrentSetup();
      } else if (e.target.classList.contains('game-type-btn')) {
        this.switchGameType(e.target.dataset.gameType);
      } else if (e.target.id === 'submitSaveSetup') {
        this.saveCurrentSetup();
      } else if (e.target.classList.contains('saved-setup-item')) {
        this.loadSavedSetup(e.target.dataset.setupId);
      }
    });
  }

  showPoolTableModal() {
    this.createModal('poolTableModal', 'Interactive Pool Table', this.getPoolTableContent(), {
      primary: { text: 'Close', id: 'closePoolTable' }
    });

    // Initialize canvas after modal is created
    setTimeout(() => {
      this.initializeCanvas();
    }, 100);
  }

  getPoolTableContent() {
    return `
            <div class="pool-table-container">
                <div class="pool-table-header">
                    <div class="game-type-selector">
                        <button class="game-type-btn ${this.currentBallSet === 'eight-ball' ? 'active' : ''}" 
                                data-game-type="eight-ball">8-Ball</button>
                        <button class="game-type-btn ${this.currentBallSet === 'nine-ball' ? 'active' : ''}" 
                                data-game-type="nine-ball">9-Ball</button>
                    </div>
                    
                    <div class="table-controls">
                        <button id="resetRack" class="btn btn-secondary">🔄 Reset Rack</button>
                        <button id="clearTable" class="btn btn-secondary">🧹 Clear Table</button>
                        <button id="saveSetup" class="btn btn-secondary">💾 Save Setup</button>
                        <button id="loadSetup" class="btn btn-secondary">📁 Load Setup</button>
                        <button id="shareSetup" class="btn btn-secondary">📤 Share</button>
                    </div>
                </div>
                
                <div class="pool-table-canvas-container">
                    <canvas id="poolTableCanvas" width="800" height="400"></canvas>
                    <div class="canvas-instructions">
                        <p><strong>Instructions:</strong></p>
                        <ul>
                            <li>🖱️ Click and drag balls to reposition them</li>
                            <li>🎯 Create custom shot scenarios and practice setups</li>
                            <li>💾 Save your setups and share with the community</li>
                            <li>🔄 Use Reset Rack to return to standard formation</li>
                        </ul>
                    </div>
                </div>
                
                <div class="ball-legend">
                    <div class="legend-section">
                        <h4>Ball Types</h4>
                        <div class="legend-items">
                            <div class="legend-item">
                                <div class="legend-ball cue-ball"></div>
                                <span>Cue Ball</span>
                            </div>
                            <div class="legend-item">
                                <div class="legend-ball solid-ball"></div>
                                <span>Solids (1-7)</span>
                            </div>
                            <div class="legend-item">
                                <div class="legend-ball stripe-ball"></div>
                                <span>Stripes (9-15)</span>
                            </div>
                            <div class="legend-item">
                                <div class="legend-ball eight-ball"></div>
                                <span>8-Ball</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  initializeCanvas() {
    this.canvas = document.getElementById('poolTableCanvas');
    if (!this.canvas) {
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.setupCanvasEvents();
    this.render();
  }

  setupCanvasEvents() {
    if (!this.canvas) {
      return;
    }

    this.canvas.addEventListener('mousedown', e => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ball = this.getBallAtPosition(x, y);
      if (ball) {
        this.selectedBall = ball;
        this.isDragging = true;
        this.canvas.style.cursor = 'grabbing';
      }
    });

    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.isDragging && this.selectedBall) {
        // Update ball position with boundaries
        this.selectedBall.position.x = Math.max(
          this.ballRadius,
          Math.min(this.tableWidth - this.ballRadius, x)
        );
        this.selectedBall.position.y = Math.max(
          this.ballRadius,
          Math.min(this.tableHeight - this.ballRadius, y)
        );
        this.render();
      } else {
        // Show hover cursor over balls
        const ball = this.getBallAtPosition(x, y);
        this.canvas.style.cursor = ball ? 'grab' : 'default';
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.selectedBall = null;
      this.canvas.style.cursor = 'default';
    });

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const ball = this.getBallAtPosition(x, y);
      if (ball) {
        this.selectedBall = ball;
        this.isDragging = true;
      }
    });

    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (this.isDragging && this.selectedBall) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        this.selectedBall.position.x = Math.max(
          this.ballRadius,
          Math.min(this.tableWidth - this.ballRadius, x)
        );
        this.selectedBall.position.y = Math.max(
          this.ballRadius,
          Math.min(this.tableHeight - this.ballRadius, y)
        );
        this.render();
      }
    });

    this.canvas.addEventListener('touchend', e => {
      e.preventDefault();
      this.isDragging = false;
      this.selectedBall = null;
    });
  }

  getBallAtPosition(x, y) {
    return this.balls.find(ball => {
      const dx = x - ball.position.x;
      const dy = y - ball.position.y;
      return Math.sqrt(dx * dx + dy * dy) <= this.ballRadius;
    });
  }

  render() {
    if (!this.ctx) {
      return;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.tableWidth, this.tableHeight);

    // Draw table background
    this.drawTable();

    // Draw balls
    this.balls.forEach(ball => this.drawBall(ball));

    // Draw selected ball highlight
    if (this.selectedBall) {
      this.drawBallHighlight(this.selectedBall);
    }
  }

  drawTable() {
    const ctx = this.ctx;

    // Table felt background
    const gradient = ctx.createLinearGradient(0, 0, this.tableWidth, this.tableHeight);
    gradient.addColorStop(0, '#0d5016');
    gradient.addColorStop(0.5, '#0f6019');
    gradient.addColorStop(1, '#0d5016');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.tableWidth, this.tableHeight);

    // Table border/rails
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, this.tableWidth - 8, this.tableHeight - 8);

    // Corner pockets
    const pocketRadius = 20;
    const pockets = [
      { x: 0, y: 0 },
      { x: this.tableWidth, y: 0 },
      { x: 0, y: this.tableHeight },
      { x: this.tableWidth, y: this.tableHeight },
      { x: this.tableWidth / 2, y: 0 },
      { x: this.tableWidth / 2, y: this.tableHeight }
    ];

    ctx.fillStyle = '#000000';
    pockets.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocketRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Head string (break line)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(this.tableWidth / 4, 10);
    ctx.lineTo(this.tableWidth / 4, this.tableHeight - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Foot spot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(this.tableWidth * 0.75, this.tableHeight / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBall(ball) {
    const ctx = this.ctx;
    const { x, y } = ball.position;

    // Ball shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 2, this.ballRadius - 1, this.ballRadius - 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball gradient for 3D effect
    const gradient = ctx.createRadialGradient(
      x - this.ballRadius / 3,
      y - this.ballRadius / 3,
      0,
      x,
      y,
      this.ballRadius
    );

    if (ball.type === 'stripe') {
      // Striped ball
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.7, ball.color);
      gradient.addColorStop(1, this.darkenColor(ball.color, 0.3));
    } else {
      // Solid ball
      gradient.addColorStop(0, this.lightenColor(ball.color, 0.4));
      gradient.addColorStop(0.7, ball.color);
      gradient.addColorStop(1, this.darkenColor(ball.color, 0.3));
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, this.ballRadius, 0, Math.PI * 2);
    ctx.fill();

    // Ball outline
    ctx.strokeStyle = this.darkenColor(ball.color, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Stripe pattern for striped balls
    if (ball.type === 'stripe') {
      this.drawStripePattern(ctx, ball);
    }

    // Ball number
    if (ball.number) {
      this.drawBallNumber(ctx, ball);
    }

    // Highlight for cue ball
    if (ball.type === 'cue') {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, this.ballRadius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawStripePattern(ctx, ball) {
    const { x, y } = ball.position;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, this.ballRadius - 1, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - this.ballRadius, y - 4, this.ballRadius * 2, 8);

    ctx.restore();
  }

  drawBallNumber(ctx, ball) {
    const { x, y } = ball.position;

    // Number circle background
    ctx.fillStyle = ball.type === 'eight' || ball.type === 'stripe' ? '#ffffff' : '#000000';
    ctx.beginPath();
    ctx.arc(x, y, this.ballRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Number text
    ctx.fillStyle = ball.type === 'eight' || ball.type === 'stripe' ? '#000000' : '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ball.number, x, y);
  }

  drawBallHighlight(ball) {
    const ctx = this.ctx;
    const { x, y } = ball.position;

    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(x, y, this.ballRadius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  lightenColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.floor(255 * amount));
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.floor(255 * amount));
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.floor(255 * amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  darkenColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.floor(255 * amount));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.floor(255 * amount));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.floor(255 * amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  switchGameType(gameType) {
    if (this.ballSets[gameType]) {
      this.currentBallSet = gameType;
      this.balls = [...this.ballSets[gameType]];

      // Update button states
      document.querySelectorAll('.game-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gameType === gameType);
      });

      this.render();

      if (window.showToast) {
        window.showToast(`Switched to ${gameType.replace('-', ' ')} setup!`, 'info', 1500);
      }
    }
  }

  resetToRack() {
    this.balls = [...this.ballSets[this.currentBallSet]];
    this.render();

    if (window.showToast) {
      window.showToast('Reset to standard rack formation', 'success', 1500);
    }
  }

  clearAllBalls() {
    this.balls = [];
    this.render();

    if (window.showToast) {
      window.showToast('Table cleared', 'info', 1500);
    }
  }

  showSaveSetupModal() {
    const content = `
            <div class="save-setup-form">
                <div class="form-field">
                    <label for="setupName">Setup Name</label>
                    <input id="setupName" type="text" class="form-input" placeholder="Enter setup name" maxlength="50" required>
                </div>
                <div class="form-field">
                    <label for="setupDescription">Description (Optional)</label>
                    <textarea id="setupDescription" class="form-input" rows="3" placeholder="Describe this shot scenario..."></textarea>
                </div>
            </div>
        `;

    this.createModal('saveSetupModal', 'Save Current Setup', content, {
      primary: { text: 'Save', id: 'submitSaveSetup' },
      secondary: { text: 'Cancel', id: 'cancelSaveSetup' }
    });
  }

  saveCurrentSetup() {
    const nameInput = document.getElementById('setupName');
    const descInput = document.getElementById('setupDescription');

    if (!nameInput || !nameInput.value.trim()) {
      if (window.showToast) {
        window.showToast('Please enter a setup name', 'error', 2000);
      }
      return;
    }

    const setupData = {
      id: `setup_${Date.now()}`,
      name: nameInput.value.trim(),
      description: descInput ? descInput.value.trim() : '',
      gameType: this.currentBallSet,
      balls: JSON.parse(JSON.stringify(this.balls)),
      createdBy: this.currentUser ? this.currentUser.info.displayName : 'Anonymous',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const userKey = this.currentUser ? this.currentUser.info.id : 'anonymous';
    const savedSetups = JSON.parse(localStorage.getItem(`cl_pool_setups_${userKey}`) || '[]');
    savedSetups.push(setupData);
    localStorage.setItem(`cl_pool_setups_${userKey}`, JSON.stringify(savedSetups));

    this.savedSetups.set(setupData.id, setupData);
    this.closeModal('saveSetupModal');

    if (window.showToast) {
      window.showToast(`Setup "${setupData.name}" saved successfully!`, 'success', 2000);
    }
  }

  showLoadSetupModal() {
    const setups = Array.from(this.savedSetups.values());

    let content;
    if (setups.length === 0) {
      content = `
                <div class="empty-setups">
                    <div class="empty-icon">📁</div>
                    <h4>No Saved Setups</h4>
                    <p>Create and save custom ball arrangements to load them later!</p>
                </div>
            `;
    } else {
      content = `
                <div class="saved-setups-list">
                    ${setups
                      .map(
                        setup => `
                        <div class="saved-setup-item" data-setup-id="${setup.id}">
                            <div class="setup-info">
                                <h5>${setup.name}</h5>
                                <p class="setup-description">${setup.description || 'No description'}</p>
                                <div class="setup-meta">
                                    <span class="setup-game-type">${setup.gameType.replace('-', ' ')}</span>
                                    <span class="setup-date">${new Date(setup.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div class="setup-preview">
                                <div class="ball-count">${setup.balls.length} balls</div>
                            </div>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            `;
    }

    this.createModal('loadSetupModal', 'Load Saved Setup', content, {
      secondary: { text: 'Close', id: 'closeLoadSetup' }
    });
  }

  loadSavedSetup(setupId) {
    const setup = this.savedSetups.get(setupId);
    if (!setup) {
      return;
    }

    this.currentBallSet = setup.gameType;
    this.balls = JSON.parse(JSON.stringify(setup.balls));

    // Update game type buttons if modal is still open
    const poolModal = document.getElementById('poolTableModal');
    if (poolModal) {
      poolModal.querySelectorAll('.game-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gameType === setup.gameType);
      });
    }

    this.render();
    this.closeModal('loadSetupModal');

    if (window.showToast) {
      window.showToast(`Loaded setup "${setup.name}"`, 'success', 1500);
    }
  }

  loadSavedSetups() {
    if (!this.currentUser) {
      return;
    }

    const userKey = this.currentUser.info.id;
    const savedSetups = JSON.parse(localStorage.getItem(`cl_pool_setups_${userKey}`) || '[]');

    this.savedSetups.clear();
    savedSetups.forEach(setup => {
      this.savedSetups.set(setup.id, setup);
    });
  }

  shareCurrentSetup() {
    const setupData = {
      gameType: this.currentBallSet,
      balls: this.balls
    };

    const encoded = btoa(JSON.stringify(setupData));
    const shareUrl = `${window.location.origin}/?setup=${encoded}`;

    // Copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        if (window.showToast) {
          window.showToast('Setup URL copied to clipboard!', 'success', 2000);
        }
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      if (window.showToast) {
        window.showToast('Setup URL copied to clipboard!', 'success', 2000);
      }
    }
  }

  createModal(id, title, content, buttons = {}) {
    // Remove existing modal if present
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
    }

    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';

    modal.innerHTML = `
            <div class="modal-content pool-table-modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="btn btn-secondary modal-close">Close</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-actions">
                    ${buttons.secondary ? `<button id="${buttons.secondary.id}" class="btn btn-secondary">${buttons.secondary.text}</button>` : ''}
                    ${buttons.primary ? `<button id="${buttons.primary.id}" class="btn btn-primary">${buttons.primary.text}</button>` : ''}
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Add close functionality
    modal.querySelector('.modal-close').addEventListener('click', () => {
      this.closeModal(id);
    });

    // Close on backdrop click
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        this.closeModal(id);
      }
    });

    // ESC key handler
    const escHandler = e => {
      if (e.key === 'Escape') {
        this.closeModal(id);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    return modal;
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }
  }
}

// Initialize pool table visualization
window.poolTableViz = new PoolTableVisualization();

// Global functions for external access
window.showPoolTable = () => {
  window.poolTableViz.showPoolTableModal();
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PoolTableVisualization;
}
