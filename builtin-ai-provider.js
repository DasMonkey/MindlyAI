/**
 * Built-in AI Provider
 * Implements Chrome's Built-in AI APIs (Gemini Nano)
 * Handles Proofreader, Translator, Summarizer, Rewriter, Writer, and Prompt APIs
 */

class BuiltInAIProvider {
  constructor() {
    this.name = 'Built-in AI (Gemini Nano)';
    this.apiStatus = new Map();
    this.sessions = new Map();
    this.cache = new Map();
    this.downloadProgress = new Map();
  }

  /**
   * Initialize the provider
   */
  async initialize() {
    console.log('🤖 Initializing Built-in AI Provider...');
    await this.checkAllAPIs();
    console.log('✅ Built-in AI Provider initialized');
  }

  /**
   * Check if provider is available
   */
  async isAvailable() {
    // Check if at least one API is available
    await this.checkAllAPIs();

    for (const [apiName, status] of this.apiStatus) {
      if (status.availability === 'available' || status.availability === 'downloadable') {
        return true;
      }
    }

    return false;
  }

  /**
   * Get provider name
   */
  getName() {
    return this.name;
  }

  /**
   * Check all Built-in AI APIs availability
   */
  async checkAllAPIs() {
    const apis = [
      'Proofreader',
      'Translator',
      'Summarizer',
      'Rewriter',
      'Writer',
      'LanguageModel'
    ];

    for (const apiName of apis) {
      await this.checkAPIAvailability(apiName);
    }
  }

  /**
   * Check specific API availability
   */
  async checkAPIAvailability(apiName) {
    try {
      // Check if the API exists in the global scope
      if (!(apiName in self)) {
        this.apiStatus.set(apiName, {
          supported: false,
          availability: 'unavailable',
          lastChecked: Date.now(),
          error: `${apiName} API not supported in this Chrome version`
        });
        console.log(`📊 ${apiName} API: not found in global scope`);
        return;
      }

      const API = self[apiName];

      // Verify API has availability method
      if (typeof API.availability !== 'function') {
        this.apiStatus.set(apiName, {
          supported: false,
          availability: 'unavailable',
          lastChecked: Date.now(),
          error: `${apiName} API exists but has no availability() method`
        });
        console.log(`📊 ${apiName} API: exists but no availability() method`);
        return;
      }

      // Check availability status
      let availability;

      // Different APIs require different parameters for availability check
      if (apiName === 'Translator') {
        // Translator API requires language parameters
        availability = await API.availability({
          sourceLanguage: 'en',
          targetLanguage: 'es'
        });
      } else if (apiName === 'LanguageModel') {
        // LanguageModel (Prompt API) should specify output language
        availability = await API.availability({
          outputLanguage: 'en'
        });
      } else {
        // Other APIs don't need parameters
        availability = await API.availability();
      }

      console.log(`📊 ${apiName} API raw availability response:`, availability);

      // Map Chrome's availability values to our internal format
      let mappedAvailability = 'unavailable';
      if (availability === 'readily' || availability === 'available') {
        mappedAvailability = 'available';
      } else if (availability === 'after-download' || availability === 'downloadable') {
        mappedAvailability = 'downloadable';
      } else if (availability === 'downloading') {
        mappedAvailability = 'downloading';
      } else {
        mappedAvailability = 'unavailable';
      }

      this.apiStatus.set(apiName, {
        supported: true,
        availability: mappedAvailability,
        lastChecked: Date.now(),
        error: null
      });

      console.log(`📊 ${apiName} API: ${mappedAvailability} (raw: ${availability})`);
    } catch (error) {
      console.error(`❌ Error checking ${apiName}:`, error);
      this.apiStatus.set(apiName, {
        supported: false,
        availability: 'unavailable',
        lastChecked: Date.now(),
        error: error.message
      });
    }
  }

  /**
   * Check user activation (required for Built-in AI)
   * In Chrome extensions, we bypass this check since the user has already
   * performed an action (clicked extension button, context menu, etc.)
   */
  checkUserActivation() {
    // In extension contexts (sidepanel, background, content scripts),
    // user activation may not propagate correctly, but the user has
    // already performed an action to trigger the extension
    // So we always return true for extensions
    return true;

    // Original check (kept for reference):
    // if (!navigator.userActivation || !navigator.userActivation.isActive) {
    //   console.warn('⚠️ User activation required for Built-in AI');
    //   return false;
    // }
    // return true;
  }

  /**
   * Monitor download progress
   */
  monitorDownload(apiName) {
    return (monitor) => {
      monitor.addEventListener('downloadprogress', (e) => {
        const progress = e.loaded * 100;
        this.downloadProgress.set(apiName, {
          loaded: e.loaded,
          progress: progress,
          status: 'downloading'
        });
        console.log(`📥 ${apiName} download: ${progress.toFixed(1)}%`);
      });
    };
  }

  /**
   * Get API status
   */
  getAPIStatus() {
    const status = {};
    for (const [apiName, apiStatus] of this.apiStatus) {
      status[apiName] = apiStatus;
    }
    return status;
  }

  // ==================== Cache Management ====================

  /**
   * Get cached result
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 min TTL
      cached.hits++;
      return cached.result;
    }
    return null;
  }

  /**
   * Set cache
   */
  setCache(key, result) {
    this.cache.set(key, {
      result: result,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Generate cache key
   */
  getCacheKey(method, ...args) {
    return `builtin_${method}_${JSON.stringify(args)}`;
  }

  /**
   * Clear all cache
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cleared ${size} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    let totalHits = 0;
    let totalSize = 0;
    const entries = [];

    for (const [key, value] of this.cache) {
      totalHits += value.hits;
      totalSize += JSON.stringify(value.result).length;
      entries.push({
        key: key.substring(0, 50) + '...',
        hits: value.hits,
        age: Date.now() - value.timestamp,
        size: JSON.stringify(value.result).length
      });
    }

    return {
      totalEntries: this.cache.size,
      totalHits: totalHits,
      totalSize: totalSize,
      entries: entries.sort((a, b) => b.hits - a.hits).slice(0, 10) // Top 10
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.cache) {
      if (now - value.timestamp > 300000) { // 5 min TTL
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} expired cache entries`);
    }
  }

  // ==================== PROOFREADER API ====================

  /**
   * Check grammar and spelling
   * Can use either Proofreader API (for simple text) or Prompt API (for custom prompts)
   */
  async checkGrammar(textOrPrompt, options = {}) {
    const cacheKey = this.getCacheKey('checkGrammar', textOrPrompt);
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('📦 Using cached grammar check result');
      return cached;
    }

    try {
      // Check if input is a full prompt (contains instructions)
      const isFullPrompt = textOrPrompt.includes('JSON array') || textOrPrompt.includes('ANALYZE THIS TEXT');

      if (isFullPrompt) {
        // Use Prompt API for custom prompts
        return await this.checkGrammarWithPromptAPI(textOrPrompt, options);
      } else {
        // Use Proofreader API for simple text
        return await this.checkGrammarWithProofreader(textOrPrompt, options);
      }
    } catch (error) {
      console.error('❌ Grammar check error:', error);
      throw error;
    }
  }

  /**
   * Check grammar using Proofreader API (simple text)
   */
  async checkGrammarWithProofreader(text, options = {}) {
    try {
      // Check API availability
      const status = this.apiStatus.get('Proofreader');
      if (!status || status.availability === 'unavailable') {
        throw new Error('Proofreader API not available');
      }

      // Check user activation
      if (!this.checkUserActivation()) {
        throw new Error('User activation required');
      }

      // Create proofreader session
      const proofreader = await this.createProofreaderSession(options);

      // Proofread text
      const result = await proofreader.proofread(text);

      // Convert to unified format
      const corrections = this.formatProofreaderResult(result, text);

      // Cache result
      const cacheKey = this.getCacheKey('checkGrammar', text);
      this.setCache(cacheKey, corrections);

      return corrections;
    } catch (error) {
      console.error('❌ Proofreader error:', error);
      throw error;
    }
  }

  /**
   * Check grammar using Prompt API (custom prompts)
   */
  async checkGrammarWithPromptAPI(prompt, options = {}) {
    try {
      // Check Prompt API availability
      const status = this.apiStatus.get('LanguageModel');
      if (!status || status.availability === 'unavailable') {
        throw new Error('Prompt API not available');
      }

      // Check user activation
      if (!this.checkUserActivation()) {
        throw new Error('User activation required');
      }

      // Create a prompt session
      const promptWrapper = new PromptWrapper(this);
      const session = await promptWrapper.createSession({
        temperature: 0.3,  // Lower temperature for consistent grammar checks
        topK: 40
      });

      // Send the prompt
      const result = await promptWrapper.prompt(session, prompt, {});

      // Cache result
      const cacheKey = this.getCacheKey('checkGrammar', prompt);
      this.setCache(cacheKey, result);

      // Cleanup session
      promptWrapper.destroySession(session.id);

      return result;
    } catch (error) {
      console.error('❌ Prompt API grammar check error:', error);
      throw error;
    }
  }

  /**
   * Create Proofreader session
   */
  async createProofreaderSession(options = {}) {
    const sessionKey = 'proofreader';

    // Reuse existing session if available
    if (this.sessions.has(sessionKey)) {
      return this.sessions.get(sessionKey);
    }

    const config = {
      outputLanguage: 'en', // Required to suppress warnings
      monitor: this.monitorDownload('Proofreader')
    };

    // Use LanguageModel for proofreading (Proofreader API uses LanguageModel)
    const proofreader = await self.LanguageModel.create(config);
    this.sessions.set(sessionKey, proofreader);

    return proofreader;
  }

  /**
   * Format Proofreader API result to unified format
   */
  formatProofreaderResult(apiResult, originalText) {
    if (!apiResult || !apiResult.corrections) {
      return [];
    }

    return apiResult.corrections.map(correction => ({
      error: originalText.substring(correction.startIndex, correction.endIndex),
      correction: correction.correction,
      type: correction.type || 'grammar',
      message: correction.explanation || 'Suggested correction',
      startIndex: correction.startIndex,
      endIndex: correction.endIndex
    }));
  }


  // ==================== TRANSLATOR API ====================

  /**
   * Translate text using Translator API
   */
  async translateText(text, sourceLang, targetLang, options = {}) {
    const cacheKey = this.getCacheKey('translateText', text, sourceLang, targetLang);
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('📦 Using cached translation result');
      return cached;
    }

    try {
      // Check API availability
      const status = this.apiStatus.get('Translator');
      if (!status || status.availability === 'unavailable') {
        throw new Error('Translator API not available');
      }

      // Check user activation
      if (!this.checkUserActivation()) {
        throw new Error('User activation required');
      }

      // Create translator session
      const translator = await this.createTranslatorSession(sourceLang, targetLang, options);

      // Translate
      const translation = await translator.translate(text);

      // Cache result
      this.setCache(cacheKey, translation);

      return translation;
    } catch (error) {
      console.error('❌ Translator error:', error);
      throw error;
    }
  }

  /**
   * Create Translator session
   */
  async createTranslatorSession(sourceLang, targetLang, options = {}) {
    const sessionKey = `translator_${sourceLang}_${targetLang}`;

    // Reuse existing session if available
    if (this.sessions.has(sessionKey)) {
      return this.sessions.get(sessionKey);
    }

    const config = {
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      monitor: this.monitorDownload('Translator')
    };

    const translator = await self.Translator.create(config);
    this.sessions.set(sessionKey, translator);

    return translator;
  }


  // ==================== SUMMARIZER API ====================

  /**
   * Summarize content using Summarizer API
   */
  async summarizeContent(content, options = {}) {
    const cacheKey = this.getCacheKey('summarizeContent', content, options);
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('📦 Using cached summary result');
      return cached;
    }

    try {
      const status = this.apiStatus.get('Summarizer');
      if (!status || status.availability === 'unavailable') {
        throw new Error('Summarizer API not available');
      }

      if (!this.checkUserActivation()) {
        throw new Error('User activation required');
      }

      const summarizer = await this.createSummarizerSession(options);
      const summary = await summarizer.summarize(content, {
        context: options.context
      });

      this.setCache(cacheKey, summary);
      return summary;
    } catch (error) {
      console.error('❌ Summarizer error:', error);
      throw error;
    }
  }

  /**
   * Summarize content with streaming
   */
  async summarizeContentStreaming(content, options = {}, onChunk) {
    try {
      const status = this.apiStatus.get('Summarizer');
      if (!status || status.availability === 'unavailable') {
        throw new Error('Summarizer API not available');
      }

      if (!this.checkUserActivation()) {
        throw new Error('User activation required');
      }

      const summarizer = await this.createSummarizerSession(options);
      const stream = summarizer.summarizeStreaming(content, {
        context: options.context
      });

      let fullSummary = '';
      for await (const chunk of stream) {
        fullSummary += chunk;
        if (onChunk) {
          onChunk(fullSummary);
        }
      }

      return fullSummary;
    } catch (error) {
      console.error('❌ Summarizer streaming error:', error);
      throw error;
    }
  }

  /**
   * Create Summarizer session
   */
  async createSummarizerSession(options = {}) {
    const config = {
      type: options.type || 'key-points',
      format: options.format || 'markdown',
      length: options.length || 'medium',
      sharedContext: options.sharedContext,
      monitor: this.monitorDownload('Summarizer')
    };

    const sessionKey = `summarizer_${JSON.stringify(config)}`;

    if (this.sessions.has(sessionKey)) {
      return this.sessions.get(sessionKey);
    }

    const summarizer = await self.Summarizer.create(config);
    this.sessions.set(sessionKey, summarizer);

    return summarizer;
  }

  // ==================== REWRITER API ====================

  /**
   * Rewrite text using Rewriter API
   */
  async rewriteText(text, options = {}) {
    const cacheKey = this.getCacheKey('rewriteText', text, options);
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('📦 Using cached rewrite result');
      return cached;
    }

    try {
      const status = this.apiStatus.get('Rewriter');
      if (!status || status.availability === 'unavailable') {
        throw new Error('Rewriter API not available');
      }

      if (!this.checkUserActivation()) {
        throw new Error('User activation required');
      }

      const rewriter = await this.createRewriterSession(options);
      const result = await rewriter.rewrite(text, {
        context: options.context,
        tone: options.tone
      });

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('❌ Rewriter error:', error);
      throw error;
    }
  }

  /**
   * Rewrite text with streaming
   */
  async rewriteTextStreaming(text, options = {}, onChunk) {
    try {
      const status = this.apiStatus.get('Rewriter');
      if (!status || status.availability === 'unavailable') {
        throw new Error('Rewriter API not available');
      }

      if (!this.checkUserActivation()) {
        throw new Error('User activation required');
      }

      const rewriter = await this.createRewriterSession(options);
      const stream = rewriter.rewriteStreaming(text, {
        context: options.context,
        tone: options.tone
      });

      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        if (onChunk) {
          onChunk(fullText);
        }
      }

      return fullText;
    } catch (error) {
      console.error('❌ Rewriter streaming error:', error);
      throw error;
    }
  }

  /**
   * Create Rewriter session
   */
  async createRewriterSession(options = {}) {
    const config = {
      tone: options.tone || 'as-is',
      format: options.format || 'markdown',
      length: options.length || 'as-is',
      sharedContext: options.sharedContext,
      monitor: this.monitorDownload('Rewriter')
    };

    const sessionKey = `rewriter_${JSON.stringify(config)}`;

    if (this.sessions.has(sessionKey)) {
      return this.sessions.get(sessionKey);
    }

    const rewriter = await self.Rewriter.create(config);
    this.sessions.set(sessionKey, rewriter);

    return rewriter;
  }

  // ==================== WRITER API ====================

  /**
   * Generate content using Prompt API (LanguageModel)
   * Note: Writer API requires Origin Trial, so we use Prompt API instead
   */
  async generateContent(prompt, options = {}) {
    try {
      // Use Prompt API for content generation
      const promptWrapper = new PromptWrapper(this);
      const session = await promptWrapper.createSession({
        temperature: options.temperature || 1.0,
        topK: options.topK || 40,
        outputLanguage: options.outputLanguage || 'en' // Required to suppress warnings
      });

      const result = await promptWrapper.prompt(session, prompt, options);

      // Cleanup session
      promptWrapper.destroySession(session.id);

      return result;
    } catch (error) {
      console.error('❌ Content generation error:', error);
      console.error('❌ Error type:', error.constructor.name);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Prompt length:', prompt?.length, 'chars');
      throw error;
    }
  }

  /**
   * Generate content with streaming using Prompt API
   */
  async generateContentStreaming(prompt, options = {}, onChunk) {
    try {
      // Use Prompt API for streaming content generation
      const promptWrapper = new PromptWrapper(this);
      const session = await promptWrapper.createSession({
        temperature: options.temperature || 1.0,
        topK: options.topK || 40
      });

      const result = await promptWrapper.promptStreaming(session, prompt, options, onChunk);

      // Cleanup session
      promptWrapper.destroySession(session.id);

      return result;
    } catch (error) {
      console.error('❌ Streaming content generation error:', error);
      throw error;
    }
  }

  // ==================== PROMPT API (LanguageModel) ====================

  /**
   * Create a prompt session for advanced prompting
   */
  async createPromptSession(options = {}) {
    try {
      const promptWrapper = new PromptWrapper(this);
      return await promptWrapper.createSession(options);
    } catch (error) {
      console.error('❌ Prompt session creation error:', error);
      throw error;
    }
  }

  /**
   * Create a multimodal prompt session (supports images and audio)
   */
  async createMultimodalPromptSession(options = {}) {
    try {
      const promptWrapper = new PromptWrapper(this);
      return await promptWrapper.createMultimodalSession(options);
    } catch (error) {
      console.error('❌ Multimodal prompt session creation error:', error);
      throw error;
    }
  }

  /**
   * Send a prompt to a session
   */
  async prompt(sessionData, input, options = {}) {
    try {
      const promptWrapper = new PromptWrapper(this);
      return await promptWrapper.prompt(sessionData, input, options);
    } catch (error) {
      console.error('❌ Prompt error:', error);
      throw error;
    }
  }

  /**
   * Send a prompt with streaming
   */
  async promptStreaming(sessionData, input, options = {}, onChunk) {
    try {
      const promptWrapper = new PromptWrapper(this);
      return await promptWrapper.promptStreaming(sessionData, input, options, onChunk);
    } catch (error) {
      console.error('❌ Prompt streaming error:', error);
      throw error;
    }
  }

  /**
   * Send a prompt with image input
   */
  async promptWithImage(sessionData, text, imageInput, options = {}) {
    try {
      const promptWrapper = new PromptWrapper(this);
      return await promptWrapper.promptWithImage(sessionData, text, imageInput, options);
    } catch (error) {
      console.error('❌ Prompt with image error:', error);
      throw error;
    }
  }

  /**
   * Send a prompt with image input (streaming)
   */
  async promptWithImageStreaming(sessionData, text, imageInput, options = {}, onChunk) {
    try {
      const promptWrapper = new PromptWrapper(this);
      return await promptWrapper.promptWithImageStreaming(sessionData, text, imageInput, options, onChunk);
    } catch (error) {
      console.error('❌ Prompt with image streaming error:', error);
      throw error;
    }
  }

  /**
   * Send a prompt with audio input
   */
  async promptWithAudio(sessionData, text, audioInput, options = {}) {
    try {
      const promptWrapper = new PromptWrapper(this);
      return await promptWrapper.promptWithAudio(sessionData, text, audioInput, options);
    } catch (error) {
      console.error('❌ Prompt with audio error:', error);
      throw error;
    }
  }

  // ==================== Cleanup ====================

  /**
   * Cleanup resources
   */
  cleanup() {
    // Destroy all sessions
    for (const session of this.sessions.values()) {
      if (session && session.destroy) {
        session.destroy();
      }
    }
    this.sessions.clear();
    this.cache.clear();
    console.log('🧹 Built-in AI Provider cleaned up');
  }
}

/**
 * WriterWrapper Class
 * Handles original content generation using the Writer API
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */
class WriterWrapper {
  constructor(provider) {
    this.provider = provider;
  }

  /**
   * Check Writer API availability
   * Requirements: 10.1
   */
  async checkAvailability() {
    try {
      // Check if API exists in browser
      if (!('Writer' in self)) {
        return {
          supported: false,
          availability: 'unavailable',
          error: 'Writer API not supported in this Chrome version'
        };
      }

      // Check availability status
      const availability = await self.Writer.availability();

      return {
        supported: true,
        availability: availability,
        error: null
      };
    } catch (error) {
      return {
        supported: false,
        availability: 'unavailable',
        error: error.message
      };
    }
  }

  /**
   * Create Writer session with tone, format, length options
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   */
  async createSession(options = {}) {
    // Build configuration with all supported options
    const config = {
      // Tone options: 'formal', 'neutral', 'casual'
      tone: options.tone || 'neutral',

      // Format options: 'markdown', 'plain-text'
      format: options.format || 'markdown',

      // Length options: 'short', 'medium', 'long'
      length: options.length || 'medium',

      // Language configuration
      expectedInputLanguages: options.expectedInputLanguages,
      expectedContextLanguages: options.expectedContextLanguages,
      outputLanguage: options.outputLanguage,

      // Shared context for consistent multi-output generation
      sharedContext: options.sharedContext,

      // Download progress monitoring
      monitor: this.provider.monitorDownload('Writer')
    };

    // Generate session key for caching
    const sessionKey = `writer_${JSON.stringify(config)}`;

    // Reuse existing session if available
    if (this.provider.sessions.has(sessionKey)) {
      console.log('♻️ Reusing existing Writer session');
      return this.provider.sessions.get(sessionKey);
    }

    // Create new session
    console.log('🆕 Creating new Writer session with config:', config);
    const writer = await self.Writer.create(config);

    // Cache session for reuse
    this.provider.sessions.set(sessionKey, writer);

    return writer;
  }

  /**
   * Generate content using Writer.write()
   * Requirements: 10.1, 10.6
   */
  async write(prompt, options = {}) {
    try {
      // Check API availability
      const status = this.provider.apiStatus.get('Writer');
      if (!status || status.availability === 'unavailable') {
        throw new Error('Writer API not available');
      }

      // Check user activation
      if (!this.provider.checkUserActivation()) {
        throw new Error('User activation required for Writer API');
      }

      // Create or reuse session
      const writer = await this.createSession(options);

      // Generate content with optional per-request context
      const result = await writer.write(prompt, {
        context: options.context
      });

      console.log('✅ Content generated successfully');
      return result;
    } catch (error) {
      console.error('❌ Writer.write() error:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Generate content with streaming using Writer.writeStreaming()
   * Requirements: 10.1, 10.6
   */
  async writeStreaming(prompt, options = {}, onChunk) {
    try {
      // Check API availability
      const status = this.provider.apiStatus.get('Writer');
      if (!status || status.availability === 'unavailable') {
        throw new Error('Writer API not available');
      }

      // Check user activation
      if (!this.provider.checkUserActivation()) {
        throw new Error('User activation required for Writer API');
      }

      // Create or reuse session
      const writer = await this.createSession(options);

      // Generate content with streaming
      const stream = writer.writeStreaming(prompt, {
        context: options.context
      });

      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        if (onChunk) {
          onChunk(fullText);
        }
      }

      console.log('✅ Streaming content generation completed');
      return fullText;
    } catch (error) {
      console.error('❌ Writer.writeStreaming() error:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Handle Writer API errors
   * Requirements: 10.7, 14.1, 14.2, 14.3, 14.4, 14.5
   */
  handleError(error) {
    // Classify error type
    let errorType = 'unknown';
    let userMessage = 'An error occurred during content generation';

    if (error.message.includes('not available')) {
      errorType = 'api_unavailable';
      userMessage = 'Writer API is not available. Please try using Cloud API instead.';
    } else if (error.message.includes('User activation required')) {
      errorType = 'user_activation_required';
      userMessage = 'Please click to activate content generation.';
    } else if (error.message.includes('download')) {
      errorType = 'download_failed';
      userMessage = 'Failed to download Writer model. Please try again or use Cloud API.';
    } else if (error.message.includes('session')) {
      errorType = 'session_creation_failed';
      userMessage = 'Failed to create Writer session. Please try again.';
    } else if (error.message.includes('streaming')) {
      errorType = 'streaming_error';
      userMessage = 'Streaming generation failed. Please try again.';
    } else if (error.message.includes('generation')) {
      errorType = 'generation_failed';
      userMessage = 'Content generation failed. Please try again.';
    }

    // Log error details for debugging
    console.error(`[WriterWrapper] Error type: ${errorType}`, {
      message: error.message,
      stack: error.stack
    });

    // Store error info for UI display
    error.errorType = errorType;
    error.userMessage = userMessage;

    return {
      errorType,
      userMessage,
      originalError: error
    };
  }
}

/**
 * PromptWrapper Class
 * Handles advanced prompting using the Prompt API (LanguageModel)
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 5.1, 5.2, 5.3, 5.4, 14.1, 14.2, 14.3, 14.4, 14.5
 */
class PromptWrapper {
  constructor(provider) {
    this.provider = provider;
  }

  /**
   * Check Prompt API (LanguageModel) availability
   * Requirements: 11.1
   */
  async checkAvailability() {
    try {
      // Check if API exists in browser
      if (!('LanguageModel' in self)) {
        return {
          supported: false,
          availability: 'unavailable',
          error: 'Prompt API (LanguageModel) not supported in this Chrome version'
        };
      }

      // Check availability status
      const availability = await self.LanguageModel.availability({
        outputLanguage: 'en'
      });

      return {
        supported: true,
        availability: availability,
        error: null
      };
    } catch (error) {
      return {
        supported: false,
        availability: 'unavailable',
        error: error.message
      };
    }
  }

  /**
   * Get model parameters (temperature, topK)
   * Requirements: 11.2
   */
  async getModelParams() {
    try {
      // Check if API exists
      if (!('LanguageModel' in self)) {
        throw new Error('Prompt API (LanguageModel) not supported');
      }

      // Get model parameters
      const params = await self.LanguageModel.params();

      return {
        maxTemperature: params.maxTemperature || 2.0,
        maxTopK: params.maxTopK || 128,
        defaultTemperature: params.defaultTemperature || 1.0,
        defaultTopK: params.defaultTopK || 3
      };
    } catch (error) {
      console.error('❌ Error getting model parameters:', error);
      return {
        maxTemperature: 2.0,
        maxTopK: 128,
        defaultTemperature: 1.0,
        defaultTopK: 3
      };
    }
  }

  /**
   * Create Prompt session with configurable parameters
   * Requirements: 11.1, 11.2, 11.3, 11.6, 11.8, 5.1, 5.2, 5.3, 5.4
   */
  async createSession(options = {}) {
    try {
      // Check API availability
      const status = this.provider.apiStatus.get('LanguageModel');
      if (!status || status.availability === 'unavailable') {
        throw new Error('Prompt API (LanguageModel) not available');
      }

      // Check user activation (required for Built-in AI)
      // Requirements: 5.1, 5.2, 5.3, 5.4
      if (!this.provider.checkUserActivation()) {
        throw new Error('User activation required for Prompt API');
      }

      // Get model parameters to validate configuration
      const modelParams = await this.getModelParams();

      // Build configuration with validated parameters
      const config = {
        // Temperature: controls randomness (0.0 to maxTemperature)
        temperature: options.temperature !== undefined
          ? Math.min(options.temperature, modelParams.maxTemperature)
          : modelParams.defaultTemperature,

        // TopK: controls diversity (1 to maxTopK)
        topK: options.topK !== undefined
          ? Math.min(options.topK, modelParams.maxTopK)
          : modelParams.defaultTopK,

        // Output language (required to suppress warnings)
        outputLanguage: options.outputLanguage || 'en',

        // Download progress monitoring
        monitor: this.provider.monitorDownload('LanguageModel')
      };

      // Create new session
      console.log('🆕 Creating new Prompt session with config:', config);
      const session = await self.LanguageModel.create(config);

      // Generate unique session ID
      const sessionId = `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store session for lifecycle management
      this.provider.sessions.set(sessionId, {
        instance: session,
        config: config,
        created: Date.now(),
        lastUsed: Date.now(),
        usageCount: 0,
        history: [] // Chat history for conversational context
      });

      console.log('✅ Prompt session created successfully:', sessionId);

      return {
        id: sessionId,
        session: session,
        config: config
      };
    } catch (error) {
      console.error('❌ Prompt session creation error:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Send a prompt to a session (batch prompting)
   * Requirements: 11.1, 11.7
   */
  async prompt(sessionData, input, options = {}) {
    try {
      // Get session instance
      const sessionInfo = this.provider.sessions.get(sessionData.id);
      if (!sessionInfo) {
        throw new Error('Invalid or expired session');
      }

      const session = sessionData.session || sessionInfo.instance;
      if (!session) {
        throw new Error('Session instance not found');
      }

      // Update session usage
      sessionInfo.lastUsed = Date.now();
      sessionInfo.usageCount++;

      // Build prompt options
      const promptOptions = {
        // AbortController support for cancellation
        signal: options.signal,

        // JSON schema for structured output
        responseConstraint: options.responseConstraint,

        // Omit constraint from input
        omitResponseConstraintInput: options.omitResponseConstraintInput
      };

      console.log('💬 Sending prompt to session:', sessionData.id);

      // Send prompt
      const result = await session.prompt(input, promptOptions);

      // Add to chat history
      sessionInfo.history.push({
        role: 'user',
        content: input,
        timestamp: Date.now()
      });
      sessionInfo.history.push({
        role: 'assistant',
        content: result,
        timestamp: Date.now()
      });

      // Parse JSON if responseConstraint was used
      if (options.responseConstraint) {
        try {
          const parsed = JSON.parse(result);
          console.log('✅ Structured JSON response parsed successfully');
          return parsed;
        } catch (parseError) {
          console.warn('⚠️ Failed to parse JSON response, returning raw text');
          return result;
        }
      }

      console.log('✅ Prompt completed successfully');
      return result;
    } catch (error) {
      console.error('❌ Prompt error:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Send a prompt with streaming
   * Requirements: 11.1, 11.7
   */
  async promptStreaming(sessionData, input, options = {}, onChunk) {
    try {
      // Get session instance
      const sessionInfo = this.provider.sessions.get(sessionData.id);
      if (!sessionInfo) {
        throw new Error('Invalid or expired session');
      }

      const session = sessionData.session || sessionInfo.instance;
      if (!session) {
        throw new Error('Session instance not found');
      }

      // Update session usage
      sessionInfo.lastUsed = Date.now();
      sessionInfo.usageCount++;

      // Build prompt options with AbortController support
      const promptOptions = {
        signal: options.signal
      };

      console.log('💬 Sending streaming prompt to session:', sessionData.id);

      // Send streaming prompt
      const stream = session.promptStreaming(input, promptOptions);

      let fullResponse = '';
      try {
        for await (const chunk of stream) {
          fullResponse += chunk;
          if (onChunk) {
            onChunk(fullResponse);
          }
        }
      } catch (streamError) {
        // Handle cancellation gracefully
        if (streamError.name === 'AbortError') {
          console.log('⚠️ Prompt streaming cancelled by user');
          throw new Error('Prompt cancelled');
        }
        throw streamError;
      }

      // Add to chat history
      sessionInfo.history.push({
        role: 'user',
        content: input,
        timestamp: Date.now()
      });
      sessionInfo.history.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now()
      });

      console.log('✅ Streaming prompt completed successfully');
      return fullResponse;
    } catch (error) {
      console.error('❌ Prompt streaming error:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Destroy a session and cleanup resources
   * Requirements: 11.6, 11.8
   */
  destroySession(sessionId) {
    try {
      const sessionInfo = this.provider.sessions.get(sessionId);
      if (!sessionInfo) {
        console.warn('⚠️ Session not found:', sessionId);
        return;
      }

      // Destroy the session instance
      if (sessionInfo.instance && sessionInfo.instance.destroy) {
        sessionInfo.instance.destroy();
      }

      // Remove from sessions map
      this.provider.sessions.delete(sessionId);

      console.log('🧹 Session destroyed:', sessionId);
    } catch (error) {
      console.error('❌ Error destroying session:', error);
    }
  }

  /**
   * Get chat history for a session
   * Requirements: 11.8
   */
  getChatHistory(sessionId) {
    const sessionInfo = this.provider.sessions.get(sessionId);
    if (!sessionInfo) {
      return [];
    }
    return sessionInfo.history || [];
  }

  /**
   * Clear chat history for a session
   * Requirements: 11.8
   */
  clearChatHistory(sessionId) {
    const sessionInfo = this.provider.sessions.get(sessionId);
    if (sessionInfo) {
      sessionInfo.history = [];
      console.log('🧹 Chat history cleared for session:', sessionId);
    }
  }

  // ==================== MULTIMODAL SUPPORT ====================

  /**
   * Create session with multimodal support (images, audio)
   * Requirements: 11.4
   */
  async createMultimodalSession(options = {}) {
    try {
      // Check API availability
      const status = this.provider.apiStatus.get('LanguageModel');
      if (!status || status.availability === 'unavailable') {
        throw new Error('Prompt API (LanguageModel) not available');
      }

      // Check user activation
      if (!this.provider.checkUserActivation()) {
        throw new Error('User activation required for Prompt API');
      }

      // Get model parameters
      const modelParams = await this.getModelParams();

      // Build configuration with multimodal support
      const config = {
        // Temperature and topK parameters
        temperature: options.temperature !== undefined
          ? Math.min(options.temperature, modelParams.maxTemperature)
          : modelParams.defaultTemperature,
        topK: options.topK !== undefined
          ? Math.min(options.topK, modelParams.maxTopK)
          : modelParams.defaultTopK,

        // Expected inputs - support text, image, and audio
        expectedInputs: options.expectedInputs || [
          { type: 'text' },
          { type: 'image' }
        ],

        // Expected outputs
        expectedOutputs: options.expectedOutputs || [
          { type: 'text' }
        ],

        // Initial prompts for context
        initialPrompts: options.initialPrompts || [],

        // Output language (required to suppress warnings)
        outputLanguage: options.outputLanguage || 'en',

        // Download progress monitoring
        monitor: this.provider.monitorDownload('LanguageModel')
      };

      console.log('🆕 Creating multimodal Prompt session with config:', config);
      const session = await self.LanguageModel.create(config);

      // Generate unique session ID
      const sessionId = `prompt_multimodal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store session for lifecycle management
      this.provider.sessions.set(sessionId, {
        instance: session,
        config: config,
        created: Date.now(),
        lastUsed: Date.now(),
        usageCount: 0,
        history: [],
        multimodal: true
      });

      console.log('✅ Multimodal Prompt session created successfully:', sessionId);

      return {
        id: sessionId,
        session: session,
        config: config
      };
    } catch (error) {
      console.error('❌ Multimodal session creation error:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Convert File object to format suitable for Prompt API
   * Requirements: 11.4
   */
  async convertFileToPromptFormat(file) {
    try {
      // For images and audio, the Prompt API accepts File objects directly
      // No conversion needed - just validate the file type
      const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      const validAudioTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];

      if (validImageTypes.includes(file.type)) {
        console.log('✅ Valid image file:', file.type);
        return { type: 'image', value: file };
      } else if (validAudioTypes.includes(file.type)) {
        console.log('✅ Valid audio file:', file.type);
        return { type: 'audio', value: file };
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }
    } catch (error) {
      console.error('❌ File conversion error:', error);
      throw error;
    }
  }

  /**
   * Convert image URL to File object for Prompt API
   * Requirements: 11.4
   */
  async convertImageUrlToFile(imageUrl) {
    try {
      console.log('📥 Fetching image from URL:', imageUrl);

      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      // Get the blob
      const blob = await response.blob();

      // Determine file type from blob or URL
      let mimeType = blob.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        // Try to infer from URL extension
        const ext = imageUrl.split('.').pop().toLowerCase().split('?')[0];
        const mimeTypes = {
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'webp': 'image/webp'
        };
        mimeType = mimeTypes[ext] || 'image/png';
      }

      // Create File object from blob
      const fileName = imageUrl.split('/').pop().split('?')[0] || 'image.png';
      const file = new File([blob], fileName, { type: mimeType });

      console.log('✅ Image converted to File:', file.name, file.type, file.size, 'bytes');

      return file;
    } catch (error) {
      console.error('❌ Image URL conversion error:', error);
      throw error;
    }
  }

  /**
   * Prompt with image input
   * Requirements: 11.4
   */
  async promptWithImage(sessionData, text, imageInput, options = {}) {
    try {
      // Get session instance
      const sessionInfo = this.provider.sessions.get(sessionData.id);
      if (!sessionInfo) {
        throw new Error('Invalid or expired session');
      }

      const session = sessionData.session || sessionInfo.instance;
      if (!session) {
        throw new Error('Session instance not found');
      }

      // Update session usage
      sessionInfo.lastUsed = Date.now();
      sessionInfo.usageCount++;

      // Convert image input to File if it's a URL
      let imageFile;
      if (typeof imageInput === 'string') {
        imageFile = await this.convertImageUrlToFile(imageInput);
      } else if (imageInput instanceof File || imageInput instanceof Blob) {
        imageFile = imageInput;
      } else {
        throw new Error('Invalid image input: must be URL, File, or Blob');
      }

      // Build multimodal content array
      const content = [
        { type: 'text', value: text },
        { type: 'image', value: imageFile }
      ];

      console.log('💬 Sending multimodal prompt with image to session:', sessionData.id);

      // Use append() to add the multimodal message to the session
      await session.append([
        {
          role: 'user',
          content: content
        }
      ]);

      // Then prompt for the response
      const result = await session.prompt(options.followUpPrompt || '', {
        signal: options.signal
      });

      // Add to chat history
      sessionInfo.history.push({
        role: 'user',
        content: content,
        timestamp: Date.now()
      });
      sessionInfo.history.push({
        role: 'assistant',
        content: result,
        timestamp: Date.now()
      });

      console.log('✅ Multimodal prompt with image completed successfully');
      return result;
    } catch (error) {
      console.error('❌ Prompt with image error:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Prompt with image input (streaming)
   * Requirements: 11.4
   */
  async promptWithImageStreaming(sessionData, text, imageInput, options = {}, onChunk) {
    try {
      // Get session instance
      const sessionInfo = this.provider.sessions.get(sessionData.id);
      if (!sessionInfo) {
        throw new Error('Invalid or expired session');
      }

      const session = sessionData.session || sessionInfo.instance;
      if (!session) {
        throw new Error('Session instance not found');
      }

      // Update session usage
      sessionInfo.lastUsed = Date.now();
      sessionInfo.usageCount++;

      // Convert image input to File if it's a URL
      let imageFile;
      if (typeof imageInput === 'string') {
        imageFile = await this.convertImageUrlToFile(imageInput);
      } else if (imageInput instanceof File || imageInput instanceof Blob) {
        imageFile = imageInput;
      } else {
        throw new Error('Invalid image input: must be URL, File, or Blob');
      }

      // Build multimodal content array
      const content = [
        { type: 'text', value: text },
        { type: 'image', value: imageFile }
      ];

      console.log('💬 Sending streaming multimodal prompt with image to session:', sessionData.id);

      // Use append() to add the multimodal message to the session
      await session.append([
        {
          role: 'user',
          content: content
        }
      ]);

      // Then prompt for streaming response
      const stream = session.promptStreaming(options.followUpPrompt || '', {
        signal: options.signal
      });

      let fullResponse = '';
      try {
        for await (const chunk of stream) {
          fullResponse += chunk;
          if (onChunk) {
            onChunk(fullResponse);
          }
        }
      } catch (streamError) {
        if (streamError.name === 'AbortError') {
          console.log('⚠️ Streaming cancelled by user');
          throw new Error('Prompt cancelled');
        }
        throw streamError;
      }

      // Add to chat history
      sessionInfo.history.push({
        role: 'user',
        content: content,
        timestamp: Date.now()
      });
      sessionInfo.history.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now()
      });

      console.log('✅ Streaming multimodal prompt with image completed successfully');
      return fullResponse;
    } catch (error) {
      console.error('❌ Streaming prompt with image error:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Prompt with audio input
   * Requirements: 11.4
   */
  async promptWithAudio(sessionData, text, audioInput, options = {}) {
    try {
      // Get session instance
      const sessionInfo = this.provider.sessions.get(sessionData.id);
      if (!sessionInfo) {
        throw new Error('Invalid or expired session');
      }

      const session = sessionData.session || sessionInfo.instance;
      if (!session) {
        throw new Error('Session instance not found');
      }

      // Update session usage
      sessionInfo.lastUsed = Date.now();
      sessionInfo.usageCount++;

      // Validate audio input
      let audioFile;
      if (audioInput instanceof File || audioInput instanceof Blob) {
        audioFile = audioInput;
      } else {
        throw new Error('Invalid audio input: must be File or Blob');
      }

      // Build multimodal content array
      const content = [
        { type: 'text', value: text },
        { type: 'audio', value: audioFile }
      ];

      console.log('💬 Sending multimodal prompt with audio to session:', sessionData.id);

      // Use append() to add the multimodal message to the session
      await session.append([
        {
          role: 'user',
          content: content
        }
      ]);

      // Then prompt for the response
      const result = await session.prompt(options.followUpPrompt || '', {
        signal: options.signal
      });

      // Add to chat history
      sessionInfo.history.push({
        role: 'user',
        content: content,
        timestamp: Date.now()
      });
      sessionInfo.history.push({
        role: 'assistant',
        content: result,
        timestamp: Date.now()
      });

      console.log('✅ Multimodal prompt with audio completed successfully');
      return result;
    } catch (error) {
      console.error('❌ Prompt with audio error:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Handle Prompt API errors
   * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
   */
  handleError(error) {
    // Classify error type
    let errorType = 'unknown';
    let userMessage = 'An error occurred during prompting';

    if (error.message.includes('not available')) {
      errorType = 'api_unavailable';
      userMessage = 'Prompt API is not available. Please try using Cloud API instead.';
    } else if (error.message.includes('User activation required')) {
      errorType = 'user_activation_required';
      userMessage = 'Please click to activate the Prompt API.';
    } else if (error.message.includes('download')) {
      errorType = 'download_failed';
      userMessage = 'Failed to download Language Model. Please try again or use Cloud API.';
    } else if (error.message.includes('session')) {
      errorType = 'session_creation_failed';
      userMessage = 'Failed to create Prompt session. Please try again.';
    } else if (error.message.includes('Invalid or expired session')) {
      errorType = 'invalid_session';
      userMessage = 'Session is invalid or expired. Please create a new session.';
    } else if (error.message.includes('cancelled')) {
      errorType = 'cancelled';
      userMessage = 'Prompt was cancelled.';
    } else if (error.message.includes('AbortError') || error.name === 'AbortError') {
      errorType = 'cancelled';
      userMessage = 'Prompt was cancelled by user.';
    } else if (error.message.includes('prompt')) {
      errorType = 'prompt_execution_failed';
      userMessage = 'Prompt execution failed. Please try again.';
    }

    // Log error details for debugging
    console.error(`[PromptWrapper] Error type: ${errorType}`, {
      message: error.message,
      stack: error.stack
    });

    // Store error info for UI display
    error.errorType = errorType;
    error.userMessage = userMessage;

    return {
      errorType,
      userMessage,
      originalError: error
    };
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BuiltInAIProvider };
}
