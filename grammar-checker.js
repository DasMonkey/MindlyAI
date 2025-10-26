// Grammar & Spelling Checker - Grammarly-like inline corrections
class GrammarChecker {
  constructor() {
    this.attachedFields = new WeakMap();
    this.checkCache = new Map();
    this.activeSuggestionPopup = null;
    this.debounceTimers = new WeakMap();
  }

  init() {
    console.log('📝 Grammar Checker initialized');
    this.detectExistingFields();
    this.observeNewFields();
  }

  detectExistingFields() {
    const fields = document.querySelectorAll(
      'textarea, input[type="text"], input[type="email"], [contenteditable="true"]'
    );
    
    fields.forEach(field => this.attachToField(field));
  }

  observeNewFields() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (this.isTextField(node)) {
              this.attachToField(node);
            }
            const fields = node.querySelectorAll?.(
              'textarea, input[type="text"], input[type="email"], [contenteditable="true"]'
            );
            fields?.forEach(field => this.attachToField(field));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  isTextField(element) {
    const tag = element.tagName?.toLowerCase();
    return (
      tag === 'textarea' ||
      (tag === 'input' && ['text', 'email'].includes(element.type)) ||
      element.contentEditable === 'true'
    );
  }

  attachToField(field) {
    if (this.attachedFields.has(field)) return;

    const rect = field.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 30) return;

    const checker = new FieldChecker(field, this);
    this.attachedFields.set(field, checker);
  }

  showSuggestionPopup(error, rect, field) {
    this.hideSuggestionPopup();
    this.activeSuggestionPopup = new SuggestionPopup(error, rect, field, this);
  }

  hideSuggestionPopup() {
    if (this.activeSuggestionPopup) {
      this.activeSuggestionPopup.remove();
      this.activeSuggestionPopup = null;
    }
  }

  async checkText(text) {
    // Check cache first
    const cacheKey = text.trim().toLowerCase();
    if (this.checkCache.has(cacheKey)) {
      return this.checkCache.get(cacheKey);
    }

    const prompt = `You are a grammar and spelling checker. Check this text carefully and return ALL errors at once (both spelling AND grammar).

Return a JSON array in this exact format:
[{"error": "the wrong text", "correction": "the correct text", "type": "grammar" or "spelling", "message": "brief explanation"}]

IMPORTANT RULES:
- Check for BOTH spelling and grammar errors in the SAME analysis
- Return ALL errors found, even if they are in the same sentence
- If a sentence has both spelling AND grammar errors, include BOTH separately
- Only include errors where correction is DIFFERENT from the error text
- For grammar errors that depend on spelling, show the final corrected version
- Skip punctuation-only changes unless grammatically necessary
- If no real errors exist, return empty array: []
- Return ONLY valid JSON, no explanations or markdown

Examples:
- Input: "He dont like apples"
  Output: [{"error": "dont", "correction": "doesn't", "type": "spelling", "message": "Missing apostrophe"}, {"error": "dont like", "correction": "doesn't like", "type": "grammar", "message": "Subject-verb agreement"}]

Text to check:
${text}

JSON response:`;

    try {
      const response = await new Promise((resolve, reject) => {
        // Check if extension context is still valid before sending message
        if (!chrome.runtime?.id) {
          reject(new Error('Extension context invalidated'));
          return;
        }
        
        try {
          chrome.runtime.sendMessage({
            action: 'grammarCheck',
            prompt: prompt
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response);
          });
        } catch (e) {
          reject(new Error('Could not establish connection'));
        }
      });

      if (response?.result) {
        let errors = [];
        try {
          // Clean up the response - remove markdown code blocks if present
          let jsonText = response.result.trim();
          if (jsonText.startsWith('```json')) {
            jsonText = jsonText.substring(7);
          }
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.substring(3);
          }
          if (jsonText.endsWith('```')) {
            jsonText = jsonText.substring(0, jsonText.length - 3);
          }
          jsonText = jsonText.trim();

          errors = JSON.parse(jsonText);
          
          // Validate the structure and filter out bad suggestions
          if (!Array.isArray(errors)) {
            errors = [];
          }
          
          // Filter out errors where correction is same as error (case-insensitive)
          errors = errors.filter(err => 
            err.error && err.correction && 
            err.error.toLowerCase().trim() !== err.correction.toLowerCase().trim()
          );
        } catch (e) {
          console.error('Failed to parse grammar check response:', e);
          errors = [];
        }

        // Cache the result
        this.checkCache.set(cacheKey, errors);
        
        // Limit cache size
        if (this.checkCache.size > 100) {
          const firstKey = this.checkCache.keys().next().value;
          this.checkCache.delete(firstKey);
        }

        return errors;
      }
    } catch (error) {
      // Silently ignore extension context invalidation errors (happens on reload)
      const isExpectedError = 
        error.message === 'Extension context invalidated' ||
        error.message?.includes('Could not establish connection') ||
        error.message?.includes('Receiving end does not exist');
      
      if (!isExpectedError) {
        console.error('Grammar check error:', error);
      }
      return [];
    }

    return [];
  }
}

// Field Checker - Monitors a single text field
class FieldChecker {
  constructor(field, grammarChecker) {
    this.field = field;
    this.grammarChecker = grammarChecker;
    this.overlay = null;
    this.errors = [];
    this.lastCheckedText = '';
    this.debounceTimer = null;
    this.attachListeners();
  }

  attachListeners() {
    // Check on input with debounce
    this.field.addEventListener('input', () => this.scheduleCheck());
    this.field.addEventListener('focus', () => this.scheduleCheck());
  }

  scheduleCheck() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.checkGrammar(), 1000);
  }

  async checkGrammar() {
    const text = this.getFieldText();
    
    if (!text || text.length < 3 || text === this.lastCheckedText) {
      return;
    }

    this.lastCheckedText = text;
    
    // Check text with AI
    this.errors = await this.grammarChecker.checkText(text);
    
    if (this.errors.length > 0) {
      this.showUnderlines();
    } else {
      this.removeOverlay();
    }
  }

  getFieldText() {
    if (this.field.contentEditable === 'true') {
      return this.field.innerText;
    }
    return this.field.value;
  }

  showUnderlines() {
    this.removeOverlay();

    const text = this.getFieldText();
    const fieldRect = this.field.getBoundingClientRect();

    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'grammar-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: ${fieldRect.top}px;
      left: ${fieldRect.left}px;
      width: ${fieldRect.width}px;
      height: ${fieldRect.height}px;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
      clip-path: inset(0);
    `;

    // For each error, find its position and add an underline
    this.errors.forEach(error => {
      const errorIndex = text.indexOf(error.error);
      if (errorIndex !== -1) {
        this.addUnderline(error, errorIndex);
      }
    });

    document.body.appendChild(this.overlay);

    // Update overlay position on scroll (page scroll or field internal scroll)
    const updatePosition = () => {
      const newRect = this.field.getBoundingClientRect();
      if (this.overlay) {
        this.overlay.style.top = `${newRect.top}px`;
        this.overlay.style.left = `${newRect.left}px`;
        this.overlay.style.width = `${newRect.width}px`;
        this.overlay.style.height = `${newRect.height}px`;
        
        // Recalculate underline positions when field scrolls internally
        this.updateUnderlinePositions();
      }
    };

    // Listen to field's internal scroll
    this.field.addEventListener('scroll', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    // Store cleanup function
    this.overlay._cleanup = () => {
      this.field.removeEventListener('scroll', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }

  updateUnderlinePositions() {
    // Recalculate all underline positions relative to current field state
    if (!this.overlay) return;
    
    const underlines = this.overlay.querySelectorAll('.grammar-underline');
    const fieldRect = this.field.getBoundingClientRect();
    
    underlines.forEach(underline => {
      const errorData = JSON.parse(underline.dataset.error);
      const text = this.getFieldText();
      const errorIndex = text.indexOf(errorData.error);
      
      if (errorIndex === -1) {
        // Error text no longer exists, hide underline
        underline.style.display = 'none';
        return;
      }
      
      // Get new position
      let errorRect;
      if (this.field.contentEditable === 'true') {
        const range = this.getRangeForError(errorIndex, errorData.error.length);
        if (range) {
          errorRect = range.getBoundingClientRect();
        }
      } else {
        errorRect = this.getMirrorRect(errorIndex, errorData.error.length);
      }
      
      if (errorRect) {
        // Update position relative to overlay (which is fixed to field bounds)
        underline.style.left = `${errorRect.left - fieldRect.left}px`;
        underline.style.top = `${errorRect.top - fieldRect.top}px`;
        underline.style.width = `${errorRect.width}px`;
        underline.style.height = `${errorRect.height}px`;
        underline.style.display = 'block';
      }
    });
  }
  
  getRangeForError(startIndex, length) {
    if (this.field.contentEditable !== 'true') return null;
    
    const nodes = this.getAllNodes(this.field);
    let currentIndex = 0;
    
    for (let node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const nodeLength = node.textContent.length;
        if (currentIndex + nodeLength > startIndex) {
          const range = document.createRange();
          const offsetInNode = startIndex - currentIndex;
          range.setStart(node, offsetInNode);
          range.setEnd(node, Math.min(offsetInNode + length, nodeLength));
          return range;
        }
        currentIndex += nodeLength;
      } else if (node.nodeName === 'BR') {
        currentIndex += 1;
      }
    }
    return null;
  }

  addUnderline(error, startIndex) {
    const text = this.getFieldText();
    const errorText = error.error;
    
    // Get accurate position using Range API
    let range;
    let errorRect;
    
    if (this.field.contentEditable === 'true') {
      // For contenteditable, walk through all nodes including BR tags
      const nodes = this.getAllNodes(this.field);
      let currentIndex = 0;
      
      for (let node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const nodeLength = node.textContent.length;
          if (currentIndex + nodeLength > startIndex) {
            // Found the node containing the error
            range = document.createRange();
            const offsetInNode = startIndex - currentIndex;
            range.setStart(node, offsetInNode);
            range.setEnd(node, Math.min(offsetInNode + errorText.length, nodeLength));
            errorRect = range.getBoundingClientRect();
            break;
          }
          currentIndex += nodeLength;
        } else if (node.nodeName === 'BR') {
          // BR tag counts as a newline character
          currentIndex += 1;
        }
      }
    } else {
      // For input/textarea, create a mirror element to measure
      errorRect = this.getMirrorRect(startIndex, errorText.length);
    }
    
    if (!errorRect || errorRect.width === 0) {
      console.warn('Could not determine error position for:', errorText);
      return;
    }
    
    // Get field position
    const fieldRect = this.field.getBoundingClientRect();
    
    // Calculate relative position within the field
    const left = errorRect.left - fieldRect.left;
    // Position the underline at the bottom of the text (baseline)
    const top = errorRect.top - fieldRect.top + errorRect.height - 4;
    const width = errorRect.width;
    
    // Create underline span that aligns with the text
    const underline = document.createElement('span');
    underline.className = 'grammar-underline';
    underline.style.cssText = `
      position: absolute;
      left: ${left}px;
      top: ${errorRect.top - fieldRect.top}px;
      width: ${width}px;
      height: ${errorRect.height}px;
      border-bottom: 2px dotted #FF4444;
      pointer-events: auto;
      cursor: pointer;
      display: block;
    `;

    underline.dataset.error = JSON.stringify(error);
    underline.title = `${error.type}: ${error.message}`;

    // Show suggestion on hover
    let showTimeout;
    underline.addEventListener('mouseenter', (e) => {
      showTimeout = setTimeout(() => {
        const rect = underline.getBoundingClientRect();
        this.grammarChecker.showSuggestionPopup(error, rect, this.field);
      }, 100);
    });

    underline.addEventListener('mouseleave', () => {
      clearTimeout(showTimeout);
    });
    
    // Also show on click
    underline.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = underline.getBoundingClientRect();
      this.grammarChecker.showSuggestionPopup(error, rect, this.field);
    });

    this.overlay.appendChild(underline);
  }
  
  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) {
        textNodes.push(node);
      }
    }
    return textNodes;
  }
  
  getAllNodes(element) {
    const nodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ALL,
      {
        acceptNode: function(node) {
          // Accept text nodes and BR elements
          if (node.nodeType === Node.TEXT_NODE || node.nodeName === 'BR') {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      },
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      nodes.push(node);
    }
    return nodes;
  }
  
  getMirrorRect(startIndex, length) {
    // Create a mirror div that mimics the textarea/input
    const mirror = document.createElement('div');
    const fieldStyles = window.getComputedStyle(this.field);
    const fieldRect = this.field.getBoundingClientRect();
    
    mirror.style.cssText = `
      position: absolute;
      top: ${fieldRect.top + window.scrollY}px;
      left: ${fieldRect.left + window.scrollX}px;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      pointer-events: none;
    `;
    
    // Copy all relevant styles
    const stylesToCopy = [
      'font-family', 'font-size', 'font-weight', 'font-style',
      'line-height', 'letter-spacing', 'text-transform',
      'padding', 'border', 'width', 'box-sizing',
      'padding-top', 'padding-left', 'padding-right', 'padding-bottom'
    ];
    
    stylesToCopy.forEach(style => {
      mirror.style[style] = fieldStyles[style];
    });
    
    const text = this.getFieldText();
    const textBefore = text.substring(0, startIndex);
    const errorText = text.substring(startIndex, startIndex + length);
    
    // Build the mirror content with a marker span
    const escapedBefore = this.escapeHtml(textBefore).replace(/\n/g, '<br>');
    const escapedError = this.escapeHtml(errorText);
    const escapedAfter = this.escapeHtml(text.substring(startIndex + length)).replace(/\n/g, '<br>');
    
    mirror.innerHTML = escapedBefore + 
      '<span id="error-marker" style="background: rgba(255,0,0,0.2);">' + escapedError + '</span>' +
      escapedAfter;
    
    document.body.appendChild(mirror);
    const marker = mirror.querySelector('#error-marker');
    const rect = marker.getBoundingClientRect();
    document.body.removeChild(mirror);
    
    return rect;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  removeOverlay() {
    if (this.overlay) {
      if (this.overlay._cleanup) {
        this.overlay._cleanup();
      }
      this.overlay.remove();
      this.overlay = null;
    }
  }
}

// Suggestion Popup - Shows corrections on hover
class SuggestionPopup {
  constructor(error, rect, field, grammarChecker) {
    this.error = error;
    this.rect = rect;
    this.field = field;
    this.grammarChecker = grammarChecker;
    this.element = null;
    this.create();
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'grammar-suggestion-popup';
    this.element.innerHTML = `
      <div class="grammar-suggestion-header">
        <span class="grammar-suggestion-type">${this.error.type}</span>
      </div>
      <div class="grammar-suggestion-body">
        <div class="grammar-suggestion-error">${this.escapeHtml(this.error.error)}</div>
        <div class="grammar-suggestion-arrow">→</div>
        <div class="grammar-suggestion-correction">${this.escapeHtml(this.error.correction)}</div>
      </div>
      <div class="grammar-suggestion-message">${this.escapeHtml(this.error.message)}</div>
      <div class="grammar-suggestion-actions">
        <button class="grammar-suggestion-btn grammar-suggestion-btn-primary" data-action="apply">Apply</button>
        <button class="grammar-suggestion-btn grammar-suggestion-btn-secondary" data-action="ignore">Ignore</button>
      </div>
    `;

    this.element.style.cssText = `
      position: absolute;
      top: ${this.rect.bottom + window.scrollY + 5}px;
      left: ${this.rect.left + window.scrollX}px;
      z-index: 10002;
    `;

    document.body.appendChild(this.element);

    // Keep popup open when hovering over it
    this.element.addEventListener('mouseenter', () => {
      clearTimeout(this.hideTimer);
    });

    this.element.addEventListener('mouseleave', () => {
      this.hideTimer = setTimeout(() => {
        this.grammarChecker.hideSuggestionPopup();
      }, 300);
    });

    // Button handlers
    this.element.querySelector('[data-action="apply"]').addEventListener('click', () => {
      this.applyCorrection();
    });

    this.element.querySelector('[data-action="ignore"]').addEventListener('click', () => {
      this.grammarChecker.hideSuggestionPopup();
    });

    // Ensure popup stays on screen
    setTimeout(() => {
      const popupRect = this.element.getBoundingClientRect();
      if (popupRect.right > window.innerWidth) {
        this.element.style.left = `${window.innerWidth - popupRect.width - 10 + window.scrollX}px`;
      }
      if (popupRect.bottom > window.innerHeight + window.scrollY) {
        this.element.style.top = `${this.rect.top + window.scrollY - popupRect.height - 5}px`;
      }
    }, 10);
  }

  applyCorrection() {
    const text = this.field.contentEditable === 'true' 
      ? this.field.innerText 
      : this.field.value;

    const newText = text.replace(this.error.error, this.error.correction);

    if (this.field.contentEditable === 'true') {
      this.field.innerText = newText;
    } else {
      this.field.value = newText;
    }

    // Trigger input event
    this.field.dispatchEvent(new Event('input', { bubbles: true }));
    this.field.dispatchEvent(new Event('change', { bubbles: true }));

    // Get the field checker
    const checker = this.grammarChecker.attachedFields.get(this.field);
    
    // IMMEDIATELY remove the underline for this specific error AND any overlapping errors
    if (checker && checker.overlay) {
      const underlines = checker.overlay.querySelectorAll('.grammar-underline');
      const fixedText = this.error.error;
      
      underlines.forEach(underline => {
        const errorData = JSON.parse(underline.dataset.error);
        
        // Remove if:
        // 1. Exact match: errorData.error === this.error.error
        // 2. Overlapping: the error contains or is contained by the fixed text
        const shouldRemove = 
          errorData.error === fixedText ||
          errorData.error.includes(fixedText) ||
          fixedText.includes(errorData.error);
        
        if (shouldRemove) {
          underline.remove();
        }
      });
      
      // If no more underlines, remove the overlay entirely
      if (checker.overlay.querySelectorAll('.grammar-underline').length === 0) {
        checker.removeOverlay();
      }
    }

    // Show success feedback
    const btn = this.element.querySelector('[data-action="apply"]');
    btn.textContent = '✓ Applied';
    btn.disabled = true;

    setTimeout(() => {
      this.grammarChecker.hideSuggestionPopup();
      
      // Re-check the field after a delay (in case there are other errors)
      if (checker) {
        checker.scheduleCheck();
      }
    }, 500);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  remove() {
    if (this.element) {
      this.element.remove();
    }
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.grammarChecker = new GrammarChecker();
    window.grammarChecker.init();
  });
} else {
  window.grammarChecker = new GrammarChecker();
  window.grammarChecker.init();
}
