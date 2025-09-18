/*
 * MOBILE ENHANCEMENTS
 * Capital Ladder App - Mobile User Experience
 * 
 * Features:
 * - Touch-optimized interactions
 * - Pull-to-refresh functionality
 * - Mobile keyboard handling
 * - Responsive layout adjustments
 * - Performance optimizations
 */

// Mobile detection and feature flags
const MobileFeatures = {
  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
  isAndroid: /Android/i.test(navigator.userAgent),
  hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  supportsServiceWorker: 'serviceWorker' in navigator,
  
  init() {
    console.log('🔧 Mobile Features Initialized', {
      mobile: this.isMobile,
      touch: this.hasTouch,
      platform: this.isIOS ? 'iOS' : this.isAndroid ? 'Android' : 'Desktop'
    });
    
    if (this.isMobile || this.hasTouch) {
      this.enableMobileFeatures();
    }
    
    // Always enable responsive features
    this.enableResponsiveFeatures();
  },
  
  enableMobileFeatures() {
    this.enableTouchOptimizations();
    this.enablePullToRefresh();
    this.enableMobileKeyboard();
    this.enableMobileNavigation();
    this.enablePerformanceOptimizations();
  },
  
  enableResponsiveFeatures() {
    this.enableResponsiveLayout();
    this.enableAppVisibility();
  }
};

// Touch optimizations for better mobile experience
MobileFeatures.enableTouchOptimizations = function() {
  // Prevent default touch behaviors that interfere with app
  document.addEventListener('touchstart', function(e) {
    // Allow touch on form inputs
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      return;
    }
    
    // Prevent zoom on double tap for most elements
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Improve button feedback on touch
  const buttons = document.querySelectorAll('.btn, button');
  buttons.forEach(button => {
    button.addEventListener('touchstart', function() {
      this.classList.add('touch-active');
    });
    
    button.addEventListener('touchend', function() {
      setTimeout(() => {
        this.classList.remove('touch-active');
      }, 150);
    });
  });
  
  // Add haptic feedback for iOS
  if (this.isIOS && window.navigator.vibrate) {
    buttons.forEach(button => {
      button.addEventListener('touchstart', () => {
        window.navigator.vibrate(10); // 10ms haptic feedback
      });
    });
  }
  
  console.log('📱 Touch optimizations enabled');
};

// Pull-to-refresh functionality
MobileFeatures.enablePullToRefresh = function() {
  let startY = 0;
  let pullDistance = 0;
  let isPulling = false;
  const threshold = 80; // pixels
  const maxPull = 120;
  
  // Create pull-to-refresh indicator
  const pullIndicator = document.createElement('div');
  pullIndicator.className = 'pull-refresh-indicator';
  pullIndicator.innerHTML = '⬇️ Pull to refresh';
  pullIndicator.style.cssText = `
    position: fixed;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(212, 175, 55, 0.1);
    color: #d4af37;
    padding: 12px 24px;
    border-radius: 20px;
    font-size: 14px;
    text-align: center;
    transition: all 0.3s ease;
    z-index: 1000;
    border: 1px solid rgba(212, 175, 55, 0.3);
    backdrop-filter: blur(10px);
  `;
  document.body.appendChild(pullIndicator);
  
  const appContainer = document.getElementById('app-container');
  if (!appContainer) return;
  
  function handleTouchStart(e) {
    if (window.scrollY === 0) { // Only at top of page
      startY = e.touches[0].clientY;
      isPulling = true;
    }
  }
  
  function handleTouchMove(e) {
    if (!isPulling || window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    pullDistance = Math.min(maxPull, Math.max(0, currentY - startY));
    
    if (pullDistance > 0) {
      e.preventDefault(); // Prevent scroll
      
      // Update visual feedback
      const progress = Math.min(1, pullDistance / threshold);
      pullIndicator.style.top = `${-60 + (progress * 70)}px`;
      pullIndicator.style.opacity = progress;
      
      if (pullDistance >= threshold) {
        pullIndicator.innerHTML = '⬆️ Release to refresh';
        pullIndicator.style.backgroundColor = 'rgba(46, 139, 87, 0.2)';
        pullIndicator.style.borderColor = 'rgba(46, 139, 87, 0.5)';
        pullIndicator.style.color = '#2e8b57';
      } else {
        pullIndicator.innerHTML = '⬇️ Pull to refresh';
        pullIndicator.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
        pullIndicator.style.borderColor = 'rgba(212, 175, 55, 0.3)';
        pullIndicator.style.color = '#d4af37';
      }
      
      // Transform the app container
      appContainer.style.transform = `translateY(${pullDistance * 0.5}px)`;
      appContainer.style.transition = 'none';
    }
  }
  
  function handleTouchEnd() {
    if (!isPulling) return;
    
    isPulling = false;
    
    // Reset app container position
    appContainer.style.transform = '';
    appContainer.style.transition = 'transform 0.3s ease';
    
    // Hide indicator
    pullIndicator.style.top = '-60px';
    pullIndicator.style.opacity = '0';
    
    // Trigger refresh if threshold was met
    if (pullDistance >= threshold) {
      refreshLeaderboard();
    }
    
    pullDistance = 0;
  }
  
  // Touch event listeners
  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
  
  console.log('🔄 Pull-to-refresh enabled');
};

// Mobile keyboard handling
MobileFeatures.enableMobileKeyboard = function() {
  const inputs = document.querySelectorAll('input, textarea');
  
  inputs.forEach(input => {
    // Scroll into view when focused
    input.addEventListener('focus', function(e) {
      setTimeout(() => {
        e.target.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }, 300); // Wait for keyboard animation
    });
    
    // Add mobile-friendly input attributes
    if (input.type === 'email') {
      input.setAttribute('inputmode', 'email');
      input.setAttribute('autocomplete', 'email');
    }
    
    if (input.type === 'password') {
      input.setAttribute('autocomplete', 'current-password');
    }
  });
  
  // Handle viewport changes from keyboard
  let initialViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  
  function handleViewportChange() {
    if (window.visualViewport) {
      const currentHeight = window.visualViewport.height;
      const heightDiff = initialViewportHeight - currentHeight;
      
      // Keyboard is likely open if viewport shrunk significantly
      if (heightDiff > 150) {
        document.body.classList.add('keyboard-open');
      } else {
        document.body.classList.remove('keyboard-open');
      }
    }
  }
  
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportChange);
  }
  
  console.log('⌨️ Mobile keyboard handling enabled');
};

// Mobile navigation enhancements
MobileFeatures.enableMobileNavigation = function() {
  // Smooth scrolling for mobile
  document.addEventListener('click', function(e) {
    if (e.target.matches('a[href^="#"]')) {
      e.preventDefault();
      const target = document.querySelector(e.target.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  });
  
  // Modal adjustments for mobile
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    // Prevent body scroll when modal is open
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (!modal.classList.contains('hidden')) {
            document.body.style.overflow = 'hidden';
          } else {
            document.body.style.overflow = '';
          }
        }
      });
    });
    
    observer.observe(modal, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
  });
  
  console.log('🧭 Mobile navigation enabled');
};

// Performance optimizations for mobile
MobileFeatures.enablePerformanceOptimizations = function() {
  // Lazy load images (if any)
  if ('IntersectionObserver' in window) {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  }
  
  // Reduce animations on slower devices
  const isSlowDevice = navigator.hardwareConcurrency < 4 || navigator.deviceMemory < 4;
  if (isSlowDevice) {
    document.documentElement.style.setProperty('--mobile-animation-duration', '0.1s');
    console.log('⚡ Reduced animations for slower device');
  }
  
  // Debounced resize handler
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Handle orientation changes
      if (this.isMobile) {
        const isLandscape = window.innerWidth > window.innerHeight;
        document.body.classList.toggle('landscape', isLandscape);
        document.body.classList.toggle('portrait', !isLandscape);
      }
    }, 250);
  });
  
  console.log('🚀 Performance optimizations enabled');
};

// Responsive layout adjustments
MobileFeatures.enableResponsiveLayout = function() {
  function updateLayout() {
    const width = window.innerWidth;
    const appContainer = document.getElementById('app-container');
    
    if (!appContainer) return;
    
    // Add responsive classes
    document.body.classList.toggle('mobile', width < 768);
    document.body.classList.toggle('tablet', width >= 768 && width < 1024);
    document.body.classList.toggle('desktop', width >= 1024);
    
    // Update CSS custom properties based on screen size
    if (width < 768) {
      document.documentElement.style.setProperty('--responsive-columns', '1');
      document.documentElement.style.setProperty('--responsive-gap', '12px');
      document.documentElement.style.setProperty('--responsive-padding', '16px');
    } else if (width < 1024) {
      document.documentElement.style.setProperty('--responsive-columns', '2');
      document.documentElement.style.setProperty('--responsive-gap', '16px');
      document.documentElement.style.setProperty('--responsive-padding', '20px');
    } else {
      document.documentElement.style.setProperty('--responsive-columns', '3');
      document.documentElement.style.setProperty('--responsive-gap', '24px');
      document.documentElement.style.setProperty('--responsive-padding', '32px');
    }
  }
  
  // Initial layout update
  updateLayout();
  
  // Update on resize
  window.addEventListener('resize', updateLayout);
  
  console.log('📐 Responsive layout enabled');
};

// App visibility and loading states
MobileFeatures.enableAppVisibility = function() {
  const appContainer = document.getElementById('app-container');
  const authContainer = document.getElementById('auth-container');
  
  if (appContainer) {
    // Smooth app entrance
    setTimeout(() => {
      appContainer.classList.add('visible');
    }, 100);
    
    // Handle app visibility changes (e.g., tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App is hidden - pause non-essential updates
        console.log('📱 App hidden - reducing activity');
      } else {
        // App is visible - resume updates
        console.log('📱 App visible - resuming activity');
        if (typeof refreshLeaderboard === 'function') {
          refreshLeaderboard();
        }
      }
    });
  }
  
  console.log('👁️ App visibility handling enabled');
};

// Refresh function for pull-to-refresh
function refreshLeaderboard() {
  console.log('🔄 Refreshing leaderboard...');
  
  // Show loading indicator
  const indicator = document.querySelector('.pull-refresh-indicator');
  if (indicator) {
    indicator.innerHTML = '🔄 Refreshing...';
    indicator.style.backgroundColor = 'rgba(46, 139, 87, 0.2)';
    indicator.style.color = '#2e8b57';
  }
  
  // Call the existing refresh function if available
  if (typeof loadLeaderboard === 'function') {
    loadLeaderboard();
  }
  
  if (typeof loadActiveMatches === 'function') {
    loadActiveMatches();
  }
  
  if (typeof loadNotifications === 'function') {
    loadNotifications();
  }
  
  // Hide indicator after delay
  setTimeout(() => {
    if (indicator) {
      indicator.style.top = '-60px';
      indicator.style.opacity = '0';
    }
  }, 1500);
}

// CSS for touch states
const mobileStyles = document.createElement('style');
mobileStyles.textContent = `
  .touch-active {
    transform: scale(0.98) !important;
    opacity: 0.8 !important;
    transition: all 0.1s ease !important;
  }
  
  .keyboard-open {
    /* Adjust layout when keyboard is open */
    --mobile-padding: 12px;
    --mobile-gap: 8px;
  }
  
  .keyboard-open .app-container {
    padding-bottom: 10px;
  }
  
  .landscape .ziggurat-tier {
    padding: 8px 12px;
    font-size: 14px;
  }
  
  .landscape .user-header {
    flex-direction: row;
    align-items: center;
  }
  
  /* Reduced motion for performance */
  .reduced-motion * {
    animation-duration: 0.1s !important;
    transition-duration: 0.1s !important;
  }
`;
document.head.appendChild(mobileStyles);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MobileFeatures.init());
} else {
  MobileFeatures.init();
}

// Export for other scripts to use
window.MobileFeatures = MobileFeatures;