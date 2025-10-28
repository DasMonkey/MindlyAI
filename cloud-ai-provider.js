/**
 * Cloud AI Provider (Gemini API)
 * Wraps existing Gemini Cloud API functionality into provider interface
 * This is a REFACTORING of existing code, maintaining all functionality
 */

class CloudAIProvider {
  constructor() {
    this.name = 'Cloud API (Gemini)';
    this.apiKey = null;
    this.cache = new Map();
  }

  /**
   * Initialize the provider
   */
  async initialize() {
    console.log('☁️ Initializing Cloud AI Provider...');
    
    // Load API key from storage
    await this.loadAPIKey();
    
    console.log('✅ Cloud AI Provider initialized');
  }

  /**
   * Load API key from Chrome storage
   */
  async loadAPIKey() {
    try {
      const result = await chrome.storage.local.get(['geminiApiKey']);
      this.apiKey = result.geminiApiKey || null;
      
      if (this.apiKey) {
        console.log('✅ API key loaded');
      } else {
        console.warn('⚠️ No API key configured');
      }
    } catch (error) {
      console.error('❌ Error loading API key:', error);
    }
  }

  /**
   * Set API key
   */
  async setAPIKey(apiKey) {
    this.apiKey = apiKey;
    await chrome.storage.local.set({ geminiApiKey: apiKey });
    console.log('✅ API key saved');
  }

  /**
   * Check if provider is available
   */
  async isAvailable() {
    return this.apiKey !== null && this.apiKey !== '';
  }

  /**
   * Get provider name
   */
  getName() {
    return this.name;
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
    return `cloud_${method}_${JSON.stringify(args)}`;
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

  // ==================== CORE GEMINI API CALLS ====================

  /**
   * Call Gemini API (text-only or with image parts)
   * This wraps the existing callGeminiApi function
   */
  async callGeminiApi(prompt, imageParts = null) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    // Use latest lite model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent?key=${this.apiKey}`;

    // Build parts array
    let parts = [];
    if (imageParts && imageParts.length > 0) {
      parts = [...imageParts, { text: prompt }];
    } else {
      parts = [{ text: prompt }];
    }

    console.log('📤 Calling Gemini API with prompt length:', prompt.length);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error Response:', error);
      throw new Error(error.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Check if response has expected structure
    if (!data.candidates || !data.candidates[0]) {
      console.error('Unexpected API response structure:', data);
      throw new Error('API returned unexpected response format: missing candidates');
    }

    const candidate = data.candidates[0];
    if (!candidate.content) {
      console.error('Unexpected API response structure:', data);
      throw new Error('API returned unexpected response format: missing content');
    }

    if (!candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('Unexpected API response structure:', data);
      // Check if content was filtered or blocked
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
        throw new Error(`Content blocked: ${candidate.finishReason}. Please try with different content.`);
      }
      throw new Error('API returned unexpected response format: missing parts');
    }

    // Check if parts[0] exists and has text property
    if (!candidate.content.parts[0]) {
      console.error('Unexpected API response structure:', data);
      throw new Error('API returned unexpected response format: parts array is empty');
    }

    // Check for text content
    const text = candidate.content.parts[0].text;
    if (!text) {
      console.error('Unexpected API response structure:', data);
      console.error('parts[0]:', candidate.content.parts[0]);
      throw new Error('API returned unexpected response format: text content is missing');
    }

    return text;
  }

  /**
   * Call Gemini API with vision (multimodal) support
   * This wraps the existing callGeminiVisionApi function
   */
  async callGeminiVisionApi(prompt, imageBase64) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    console.log('📤 Calling Gemini Vision API');
    console.log('Prompt:', prompt.substring(0, 100) + '...');
    console.log('Image data length:', imageBase64.length);

    // Remove data URL prefix if present
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.2,  // Lower temperature for more accurate OCR
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192  // Larger output for long documents
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Vision API Error Response:', error);
      throw new Error(error.error?.message || `Vision API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Vision API Response received');

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Unexpected Vision API response structure:', data);
      throw new Error('Vision API returned unexpected response format');
    }

    const text = data.candidates[0].content.parts[0].text;
    return text;
  }

  // ==================== GRAMMAR CHECKING ====================

  /**
   * Check grammar and spelling
   * Wraps existing grammar checking functionality
   * Can accept either plain text or a full prompt
   */
  async checkGrammar(textOrPrompt, options = {}) {
    const cacheKey = this.getCacheKey('checkGrammar', textOrPrompt);
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('📦 Using cached grammar check result');
      return cached;
    }

    try {
      // Check if input is already a full prompt (contains instructions)
      const isFullPrompt = textOrPrompt.includes('JSON array') || textOrPrompt.includes('ANALYZE THIS TEXT');
      
      let prompt;
      if (isFullPrompt) {
        // Use the provided prompt as-is
        prompt = textOrPrompt;
      } else {
        // Create a prompt from the text
        prompt = `Analyze the following text for grammar and spelling errors. Return a JSON array of corrections with this exact format:
[
  {
    "error": "the incorrect text",
    "correction": "the corrected text",
    "type": "grammar" or "spelling",
    "message": "explanation of the error"
  }
]

If there are no errors, return an empty array: []

Text to analyze:
${textOrPrompt}`;
      }

      const result = await this.callGeminiApi(prompt);
      
      // For full prompts from grammar-checker.js, return the raw result
      // The grammar-checker will parse it
      if (isFullPrompt) {
        this.setCache(cacheKey, result);
        return result;
      }
      
      // Parse JSON response for simple text input
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in response, returning empty corrections');
        return [];
      }

      const corrections = JSON.parse(jsonMatch[0]);
      
      // Cache result
      this.setCache(cacheKey, corrections);
      
      return corrections;
    } catch (error) {
      console.error('❌ Grammar check error:', error);
      throw error;
    }
  }

  // ==================== TRANSLATION ====================

  /**
   * Translate text
   * Wraps existing translation functionality
   */
  async translateText(text, sourceLang, targetLang, options = {}) {
    const cacheKey = this.getCacheKey('translateText', text, sourceLang, targetLang);
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('📦 Using cached translation result');
      return cached;
    }

    try {
      const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Return ONLY the translated text, nothing else:\n\n${text}`;
      
      const translation = await this.callGeminiApi(prompt);
      
      // Cache result
      this.setCache(cacheKey, translation);
      
      return translation;
    } catch (error) {
      console.error('❌ Translation error:', error);
      throw error;
    }
  }

  // ==================== SUMMARIZATION ====================

  /**
   * Summarize content
   * Wraps existing summarization functionality
   */
  async summarizeContent(content, options = {}) {
    const cacheKey = this.getCacheKey('summarizeContent', content, options);
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('📦 Using cached summary result');
      return cached;
    }

    try {
      const type = options.type || 'key-points';
      const length = options.length || 'medium';
      
      let prompt = '';
      if (type === 'key-points') {
        prompt = `Summarize the following content into key points:\n\n${content}`;
      } else if (type === 'tl;dr') {
        prompt = `Provide a TL;DR summary of the following content:\n\n${content}`;
      } else {
        prompt = `Summarize the following content:\n\n${content}`;
      }
      
      const summary = await this.callGeminiApi(prompt);
      
      // Cache result
      this.setCache(cacheKey, summary);
      
      return summary;
    } catch (error) {
      console.error('❌ Summarization error:', error);
      throw error;
    }
  }

  // ==================== REWRITING ====================

  /**
   * Rewrite text
   * Wraps existing rewriting functionality
   * Supports Rewriter API-compatible options
   */
  async rewriteText(text, options = {}) {
    const cacheKey = this.getCacheKey('rewriteText', text, options);
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log('📦 Using cached rewrite result');
      return cached;
    }

    try {
      // Build prompt based on options (compatible with Rewriter API)
      let prompt = '';
      
      // Add shared context if provided
      if (options.sharedContext) {
        prompt += `Context: ${options.sharedContext}\n\n`;
      }
      
      // Add specific context if provided
      if (options.context) {
        prompt += `Additional context: ${options.context}\n\n`;
      }
      
      // Build the main instruction
      let instruction = 'Rewrite the following text';
      
      // Handle tone
      if (options.tone && options.tone !== 'as-is') {
        const toneMap = {
          'more-formal': 'in a more formal and professional tone',
          'more-casual': 'in a more casual and friendly tone',
          'neutral': 'in a neutral tone'
        };
        instruction += ' ' + (toneMap[options.tone] || `in a ${options.tone} tone`);
      }
      
      // Handle length
      if (options.length && options.length !== 'as-is') {
        if (options.length === 'shorter') {
          instruction += ', making it more concise';
        } else if (options.length === 'longer') {
          instruction += ', expanding it with more detail';
        }
      }
      
      prompt += `${instruction}. Return ONLY the rewritten text, no explanations:\n\n${text}\n\nRewritten:`;
      
      const rewritten = await this.callGeminiApi(prompt);
      
      // Cache result
      this.setCache(cacheKey, rewritten);
      
      return rewritten;
    } catch (error) {
      console.error('❌ Rewrite error:', error);
      throw error;
    }
  }

  // ==================== CONTENT GENERATION ====================

  /**
   * Generate content
   * Wraps existing content generation functionality
   */
  async generateContent(prompt, options = {}) {
    try {
      const result = await this.callGeminiApi(prompt);
      return result;
    } catch (error) {
      console.error('❌ Content generation error:', error);
      throw error;
    }
  }

  // ==================== MULTIMODAL (IMAGE) ====================

  /**
   * Prompt with image input
   * Wraps existing vision API functionality
   */
  async promptWithImage(sessionData, text, imageInput, options = {}) {
    try {
      // Convert image to base64 if it's a URL
      let imageBase64;
      if (typeof imageInput === 'string') {
        // It's a URL, fetch and convert
        const response = await fetch(imageInput);
        const blob = await response.blob();
        imageBase64 = await this.blobToBase64(blob);
      } else if (imageInput instanceof File || imageInput instanceof Blob) {
        // Convert File/Blob to base64
        imageBase64 = await this.blobToBase64(imageInput);
      } else {
        throw new Error('Invalid image input: must be URL, File, or Blob');
      }

      // Call vision API
      const result = await this.callGeminiVisionApi(text, imageBase64);
      return result;
    } catch (error) {
      console.error('❌ Prompt with image error:', error);
      throw error;
    }
  }

  /**
   * Convert Blob to base64
   */
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ==================== Cleanup ====================

  /**
   * Cleanup resources
   */
  cleanup() {
    this.cache.clear();
    console.log('🧹 Cloud AI Provider cleaned up');
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CloudAIProvider };
}
