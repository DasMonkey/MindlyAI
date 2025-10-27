// Grammar & Spelling Checker - Grammarly-like inline corrections
class GrammarChecker {
  constructor() {
    this.attachedFields = new WeakMap();
    this.checkCache = new Map();
    this.activeSuggestionPopup = null;
    this.debounceTimers = new WeakMap();
    this.isHoveringPopup = false;
    this.ignoredErrors = new Set(); // Track ignored errors (error text)
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

        // Filter out ignored errors
        errors = errors.filter(err => !this.ignoredErrors.has(err.error));
        
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
    this.hoverTracked = false;
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

    // Setup hover tracking for showing suggestions
    this.setupFieldHoverTracking();

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
    
    // Get field position and styles
    const fieldRect = this.field.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(this.field);
    const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
    
    // For multi-word errors that might span multiple lines, we need to handle each line separately
    // First, get the bounding rect to see if it spans multiple lines
    let errorRect;
    let range;
    
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
    
    // Check if the error spans multiple lines (height > 1.5 line heights)
    if (errorRect.height > lineHeight * 1.5) {
      console.log('Error spans multiple lines, creating separate underlines:', errorText);
      this.addMultiLineUnderline(error, startIndex, errorRect, fieldRect, lineHeight);
      return;
    }
    
    // Single line error - create one underline
    let left = errorRect.left - fieldRect.left;
    let width = errorRect.width;
    let height = errorRect.height;
    
    // Clamp height to reasonable line height
    if (height > lineHeight * 1.5) {
      height = lineHeight;
    }
    
    // Validate width
    const maxReasonableWidth = fieldRect.width - left - 10;
    if (width > maxReasonableWidth || width > fieldRect.width * 0.8) {
      console.warn('Width too large, using canvas measurement:', errorText);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
      const textMetrics = context.measureText(errorText);
      width = Math.min(textMetrics.width + 4, maxReasonableWidth);
    }
    
    // Bounds checking
    if (left < 0) left = 0;
    if (left + width > fieldRect.width) width = fieldRect.width - left;
    
    if (width <= 0 || width > fieldRect.width) {
      console.warn('Invalid dimensions, skipping:', errorText);
      return;
    }
    
    this.createUnderlineElement(error, left, errorRect.top - fieldRect.top, width, height);
  }
  
  addMultiLineUnderline(error, startIndex, errorRect, fieldRect, lineHeight) {
    // For errors spanning multiple lines, create underline segments per line
    // Use Range API to get client rects for each line
    const text = this.getFieldText();
    const errorText = error.error;
    
    let clientRects = [];
    
    if (this.field.contentEditable === 'true') {
      const nodes = this.getAllNodes(this.field);
      let currentIndex = 0;
      
      for (let node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const nodeLength = node.textContent.length;
          if (currentIndex + nodeLength > startIndex) {
            const range = document.createRange();
            const offsetInNode = startIndex - currentIndex;
            range.setStart(node, offsetInNode);
            range.setEnd(node, Math.min(offsetInNode + errorText.length, nodeLength));
            clientRects = Array.from(range.getClientRects());
            break;
          }
          currentIndex += nodeLength;
        } else if (node.nodeName === 'BR') {
          currentIndex += 1;
        }
      }
    } else {
      // For textarea/input, we can't get multi-line rects easily
      // Create single underline with constrained dimensions
      const left = Math.max(0, errorRect.left - fieldRect.left);
      const top = errorRect.top - fieldRect.top;
      const width = Math.min(errorRect.width, fieldRect.width - left);
      this.createUnderlineElement(error, left, top, width, lineHeight);
      return;
    }
    
    // Create an underline for each line segment
    clientRects.forEach((rect, index) => {
      if (rect.width > 0 && rect.height > 0) {
        const left = Math.max(0, rect.left - fieldRect.left);
        const top = rect.top - fieldRect.top;
        const width = Math.min(rect.width, fieldRect.width - left);
        const height = Math.min(rect.height, lineHeight * 1.2);
        
        if (width > 0 && height > 0) {
          this.createUnderlineElement(error, left, top, width, height, index);
        }
      }
    });
  }
  
  createUnderlineElement(error, left, top, width, height, segmentIndex = 0) {
    // Create underline span that aligns with the text
    const underline = document.createElement('span');
    underline.className = 'grammar-underline';
    underline.style.cssText = `
      position: absolute;
      left: ${left}px;
      top: ${top}px;
      width: ${width}px;
      height: ${height}px;
      border-bottom: 2px dotted #FF4444;
      pointer-events: none;
      cursor: text;
      display: block;
      background: rgba(255, 68, 68, 0.05);
    `;

    underline.dataset.error = JSON.stringify(error);
    underline.dataset.segment = segmentIndex;
    underline.title = `${error.type}: ${error.message}`;

    this.overlay.appendChild(underline);
  }
  
  setupFieldHoverTracking() {
    if (!this.overlay || this.hoverTracked) return;
    this.hoverTracked = true;
    
    const showSuggestionForError = (error, x, y) => {
      // Convert overlay-relative position to absolute
      const overlayRect = this.overlay.getBoundingClientRect();
      const underline = document.createElement('div');
      underline.style.cssText = `
        position: absolute;
        left: ${x - overlayRect.left}px;
        top: ${y - overlayRect.top}px;
        width: 1px;
        height: 20px;
        pointer-events: none;
      `;
      
      this.grammarChecker.showSuggestionPopup(error, {
        left: x,
        top: y,
        bottom: y + 20,
        right: x + 1
      }, this.field);
    };
    
    let hoverTimeout;
    let lastHoveredError = null;
    
    // Track mouse position over the field
    const mousemoveHandler = (e) => {
      // Clear any pending timeout
      clearTimeout(hoverTimeout);
      
      // Check if overlay still exists (might have been removed after ignoring)
      if (!this.overlay || !this.overlay.parentNode) {
        return;
      }
      
      // Get mouse position relative to the field
      const fieldRect = this.field.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      // Check if mouse is within field bounds
      if (x < fieldRect.left || x > fieldRect.right || 
          y < fieldRect.top || y > fieldRect.bottom) {
        return;
      }
      
      // Find which error (if any) the mouse is over
      const underlines = this.overlay.querySelectorAll('.grammar-underline');
      const overlayRect = this.overlay.getBoundingClientRect();
      const mouseX = x - overlayRect.left;
      const mouseY = y - overlayRect.top;
      
      let foundError = null;
      underlines.forEach(underline => {
        const errorData = JSON.parse(underline.dataset.error);
        const underlineRect = underline.getBoundingClientRect();
        const relX = underlineRect.left - overlayRect.left;
        const relY = underlineRect.top - overlayRect.top;
        
        if (mouseX >= relX && mouseX <= relX + underlineRect.width &&
            mouseY >= relY && mouseY <= relY + underlineRect.height) {
          foundError = errorData;
        }
      });
      
      if (foundError && foundError !== lastHoveredError) {
        lastHoveredError = foundError;
        
        // Show popup after short delay
        hoverTimeout = setTimeout(() => {
          showSuggestionForError(foundError, x, y);
        }, 200);
      } else if (!foundError) {
        lastHoveredError = null;
        
        // Hide popup after delay
        hoverTimeout = setTimeout(() => {
          this.grammarChecker.hideSuggestionPopup();
        }, 300);
      }
    };
    
    const mouseleaveHandler = () => {
      clearTimeout(hoverTimeout);
      lastHoveredError = null;
      setTimeout(() => {
        if (!this.grammarChecker.isHoveringPopup) {
          this.grammarChecker.hideSuggestionPopup();
        }
      }, 300);
    };
    
    // Add event listeners
    this.field.addEventListener('mousemove', mousemoveHandler);
    this.field.addEventListener('mouseleave', mouseleaveHandler);
    
    // Store handlers for cleanup
    this._hoverHandlers = {
      mousemove: mousemoveHandler,
      mouseleave: mouseleaveHandler
    };
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
      max-width: ${fieldRect.width}px;
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
      '<span id="error-marker" style="display: inline; background: rgba(255,0,0,0.2);">' + escapedError + '</span>' +
      escapedAfter;
    
    document.body.appendChild(mirror);
    const marker = mirror.querySelector('#error-marker');
    
    if (!marker) {
      console.error('Error marker not found in mirror');
      document.body.removeChild(mirror);
      return null;
    }
    
    const rect = marker.getBoundingClientRect();
    document.body.removeChild(mirror);
    
    // Validate the rect before returning
    if (!rect || rect.width === 0 || rect.width > fieldRect.width * 2) {
      console.warn('Invalid rect from mirror for text:', errorText, rect);
      return null;
    }
    
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
      this.hoverTracked = false;
    }
    
    // Remove hover tracking event listeners
    if (this._hoverHandlers) {
      this.field.removeEventListener('mousemove', this._hoverHandlers.mousemove);
      this.field.removeEventListener('mouseleave', this._hoverHandlers.mouseleave);
      this._hoverHandlers = null;
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
      this.grammarChecker.isHoveringPopup = true;
      clearTimeout(this.hideTimer);
    });

    this.element.addEventListener('mouseleave', () => {
      this.grammarChecker.isHoveringPopup = false;
      this.hideTimer = setTimeout(() => {
        this.grammarChecker.hideSuggestionPopup();
      }, 300);
    });

    // Button handlers
    this.element.querySelector('[data-action="apply"]').addEventListener('click', () => {
      this.applyCorrection();
    });

    this.element.querySelector('[data-action="ignore"]').addEventListener('click', () => {
      this.ignoreError();
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
    if (this.field.contentEditable === 'true') {
      // For contentEditable, walk through text nodes and replace
      const walker = document.createTreeWalker(
        this.field,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let textNode;
      while (textNode = walker.nextNode()) {
        if (textNode.textContent.includes(this.error.error)) {
          textNode.textContent = textNode.textContent.replace(this.error.error, this.error.correction);
          break; // Only replace first occurrence
        }
      }
    } else {
      // For textarea/input
      const text = this.field.value;
      const newText = text.replace(this.error.error, this.error.correction);
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

  ignoreError() {
    // Add error to ignored list
    this.grammarChecker.ignoredErrors.add(this.error.error);
    
    // Clear the check cache so ignored errors don't reappear
    this.grammarChecker.checkCache.clear();
    
    // Get the field checker
    const checker = this.grammarChecker.attachedFields.get(this.field);
    
    // Remove the underline(s) for this specific error
    if (checker && checker.overlay) {
      const underlines = checker.overlay.querySelectorAll('.grammar-underline');
      const errorText = this.error.error;
      
      underlines.forEach(underline => {
        const errorData = JSON.parse(underline.dataset.error);
        
        // Remove if it's the same error
        if (errorData.error === errorText) {
          underline.remove();
        }
      });
      
      // If no more underlines, remove the overlay entirely
      if (checker.overlay.querySelectorAll('.grammar-underline').length === 0) {
        checker.removeOverlay();
      }
    }
    
    // Show feedback
    const btn = this.element.querySelector('[data-action="ignore"]');
    btn.textContent = '✓ Ignored';
    btn.disabled = true;
    
    // Hide popup after a brief delay
    setTimeout(() => {
      this.grammarChecker.hideSuggestionPopup();
    }, 300);
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
