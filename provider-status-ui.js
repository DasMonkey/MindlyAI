// Provider Status UI Components
// Creates reusable UI components for displaying provider status across the extension

class ProviderStatusUI {
  constructor() {
    this.providerManager = null;
    this.statusUpdateInterval = null;
  }

  // Initialize with provider manager instance
  async initialize(providerManager) {
    this.providerManager = providerManager;
    console.log('✅ Provider Status UI initialized');
  }

  // Create a provider indicator badge
  createProviderBadge(options = {}) {
    const {
      containerId = 'provider-badge-container',
      position = 'top-right',
      showDownloadProgress = true,
      compact = false
    } = options;

    const badge = document.createElement('div');
    badge.id = containerId;
    badge.className = `provider-badge provider-badge-${position} ${compact ? 'compact' : ''}`;
    badge.innerHTML = `
      <div class="provider-badge-content">
        <span class="provider-icon">🤖</span>
        <span class="provider-name">Loading...</span>
        <span class="provider-status-indicator"></span>
      </div>
      <div class="provider-download-progress" style="display: none;">
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <span class="progress-text">Downloading...</span>
      </div>
    `;

    // Add styles if not already present
    this.injectStyles();

    return badge;
  }

  // Update badge with current provider status
  async updateBadge(badgeElement) {
    if (!this.providerManager || !badgeElement) return;

    try {
      const status = await this.providerManager.getProviderStatus();
      const nameElement = badgeElement.querySelector('.provider-name');
      const iconElement = badgeElement.querySelector('.provider-icon');
      const statusIndicator = badgeElement.querySelector('.provider-status-indicator');
      const downloadProgress = badgeElement.querySelector('.provider-download-progress');

      // Update provider name and icon
      if (status.activeProvider === 'builtin') {
        nameElement.textContent = 'Built-in AI';
        iconElement.textContent = '⚡';
        badgeElement.classList.remove('cloud-provider');
        badgeElement.classList.add('builtin-provider');
      } else {
        nameElement.textContent = 'Cloud API';
        iconElement.textContent = '☁️';
        badgeElement.classList.remove('builtin-provider');
        badgeElement.classList.add('cloud-provider');
      }

      // Update status indicator
      if (status.fallbackActive) {
        statusIndicator.className = 'provider-status-indicator fallback';
        statusIndicator.title = 'Fallback mode active';
      } else if (status.builtinAvailable) {
        statusIndicator.className = 'provider-status-indicator available';
        statusIndicator.title = 'Provider available';
      } else {
        statusIndicator.className = 'provider-status-indicator unavailable';
        statusIndicator.title = 'Provider unavailable';
      }

      // Show download progress if applicable
      if (status.downloading && downloadProgress) {
        downloadProgress.style.display = 'block';
        this.updateDownloadProgress(badgeElement, status.downloadProgress || 0);
      } else if (downloadProgress) {
        downloadProgress.style.display = 'none';
      }

    } catch (error) {
      console.error('❌ Error updating provider badge:', error);
    }
  }

  // Update download progress bar
  updateDownloadProgress(badgeElement, progress) {
    const progressFill = badgeElement.querySelector('.progress-fill');
    const progressText = badgeElement.querySelector('.progress-text');

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressText) {
      progressText.textContent = `Downloading... ${Math.round(progress)}%`;
    }
  }

  // Create status indicator (simple dot)
  createStatusIndicator(status) {
    const indicator = document.createElement('span');
    indicator.className = `status-indicator status-${status}`;
    
    const statusText = {
      'available': 'Available',
      'downloading': 'Downloading',
      'unavailable': 'Unavailable',
      'fallback': 'Fallback Active'
    };

    indicator.title = statusText[status] || status;
    return indicator;
  }

  // Create download progress bar component
  createDownloadProgressBar() {
    const container = document.createElement('div');
    container.className = 'download-progress-container';
    container.innerHTML = `
      <div class="download-progress-header">
        <span class="download-label">Downloading AI Model</span>
        <span class="download-percentage">0%</span>
      </div>
      <div class="download-progress-bar">
        <div class="download-progress-fill"></div>
      </div>
      <div class="download-progress-footer">
        <span class="download-status">Preparing download...</span>
      </div>
    `;
    return container;
  }

  // Update download progress bar
  updateDownloadProgressBar(container, progress, status = '') {
    const fill = container.querySelector('.download-progress-fill');
    const percentage = container.querySelector('.download-percentage');
    const statusText = container.querySelector('.download-status');

    if (fill) fill.style.width = `${progress}%`;
    if (percentage) percentage.textContent = `${Math.round(progress)}%`;
    if (statusText && status) statusText.textContent = status;
  }

  // Create provider comparison card
  createProviderComparisonCard(provider, features) {
    const card = document.createElement('div');
    card.className = `provider-card provider-card-${provider}`;
    
    const providerInfo = {
      builtin: {
        name: 'Built-in AI',
        icon: '⚡',
        tagline: 'Privacy-first, offline-capable',
        benefits: ['No API key needed', 'Works offline', 'Free to use', 'Privacy-focused']
      },
      cloud: {
        name: 'Cloud API',
        icon: '☁️',
        tagline: 'Powerful cloud processing',
        benefits: ['Advanced features', 'Always available', 'Regular updates', 'Multi-language']
      }
    };

    const info = providerInfo[provider];
    
    card.innerHTML = `
      <div class="provider-card-header">
        <span class="provider-card-icon">${info.icon}</span>
        <h3 class="provider-card-name">${info.name}</h3>
      </div>
      <p class="provider-card-tagline">${info.tagline}</p>
      <ul class="provider-card-benefits">
        ${info.benefits.map(benefit => `<li>✓ ${benefit}</li>`).join('')}
      </ul>
      <div class="provider-card-features">
        <h4>Supported Features:</h4>
        <ul>
          ${features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      </div>
    `;

    return card;
  }

  // Start auto-updating badge
  startAutoUpdate(badgeElement, intervalMs = 5000) {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
    }

    // Initial update
    this.updateBadge(badgeElement);

    // Set up periodic updates
    this.statusUpdateInterval = setInterval(() => {
      this.updateBadge(badgeElement);
    }, intervalMs);
  }

  // Stop auto-updating
  stopAutoUpdate() {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
  }

  // Inject CSS styles for provider badges
  injectStyles() {
    if (document.getElementById('provider-status-ui-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'provider-status-ui-styles';
    styles.textContent = `
      /* Provider Badge Styles */
      .provider-badge {
        position: fixed;
        z-index: 10000;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        padding: 8px 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        transition: all 0.3s ease;
      }

      .provider-badge-top-right {
        top: 16px;
        right: 16px;
      }

      .provider-badge-top-left {
        top: 16px;
        left: 16px;
      }

      .provider-badge-bottom-right {
        bottom: 16px;
        right: 16px;
      }

      .provider-badge-bottom-left {
        bottom: 16px;
        left: 16px;
      }

      .provider-badge.compact {
        padding: 6px 10px;
        font-size: 12px;
      }

      .provider-badge-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .provider-icon {
        font-size: 16px;
      }

      .provider-name {
        font-weight: 600;
        color: #333;
      }

      .provider-status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
      }

      .provider-status-indicator.available {
        background: #4caf50;
        box-shadow: 0 0 4px rgba(76, 175, 80, 0.5);
      }

      .provider-status-indicator.unavailable {
        background: #f44336;
      }

      .provider-status-indicator.fallback {
        background: #ff9800;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .provider-download-progress {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #eee;
      }

      .progress-bar {
        width: 100%;
        height: 4px;
        background: #e0e0e0;
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 4px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        transition: width 0.3s ease;
      }

      .progress-text {
        font-size: 11px;
        color: #666;
      }

      /* Status Indicator Styles */
      .status-indicator {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 6px;
      }

      .status-indicator.status-available {
        background: #4caf50;
      }

      .status-indicator.status-downloading {
        background: #2196f3;
        animation: pulse 1.5s infinite;
      }

      .status-indicator.status-unavailable {
        background: #f44336;
      }

      .status-indicator.status-fallback {
        background: #ff9800;
      }

      /* Download Progress Bar Styles */
      .download-progress-container {
        background: white;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        margin: 12px 0;
      }

      .download-progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .download-label {
        font-weight: 600;
        color: #333;
        font-size: 14px;
      }

      .download-percentage {
        font-weight: 600;
        color: #667eea;
        font-size: 14px;
      }

      .download-progress-bar {
        width: 100%;
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .download-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        transition: width 0.3s ease;
        border-radius: 4px;
      }

      .download-progress-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .download-status {
        font-size: 12px;
        color: #666;
      }

      /* Provider Card Styles */
      .provider-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        margin: 12px 0;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .provider-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      }

      .provider-card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .provider-card-icon {
        font-size: 32px;
      }

      .provider-card-name {
        margin: 0;
        font-size: 20px;
        color: #333;
      }

      .provider-card-tagline {
        color: #666;
        margin: 0 0 16px 0;
        font-size: 14px;
      }

      .provider-card-benefits {
        list-style: none;
        padding: 0;
        margin: 0 0 16px 0;
      }

      .provider-card-benefits li {
        padding: 6px 0;
        color: #555;
        font-size: 14px;
      }

      .provider-card-features {
        border-top: 1px solid #eee;
        padding-top: 16px;
      }

      .provider-card-features h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #333;
      }

      .provider-card-features ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .provider-card-features li {
        padding: 4px 0;
        color: #666;
        font-size: 13px;
      }

      .provider-card-builtin {
        border-left: 4px solid #667eea;
      }

      .provider-card-cloud {
        border-left: 4px solid #4caf50;
      }
    `;

    document.head.appendChild(styles);
  }

  // Clean up
  destroy() {
    this.stopAutoUpdate();
    const styles = document.getElementById('provider-status-ui-styles');
    if (styles) styles.remove();
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProviderStatusUI;
}
