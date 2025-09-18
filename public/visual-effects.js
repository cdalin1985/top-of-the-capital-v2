// Visual Polish Enhancements Module
// Particle effects, dynamic lighting, profile avatars, and enhanced UI elements

class VisualEffects {
  constructor() {
    this.particleSystem = null;
    this.lightingSystem = null;
    this.avatarSystem = null;
    this.spectatorMode = null;
    this.currentTheme = 'auto';
    this.timeBasedLighting = true;
    this.particlesEnabled = true;
    this.init();
  }

  init() {
    this.initParticleSystem();
    this.initDynamicLighting();
    this.initAvatarSystem();
    this.initSpectatorMode();
    this.initTimeBasedEffects();
    this.loadUserPreferences();
    console.log('Visual Effects System initialized');
  }

  // === PARTICLE SYSTEM ===
  initParticleSystem() {
    this.particleSystem = {
      canvas: null,
      ctx: null,
      particles: [],
      animationId: null,
      isActive: false
    };

    this.createParticleCanvas();
    this.startParticleSystem();
  }

  createParticleCanvas() {
    const canvas = document.createElement('canvas');
    canvas.id = 'particle-canvas';
    canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
            opacity: 0.6;
        `;

    document.body.appendChild(canvas);

    this.particleSystem.canvas = canvas;
    this.particleSystem.ctx = canvas.getContext('2d');

    this.resizeParticleCanvas();
    window.addEventListener('resize', () => this.resizeParticleCanvas());
  }

  resizeParticleCanvas() {
    const canvas = this.particleSystem.canvas;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    this.particleSystem.ctx.scale(dpr, dpr);
  }

  startParticleSystem() {
    if (!this.particlesEnabled) {
      return;
    }

    this.particleSystem.isActive = true;
    this.generateParticles();
    this.animateParticles();
  }

  generateParticles() {
    const particles = this.particleSystem.particles;
    const targetCount = Math.min(50, Math.floor(window.innerWidth / 30));

    while (particles.length < targetCount) {
      particles.push(this.createParticle());
    }
  }

  createParticle() {
    const types = ['dust', 'sparkle', 'orb'];
    const type = types[Math.floor(Math.random() * types.length)];

    return {
      type: type,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.2,
      life: 1,
      maxLife: Math.random() * 300 + 100,
      color: this.getParticleColor(type)
    };
  }

  getParticleColor(type) {
    const colors = {
      dust: ['rgba(212, 175, 55, ', 'rgba(255, 255, 255, '],
      sparkle: ['rgba(212, 175, 55, ', 'rgba(255, 223, 127, '],
      orb: ['rgba(100, 149, 237, ', 'rgba(147, 112, 219, ']
    };

    const colorSet = colors[type] || colors.dust;
    return colorSet[Math.floor(Math.random() * colorSet.length)];
  }

  animateParticles() {
    if (!this.particleSystem.isActive) {
      return;
    }

    const ctx = this.particleSystem.ctx;
    const particles = this.particleSystem.particles;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];

      // Update particle
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      particle.life--;
      particle.opacity = Math.max(0, particle.opacity * 0.998);

      // Boundary wrapping
      if (particle.x < 0) {
        particle.x = window.innerWidth;
      }
      if (particle.x > window.innerWidth) {
        particle.x = 0;
      }
      if (particle.y < 0) {
        particle.y = window.innerHeight;
      }
      if (particle.y > window.innerHeight) {
        particle.y = 0;
      }

      // Remove dead particles
      if (particle.life <= 0 || particle.opacity <= 0.01) {
        particles.splice(i, 1);
        continue;
      }

      // Draw particle
      this.drawParticle(ctx, particle);
    }

    // Add new particles
    if (particles.length < 50) {
      if (Math.random() < 0.3) {
        particles.push(this.createParticle());
      }
    }

    this.particleSystem.animationId = requestAnimationFrame(() => this.animateParticles());
  }

  drawParticle(ctx, particle) {
    ctx.save();
    ctx.globalAlpha = particle.opacity;

    switch (particle.type) {
      case 'dust':
        ctx.fillStyle = particle.color + particle.opacity + ')';
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        break;

      case 'sparkle': {
        ctx.fillStyle = particle.color + particle.opacity + ')';
        ctx.beginPath();

        // Draw star shape
        const spikes = 4;
        const outerRadius = particle.size;
        const innerRadius = particle.size * 0.5;

        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes;
          const x = particle.x + Math.cos(angle) * radius;
          const y = particle.y + Math.sin(angle) * radius;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'orb': {
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size
        );
        gradient.addColorStop(0, particle.color + particle.opacity + ')');
        gradient.addColorStop(1, particle.color + '0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  // === DYNAMIC LIGHTING SYSTEM ===
  initDynamicLighting() {
    this.lightingSystem = {
      currentTime: 'day',
      transitionDuration: 2000,
      isTransitioning: false
    };

    this.updateTimeBasedLighting();
    setInterval(() => this.updateTimeBasedLighting(), 60000); // Update every minute
  }

  updateTimeBasedLighting() {
    if (!this.timeBasedLighting) {
      return;
    }

    const hour = new Date().getHours();
    let newTimeOfDay;

    if (hour >= 6 && hour < 12) {
      newTimeOfDay = 'morning';
    } else if (hour >= 12 && hour < 18) {
      newTimeOfDay = 'day';
    } else if (hour >= 18 && hour < 21) {
      newTimeOfDay = 'evening';
    } else {
      newTimeOfDay = 'night';
    }

    if (newTimeOfDay !== this.lightingSystem.currentTime) {
      this.transitionLighting(newTimeOfDay);
    }
  }

  transitionLighting(newTime) {
    if (this.lightingSystem.isTransitioning) {
      return;
    }

    this.lightingSystem.isTransitioning = true;
    const oldTime = this.lightingSystem.currentTime;

    document.body.classList.add('lighting-transition');
    document.body.classList.remove(`time-${oldTime}`);
    document.body.classList.add(`time-${newTime}`);

    setTimeout(() => {
      document.body.classList.remove('lighting-transition');
      this.lightingSystem.currentTime = newTime;
      this.lightingSystem.isTransitioning = false;
    }, this.lightingSystem.transitionDuration);

    console.log(`Lighting transitioned from ${oldTime} to ${newTime}`);
  }

  // === AVATAR SYSTEM ===
  initAvatarSystem() {
    this.avatarSystem = {
      cache: new Map(),
      defaultAvatars: this.generateDefaultAvatars()
    };

    this.setupAvatarObserver();
  }

  generateDefaultAvatars() {
    const avatarStyles = [
      '🎱',
      '🎯',
      '🏆',
      '🔥',
      '⭐',
      '💎',
      '👑',
      '🎪',
      '🚀',
      '⚡',
      '🌟',
      '🎨',
      '🎭',
      '🦄',
      '🐉',
      '🦅'
    ];

    return avatarStyles.map((emoji, index) => ({
      id: index,
      emoji: emoji,
      background: this.generateGradientBackground(),
      border: this.generateBorderStyle()
    }));
  }

  generateGradientBackground() {
    const colors = [
      'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(45deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(45deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(45deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(45deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(45deg, #ffecd2 0%, #fcb69f 100%)'
    ];

    return colors[Math.floor(Math.random() * colors.length)];
  }

  generateBorderStyle() {
    const borderStyles = [
      '2px solid #d4af37',
      '2px solid rgba(212, 175, 55, 0.8)',
      '3px solid #fff',
      '2px dashed #d4af37',
      '3px double #d4af37'
    ];

    return borderStyles[Math.floor(Math.random() * borderStyles.length)];
  }

  setupAvatarObserver() {
    const observer = new MutationObserver(() => {
      this.enhanceAvatars();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial enhancement
    setTimeout(() => this.enhanceAvatars(), 1000);
  }

  enhanceAvatars() {
    const playerElements = document.querySelectorAll(
      '.ziggurat-tier, .player-name, [data-player-name]'
    );

    playerElements.forEach(element => {
      if (element.querySelector('.enhanced-avatar')) {
        return;
      } // Already enhanced

      const playerName =
        element.textContent?.trim() ||
        element.dataset.playerName ||
        element.querySelector('.name')?.textContent?.trim();

      if (playerName && playerName !== 'undefined') {
        const avatar = this.createPlayerAvatar(playerName);
        this.insertAvatar(element, avatar);
      }
    });
  }

  createPlayerAvatar(playerName) {
    if (this.avatarSystem.cache.has(playerName)) {
      return this.avatarSystem.cache.get(playerName).cloneNode(true);
    }

    const avatarData = this.generateAvatarForPlayer(playerName);
    const avatarElement = this.buildAvatarElement(avatarData);

    this.avatarSystem.cache.set(playerName, avatarElement.cloneNode(true));
    return avatarElement;
  }

  generateAvatarForPlayer(playerName) {
    // Generate consistent avatar based on player name
    const hash = this.simpleHash(playerName);
    const avatarIndex = hash % this.avatarSystem.defaultAvatars.length;
    const baseAvatar = this.avatarSystem.defaultAvatars[avatarIndex];

    return {
      ...baseAvatar,
      playerName: playerName,
      background: this.generateGradientBackground(),
      border: this.generateBorderStyle()
    };
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  buildAvatarElement(avatarData) {
    const avatar = document.createElement('div');
    avatar.className = 'enhanced-avatar';
    avatar.style.cssText = `
            display: inline-block;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${avatarData.background};
            border: ${avatarData.border};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            margin-right: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
            cursor: pointer;
        `;

    avatar.textContent = avatarData.emoji;
    avatar.title = `${avatarData.playerName}'s Avatar`;

    // Hover effects
    avatar.addEventListener('mouseenter', () => {
      avatar.style.transform = 'scale(1.1)';
      avatar.style.boxShadow = '0 4px 16px rgba(212, 175, 55, 0.4)';
    });

    avatar.addEventListener('mouseleave', () => {
      avatar.style.transform = 'scale(1)';
      avatar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    });

    return avatar;
  }

  insertAvatar(parentElement, avatar) {
    const nameElement =
      parentElement.querySelector('.name') ||
      parentElement.querySelector('[class*="name"]') ||
      parentElement;

    if (nameElement && !nameElement.querySelector('.enhanced-avatar')) {
      nameElement.style.display = 'flex';
      nameElement.style.alignItems = 'center';
      nameElement.insertBefore(avatar, nameElement.firstChild);
    }
  }

  // === LIVE MATCH SPECTATOR MODE ===
  initSpectatorMode() {
    this.spectatorMode = {
      isActive: false,
      currentMatch: null,
      effects: {
        pulsingBorders: true,
        scoreAnimations: true,
        tensionMeter: true
      }
    };

    this.setupSpectatorEnhancements();
  }

  setupSpectatorEnhancements() {
    // Enhance live matches with spectator effects
    setInterval(() => {
      this.enhanceLiveMatches();
    }, 2000);
  }

  enhanceLiveMatches() {
    const liveMatches = document.querySelectorAll('.live-match-card');

    liveMatches.forEach(match => {
      if (match.dataset.spectatorEnhanced) {
        return;
      }

      this.addSpectatorEffects(match);
      match.dataset.spectatorEnhanced = 'true';
    });
  }

  addSpectatorEffects(matchElement) {
    // Add pulsing border for live matches
    matchElement.style.animation = 'livePulse 3s ease-in-out infinite';

    // Add tension meter
    const tensionMeter = this.createTensionMeter(matchElement);
    if (tensionMeter && !matchElement.querySelector('.tension-meter')) {
      matchElement.appendChild(tensionMeter);
    }

    // Enhance score displays
    const scoreElements = matchElement.querySelectorAll('.player-score');
    scoreElements.forEach(scoreEl => {
      scoreEl.style.textShadow = '0 0 10px rgba(212, 175, 55, 0.6)';
      scoreEl.style.transition = 'all 0.5s ease';
    });

    // Add spectator badge glow
    const spectatorBadge = matchElement.querySelector('.spectator-badge');
    if (spectatorBadge) {
      spectatorBadge.style.animation = 'spectatorGlow 2s ease-in-out infinite alternate';
    }
  }

  createTensionMeter(matchElement) {
    // Extract scores to calculate tension
    const scoreElements = matchElement.querySelectorAll('.player-score');
    if (scoreElements.length < 2) {
      return null;
    }

    const score1 = parseInt(scoreElements[0].textContent) || 0;
    const score2 = parseInt(scoreElements[1].textContent) || 0;
    const totalScore = score1 + score2;
    const scoreDiff = Math.abs(score1 - score2);

    // Calculate tension (closer games = higher tension)
    const tension = totalScore > 0 ? Math.max(0, 100 - scoreDiff * 20) : 0;

    const tensionMeter = document.createElement('div');
    tensionMeter.className = 'tension-meter';
    tensionMeter.innerHTML = `
            <div class="tension-label">Match Intensity</div>
            <div class="tension-bar">
                <div class="tension-fill" style="width: ${tension}%"></div>
            </div>
            <div class="tension-value">${Math.round(tension)}%</div>
        `;

    return tensionMeter;
  }

  // === UTILITY METHODS ===
  toggleParticles() {
    this.particlesEnabled = !this.particlesEnabled;

    if (this.particlesEnabled) {
      this.startParticleSystem();
    } else {
      this.stopParticleSystem();
    }

    this.saveUserPreferences();
    return this.particlesEnabled;
  }

  stopParticleSystem() {
    this.particleSystem.isActive = false;
    if (this.particleSystem.animationId) {
      cancelAnimationFrame(this.particleSystem.animationId);
    }

    const canvas = this.particleSystem.canvas;
    if (canvas) {
      canvas.style.opacity = '0';
      setTimeout(() => {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }, 500);
    }
  }

  toggleTimeBasedLighting() {
    this.timeBasedLighting = !this.timeBasedLighting;
    this.saveUserPreferences();
    return this.timeBasedLighting;
  }

  saveUserPreferences() {
    const preferences = {
      particlesEnabled: this.particlesEnabled,
      timeBasedLighting: this.timeBasedLighting,
      currentTheme: this.currentTheme
    };

    localStorage.setItem('visualEffectsPrefs', JSON.stringify(preferences));
  }

  loadUserPreferences() {
    try {
      const saved = localStorage.getItem('visualEffectsPrefs');
      if (saved) {
        const preferences = JSON.parse(saved);
        this.particlesEnabled = preferences.particlesEnabled !== false;
        this.timeBasedLighting = preferences.timeBasedLighting !== false;
        this.currentTheme = preferences.currentTheme || 'auto';
      }
    } catch (error) {
      console.warn('Could not load visual effects preferences:', error);
    }
  }

  // === TIME BASED EFFECTS ===
  initTimeBasedEffects() {
    // Add celebration effects for special times
    setInterval(() => {
      this.checkSpecialTimeEffects();
    }, 60000);
  }

  checkSpecialTimeEffects() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Golden hour effect (sunrise/sunset)
    if ((hour === 6 || hour === 18) && minute === 0) {
      this.triggerGoldenHourEffect();
    }

    // Midnight sparkle
    if (hour === 0 && minute === 0) {
      this.triggerMidnightSparkle();
    }
  }

  triggerGoldenHourEffect() {
    document.body.classList.add('golden-hour');
    setTimeout(() => {
      document.body.classList.remove('golden-hour');
    }, 30000); // 30 seconds
  }

  triggerMidnightSparkle() {
    // Create extra sparkle particles
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        this.particleSystem.particles.push({
          ...this.createParticle(),
          type: 'sparkle',
          size: Math.random() * 6 + 3,
          color: 'rgba(212, 175, 55, '
        });
      }, i * 100);
    }
  }

  // === SETTINGS MODAL ===
  initSettingsModal() {
    const settingsBtn = document.getElementById('visualEffectsSettings');
    const modal = document.getElementById('visualEffectsModal');
    const closeBtn = document.getElementById('closeVisualEffectsModal');
    const saveBtn = document.getElementById('saveVisualSettings');
    const resetBtn = document.getElementById('resetVisualSettings');

    if (!settingsBtn || !modal) {
      return;
    }

    // Show modal
    settingsBtn.addEventListener('click', () => {
      this.showSettingsModal();
    });

    // Close modal
    closeBtn?.addEventListener('click', () => {
      this.hideSettingsModal();
    });

    // Save settings
    saveBtn?.addEventListener('click', () => {
      this.saveSettingsFromModal();
      this.hideSettingsModal();
    });

    // Reset settings
    resetBtn?.addEventListener('click', () => {
      this.resetToDefaults();
      this.updateSettingsUI();
    });

    // Modal backdrop close
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        this.hideSettingsModal();
      }
    });

    // ESC key close
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        this.hideSettingsModal();
      }
    });

    // Initialize UI state
    setTimeout(() => this.updateSettingsUI(), 500);
  }

  showSettingsModal() {
    const modal = document.getElementById('visualEffectsModal');
    if (modal) {
      modal.classList.remove('hidden');
      this.updateSettingsUI();

      // Play sound if available
      if (window.audioManager) {
        window.audioManager.playButtonClick();
      }
    }
  }

  hideSettingsModal() {
    const modal = document.getElementById('visualEffectsModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  updateSettingsUI() {
    const particlesToggle = document.getElementById('particlesToggle');
    const lightingToggle = document.getElementById('lightingToggle');
    const avatarsToggle = document.getElementById('avatarsToggle');
    const spectatorToggle = document.getElementById('spectatorToggle');

    if (particlesToggle) {
      particlesToggle.checked = this.particlesEnabled;
    }
    if (lightingToggle) {
      lightingToggle.checked = this.timeBasedLighting;
    }
    if (avatarsToggle) {
      avatarsToggle.checked = this.avatarSystem ? true : false;
    }
    if (spectatorToggle) {
      spectatorToggle.checked = this.spectatorMode ? true : false;
    }
  }

  saveSettingsFromModal() {
    const particlesToggle = document.getElementById('particlesToggle');
    const lightingToggle = document.getElementById('lightingToggle');
    const avatarsToggle = document.getElementById('avatarsToggle');
    const spectatorToggle = document.getElementById('spectatorToggle');

    // Update particle system
    if (particlesToggle && particlesToggle.checked !== this.particlesEnabled) {
      this.toggleParticles();
    }

    // Update lighting system
    if (lightingToggle && lightingToggle.checked !== this.timeBasedLighting) {
      this.toggleTimeBasedLighting();
    }

    // Update avatars (note: avatars can't be easily toggled without full reinit)
    // This would require more complex state management

    // Update spectator mode (similar complexity)

    this.saveUserPreferences();

    // Show confirmation
    if (window.showToast) {
      window.showToast('Visual effects settings saved!', 'success', 2000);
    }
  }

  resetToDefaults() {
    this.particlesEnabled = true;
    this.timeBasedLighting = true;
    this.currentTheme = 'auto';

    // Restart particle system if needed
    if (!this.particleSystem.isActive) {
      this.startParticleSystem();
    }

    this.saveUserPreferences();

    // Show confirmation
    if (window.showToast) {
      window.showToast('Settings reset to defaults!', 'info', 2000);
    }
  }

  // === CLEANUP ===
  destroy() {
    this.stopParticleSystem();

    if (this.lightingSystem) {
      document.body.classList.remove('lighting-transition');
    }

    console.log('Visual Effects System destroyed');
  }
}

// Global instance
window.visualEffects = new VisualEffects();

// Initialize settings modal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.visualEffects) {
      window.visualEffects.initSettingsModal();
    }
  }, 1000);
});
