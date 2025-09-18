/**
 * Capital Ladder Audio Manager
 * Provides immersive audio experience with pool hall ambience and interactive sounds
 */

class AudioManager {
  constructor() {
    this.sounds = {};
    this.ambientVolume = 0.3;
    this.effectVolume = 0.6;
    this.isEnabled = localStorage.getItem('cl_audio_enabled') !== 'false';
    this.currentAmbient = null;
    this.init();
  }

  init() {
    // Create audio context for better control
    this.audioContext = null;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported, falling back to HTML5 audio');
    }

    this.loadSounds();
    this.setupVolumeControls();

    // Start ambient sounds if enabled
    if (this.isEnabled) {
      setTimeout(() => this.playAmbient(), 2000);
    }
  }

  loadSounds() {
    // Define sound library with generated audio data URLs for realistic pool sounds
    this.soundLibrary = {
      // Ambient pool hall atmosphere
      ambient: this.generateAmbientSound(),

      // Interactive sound effects
      buttonClick: this.generateClickSound(),
      buttonHover: this.generateHoverSound(),
      notification: this.generateNotificationSound(),
      challengeSent: this.generateSuccessSound(),
      matchWin: this.generateVictoryFanfare(),
      matchLose: this.generateDefeatSound(),
      ballStrike: this.generateBallStrikeSound(),
      scorePoint: this.generateScoreSound(),
      modalOpen: this.generateModalSound(),
      modalClose: this.generateModalCloseSound(),
      tipRefresh: this.generateRefreshSound()
    };

    // Load each sound
    Object.keys(this.soundLibrary).forEach(key => {
      this.loadSound(key, this.soundLibrary[key]);
    });
  }

  loadSound(name, dataUrl) {
    const audio = new Audio(dataUrl);
    audio.preload = 'auto';
    audio.volume = name === 'ambient' ? this.ambientVolume : this.effectVolume;

    if (name === 'ambient') {
      audio.loop = true;
    }

    this.sounds[name] = audio;
  }

  // Generate realistic pool hall ambient sound
  generateAmbientSound() {
    const sampleRate = 44100;
    const duration = 30; // 30 seconds loop
    const frameCount = sampleRate * duration;
    const arrayBuffer = new ArrayBuffer(frameCount * 2);
    const dataView = new DataView(arrayBuffer);

    for (let i = 0; i < frameCount; i++) {
      // Create subtle background noise with occasional pool sounds
      let sample = 0;

      // Base ambient noise
      sample += (Math.random() - 0.5) * 0.02;

      // Distant conversation murmur
      sample += Math.sin(i / 1000 + Math.sin(i / 3000)) * 0.01;

      // Occasional cue strikes (every ~5-8 seconds)
      if (Math.random() > 0.999) {
        sample += Math.sin(i / 10) * 0.3 * Math.exp((-i % 1000) / 200);
      }

      // Subtle HVAC hum
      sample += Math.sin(i / 100) * 0.005;

      const intSample = Math.max(-1, Math.min(1, sample)) * 32767;
      dataView.setInt16(i * 2, intSample, true);
    }

    return this.createWaveDataUrl(arrayBuffer, sampleRate, duration);
  }

  // Generate crisp button click sound
  generateClickSound() {
    const sampleRate = 44100;
    const duration = 0.1;
    const frameCount = sampleRate * duration;
    const arrayBuffer = new ArrayBuffer(frameCount * 2);
    const dataView = new DataView(arrayBuffer);

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Quick attack, fast decay
      const envelope = Math.exp(-t * 50);

      // Multiple harmonics for richness
      sample += Math.sin(2 * Math.PI * 800 * t) * envelope * 0.3;
      sample += Math.sin(2 * Math.PI * 1200 * t) * envelope * 0.2;
      sample += Math.sin(2 * Math.PI * 2000 * t) * envelope * 0.1;

      const intSample = Math.max(-1, Math.min(1, sample)) * 16383;
      dataView.setInt16(i * 2, intSample, true);
    }

    return this.createWaveDataUrl(arrayBuffer, sampleRate, duration);
  }

  // Generate subtle hover sound
  generateHoverSound() {
    const sampleRate = 44100;
    const duration = 0.05;
    const frameCount = sampleRate * duration;
    const arrayBuffer = new ArrayBuffer(frameCount * 2);
    const dataView = new DataView(arrayBuffer);

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin((Math.PI * t) / duration);
      const sample = Math.sin(2 * Math.PI * 600 * t) * envelope * 0.1;

      const intSample = Math.max(-1, Math.min(1, sample)) * 8191;
      dataView.setInt16(i * 2, intSample, true);
    }

    return this.createWaveDataUrl(arrayBuffer, sampleRate, duration);
  }

  // Generate notification chime
  generateNotificationSound() {
    const sampleRate = 44100;
    const duration = 0.8;
    const frameCount = sampleRate * duration;
    const arrayBuffer = new ArrayBuffer(frameCount * 2);
    const dataView = new DataView(arrayBuffer);

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Pleasant chime sequence
      const envelope = Math.exp(-t * 3);
      sample += Math.sin(2 * Math.PI * 523.25 * t) * envelope * 0.4; // C5
      sample += Math.sin(2 * Math.PI * 659.25 * t) * envelope * 0.3; // E5
      sample += Math.sin(2 * Math.PI * 783.99 * t) * envelope * 0.2; // G5

      const intSample = Math.max(-1, Math.min(1, sample)) * 16383;
      dataView.setInt16(i * 2, intSample, true);
    }

    return this.createWaveDataUrl(arrayBuffer, sampleRate, duration);
  }

  // Generate success sound
  generateSuccessSound() {
    const sampleRate = 44100;
    const duration = 0.6;
    const frameCount = sampleRate * duration;
    const arrayBuffer = new ArrayBuffer(frameCount * 2);
    const dataView = new DataView(arrayBuffer);

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Ascending success melody
      const envelope = Math.exp(-t * 4);
      const freq1 = 440 + t * 200; // Rising tone
      sample += Math.sin(2 * Math.PI * freq1 * t) * envelope * 0.3;
      sample += Math.sin(2 * Math.PI * freq1 * 1.5 * t) * envelope * 0.2;

      const intSample = Math.max(-1, Math.min(1, sample)) * 16383;
      dataView.setInt16(i * 2, intSample, true);
    }

    return this.createWaveDataUrl(arrayBuffer, sampleRate, duration);
  }

  // Generate victory fanfare
  generateVictoryFanfare() {
    const sampleRate = 44100;
    const duration = 2.0;
    const frameCount = sampleRate * duration;
    const arrayBuffer = new ArrayBuffer(frameCount * 2);
    const dataView = new DataView(arrayBuffer);

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Triumphant fanfare
      const envelope = Math.max(0, 1 - t / duration);

      // Main melody
      if (t < 0.5) {
        sample += Math.sin(2 * Math.PI * 523.25 * t) * envelope * 0.4; // C5
      } else if (t < 1.0) {
        sample += Math.sin(2 * Math.PI * 659.25 * t) * envelope * 0.4; // E5
      } else {
        sample += Math.sin(2 * Math.PI * 783.99 * t) * envelope * 0.4; // G5
      }

      // Harmony
      sample += Math.sin(2 * Math.PI * 261.63 * t) * envelope * 0.2; // C4

      const intSample = Math.max(-1, Math.min(1, sample)) * 20000;
      dataView.setInt16(i * 2, intSample, true);
    }

    return this.createWaveDataUrl(arrayBuffer, sampleRate, duration);
  }

  // Generate ball strike sound
  generateBallStrikeSound() {
    const sampleRate = 44100;
    const duration = 0.3;
    const frameCount = sampleRate * duration;
    const arrayBuffer = new ArrayBuffer(frameCount * 2);
    const dataView = new DataView(arrayBuffer);

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Sharp attack with click and resonance
      const envelope = Math.exp(-t * 30);

      // Initial click
      if (t < 0.01) {
        sample += (Math.random() - 0.5) * envelope * 0.8;
      }

      // Resonant tone
      sample += Math.sin(2 * Math.PI * 300 * t) * envelope * 0.3;
      sample += Math.sin(2 * Math.PI * 600 * t) * envelope * 0.2;

      const intSample = Math.max(-1, Math.min(1, sample)) * 20000;
      dataView.setInt16(i * 2, intSample, true);
    }

    return this.createWaveDataUrl(arrayBuffer, sampleRate, duration);
  }

  // Generate other required sounds with similar techniques...
  generateDefeatSound() {
    return this.generateNotificationSound();
  } // Placeholder
  generateScoreSound() {
    return this.generateSuccessSound();
  } // Placeholder
  generateModalSound() {
    return this.generateHoverSound();
  } // Placeholder
  generateModalCloseSound() {
    return this.generateClickSound();
  } // Placeholder
  generateRefreshSound() {
    return this.generateClickSound();
  } // Placeholder

  // Create WAV data URL from audio buffer
  createWaveDataUrl(arrayBuffer, sampleRate, duration) {
    const length = arrayBuffer.byteLength;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Copy audio data
    const audioData = new Uint8Array(arrayBuffer);
    const wavData = new Uint8Array(buffer, 44);
    wavData.set(audioData);

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  // Play specific sound
  play(soundName, options = {}) {
    if (!this.isEnabled || !this.sounds[soundName]) {
      return;
    }

    const sound = this.sounds[soundName];
    const volume =
      options.volume ?? (soundName === 'ambient' ? this.ambientVolume : this.effectVolume);

    sound.volume = volume;
    sound.currentTime = 0;

    const playPromise = sound.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('Audio play failed:', error);
      });
    }
  }

  // Play ambient sounds
  playAmbient() {
    if (this.currentAmbient) {
      this.currentAmbient.pause();
    }

    this.currentAmbient = this.sounds.ambient;
    this.play('ambient');
  }

  // Setup audio controls
  setupVolumeControls() {
    // Add audio control UI elements to the page
    this.createAudioControls();
    this.attachEventListeners();
  }

  createAudioControls() {
    // Create floating audio control panel
    const audioPanel = document.createElement('div');
    audioPanel.id = 'audioControls';
    audioPanel.innerHTML = `
            <div class="audio-control-panel">
                <div class="audio-panel-header">
                    <button id="audioToggle" class="audio-btn ${this.isEnabled ? 'enabled' : 'disabled'}">
                        <span class="audio-icon">${this.isEnabled ? '🔊' : '🔇'}</span>
                    </button>
                    <button id="audioMinimize" class="minimize-btn" title="Minimize Audio Panel">
                        <span class="minimize-icon">−</span>
                    </button>
                </div>
                <div class="volume-controls ${this.isEnabled ? 'visible' : 'hidden'}" id="audioVolumeControls">
                    <label>Ambient</label>
                    <input type="range" id="ambientVolume" min="0" max="100" value="${this.ambientVolume * 100}">
                    <label>Effects</label>
                    <input type="range" id="effectVolume" min="0" max="100" value="${this.effectVolume * 100}">
                </div>
            </div>
        `;

    document.body.appendChild(audioPanel);
    this.addAudioStyles();

    // Load saved minimize state
    this.isMinimized = localStorage.getItem('cl_audio_minimized') === 'true';
    if (this.isMinimized) {
      // Apply minimized state immediately without animation
      setTimeout(() => {
        const audioPanel = document.querySelector('.audio-control-panel');
        const minimizeBtn = document.getElementById('audioMinimize');
        const minimizeIcon = minimizeBtn.querySelector('.minimize-icon');

        audioPanel.classList.add('minimized');
        minimizeBtn.title = 'Expand Audio Panel';
        minimizeIcon.textContent = '+';
      }, 100);
    }
  }

  addAudioStyles() {
    const styles = `
            <style>
            .audio-control-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.85);
                border-radius: 12px;
                padding: 12px;
                z-index: 1000;
                backdrop-filter: blur(8px);
                border: 1px solid rgba(212, 175, 55, 0.4);
                min-width: 160px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .audio-control-panel.minimized {
                padding: 8px;
                min-width: auto;
            }
            
            .audio-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .audio-control-panel.minimized .audio-panel-header {
                margin-bottom: 0;
            }
            
            .audio-btn {
                background: rgba(212, 175, 55, 0.1);
                border: 1px solid rgba(212, 175, 55, 0.6);
                color: #d4af37;
                padding: 6px 10px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .audio-btn:hover {
                background: rgba(212, 175, 55, 0.2);
                border-color: #d4af37;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
            }
            
            .minimize-btn {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: rgba(255, 255, 255, 0.7);
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                line-height: 1;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 24px;
                height: 24px;
            }
            
            .minimize-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.4);
                color: #fff;
                transform: translateY(-1px);
            }
            
            .minimize-icon {
                font-weight: bold;
                font-size: 16px;
                line-height: 1;
                transition: transform 0.3s ease;
            }
            
            .audio-control-panel.minimized .minimize-icon {
                transform: rotate(180deg);
            }
            
            .volume-controls {
                margin-top: 8px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: hidden;
            }
            
            .volume-controls.hidden {
                opacity: 0;
                pointer-events: none;
                height: 0 !important;
                margin-top: 0 !important;
            }
            
            .audio-control-panel.minimized .volume-controls {
                opacity: 0;
                height: 0 !important;
                margin-top: 0 !important;
                pointer-events: none;
            }
            
            .volume-controls label {
                color: #d4af37;
                font-size: 11px;
                font-weight: 600;
                display: block;
                margin: 8px 0 4px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-family: var(--font-heading, 'Arial', sans-serif);
            }
            
            .volume-controls input[type="range"] {
                width: 100%;
                height: 4px;
                margin: 0 0 4px 0;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                outline: none;
                -webkit-appearance: none;
            }
            
            .volume-controls input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #d4af37;
                cursor: pointer;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
                transition: all 0.2s ease;
            }
            
            .volume-controls input[type="range"]::-webkit-slider-thumb:hover {
                background: #f4cf47;
                transform: scale(1.1);
                box-shadow: 0 2px 6px rgba(212, 175, 55, 0.4);
            }
            
            .volume-controls input[type="range"]::-moz-range-thumb {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #d4af37;
                cursor: pointer;
                border: none;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            }
            
            /* Animation for panel state changes */
            @keyframes panelExpand {
                from { max-height: 60px; }
                to { max-height: 200px; }
            }
            
            @keyframes panelCollapse {
                from { max-height: 200px; }
                to { max-height: 60px; }
            }
            
            .audio-control-panel.expanding {
                animation: panelExpand 0.3s ease-out;
            }
            
            .audio-control-panel.collapsing {
                animation: panelCollapse 0.3s ease-out;
            }
            </style>
        `;
    document.head.insertAdjacentHTML('beforeend', styles);
  }

  attachEventListeners() {
    // Toggle audio on/off
    document.getElementById('audioToggle').addEventListener('click', () => {
      this.toggleAudio();
    });

    // Minimize/expand panel
    document.getElementById('audioMinimize').addEventListener('click', () => {
      this.toggleMinimize();
    });

    // Volume controls
    document.getElementById('ambientVolume').addEventListener('input', e => {
      this.ambientVolume = e.target.value / 100;
      if (this.sounds.ambient) {
        this.sounds.ambient.volume = this.ambientVolume;
      }
    });

    document.getElementById('effectVolume').addEventListener('input', e => {
      this.effectVolume = e.target.value / 100;
    });
  }

  toggleAudio() {
    this.isEnabled = !this.isEnabled;
    localStorage.setItem('cl_audio_enabled', this.isEnabled);

    const toggleBtn = document.getElementById('audioToggle');
    const volumeControls = document.querySelector('.volume-controls');

    if (this.isEnabled) {
      toggleBtn.classList.add('enabled');
      toggleBtn.classList.remove('disabled');
      toggleBtn.querySelector('.audio-icon').textContent = '🔊';
      volumeControls.classList.add('visible');
      volumeControls.classList.remove('hidden');
      this.playAmbient();
    } else {
      toggleBtn.classList.add('disabled');
      toggleBtn.classList.remove('enabled');
      toggleBtn.querySelector('.audio-icon').textContent = '🔇';
      volumeControls.classList.add('hidden');
      volumeControls.classList.remove('visible');
      if (this.currentAmbient) {
        this.currentAmbient.pause();
      }
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    const audioPanel = document.querySelector('.audio-control-panel');
    const minimizeBtn = document.getElementById('audioMinimize');
    const minimizeIcon = minimizeBtn.querySelector('.minimize-icon');

    // Save minimize state to localStorage
    localStorage.setItem('cl_audio_minimized', this.isMinimized);

    if (this.isMinimized) {
      // Minimize the panel
      audioPanel.classList.add('collapsing');
      setTimeout(() => {
        audioPanel.classList.remove('collapsing');
        audioPanel.classList.add('minimized');
      }, 150);

      minimizeBtn.title = 'Expand Audio Panel';
      minimizeIcon.textContent = '+';

      // Play subtle sound effect
      this.play('modalClose', { volume: 0.3 });
    } else {
      // Expand the panel
      audioPanel.classList.remove('minimized');
      audioPanel.classList.add('expanding');
      setTimeout(() => {
        audioPanel.classList.remove('expanding');
      }, 300);

      minimizeBtn.title = 'Minimize Audio Panel';
      minimizeIcon.textContent = '−';

      // Play subtle sound effect
      this.play('modalOpen', { volume: 0.3 });
    }
  }

  // Public methods for playing specific sounds
  playButtonClick() {
    this.play('buttonClick');
  }
  playButtonHover() {
    this.play('buttonHover');
  }
  playNotification() {
    this.play('notification');
  }
  playChallengeSent() {
    this.play('challengeSent');
  }
  playMatchWin() {
    this.play('matchWin');
  }
  playMatchLose() {
    this.play('matchLose');
  }
  playBallStrike() {
    this.play('ballStrike');
  }
  playScorePoint() {
    this.play('scorePoint');
  }
  playModalOpen() {
    this.play('modalOpen');
  }
  playModalClose() {
    this.play('modalClose');
  }
  playTipRefresh() {
    this.play('tipRefresh');
  }
}

// Global audio manager instance
window.audioManager = new AudioManager();
