// Text Field Assistant - Main coordinator
class TextFieldAssistant {
  constructor() {
    this.attachedFields = new WeakMap();
    this.currentTrigger = null;
    this.observer = null;
    this.activeToolbar = null;
    this.selectionPopup = null;
  }

  init() {
    console.log('🎯 Text Field Assistant initialized');
    this.detectExistingFields();
    this.observeNewFields();
    this.setupGlobalListeners();
  }

  detectExistingFields() {
    // Detect textarea, input[type=text], and contenteditable elements
    const fields = document.querySelectorAll(
      'textarea, input[type="text"], input[type="email"], [contenteditable="true"]'
    );
    
    fields.forEach(field => this.attachToField(field));
  }

  observeNewFields() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            if (this.isTextField(node)) {
              this.attachToField(node);
            }
            // Check children
            const fields = node.querySelectorAll?.(
              'textarea, input[type="text"], input[type="email"], [contenteditable="true"]'
            );
            fields?.forEach(field => this.attachToField(field));
          }
        });
      });
    });

    this.observer.observe(document.body, {
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
    // Skip if already attached
    if (this.attachedFields.has(field)) return;
    
    // Skip hidden or too small fields
    const rect = field.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 30) return;

    const trigger = new TriggerIcon(field, this);
    this.attachedFields.set(field, trigger);
  }

  setupGlobalListeners() {
    // Close toolbar when clicking outside
    document.addEventListener('mousedown', (e) => {
      if (this.activeToolbar && 
          !this.activeToolbar.element.contains(e.target) &&
          !e.target.closest('.ai-trigger-icon')) {
        this.closeToolbar();
      }
      
      // Close selection popup when clicking outside (but not on text fields)
      if (this.selectionPopup && 
          !this.selectionPopup.element.contains(e.target) &&
          !e.target.closest('textarea, input, [contenteditable="true"]')) {
        this.hideSelectionPopup();
      }
    });
    
    // Handle Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.activeToolbar) {
          this.closeToolbar();
        }
        if (this.selectionPopup) {
          this.hideSelectionPopup();
        }
      }
    });
  }

  showToolbar(trigger, field) {
    // Close existing toolbar
    if (this.activeToolbar) {
      this.closeToolbar();
    }
    
    this.currentTrigger = trigger;
    this.activeToolbar = new Toolbar(field, trigger.element);
    this.activeToolbar.show();
  }


  closeToolbar() {
    if (this.activeToolbar) {
      this.activeToolbar.hide();
      this.activeToolbar = null;
    }
    this.currentTrigger = null;
  }

  showSelectionPopup(selection, field) {
    // Hide any existing popup
    this.hideSelectionPopup();
    
    // Create new selection popup
    this.selectionPopup = new SelectionPopup(selection, field, this);
    this.selectionPopup.show();
  }

  hideSelectionPopup() {
    if (this.selectionPopup) {
      this.selectionPopup.hide();
      this.selectionPopup = null;
    }
  }
}

// Selection Popup - Appears next to selected text
class SelectionPopup {
  constructor(selection, field, assistant) {
    this.selection = selection;
    this.field = field;
    this.assistant = assistant;
    this.element = null;
    this.selectedText = selection.toString().trim();
    this.savedRange = selection.getRangeAt(0).cloneRange();
    this.services = new AIServices();
    this.create();
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'ai-selection-popup';
    this.element.innerHTML = `
      <button class="ai-selection-trigger-btn" data-action="improve" title="Improve">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" 
                fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
          <path d="M19 19L19.5 21L21 21.5L19.5 22L19 24L18.5 22L17 21.5L18.5 21L19 19Z" 
                fill="currentColor"/>
        </svg>
      </button>
    `;
    
    // Use fixed positioning to prevent affecting page layout
    // Position will be set in positionNearSelection()
    this.element.style.position = 'fixed';
    this.element.style.zIndex = '10001';
    this.element.style.pointerEvents = 'none'; // Will be enabled when visible
    
    document.body.appendChild(this.element);
    this.attachListeners();
  }

  attachListeners() {
    const btn = this.element.querySelector('[data-action="improve"]');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showToolbar();
    });
  }

  showToolbar() {
    // Replace button with full toolbar
    this.element.innerHTML = `
      <div class="ai-selection-toolbar">
        <button class="ai-selection-compact-btn" data-action="fix" title="Fix">✓</button>
        <button class="ai-selection-compact-btn" data-action="clear" title="Clear">💡</button>
        <button class="ai-selection-compact-btn" data-action="casual" title="Casual">😊</button>
        <button class="ai-selection-compact-btn" data-action="formal" title="Formal">👔</button>
        <button class="ai-selection-compact-btn" data-action="shorter" title="Shorter">✂️</button>
        <button class="ai-selection-compact-btn" data-action="rephrase" title="Rephrase">🔄</button>
        <button class="ai-selection-compact-btn" data-action="translate" title="Translate">🌐</button>
        <button class="ai-selection-compact-btn ai-selection-primary" data-action="ai" title="AI">✨</button>
      </div>
    `;

    // Re-center after expanding
    setTimeout(() => this.positionNearSelection(), 10);

    // Reattach listeners for toolbar buttons
    this.element.querySelectorAll('.ai-selection-compact-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleAction(btn.dataset.action);
      });
    });
  }



  async handleAction(action) {
    const text = this.selectedText;
    
    if (!text || !text.trim()) {
      alert('No text selected');
      return;
    }
    
    if (action === 'ai') {
      this.openAIAssist(text);
      this.assistant.hideSelectionPopup();
      return;
    }
    
    // Show loading state
    this.showLoadingState(action);
    
    try {
      let result;
      switch (action) {
        case 'fix':
          result = await this.services.fixGrammar(text);
          break;
        case 'clear':
          result = await this.services.rewriteTone(text, 'clear');
          break;
        case 'casual':
          result = await this.services.rewriteTone(text, 'casual');
          break;
        case 'formal':
          result = await this.services.rewriteTone(text, 'formal');
          break;
        case 'shorter':
          result = await this.services.rewriteTone(text, 'concise');
          break;
        case 'rephrase':
          result = await this.services.rephrase(text);
          break;
        case 'translate':
          result = await this.services.translate(text);
          break;
      }

      // Ensure result is valid
      if (!result || !result.trim()) {
        throw new Error('AI returned empty response');
      }

      // Replace selected text with result
      this.replaceSelection(result);
      this.assistant.hideSelectionPopup();
    } catch (error) {
      console.error('Selection action error:', error);
      alert('Failed to process: ' + (error.message || 'Unknown error'));
      // Restore button state
      const btn = this.element.querySelector('.loading');
      if (btn && btn.dataset.originalContent) {
        btn.innerHTML = btn.dataset.originalContent;
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    }
  }

  showLoadingState(action) {
    const btn = this.element.querySelector(`[data-action="${action}"]`);
    if (btn) {
      btn.disabled = true;
      btn.classList.add('loading');
      const originalContent = btn.innerHTML;
      btn.dataset.originalContent = originalContent;
      btn.innerHTML = '<div class="ai-selection-spinner"></div>';
    }
  }

  hideLoadingState() {
    // Just close the popup when done
    this.assistant.hideSelectionPopup();
  }

  replaceSelection(newText) {
    if (this.field.contentEditable === 'true') {
      const selection = this.field.ownerDocument.defaultView.getSelection();
      selection.removeAllRanges();
      selection.addRange(this.savedRange);
      document.execCommand('insertText', false, newText);
    } else {
      // For input/textarea
      const start = this.field.value.indexOf(this.selectedText);
      if (start !== -1) {
        const before = this.field.value.substring(0, start);
        const after = this.field.value.substring(start + this.selectedText.length);
        this.field.value = before + newText + after;
        this.field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  openAIAssist(text) {
    chrome.runtime.sendMessage({
      action: 'openSidePanel'
    });
    
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'aiAssistChat',
        text: text
      });
    }, 800);
  }

  positionNearSelection() {
    const range = this.savedRange;
    const rect = range.getBoundingClientRect();
    
    // Position below the selection (using fixed positioning, so no need for scrollY)
    this.element.style.top = `${rect.bottom + 5}px`;
    
    // Center horizontally on the selection
    const selectionCenter = rect.left + (rect.width / 2);
    const popupWidth = this.element.offsetWidth || 300;
    let left = selectionCenter - (popupWidth / 2);
    
    // Ensure it stays on screen (using viewport coordinates)
    const minLeft = 10;
    const maxLeft = window.innerWidth - popupWidth - 10;
    left = Math.max(minLeft, Math.min(left, maxLeft));
    
    this.element.style.left = `${left}px`;
  }

  show() {
    // Need to add to DOM first, then position, then show
    setTimeout(() => {
      this.positionNearSelection();
      this.element.style.pointerEvents = 'all'; // Enable interactions
      this.element.classList.add('visible');
    }, 10);
  }

  hide() {
    this.element.classList.remove('visible');
    setTimeout(() => {
      this.element.remove();
    }, 200);
  }
}

// Trigger Icon - Floating sparkle button
class TriggerIcon {
  constructor(field, assistant) {
    this.field = field;
    this.assistant = assistant;
    this.element = null;
    this.visible = false;
    this.lockUntil = 0; // timestamp to prevent jittery repositioning
    this.initialFieldRect = null; // Store initial field position
    this.create();
    this.attachListeners();
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'ai-trigger-icon';
    this.element.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" 
              fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
        <path d="M19 19L19.5 21L21 21.5L19.5 22L19 24L18.5 22L17 21.5L18.5 21L19 19Z" 
              fill="currentColor"/>
      </svg>
    `;
    
    // Use fixed positioning to prevent drift with scrolling content
    this.element.style.position = 'fixed';
    this.element.style.zIndex = '10000';
    this.element.style.pointerEvents = 'all';
    this.updatePosition();
    
    document.body.appendChild(this.element);
  }

  attachListeners() {
    // Show on field focus/hover
    this.field.addEventListener('focus', () => this.show());
    this.field.addEventListener('mouseenter', () => this.show());
    
    // Hide on blur (with delay), but do not change position here
    this.field.addEventListener('blur', () => {
      setTimeout(() => {
        if (!this.element.matches(':hover')) {
          this.hide();
        }
      }, 200);
    });
    
    // Click to toggle toolbar
    this.element.addEventListener('click', (e) => {
      e.stopPropagation();
      // lock position briefly to avoid jump when toolbar shows
      this.lockUntil = Date.now() + 300;
      this.assistant.showToolbar(this, this.field);
    });
    
    // Listen for text selection in the field
    this.field.addEventListener('mouseup', () => this.handleSelection());
    this.field.addEventListener('keyup', () => this.handleSelection());
    
    // Update position ONLY on window scroll/resize (not field scroll or content changes)
    // This keeps button fixed at field's visual boundary
    const scrollHandler = (e) => {
      // Only update if the scroll is from document/window, not from the text field
      if (e.target === document || e.target === document.documentElement || e.target === document.body) {
        this.updatePosition(true); // force recalc on page scroll
      }
    };
    window.addEventListener('scroll', scrollHandler, true);
    window.addEventListener('resize', () => this.updatePosition(true)); // force recalc on window resize
    
    // DO NOT observe field resize - we want to stay locked to initial field bounds
    // even if content grows/shrinks inside
  }

  handleSelection() {
    const selection = this.field.ownerDocument.defaultView.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selection.rangeCount > 0) {
      // Show selection popup near the selected text
      this.assistant.showSelectionPopup(selection, this.field);
    } else {
      // Hide selection popup if no text is selected
      this.assistant.hideSelectionPopup();
    }
  }

  updatePosition(forceRecalc = false) {
    // During a short lock window, skip recalculation to avoid flash/jump
    if (Date.now() < this.lockUntil) return;

    // If we have a stored position and not forcing recalc, keep using it
    if (this.initialFieldRect && !forceRecalc) {
      const iconW = this.element.offsetWidth || 16;
      const iconH = this.element.offsetHeight || 16;
      
      // Use the STORED initial position - don't let field growth move the button
      this.element.style.top = `${Math.round(this.initialFieldRect.bottom - iconH - 4)}px`;
      this.element.style.left = `${Math.round(this.initialFieldRect.right - iconW - 4)}px`;
      return;
    }

    // First time or forced: capture the field's current viewport position
    const rect = this.field.getBoundingClientRect();
    
    // Check for existing buttons near bottom-right corner
    const offsetFromRight = this.detectExistingButtons(rect);
    
    this.initialFieldRect = {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right - offsetFromRight
    };

    const iconW = this.element.offsetWidth || 16;
    const iconH = this.element.offsetHeight || 16;

    // Position with 4px padding from edges
    this.element.style.top = `${Math.round(this.initialFieldRect.bottom - iconH - 4)}px`;
    this.element.style.left = `${Math.round(this.initialFieldRect.right - iconW - 4)}px`;
  }
  
  detectExistingButtons(fieldRect) {
    // Look for buttons, icons, or interactive elements near the bottom-right
    // of the field (within the field's container or nearby)
    const fieldElement = this.field;
    const parent = fieldElement.parentElement;
    
    if (!parent) return 0;
    
    // Find all buttons, clickable elements near the field's bottom-right
    const potentialButtons = parent.querySelectorAll('button, [role="button"], .icon, [class*="button"], [class*="icon"], [class*="action"]');
    
    let maxOffset = 0;
    
    potentialButtons.forEach(btn => {
      if (btn === this.element) return; // skip our own button
      
      const btnRect = btn.getBoundingClientRect();
      
      // Check if button is in the bottom-right area of the field
      const isInBottomRight = 
        btnRect.top >= fieldRect.top + (fieldRect.height * 0.6) && // bottom 40% of field
        btnRect.left >= fieldRect.left + (fieldRect.width * 0.6) && // right 40% of field
        btnRect.right <= fieldRect.right + 50; // within or just outside field's right edge
      
      if (isInBottomRight) {
        // Calculate how much space this button takes from the right
        const buttonOffsetFromRight = fieldRect.right - btnRect.left + 8; // 8px gap
        maxOffset = Math.max(maxOffset, buttonOffsetFromRight);
      }
    });
    
    return maxOffset;
  }

  show() {
    this.visible = true;
    this.element.classList.add('visible');
    this.updatePosition();
  }

  hide() {
    this.visible = false;
    this.element.classList.remove('visible');
  }
}

// Toolbar - Expandable button panel
class Toolbar {
  constructor(field, triggerElement) {
    this.field = field;
    this.triggerElement = triggerElement;
    this.element = null;
    this.expanded = false;
    this.services = new AIServices();
    this.selectedText = null; // Store selected text
    this.captureSelection(); // Capture it immediately
    this.create();
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'ai-toolbar';
    
    this.element.innerHTML = `
      <div class="ai-selection-toolbar">
        <button class="ai-selection-compact-btn" data-action="fix" title="Fix">✓</button>
        <button class="ai-selection-compact-btn" data-action="clear" title="Clear">💡</button>
        <button class="ai-selection-compact-btn" data-action="casual" title="Casual">😊</button>
        <button class="ai-selection-compact-btn" data-action="formal" title="Formal">👔</button>
        <button class="ai-selection-compact-btn" data-action="shorter" title="Shorter">✂️</button>
        <button class="ai-selection-compact-btn" data-action="rephrase" title="Rephrase">🔄</button>
        <button class="ai-selection-compact-btn" data-action="translate" title="Translate">🌐</button>
        <button class="ai-selection-compact-btn ai-selection-primary" data-action="ai" title="AI">✨</button>
      </div>
      <div class="ai-toolbar-result" style="display: none;">
        <div class="ai-toolbar-result-content"></div>
        <div class="ai-toolbar-result-actions">
          <button class="ai-toolbar-result-btn" data-action="apply">Apply</button>
          <button class="ai-toolbar-result-btn ai-toolbar-result-btn-secondary" data-action="cancel">Cancel</button>
        </div>
      </div>
    `;

    // Use fixed positioning to prevent affecting page layout
    this.element.style.position = 'fixed';
    this.element.style.zIndex = '10001';
    
    document.body.appendChild(this.element);
    this.updatePosition();
    this.attachListeners();
  }

  attachListeners() {
    // Action buttons - now using compact buttons
    this.element.querySelectorAll('.ai-selection-compact-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleAction(btn.dataset.action);
      });
    });

    // Result actions
    this.element.querySelector('[data-action="apply"]')?.addEventListener('click', () => {
      this.applyResult();
    });

    this.element.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      this.hideResult();
    });
  }

  updatePosition() {
    const rect = this.triggerElement.getBoundingClientRect();
    const toolbarWidth = this.element.offsetWidth || 320;
    
    // Use fixed positioning (viewport coordinates, no scroll offset needed)
    // Position to the LEFT of the trigger icon (since it's bottom-right corner)
    this.element.style.left = `${rect.left - toolbarWidth - 10}px`;
    
    // Align vertically with the trigger
    this.element.style.top = `${rect.top}px`;
  }

  async handleAction(action) {
    const text = this.getFieldText();
    
    // AI button - just open panel and close toolbar, no processing
    if (action === 'ai') {
      this.openAIAssist(text);
      // Close the toolbar completely
      this.field.ownerDocument.defaultView.textFieldAssistant.closeToolbar();
      return;
    }
    
    if (!text.trim()) {
      this.showError('Please enter some text first');
      return;
    }

    this.showLoading(action);

    try {
      let result;
      switch (action) {
        case 'fix':
          result = await this.services.fixGrammar(text);
          break;
        case 'clear':
          result = await this.services.rewriteTone(text, 'clear');
          break;
        case 'casual':
          result = await this.services.rewriteTone(text, 'casual');
          break;
        case 'formal':
          result = await this.services.rewriteTone(text, 'formal');
          break;
        case 'shorter':
          result = await this.services.rewriteTone(text, 'concise');
          break;
        case 'rephrase':
          result = await this.services.rephrase(text);
          break;
        case 'translate':
          result = await this.services.translate(text);
          break;
      }

      this.showResult(result);
    } catch (error) {
      this.showError('Failed to process. Please try again.');
      console.error('Toolbar action error:', error);
    }
  }

  showLoading(action) {
    const labels = {
      fix: 'Fixing...',
      clear: 'Clarifying...',
      casual: 'Rewriting...',
      formal: 'Formalizing...',
      shorter: 'Condensing...',
      rephrase: 'Rephrasing...'
    };

    const resultDiv = this.element.querySelector('.ai-toolbar-result');
    const contentDiv = this.element.querySelector('.ai-toolbar-result-content');
    
    contentDiv.innerHTML = `
      <div class="ai-toolbar-loading">
        <div class="ai-toolbar-spinner"></div>
        <span>${labels[action] || 'Processing...'}</span>
      </div>
    `;
    
    resultDiv.style.display = 'block';
  }

  showResult(text) {
    const contentDiv = this.element.querySelector('.ai-toolbar-result-content');
    contentDiv.innerHTML = `
      <div class="ai-toolbar-comparison">
        <div class="ai-toolbar-improved">
          <div class="ai-toolbar-text">${this.escapeHtml(text)}</div>
        </div>
      </div>
    `;
    
    this.improvedText = text;
  }

  showError(message) {
    const contentDiv = this.element.querySelector('.ai-toolbar-result-content');
    contentDiv.innerHTML = `
      <div class="ai-toolbar-error">
        <span class="ai-toolbar-error-icon">⚠️</span>
        <span>${message}</span>
      </div>
    `;
    
    const resultDiv = this.element.querySelector('.ai-toolbar-result');
    resultDiv.style.display = 'block';
    
    setTimeout(() => this.hideResult(), 3000);
  }

  hideResult() {
    const resultDiv = this.element.querySelector('.ai-toolbar-result');
    resultDiv.style.display = 'none';
    this.improvedText = null;
  }

  applyResult() {
    if (this.improvedText) {
      this.setFieldText(this.improvedText);
      this.hideResult();
      
      // Clear grammar highlights immediately
      this.clearGrammarHighlights();
      
      // Show success feedback
      const btn = this.element.querySelector('[data-action="apply"]');
      const originalText = btn.textContent;
      btn.textContent = '✓ Applied';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1500);
    }
  }
  
  clearGrammarHighlights() {
    // Get the grammar checker for this field and clear its overlay
    if (window.grammarChecker) {
      const checker = window.grammarChecker.attachedFields.get(this.field);
      if (checker) {
        checker.removeOverlay();
        // Reset last checked text to force recheck on next input
        checker.lastCheckedText = '';
      }
    }
  }

  openAIAssist(text) {
    // Open side panel and switch to chat with pre-filled message
    chrome.runtime.sendMessage({
      action: 'openSidePanel'
    });
    
    // Longer delay to ensure panel is fully open, then switch to chat and pre-fill
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'aiAssistChat',
        text: text
      });
    }, 800);
  }

  captureSelection() {
    // Capture any selected text immediately when toolbar is created
    const selection = this.field.ownerDocument.defaultView.getSelection();
    if (selection && selection.toString().trim()) {
      this.selectedText = selection.toString().trim();
      
      // Store the range to restore selection later
      if (selection.rangeCount > 0) {
        this.savedRange = selection.getRangeAt(0).cloneRange();
      }
      
      console.log('🎯 Captured selection:', this.selectedText.substring(0, 50) + '...');
    }
  }

  getFieldText() {
    // First, check if we captured selected text when toolbar was opened
    if (this.selectedText) {
      return this.selectedText;
    }
    
    // Fall back to full field content
    // Always use value for input/textarea, textContent for contenteditable
    if (this.field.contentEditable === 'true') {
      return this.field.textContent;
    }
    return this.field.value;
  }

  setFieldText(text) {
    if (this.field.contentEditable === 'true') {
      // For contenteditable, preserve structure by replacing only text nodes
      // or use innerHTML with proper line break conversion
      const lines = text.split('\n');
      const html = lines.map(line => line || '<br>').join('<br>');
      this.field.innerHTML = html;
      
      // Move cursor to end
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(this.field);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {
        // Ignore cursor positioning errors
      }
    } else {
      this.field.value = text;
    }
    
    // Trigger input event for frameworks like React
    this.field.dispatchEvent(new Event('input', { bubbles: true }));
    this.field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  show() {
    this.element.classList.add('visible');
    setTimeout(() => {
      this.element.classList.add('expanded');
      this.expanded = true;
      
      // Restore selection after toolbar appears
      this.restoreSelection();
    }, 50);
  }

  restoreSelection() {
    if (this.savedRange) {
      try {
        const selection = this.field.ownerDocument.defaultView.getSelection();
        selection.removeAllRanges();
        selection.addRange(this.savedRange);
        console.log('✨ Restored text selection');
      } catch (e) {
        console.log('⚠️ Could not restore selection:', e);
      }
    }
  }

  hide() {
    this.element.classList.remove('expanded');
    setTimeout(() => {
      this.element.classList.remove('visible');
      this.element.remove();
    }, 300);
  }
}

// AI Services - Handles all AI API calls
class AIServices {
  constructor() {
    this.cache = new Map();
  }

  async fixGrammar(text) {
    const prompt = `Fix grammar and spelling errors in this text. Return ONLY the corrected text, no explanations, no options, no numbering:

${text}

Corrected version:`;
    return this.callAI(prompt, 'grammar');
  }

  async rewriteTone(text, tone) {
    const prompts = {
      clear: `Rewrite this to be clearer. Return ONLY the rewritten text, no explanations:

${text}

Rewritten:`,
      casual: `Rewrite this in a casual, friendly tone. Return ONLY the rewritten text, no explanations:

${text}

Rewritten:`,
      formal: `Rewrite this in a professional, formal tone. Return ONLY the rewritten text, no explanations:

${text}

Rewritten:`,
      concise: `Make this more concise. Return ONLY the shortened text, no explanations:

${text}

Concise version:`
    };
    
    return this.callAI(prompts[tone], `tone_${tone}`);
  }

  async rephrase(text) {
    const prompt = `Rephrase this text differently while keeping the same meaning. Return ONLY the rephrased text, no explanations:

${text}

Rephrased:`;
    return this.callAI(prompt, 'rephrase');
  }

  async translate(text) {
    console.log('🌐 Starting translation for text:', text.substring(0, 50) + '...');
    
    if (!text || !text.trim()) {
      throw new Error('No text provided for translation');
    }
    
    // Get user's translation language from storage
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['targetLanguage'], async (data) => {
        const langCode = data.targetLanguage || 'es';
        console.log('🌐 Target language code:', langCode);
        
        // Map language codes to full names
        const languageNames = {
          'en': 'English',
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German',
          'zh': 'Chinese',
          'ja': 'Japanese',
          'ko': 'Korean',
          'pt': 'Portuguese',
          'ru': 'Russian',
          'ar': 'Arabic',
          'hi': 'Hindi',
          'it': 'Italian'
        };
        
        const targetLang = languageNames[langCode] || 'Spanish';
        console.log('🌐 Target language name:', targetLang);
        
        // Better language detection - check if majority is ASCII
        const asciiChars = text.replace(/[^a-zA-Z]/g, '').length;
        const totalChars = text.replace(/[^a-zA-Z\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0400-\u04ff]/g, '').length;
        const isEnglish = totalChars > 0 && (asciiChars / totalChars) > 0.7;
        
        console.log('🌐 Is English:', isEnglish, `(${asciiChars}/${totalChars} ASCII chars)`);
        
        let prompt;
        if (isEnglish && langCode !== 'en') {
          // English to target language
          prompt = `Translate this English text to ${targetLang}. Return ONLY the translated text, no explanations:

${text}

Translated:`;
        } else if (!isEnglish && langCode === 'en') {
          // Non-English to English (but user wants English, so no translation needed)
          prompt = `Translate this text to English. Return ONLY the translated text, no explanations:

${text}

Translated:`;
        } else if (!isEnglish && langCode !== 'en') {
          // Non-English to another language - translate to English first, then to target
          prompt = `Translate this text to ${targetLang}. Return ONLY the translated text, no explanations:

${text}

Translated:`;
        } else {
          // English to English - shouldn't happen, just return as is
          return Promise.resolve(text);
        }
        
        console.log('🌐 Translation prompt created, length:', prompt.length);
        
        try {
          const result = await this.callAI(prompt, null); // Don't cache translations
          console.log('✅ Translation result:', result.substring(0, 50) + '...');
          resolve(result.trim());
        } catch (error) {
          console.error('❌ Translation error:', error);
          reject(error);
        }
      });
    });
  }

  async callAI(prompt, cacheKey = null) {
    // Check cache
    if (cacheKey && this.cache.has(prompt)) {
      console.log('\u2705 Using cached response');
      return this.cache.get(prompt);
    }

    console.log('\ud83d\udce4 Sending AI request:', { action: 'generateContent', task: 'textAssist' });
    
    // Send to background script to call Google AI
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'generateContent',
        task: 'textAssist',
        prompt: prompt
      }, (response) => {
        console.log('\ud83d\udce5 Received response:', response);
        
        if (chrome.runtime.lastError) {
          console.error('\u274c Chrome runtime error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response?.result) {
          console.log('\u2705 AI response successful');
          // Cache result as-is
          if (cacheKey) {
            this.cache.set(prompt, response.result);
          }
          resolve(response.result);
        } else if (response?.error) {
          console.error('\u274c API error:', response.error);
          reject(new Error(response.error));
        } else {
          console.error('\u274c No result in response');
          reject(new Error('AI call failed - no result returned'));
        }
      });
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.textFieldAssistant = new TextFieldAssistant();
    window.textFieldAssistant.init();
  });
} else {
  window.textFieldAssistant = new TextFieldAssistant();
  window.textFieldAssistant.init();
}
