/**
 * AI Provider Manager
 * Central abstraction layer that routes AI requests to either Built-in AI or Cloud API
 * Handles provider selection, automatic fallback, and response normalization
 */

class AIProviderManager {
  constructor() {
    this.providers = new Map();
    this.activeProvider = null;
    this.settings = {
      preferredProvider: 'builtin', // 'builtin' or 'cloud'
      autoFallback: true,
      cloudAPIKey: null,
      lastUpdated: Date.now()
    };
    this.initialized = false;
  }

  /**
   * Initialize the provider manager
   * Loads settings and initializes providers
   */
  async initialize() {
    if (this.initialized) return;

    console.log('🚀 Initializing AI Provider Manager...');

    // Load settings from storage
    await this.loadSettings();

    // Import and register providers (will be implemented in next tasks)
    // For now, we'll set up the structure
    console.log('✅ AI Provider Manager initialized');
    console.log(`📍 Preferred provider: ${this.settings.preferredProvider}`);
    
    this.initialized = true;
  }

  /**
   * Register a provider
   * @param {string} name - Provider name ('builtin' or 'cloud')
   * @param {Object} provider - Provider instance
   */
  registerProvider(name, provider) {
    this.providers.set(name, provider);
    console.log(`✅ Registered provider: ${name}`);
  }

  /**
   * Set the active AI provider
   * @param {string} providerName - 'builtin' or 'cloud'
   */
  async setProvider(providerName) {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider '${providerName}' not registered`);
    }

    const provider = this.providers.get(providerName);
    
    // Check if provider is available
    const isAvailable = await provider.isAvailable();
    
    if (!isAvailable && this.settings.autoFallback) {
      console.warn(`⚠️ Provider '${providerName}' unavailable, attempting fallback...`);
      return await this.fallbackToAlternativeProvider(providerName);
    }

    if (!isAvailable) {
      throw new Error(`Provider '${providerName}' is not available`);
    }

    this.activeProvider = providerName;
    this.settings.preferredProvider = providerName;
    await this.saveSettings();

    console.log(`✅ Active provider set to: ${providerName}`);
    return { success: true, provider: providerName };
  }

  /**
   * Fallback to alternative provider
   * @param {string} failedProvider - The provider that failed
   */
  async fallbackToAlternativeProvider(failedProvider) {
    const alternativeProvider = failedProvider === 'builtin' ? 'cloud' : 'builtin';
    
    if (!this.providers.has(alternativeProvider)) {
      throw new Error('No alternative provider available');
    }

    const provider = this.providers.get(alternativeProvider);
    const isAvailable = await provider.isAvailable();

    if (!isAvailable) {
      throw new Error('Both providers are unavailable');
    }

    this.activeProvider = alternativeProvider;
    console.log(`✅ Fallback successful: Using ${alternativeProvider} provider`);
    
    return {
      success: true,
      provider: alternativeProvider,
      fallback: true,
      reason: `${failedProvider} provider unavailable`
    };
  }

  /**
   * Get the currently active provider
   */
  getActiveProvider() {
    return this.activeProvider;
  }

  /**
   * Get provider status for both providers
   */
  async getProviderStatus() {
    const status = {};

    for (const [name, provider] of this.providers) {
      const isAvailable = await provider.isAvailable();
      const providerName = provider.getName();
      
      status[name] = {
        name: providerName,
        available: isAvailable,
        active: this.activeProvider === name,
        features: await this.getProviderFeatures(provider)
      };
    }

    return status;
  }

  /**
   * Get features supported by a provider
   */
  async getProviderFeatures(provider) {
    // This will be implemented when providers are created
    return {
      grammar: true,
      translation: true,
      summarization: true,
      rewriting: true,
      generation: true,
      chat: true
    };
  }

  /**
   * Route request to active provider with automatic fallback
   */
  async routeRequest(method, ...args) {
    if (!this.activeProvider) {
      // Auto-select provider on first use
      await this.autoSelectProvider();
    }

    const provider = this.providers.get(this.activeProvider);
    
    try {
      const result = await provider[method](...args);
      return this.normalizeResponse(result, this.activeProvider, false);
    } catch (error) {
      console.error(`❌ Error with ${this.activeProvider} provider:`, error);

      // Attempt fallback if enabled
      if (this.settings.autoFallback) {
        console.log('🔄 Attempting automatic fallback...');
        
        try {
          const fallbackResult = await this.fallbackToAlternativeProvider(this.activeProvider);
          
          if (fallbackResult.success) {
            const fallbackProvider = this.providers.get(this.activeProvider);
            const result = await fallbackProvider[method](...args);
            return this.normalizeResponse(result, this.activeProvider, true);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback failed:', fallbackError);
          // If fallback fails, throw the original error instead of fallback error
          throw error;
        }
      }

      throw error;
    }
  }

  /**
   * Auto-select the best available provider
   */
  async autoSelectProvider() {
    // Try preferred provider first
    const preferredProvider = this.providers.get(this.settings.preferredProvider);
    if (preferredProvider) {
      const isAvailable = await preferredProvider.isAvailable();
      if (isAvailable) {
        this.activeProvider = this.settings.preferredProvider;
        console.log(`✅ Auto-selected preferred provider: ${this.activeProvider}`);
        return;
      } else {
        // Force use preferred provider even if not "available"
        // This allows Built-in AI to work even if models need downloading
        console.warn(`⚠️ Preferred provider ${this.settings.preferredProvider} not fully available, but using it anyway`);
        this.activeProvider = this.settings.preferredProvider;
        return;
      }
    }

    // Try alternative provider
    const alternativeProvider = this.settings.preferredProvider === 'builtin' ? 'cloud' : 'builtin';
    const altProvider = this.providers.get(alternativeProvider);
    if (altProvider) {
      const isAvailable = await altProvider.isAvailable();
      if (isAvailable) {
        this.activeProvider = alternativeProvider;
        console.log(`✅ Auto-selected fallback provider: ${this.activeProvider}`);
        return;
      } else {
        // Use alternative even if not available
        console.warn(`⚠️ Fallback provider ${alternativeProvider} not fully available, but using it anyway`);
        this.activeProvider = alternativeProvider;
        return;
      }
    }

    throw new Error('No providers registered');
  }

  /**
   * Normalize response from different providers to unified format
   */
  normalizeResponse(data, provider, fallback) {
    return {
      success: true,
      provider: provider,
      data: data,
      error: null,
      metadata: {
        processingTime: Date.now(),
        cached: false,
        fallback: fallback
      }
    };
  }

  // ==================== AI Operation Methods ====================

  /**
   * Check grammar and spelling
   */
  async checkGrammar(text, options = {}) {
    return await this.routeRequest('checkGrammar', text, options);
  }

  /**
   * Translate text
   */
  async translateText(text, sourceLang, targetLang, options = {}) {
    return await this.routeRequest('translateText', text, sourceLang, targetLang, options);
  }

  /**
   * Summarize content
   */
  async summarizeContent(content, options = {}) {
    return await this.routeRequest('summarizeContent', content, options);
  }

  /**
   * Summarize content with streaming
   */
  async summarizeContentStreaming(content, options = {}, onChunk) {
    return await this.routeRequest('summarizeContentStreaming', content, options, onChunk);
  }

  /**
   * Rewrite text
   */
  async rewriteText(text, options = {}) {
    return await this.routeRequest('rewriteText', text, options);
  }

  /**
   * Rewrite text with streaming
   */
  async rewriteTextStreaming(text, options = {}, onChunk) {
    return await this.routeRequest('rewriteTextStreaming', text, options, onChunk);
  }

  /**
   * Generate content
   */
  async generateContent(prompt, options = {}) {
    return await this.routeRequest('generateContent', prompt, options);
  }

  /**
   * Generate content with streaming
   */
  async generateContentStreaming(prompt, options = {}, onChunk) {
    return await this.routeRequest('generateContentStreaming', prompt, options, onChunk);
  }

  /**
   * Create a prompt session for chat
   */
  async createPromptSession(options = {}) {
    return await this.routeRequest('createPromptSession', options);
  }

  /**
   * Send a prompt to a session
   */
  async prompt(session, input, options = {}) {
    return await this.routeRequest('prompt', session, input, options);
  }

  /**
   * Send a prompt with streaming
   */
  async promptStreaming(session, input, options = {}, onChunk) {
    return await this.routeRequest('promptStreaming', session, input, options, onChunk);
  }

  // ==================== Settings Management ====================

  /**
   * Load settings from chrome.storage
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get('aiProviderSettings');
      if (result.aiProviderSettings) {
        this.settings = { ...this.settings, ...result.aiProviderSettings };
        console.log('✅ Settings loaded:', this.settings);
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  }

  /**
   * Save settings to chrome.storage
   */
  async saveSettings() {
    try {
      this.settings.lastUpdated = Date.now();
      await chrome.storage.local.set({ aiProviderSettings: this.settings });
      console.log('✅ Settings saved');
    } catch (error) {
      console.error('❌ Error saving settings:', error);
    }
  }

  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    
    // If provider preference changed, switch provider
    if (newSettings.preferredProvider && newSettings.preferredProvider !== this.activeProvider) {
      await this.setProvider(newSettings.preferredProvider);
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Get API status
   */
  async getAPIStatus() {
    return await this.getProviderStatus();
  }

  /**
   * Clear cache (will be implemented when cache is added)
   */
  clearCache() {
    console.log('🗑️ Cache cleared');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    for (const provider of this.providers.values()) {
      if (provider.cleanup) {
        provider.cleanup();
      }
    }
    console.log('🧹 AI Provider Manager cleaned up');
  }
}

// Create singleton instance
const aiProviderManager = new AIProviderManager();

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIProviderManager, aiProviderManager };
}
