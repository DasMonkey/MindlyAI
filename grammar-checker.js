// Grammar & Spelling Checker - Grammarly-like inline corrections
class GrammarChecker {
  constructor() {
    this.attachedFields = new WeakMap();
    this.checkCache = new Map();
    this.activeSuggestionPopup = null;
    this.debounceTimers = new WeakMap();
    this.isHoveringPopup = false;
    this.ignoredErrors = new Set(); // Track ignored errors (error text)
    this.providerStatusUI = null; // Provider status UI instance
    this.providerBadge = null; // Provider badge element
  }

  async init() {
    console.log('🔍 Grammar Checker initialized');
    this.detectExistingFields();
    this.observeNewFields();
    
    // Initialize provider status UI if available
    if (typeof ProviderStatusUI !== 'undefined') {
      try {
        this.providerStatusUI = new ProviderStatusUI();
        // Provider manager will be initialized by background.js
        console.log('✅ Provider Status UI ready for grammar checker');
      } catch (error) {
        console.warn('⚠️ Provider Status UI not available:', error);
      }
    }
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
    console.log('🔍 Grammar check requested for text:', text.substring(0, 50) + '...', `(${text.length} chars, ${text.split('\n').length} lines)`);
    
    // Check cache first
    const cacheKey = text.trim().toLowerCase();
    if (this.checkCache.has(cacheKey)) {
      console.log('📦 Using cached result');
      return this.checkCache.get(cacheKey);
    }

    try {
      console.log('📤 Sending grammar check request to background');
      const response = await new Promise((resolve, reject) => {
        // Check if extension context is still valid before sending message
        if (!chrome.runtime?.id) {
          reject(new Error('Extension context invalidated'));
          return;
        }

        try {
          // Send plain text to use Proofreader API when available
          // The backend will automatically choose between Proofreader API and Prompt API
          chrome.runtime.sendMessage({
            action: 'grammarCheck',
            text: text  // Send plain text instead of prompt
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
        console.log('📥 Received grammar check response:', response);
        let errors = [];
        
        // The result is already in the correct format from builtin-ai-provider.js
        // It's an array of error objects: [{error, correction, type, message, startIndex, endIndex}]
        if (Array.isArray(response.result)) {
          console.log('✅ Result is already an array:', response.result);
          errors = response.result;
        } else {
          // Fallback: try to parse as JSON (for backward compatibility with Prompt API)
          try {
            let responseText = response.result.trim();

            // Remove markdown code blocks
            responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            // Try standard JSON parse
            const parsed = JSON.parse(responseText);
            if (Array.isArray(parsed)) {
              errors = parsed;
            }
          } catch (e) {
            console.error('Grammar check parsing failed:', e);
            errors = [];
          }
        }

        // Validate and filter
        if (!Array.isArray(errors)) {
          errors = [];
        }

        errors = errors.filter(err =>
          err.error &&
          err.correction &&
          err.error.toLowerCase().trim() !== err.correction.toLowerCase().trim()
        );

        console.log('🔍 Filtered errors:', errors.length, 'errors found');

        // Filter out ignored errors
        errors = errors.filter(err => !this.ignoredErrors.has(err.error));

        // Cache the result
        this.checkCache.set(cacheKey, errors);

        // Limit cache size
        if (this.checkCache.size > 100) {
          const firstKey = this.checkCache.keys().next().value;
          this.checkCache.delete(firstKey);
        }

        console.log('✅ Returning', errors.length, 'errors:', errors);
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
    this.isApplyingCorrection = false; // Flag to prevent removing all highlights when applying a fix
    this.attachListeners();
  }

  attachListeners() {
    // Check on input with debounce
    this.field.addEventListener('input', () => {
      this.handleTextChange();
      this.scheduleCheck();
    });
    this.field.addEventListener('focus', () => this.scheduleCheck());
  }

  handleTextChange() {
    // When text changes, immediately hide highlights to prevent misalignment
    // They will reappear after the debounce with correct positions
    // EXCEPT when applying a correction - in that case, only the specific highlight is removed
    if (!this.isApplyingCorrection) {
      this.removeOverlay();
    }
  }

  scheduleCheck() {
    clearTimeout(this.debounceTimer);
    // 500ms delay - faster response while still avoiding checking on every keystroke
    this.debounceTimer = setTimeout(() => this.checkGrammar(), 500);
  }

  async checkGrammar() {
    const text = this.getFieldText();

    console.log('📝 FieldChecker: Checking grammar for text:', text.substring(0, 50) + '...', `(${text.length} chars, ${text.split('\n').length} lines)`);

    if (!text || text.length < 3 || text === this.lastCheckedText) {
      console.log('⏭️ Skipping check (too short or same as last check)');
      return;
    }

    this.lastCheckedText = text;

    // Check text with AI
    console.log('🔍 FieldChecker: Calling checkText...');
    this.errors = await this.grammarChecker.checkText(text);

    console.log('📊 FieldChecker: Received', this.errors?.length || 0, 'errors');

    if (this.errors && this.errors.length > 0) {
      console.log('🎨 FieldChecker: Showing underlines for', this.errors.length, 'errors');
      this.showUnderlines();
    } else {
      console.log('✨ FieldChecker: No errors, removing overlay');
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

    const fieldRect = this.field.getBoundingClientRect();

    // Get field's computed style to account for padding
    const computedStyle = window.getComputedStyle(this.field);
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

    // Create overlay container - position FIXED to viewport
    this.overlay = document.createElement('div');
    this.overlay.className = 'grammar-overlay';
    
    // Get border-radius to match field's rounded corners
    const borderRadius = computedStyle.borderRadius || '0';
    
    // Use clientWidth/clientHeight to get the VISIBLE area (excludes scrollbar)
    const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const overlayWidth = this.field.clientWidth - paddingLeft - paddingRight;
    const overlayHeight = this.field.clientHeight - paddingTop - paddingBottom;
    
    this.overlay.style.cssText = `
      position: fixed;
      top: ${fieldRect.top + paddingTop}px;
      left: ${fieldRect.left + paddingLeft}px;
      width: ${overlayWidth}px;
      height: ${overlayHeight}px;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden !important;
      border-radius: ${borderRadius};
      box-sizing: border-box;
      clip-path: inset(0px 0px 0px 0px);
      -webkit-clip-path: inset(0px 0px 0px 0px);
    `;

    // IMPORTANT: Append overlay to DOM BEFORE getting its bounding rect
    document.body.appendChild(this.overlay);

    // For each error, find its position and add an underline
    // Use a more robust approach: search for the text directly in the DOM
    this.errors.forEach(error => {
      this.addUnderlineByText(error);
    });

    // Setup hover tracking for showing suggestions
    this.setupFieldHoverTracking();

    // Update overlay position on scroll (page scroll or field internal scroll)
    const updatePosition = () => {
      if (!this.overlay) return;
      
      const newRect = this.field.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(this.field);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;

      // Check if field is visible in viewport
      const isVisible = 
        newRect.top < window.innerHeight &&
        newRect.bottom > 0 &&
        newRect.left < window.innerWidth &&
        newRect.right > 0;

      if (!isVisible) {
        // Hide overlay if field is not visible
        this.overlay.style.display = 'none';
        return;
      }

      // Show and update overlay position
      this.overlay.style.display = 'block';
      this.overlay.style.top = `${newRect.top + paddingTop}px`;
      this.overlay.style.left = `${newRect.left + paddingLeft}px`;
      this.overlay.style.width = `${newRect.width - paddingLeft - paddingRight}px`;
      this.overlay.style.height = `${newRect.height - paddingTop - paddingBottom}px`;

      // Recalculate underline positions when field scrolls internally
      this.updateUnderlinePositions();
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
    // Recalculate all underline positions by searching for text again
    // This ensures highlights move with text when line breaks are added
    if (!this.overlay || !this.errors || this.errors.length === 0) return;

    // Clear existing underlines
    this.overlay.innerHTML = '';

    // Recalculate each error's position
    const overlayRect = this.overlay.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(this.field);
    const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
    
    // Get overlay dimensions for visibility checking
    const overlayWidth = this.overlay.offsetWidth;
    const overlayHeight = this.overlay.offsetHeight;

    this.errors.forEach(error => {
      const errorText = error.error;
      
      if (this.field.contentEditable === 'true') {
        // Use TreeWalker to find text
        const walker = document.createTreeWalker(
          this.field,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let node;
        while (node = walker.nextNode()) {
          const index = node.textContent.indexOf(errorText);
          if (index !== -1) {
            try {
              const range = document.createRange();
              range.setStart(node, index);
              range.setEnd(node, index + errorText.length);
              const rects = range.getClientRects();

              if (rects && rects.length > 0) {
                Array.from(rects).forEach((rect, idx) => {
                  if (rect.width > 0 && rect.height > 0) {
                    const left = rect.left - overlayRect.left;
                    const top = rect.top - overlayRect.top;
                    const width = Math.min(rect.width, overlayWidth - left);
                    const height = Math.min(rect.height, lineHeight + 2);

                    // Only create if COMPLETELY visible within overlay bounds
                    const isVisible = 
                      left >= 0 && 
                      top >= 0 && 
                      (left + width) <= overlayWidth && 
                      (top + height) <= overlayHeight;

                    if (isVisible && width > 0 && height > 0) {
                      this.createUnderlineElement(error, left, top, width, height, idx);
                    }
                  }
                });
                break; // Only highlight first occurrence
              }
            } catch (e) {
              // Silently skip if range creation fails
            }
          }
        }
      } else {
        // For textarea/input
        const text = this.field.value;
        const index = text.indexOf(errorText);
        if (index !== -1) {
          const errorRect = this.getMirrorRect(index, errorText.length);
          if (errorRect && errorRect.width > 0) {
            const left = errorRect.left - overlayRect.left;
            const top = errorRect.top - overlayRect.top;
            const width = Math.min(errorRect.width, overlayWidth - left);
            const height = Math.min(errorRect.height, lineHeight + 2);

            // Only create if COMPLETELY visible within overlay bounds
            const isVisible = 
              left >= 0 && 
              top >= 0 && 
              (left + width) <= overlayWidth && 
              (top + height) <= overlayHeight;

            if (isVisible && width > 0 && height > 0) {
              this.createUnderlineElement(error, left, top, width, height);
            }
          }
        }
      }
    });
  }

  getRangeForError(startIndex, length) {
    if (this.field.contentEditable !== 'true') return null;

    // Validate input parameters
    const fieldText = this.getFieldText();
    if (startIndex < 0 || startIndex >= fieldText.length) {
      console.warn('Invalid startIndex in getRangeForError:', startIndex, 'Text length:', fieldText.length);
      return null;
    }

    // Make sure length doesn't exceed available text
    if (length <= 0 || (startIndex + length) > fieldText.length) {
      console.warn('Invalid length in getRangeForError:', length, 'startIndex:', startIndex, 'textLength:', fieldText.length);
      return null;
    }

    const nodes = this.getAllNodes(this.field);
    let currentIndex = 0;

    for (let node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const nodeLength = node.textContent.length;
        // Check if this node contains the startIndex
        if (startIndex >= currentIndex && startIndex < currentIndex + nodeLength) {
          const range = document.createRange();
          const offsetInNode = startIndex - currentIndex;

          // VALIDATE offset is within node bounds BEFORE using it
          if (offsetInNode < 0 || offsetInNode > nodeLength) {
            console.warn('Invalid offsetInNode:', offsetInNode, 'for node length:', nodeLength, 'startIndex:', startIndex, 'currentIndex:', currentIndex);
            return null;
          }

          const endOffset = Math.min(offsetInNode + length, nodeLength);

          // Additional safety: validate endOffset
          if (endOffset < offsetInNode || endOffset > nodeLength) {
            console.warn('Invalid endOffset:', endOffset, 'offsetInNode:', offsetInNode, 'nodeLength:', nodeLength);
            return null;
          }

          try {
            range.setStart(node, offsetInNode);
            range.setEnd(node, endOffset);
            return range;
          } catch (e) {
            console.error('Error creating range:', e, { offsetInNode, endOffset, nodeLength });
            return null;
          }
        }
        currentIndex += nodeLength;
      } else if (node.nodeName === 'BR') {
        currentIndex += 1;
      }
    }
    return null;
  }

  findWholeWordIndex(text, searchText) {
    // Find the search text as a whole word/phrase, not as a substring within another word
    // This prevents matching "cause" inside "because"
    
    // If the search text contains spaces, it's a phrase - match it exactly with word boundaries
    if (searchText.includes(' ')) {
      // For phrases, use regex with word boundaries at start and end
      const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSearch}\\b`, 'i');
      const match = text.match(regex);
      return match ? match.index : -1;
    }
    
    // For single words, check word boundaries manually
    let index = 0;
    while ((index = text.indexOf(searchText, index)) !== -1) {
      const charBefore = index > 0 ? text[index - 1] : ' ';
      const charAfter = index + searchText.length < text.length ? text[index + searchText.length] : ' ';
      
      // Check if both surrounding characters are word boundaries (space, punctuation, etc.)
      const isWordBoundaryBefore = /[\s.,!?;:()\[\]{}"'\n\r\t]/.test(charBefore) || index === 0;
      const isWordBoundaryAfter = /[\s.,!?;:()\[\]{}"'\n\r\t]/.test(charAfter) || index + searchText.length === text.length;
      
      if (isWordBoundaryBefore && isWordBoundaryAfter) {
        return index;
      }
      
      index++;
    }
    
    return -1;
  }

  addUnderlineByText(error) {
    // Modern approach: Use window.find() or TreeWalker to locate text
    // This avoids character counting issues with line breaks
    const errorText = error.error;

    if (!errorText || !errorText.trim()) {
      return;
    }

    const fieldRect = this.field.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(this.field);
    const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
    const overlayRect = this.overlay.getBoundingClientRect();

    if (this.field.contentEditable === 'true') {
      // For contenteditable: Use TreeWalker to find text
      this.findAndHighlightInContentEditable(error, errorText, overlayRect, lineHeight);
    } else {
      // For textarea/input: Use the mirror method
      this.findAndHighlightInTextarea(error, errorText, overlayRect, lineHeight, fieldRect, computedStyle);
    }
  }

  findAndHighlightInContentEditable(error, errorText, overlayRect, lineHeight) {
    // Use TreeWalker to search through all text nodes
    const walker = document.createTreeWalker(
      this.field,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    // Get the field's visible viewport in viewport coordinates
    const fieldRect = this.field.getBoundingClientRect();
    const fieldTop = fieldRect.top;
    const fieldBottom = fieldRect.bottom;
    const fieldLeft = fieldRect.left;
    const fieldRight = fieldRect.right;

    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent;
      const index = this.findWholeWordIndex(text, errorText);

      if (index !== -1) {
        // Found the error text in this node
        try {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + errorText.length);

          const rects = range.getClientRects();

          if (rects && rects.length > 0) {
            // Handle multi-line errors
            Array.from(rects).forEach((rect, idx) => {
              if (rect.width > 0 && rect.height > 0) {
                // Check if this rect is within the field's visible viewport
                const isInViewport = 
                  rect.bottom > fieldTop &&
                  rect.top < fieldBottom &&
                  rect.right > fieldLeft &&
                  rect.left < fieldRight;

                if (!isInViewport) {
                  // Skip this highlight - it's scrolled out of view
                  return;
                }

                const left = rect.left - overlayRect.left;
                const top = rect.top - overlayRect.top;
                const width = rect.width;
                const height = Math.min(rect.height, lineHeight + 2);

                if (left >= 0 && top >= 0 && width > 0 && height > 0) {
                  this.createUnderlineElement(error, left, top, width, height, idx);
                }
              }
            });
            break; // Only highlight first occurrence
          }
        } catch (e) {
          // Silently skip if range creation fails
        }
      }
    }
  }

  findAndHighlightInTextarea(error, errorText, overlayRect, lineHeight, fieldRect, computedStyle) {
    // For textarea/input, we need to use the mirror technique
    const text = this.field.value;
    const index = this.findWholeWordIndex(text, errorText);

    if (index === -1) {
      return;
    }

    // Use mirror to get position
    const errorRect = this.getMirrorRect(index, errorText.length);

    if (!errorRect || errorRect.width === 0) {
      return;
    }

    // Calculate position relative to overlay
    const left = errorRect.left - overlayRect.left;
    const top = errorRect.top - overlayRect.top;
    let width = errorRect.width;
    let height = Math.min(errorRect.height, lineHeight + 2);

    // Validate dimensions
    const overlayWidth = this.overlay.offsetWidth;
    if (left < 0 || left >= overlayWidth) {
      return;
    }

    // Clamp width to overlay bounds
    if (left + width > overlayWidth) {
      width = overlayWidth - left;
    }

    if (width > 0 && height > 0) {
      this.createUnderlineElement(error, left, top, width, height);
    }
  }

  addUnderline(error, startIndex) {
    const text = this.getFieldText();
    const errorText = error.error;

    // Validate parameters
    if (!errorText || startIndex < 0 || startIndex >= text.length) {
      console.warn('Invalid parameters for addUnderline:', { errorText, startIndex, textLength: text.length });
      return;
    }

    // Verify the error text still exists at this position
    const actualTextAtPosition = text.substring(startIndex, startIndex + errorText.length);
    if (actualTextAtPosition !== errorText) {
      console.warn('Error text mismatch at position:', { expected: errorText, actual: actualTextAtPosition, startIndex });
      return;
    }

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
            const offsetInNode = startIndex - currentIndex;

            // VALIDATE before creating range
            if (offsetInNode < 0 || offsetInNode >= nodeLength) {
              console.warn('Invalid offsetInNode in addUnderline:', offsetInNode, 'nodeLength:', nodeLength);
              currentIndex += nodeLength;
              continue;
            }

            const endOffset = Math.min(offsetInNode + errorText.length, nodeLength);
            if (endOffset < offsetInNode || endOffset > nodeLength) {
              console.warn('Invalid endOffset in addUnderline:', endOffset);
              currentIndex += nodeLength;
              continue;
            }

            try {
              range = document.createRange();
              range.setStart(node, offsetInNode);
              range.setEnd(node, endOffset);

              // Use getClientRects to get more precise positioning for inline elements
              const rects = range.getClientRects();
              if (rects && rects.length > 0) {
                // For single-line errors, use the first (and only) rect
                errorRect = rects[0];
              } else if (range) {
                errorRect = range.getBoundingClientRect();
              }
            } catch (e) {
              console.error('Error creating range in addUnderline:', e);
              currentIndex += nodeLength;
              continue;
            }
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

    // CRITICAL: Account for field's internal scroll offset
    const scrollTop = this.field.scrollTop || 0;
    const scrollLeft = this.field.scrollLeft || 0;

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
    // Account for field padding since overlay is positioned inside padding box
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

    // SUBTRACT scroll offset because when you scroll down, content moves up
    // For contentEditable, don't subtract scrollLeft as it doesn't work the same way
    const leftOffset = this.field.contentEditable === 'true' ? 0 : scrollLeft;
    let left = errorRect.left - fieldRect.left - paddingLeft - leftOffset;
    // For contentEditable, don't subtract scrollTop since errorRect.top from getClientRects() already accounts for it
    // For input/textarea, we need to subtract scrollTop to position within the overlay
    const topOffset = this.field.contentEditable === 'true' ? 0 : scrollTop;
    let top = errorRect.top - fieldRect.top - paddingTop - topOffset;
    let width = errorRect.width;
    let height = errorRect.height;

    // STRICT height clamping - single line errors should never exceed line height + 2px
    // This prevents highlights from spanning multiple rows
    const maxHeight = lineHeight + 2;
    if (height > maxHeight) {
      height = Math.min(height, maxHeight);
      // If height was too large, the measurement was likely wrong - use canvas to measure width instead
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
      const textMetrics = context.measureText(errorText);
      width = textMetrics.width + 4; // Add 4px for slight padding
    }

    // Validate width against reasonable limits
    const maxReasonableWidth = fieldRect.width - left - 10;
    // Hard cap: never create highlights wider than 70% of the field width
    const absoluteMaxWidth = Math.min(maxReasonableWidth, fieldRect.width * 0.7);

    if (width > maxReasonableWidth || width > fieldRect.width * 0.8) {
      console.warn('Width too large, using canvas measurement:', errorText.substring(0, 50), 'Original width:', width);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
      const textMetrics = context.measureText(errorText);
      width = Math.min(textMetrics.width + 4, absoluteMaxWidth);
    }

    // Bounds checking and final width cap
    if (left < 0) left = 0;
    if (left + width > fieldRect.width) width = fieldRect.width - left;
    // Final safety check - never exceed 70% of field width
    if (width > absoluteMaxWidth) {
      width = absoluteMaxWidth;
    }

    if (width <= 0 || width > fieldRect.width || height <= 0) {
      console.warn('Invalid dimensions, skipping:', errorText, 'width:', width, 'height:', height);
      return;
    }

    this.createUnderlineElement(error, left, top, width, height);
  }

  addMultiLineUnderline(error, startIndex, errorRect, fieldRect, lineHeight) {
    // For errors spanning multiple lines, create underline segments per line
    // Use Range API to get client rects for each line
    const text = this.getFieldText();
    const errorText = error.error;

    // Get scroll offsets
    const scrollTop = this.field.scrollTop || 0;
    const scrollLeft = this.field.scrollLeft || 0;

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
            const rects = range.getClientRects();
            clientRects = rects ? Array.from(rects) : [];
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
      const leftOffset = this.field.contentEditable === 'true' ? 0 : scrollLeft;
      const topOffset = this.field.contentEditable === 'true' ? 0 : scrollTop;
      const left = Math.max(0, errorRect.left - fieldRect.left - leftOffset);
      const top = errorRect.top - fieldRect.top - topOffset;
      const width = Math.min(errorRect.width, fieldRect.width - left);
      this.createUnderlineElement(error, left, top, width, lineHeight);
      return;
    }

    // Create an underline for each line segment
    const leftOffsetForEditable = this.field.contentEditable === 'true' ? 0 : scrollLeft;
    const topOffsetForEditable = this.field.contentEditable === 'true' ? 0 : scrollTop;
    clientRects.forEach((rect, index) => {
      if (rect.width > 0 && rect.height > 0) {
        const left = Math.max(0, rect.left - fieldRect.left - leftOffsetForEditable);
        const top = rect.top - fieldRect.top - topOffsetForEditable;
        const width = Math.min(rect.width, fieldRect.width - left);
        // STRICT height clamping - never exceed lineHeight + 1px for each segment
        const height = Math.min(rect.height, lineHeight + 1);

        if (width > 0 && height > 0) {
          this.createUnderlineElement(error, left, top, width, height, index);
        }
      }
    });
  }

  createUnderlineElement(error, left, top, width, height, segmentIndex = 0) {
    // Create underline span that aligns with the text
    if (width <= 0 || height <= 0) {
      return;
    }

    // Get the field's actual visible viewport dimensions
    // clientHeight/clientWidth = visible area (what user sees)
    // scrollHeight/scrollWidth = total content area
    const visibleWidth = this.field.clientWidth;
    const visibleHeight = this.field.clientHeight;
    
    // Get padding to calculate the actual content area
    const computedStyle = window.getComputedStyle(this.field);
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    
    // Calculate the visible content area (excluding padding and scrollbar)
    const visibleContentWidth = visibleWidth - paddingLeft - paddingRight;
    const visibleContentHeight = visibleHeight - paddingTop - paddingBottom;
    
    // STRICT VISIBILITY CHECK: Only create if within visible content area
    const isCompletelyVisible = 
      left >= 0 && 
      top >= 0 && 
      (left + width) <= visibleContentWidth && 
      (top + height) <= visibleContentHeight;
    
    if (!isCompletelyVisible) {
      // Don't create highlight if any part is outside the visible viewport
      return;
    }

    const underline = document.createElement('span');
    underline.className = 'grammar-underline';

    // Store ORIGINAL positions (before any scroll adjustment)
    underline.dataset.originalLeft = left;
    underline.dataset.originalTop = top;
    underline.dataset.originalWidth = width;
    underline.dataset.originalHeight = height;

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
      overflow: hidden;
      box-sizing: border-box;
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
      // Check if overlay still exists before accessing properties
      if (!this.overlay || !this.overlay.parentNode) {
        return;
      }

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

      // Double-check overlay still exists (might have been removed while processing)
      if (!this.overlay || !this.overlay.parentNode) {
        return;
      }

      // Find which error (if any) the mouse is over
      // Triple-check overlay still exists before accessing properties
      if (!this.overlay || !this.overlay.parentNode) {
        return;
      }

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
        acceptNode: function (node) {
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

    // Get scroll offsets - these need to be subtracted from the final position
    const scrollTop = this.field.scrollTop || 0;
    const scrollLeft = this.field.scrollLeft || 0;

    // Use fixed positioning to match the field's current viewport position
    mirror.style.cssText = `
      position: fixed;
      top: ${fieldRect.top}px;
      left: ${fieldRect.left}px;
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
    // IMPORTANT: Convert ALL newlines to <br> tags, including in the error text
    const escapedBefore = this.escapeHtml(textBefore).replace(/\n/g, '<br>');
    const escapedError = this.escapeHtml(errorText).replace(/\n/g, '<br>');
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

    // Adjust rect for textarea's internal scroll offset
    // When textarea scrolls down, content moves up, so we subtract scrollTop
    // When textarea scrolls right, content moves left, so we subtract scrollLeft
    return {
      top: rect.top - scrollTop,
      bottom: rect.bottom - scrollTop,
      left: rect.left - scrollLeft,
      right: rect.right - scrollLeft,
      width: rect.width,
      height: rect.height,
      x: rect.x - scrollLeft,
      y: rect.y - scrollTop
    };
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
    // Get the field checker
    const checker = this.grammarChecker.attachedFields.get(this.field);
    
    // Set flag to prevent removing all highlights
    if (checker) {
      checker.isApplyingCorrection = true;
    }

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

      // Remove the error from the errors array
      checker.errors = checker.errors.filter(err => {
        const shouldRemove =
          err.error === fixedText ||
          err.error.includes(fixedText) ||
          fixedText.includes(err.error);
        return !shouldRemove;
      });

      // If no more underlines, remove the overlay entirely
      if (checker.overlay.querySelectorAll('.grammar-underline').length === 0) {
        checker.removeOverlay();
      }
    }

    // Immediately recalculate positions of remaining highlights
    // This prevents them from appearing in wrong positions after the text change
    if (checker && checker.overlay && checker.errors.length > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        checker.updateUnderlinePositions();
      });
    }

    // Reset flag after a short delay
    setTimeout(() => {
      if (checker) {
        checker.isApplyingCorrection = false;
      }
    }, 100);

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