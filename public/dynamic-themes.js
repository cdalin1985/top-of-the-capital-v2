/**
 * Dynamic Color Themes System
 * Multiple color scheme options with real-time theme switching
 */

class DynamicThemes {
  constructor() {
    this.themes = new Map();
    this.currentTheme = 'classic-gold';
    this.themeTransitionDuration = 300;
    this.savedTheme = null;

    this.init();
  }

  init() {
    console.log('Dynamic Themes System initialized');
    this.loadThemes();
    this.loadSavedTheme();
    this.setupThemeButton();
    this.applyStoredTheme();

    // Wait for app to be ready
    setTimeout(() => {
      this.setupEventListeners();
    }, 1000);
  }

  loadThemes() {
    // Define comprehensive theme configurations
    const themeConfigurations = [
      {
        id: 'classic-gold',
        name: '🏆 Classic Gold',
        description: 'The original elegant gold and marble theme',
        colors: {
          '--color-background': '#0a0c0e',
          '--color-background-mist': '#111418',
          '--color-marble-dark': '#1a1d1c',
          '--color-marble-light': '#2c302e',
          '--color-gold': '#d4af37',
          '--color-gold-faded': 'rgba(212, 175, 55, 0.5)',
          '--color-green-accent': '#2e8b57',
          '--color-text': '#EAEAEA',
          '--color-text-muted': '#888'
        }
      },
      {
        id: 'midnight-blue',
        name: '🌙 Midnight Blue',
        description: 'Deep blues with silver accents for night gaming',
        colors: {
          '--color-background': '#0f1419',
          '--color-background-mist': '#1a1f2e',
          '--color-marble-dark': '#1e2a3a',
          '--color-marble-light': '#2d3748',
          '--color-gold': '#4a90e2',
          '--color-gold-faded': 'rgba(74, 144, 226, 0.5)',
          '--color-green-accent': '#38a169',
          '--color-text': '#e2e8f0',
          '--color-text-muted': '#a0aec0'
        }
      },
      {
        id: 'emerald-forest',
        name: '🌲 Emerald Forest',
        description: 'Rich greens and earth tones for natural vibes',
        colors: {
          '--color-background': '#0f1b0f',
          '--color-background-mist': '#1a2e1a',
          '--color-marble-dark': '#2d3a2d',
          '--color-marble-light': '#3d4a3d',
          '--color-gold': '#10b981',
          '--color-gold-faded': 'rgba(16, 185, 129, 0.5)',
          '--color-green-accent': '#059669',
          '--color-text': '#ecfdf5',
          '--color-text-muted': '#9ca3af'
        }
      },
      {
        id: 'crimson-fire',
        name: '🔥 Crimson Fire',
        description: 'Bold reds and oranges for intense competition',
        colors: {
          '--color-background': '#1a0f0f',
          '--color-background-mist': '#2e1a1a',
          '--color-marble-dark': '#3a2d2d',
          '--color-marble-light': '#4a3d3d',
          '--color-gold': '#ef4444',
          '--color-gold-faded': 'rgba(239, 68, 68, 0.5)',
          '--color-green-accent': '#f97316',
          '--color-text': '#fef2f2',
          '--color-text-muted': '#9ca3af'
        }
      },
      {
        id: 'royal-purple',
        name: '👑 Royal Purple',
        description: 'Majestic purples with gold highlights',
        colors: {
          '--color-background': '#1a0f1a',
          '--color-background-mist': '#2e1a2e',
          '--color-marble-dark': '#3a2d3a',
          '--color-marble-light': '#4a3d4a',
          '--color-gold': '#a855f7',
          '--color-gold-faded': 'rgba(168, 85, 247, 0.5)',
          '--color-green-accent': '#c084fc',
          '--color-text': '#faf7ff',
          '--color-text-muted': '#a1a1aa'
        }
      },
      {
        id: 'ocean-depths',
        name: '🌊 Ocean Depths',
        description: 'Deep teals and aqua for calm focus',
        colors: {
          '--color-background': '#0f1a1a',
          '--color-background-mist': '#1a2e2e',
          '--color-marble-dark': '#2d3a3a',
          '--color-marble-light': '#3d4a4a',
          '--color-gold': '#06b6d4',
          '--color-gold-faded': 'rgba(6, 182, 212, 0.5)',
          '--color-green-accent': '#0891b2',
          '--color-text': '#f0fdff',
          '--color-text-muted': '#94a3b8'
        }
      },
      {
        id: 'neon-cyber',
        name: '⚡ Neon Cyber',
        description: 'Electric neons for futuristic gameplay',
        colors: {
          '--color-background': '#0a0a0f',
          '--color-background-mist': '#151520',
          '--color-marble-dark': '#1a1a2e',
          '--color-marble-light': '#2a2a3e',
          '--color-gold': '#00ff88',
          '--color-gold-faded': 'rgba(0, 255, 136, 0.5)',
          '--color-green-accent': '#00d4ff',
          '--color-text': '#f0fff4',
          '--color-text-muted': '#a0ffc0'
        }
      },
      {
        id: 'sunset-warmth',
        name: '🌅 Sunset Warmth',
        description: 'Warm oranges and yellows for cozy sessions',
        colors: {
          '--color-background': '#1a130f',
          '--color-background-mist': '#2e221a',
          '--color-marble-dark': '#3a322d',
          '--color-marble-light': '#4a423d',
          '--color-gold': '#f59e0b',
          '--color-gold-faded': 'rgba(245, 158, 11, 0.5)',
          '--color-green-accent': '#f97316',
          '--color-text': '#fffbeb',
          '--color-text-muted': '#a78bfa'
        }
      }
    ];

    themeConfigurations.forEach(theme => {
      this.themes.set(theme.id, theme);
    });
  }

  setupThemeButton() {
    // Check if theme button already exists
    if (document.getElementById('themeSettings')) {
      return;
    }

    // Add theme button to challenge card
    setTimeout(() => {
      const challengeCard = document.getElementById('challenge-card');
      if (challengeCard) {
        const visualEffectsBtn = challengeCard.querySelector('#visualEffectsSettings');
        if (visualEffectsBtn && !document.getElementById('themeSettings')) {
          const themeBtn = document.createElement('button');
          themeBtn.id = 'themeSettings';
          themeBtn.className = 'btn btn-secondary';
          themeBtn.innerHTML = '🎨 Themes';
          themeBtn.style.fontSize = '0.9em';
          themeBtn.style.marginLeft = '10px';

          // Insert into the same button group
          visualEffectsBtn.parentNode.appendChild(themeBtn);

          console.log('Theme button created successfully');
        }
      }
    }, 2000); // Wait for app to be fully loaded
  }

  setupEventListeners() {
    // Use event delegation for better reliability
    document.addEventListener('click', e => {
      if (e.target.id === 'themeSettings') {
        e.preventDefault();
        console.log('Theme settings clicked');
        this.showThemeModal();
      } else if (e.target.classList.contains('theme-option') || e.target.closest('.theme-option')) {
        e.preventDefault();
        const themeOption = e.target.classList.contains('theme-option')
          ? e.target
          : e.target.closest('.theme-option');
        const themeId = themeOption.dataset.themeId;
        if (themeId) {
          console.log('Switching to theme:', themeId);
          this.switchTheme(themeId);
        }
      } else if (e.target.id === 'resetTheme') {
        e.preventDefault();
        this.resetToDefault();
      } else if (e.target.id === 'closeTheme') {
        e.preventDefault();
        this.closeModal('themeModal');
      }
    });
  }

  showThemeModal() {
    this.createModal('themeModal', 'Color Themes', this.getThemeModalContent(), {
      secondary: { text: 'Reset to Default', id: 'resetTheme' },
      primary: { text: 'Close', id: 'closeTheme' }
    });
  }

  getThemeModalContent() {
    const themes = Array.from(this.themes.values());

    return `
            <div class="theme-selection">
                <div class="theme-info">
                    <p>Choose your preferred color scheme for the Capital Ladder experience. Changes apply instantly!</p>
                </div>
                
                <div class="themes-grid">
                    ${themes
                      .map(
                        theme => `
                        <div class="theme-option ${theme.id === this.currentTheme ? 'active' : ''}" 
                             data-theme-id="${theme.id}">
                            <div class="theme-preview" data-theme-id="${theme.id}">
                                <div class="preview-background" style="background: ${theme.colors['--color-background']};">
                                    <div class="preview-marble" style="background: ${theme.colors['--color-marble-light']}; border-color: ${theme.colors['--color-gold']};"></div>
                                    <div class="preview-accent" style="background: ${theme.colors['--color-gold']};"></div>
                                    <div class="preview-text" style="color: ${theme.colors['--color-text']};"></div>
                                </div>
                            </div>
                            <div class="theme-info-card">
                                <h4 class="theme-name">${theme.name}</h4>
                                <p class="theme-description">${theme.description}</p>
                                <div class="theme-colors">
                                    <div class="color-dot" style="background: ${theme.colors['--color-gold']};"></div>
                                    <div class="color-dot" style="background: ${theme.colors['--color-green-accent']};"></div>
                                    <div class="color-dot" style="background: ${theme.colors['--color-marble-light']};"></div>
                                    <div class="color-dot" style="background: ${theme.colors['--color-background']};"></div>
                                </div>
                            </div>
                        </div>
                    `
                      )
                      .join('')}
                </div>
                
            </div>
        `;
  }

  switchTheme(themeId) {
    if (!this.themes.has(themeId)) {
      console.warn(`Theme ${themeId} not found`);
      return;
    }

    const theme = this.themes.get(themeId);
    this.currentTheme = themeId;

    // Apply theme with smooth transition
    this.applyThemeTransition(theme);

    // Save to localStorage
    localStorage.setItem('cl_theme', themeId);

    // Update active state in modal if open
    this.updateThemeModalSelection();

    // Show toast notification
    // Try different ways to access the showToast function
    const toastFn =
      window.showToast ||
      window.parent?.showToast ||
      (window.document &&
        document.querySelector('#app-container') &&
        (() => {
          // Find showToast in app context
          try {
            return eval('showToast');
          } catch (e) {
            return null;
          }
        })());

    if (toastFn && typeof toastFn === 'function') {
      toastFn(`Applied ${theme.name} theme!`, 'success', 2000);
    } else {
      // Fallback notification
      console.log(`Applied ${theme.name} theme!`);
      const notification = document.createElement('div');
      notification.textContent = `Applied ${theme.name} theme!`;
      notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; background: var(--color-gold);
                color: var(--color-background); padding: 12px 20px; border-radius: 8px;
                font-weight: 600; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideInRight 0.3s ease;
            `;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
      }, 2000);
    }
  }

  applyThemeTransition(theme) {
    // Create transition overlay
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: ${theme.colors['--color-background']};
            z-index: 10001;
            opacity: 0;
            transition: opacity ${this.themeTransitionDuration}ms ease;
            pointer-events: none;
        `;

    document.body.appendChild(overlay);

    // Fade in overlay
    requestAnimationFrame(() => {
      overlay.style.opacity = '0.8';
    });

    // Apply theme colors after brief delay
    setTimeout(() => {
      this.applyThemeColors(theme);

      // Fade out overlay
      overlay.style.opacity = '0';

      // Remove overlay after transition
      setTimeout(() => {
        overlay.remove();
      }, this.themeTransitionDuration);
    }, this.themeTransitionDuration / 2);
  }

  applyThemeColors(theme) {
    const root = document.documentElement;

    // Apply all theme colors to CSS custom properties
    Object.entries(theme.colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Update meta theme color for mobile browsers
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = theme.colors['--color-background'];
  }

  updateThemeModalSelection() {
    const modal = document.getElementById('themeModal');
    if (!modal) {
      return;
    }

    // Update active states
    modal.querySelectorAll('.theme-option').forEach(option => {
      const themeId = option.dataset.themeId;
      option.classList.toggle('active', themeId === this.currentTheme);
    });
  }

  loadSavedTheme() {
    const savedThemeId = localStorage.getItem('cl_theme');
    if (savedThemeId && this.themes.has(savedThemeId)) {
      this.savedTheme = savedThemeId;
    }
  }

  applyStoredTheme() {
    if (this.savedTheme) {
      // Apply immediately without transition on page load
      const theme = this.themes.get(this.savedTheme);
      this.currentTheme = this.savedTheme;
      this.applyThemeColors(theme);
    }
  }

  resetToDefault() {
    this.switchTheme('classic-gold');

    if (window.showToast) {
      window.showToast('Reset to Classic Gold theme', 'info', 2000);
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
            <div class="modal-content theme-modal-content">
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

  getCurrentTheme() {
    return this.themes.get(this.currentTheme);
  }

  exportTheme() {
    const theme = this.getCurrentTheme();
    return {
      id: theme.id,
      name: theme.name,
      colors: theme.colors
    };
  }
}

// Initialize dynamic themes system
window.dynamicThemes = new DynamicThemes();

// Global functions for external access
window.switchTheme = themeId => {
  window.dynamicThemes.switchTheme(themeId);
};

window.getCurrentTheme = () => {
  return window.dynamicThemes.getCurrentTheme();
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DynamicThemes;
}
