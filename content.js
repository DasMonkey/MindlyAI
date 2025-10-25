// Content script - runs on all pages
let floatingPopup = null;
let selectedText = '';

// Check if side panel is open and adjust popup position
function checkSidePanelAndAdjustPopup() {
  if (!floatingPopup) return;
  
  // Check if Chrome side panel is open by looking at viewport width changes
  const viewportWidth = window.innerWidth;
  const popupRect = floatingPopup.getBoundingClientRect();
  
  // If popup is too close to the right edge (likely hidden by side panel)
  if (popupRect.right > viewportWidth - 50) {
    // Move popup to the left
    const newRight = viewportWidth - 20;
    floatingPopup.style.right = '20px';
    floatingPopup.style.left = 'auto';
  }
}

// Monitor window resize to detect side panel
window.addEventListener('resize', () => {
  checkSidePanelAndAdjustPopup();
});

// Create floating popup on page load
function createFloatingPopup() {
  if (floatingPopup) return;

  floatingPopup = document.createElement('div');
  floatingPopup.id = 'ai-assistant-popup';
  floatingPopup.innerHTML = `
    <div class="ai-popup-header">
      <span class="ai-popup-title">✨ AI Assistant</span>
      <button class="ai-popup-toggle" title="Minimize/Expand">−</button>
    </div>
    <div class="ai-popup-content">
      <button class="ai-btn" data-action="summarize">
        <span class="ai-btn-icon">📄</span>
        Summarize Page
      </button>
      <button class="ai-btn" data-action="translate-page">
        <span class="ai-btn-icon">🌐</span>
        Translate Page
      </button>
      <button class="ai-btn" data-action="translate-selection">
        <span class="ai-btn-icon">🔤</span>
        Translate Text
      </button>
      <button class="ai-btn" data-action="mindmap">
        <span class="ai-btn-icon">🧠</span>
        Create Mindmap
      </button>
      <button class="ai-btn" data-action="social-content">
        <span class="ai-btn-icon">📱</span>
        Social Content
      </button>
      <button class="ai-btn" data-action="save-bookmark">
        <span class="ai-btn-icon">🔖</span>
        Save Bookmark
      </button>
      <button class="ai-btn ai-btn-primary" data-action="call-mindy">
        <span class="ai-btn-icon">🎤</span>
        Call Mindy
      </button>
      <div class="ai-btn-row">
        <button class="ai-btn ai-btn-tts" data-action="text-to-speech">
          <span class="ai-btn-icon">🔊</span>
          Text to Speech
        </button>
        <button class="ai-btn-control" data-action="tts-control" title="Play/Pause" style="display: none;">
          <span class="ai-control-icon">⏸</span>
        </button>
      </div>
      <button class="ai-btn ai-btn-secondary" data-action="open-panel">
        <span class="ai-btn-icon">📊</span>
        Open Dashboard
      </button>
    </div>
  `;

  document.body.appendChild(floatingPopup);

  // Make draggable
  makeDraggable(floatingPopup);

  // Add event listeners
  const toggleBtn = floatingPopup.querySelector('.ai-popup-toggle');
  const content = floatingPopup.querySelector('.ai-popup-content');
  
  // Restore collapsed state from localStorage
  const isCollapsed = localStorage.getItem('ai-popup-collapsed') === 'true';
  if (isCollapsed) {
    content.classList.add('collapsed');
    toggleBtn.textContent = '+';
  }
  
  toggleBtn.addEventListener('click', () => {
    content.classList.toggle('collapsed');
    const collapsed = content.classList.contains('collapsed');
    toggleBtn.textContent = collapsed ? '+' : '−';
    // Save state to localStorage
    localStorage.setItem('ai-popup-collapsed', collapsed);
  });

  // Button handlers
  floatingPopup.querySelectorAll('.ai-btn').forEach(btn => {
    btn.addEventListener('click', handleButtonClick);
  });
  
  // Initial check for side panel
  setTimeout(() => checkSidePanelAndAdjustPopup(), 100);
}

function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = element.querySelector('.ai-popup-header');

  header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

async function handleButtonClick(e) {
  const action = e.currentTarget.dataset.action;
  
  switch (action) {
    case 'summarize':
      await summarizePage();
      break;
    case 'translate-page':
      await translatePage();
      break;
    case 'translate-selection':
      await translateSelection();
      break;
    case 'mindmap':
      await createMindmap();
      break;
    case 'social-content':
      await generateSocialContent();
      break;
    case 'save-bookmark':
      await saveBookmark();
      break;
    case 'text-to-speech':
      await textToSpeech();
      break;
    case 'tts-control':
      toggleTTSPlayback();
      break;
    case 'call-mindy':
      // Open sidebar and switch to Mindy tab
      chrome.runtime.sendMessage({ action: 'openSidePanel' });
      chrome.runtime.sendMessage({ action: 'switchToMindy' });
      break;
    case 'chat-page':
      chrome.runtime.sendMessage({ action: 'openSidePanel' });
      chrome.runtime.sendMessage({ action: 'switchToChat' });
      break;
    case 'open-panel':
      chrome.runtime.sendMessage({ action: 'openSidePanel' });
      break;
  }
}

// Track text selection
let selectedHTML = '';
document.addEventListener('mouseup', () => {
  selectedText = window.getSelection().toString().trim();
  
  // Also capture HTML structure
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    selectedHTML = container.innerHTML;
  }
});

async function summarizePage() {
  const content = document.body.innerText.substring(0, 5000); // Limit content
  chrome.runtime.sendMessage({
    action: 'generateContent',
    task: 'summarize',
    content: content,
    url: window.location.href,
    title: document.title
  });
  chrome.runtime.sendMessage({ action: 'openSidePanel' });
}

async function translatePage() {
  try {
    // Show loading indicator on button
    const translateBtn = document.querySelector('[data-action="translate-page"]');
    if (!translateBtn) return;
    
    const originalHTML = translateBtn.innerHTML;
    translateBtn.innerHTML = '<span class="ai-btn-icon">⏳</span> Translating...';
    translateBtn.disabled = true;
    
    // Get target language
    const data = await chrome.storage.local.get(['targetLanguage']);
    const langCode = data.targetLanguage || 'es';
    
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
    
    // Get all visible text elements on the page
    const textElements = [];
    const selectors = 'p, h1, h2, h3, h4, h5, h6, li, td, th, span, a, button, label, div';
    document.querySelectorAll(selectors).forEach(el => {
      // Only get elements with direct text content (not just children)
      const directText = Array.from(el.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .join(' ')
        .trim();
      
      if (directText && directText.length > 3) {
        textElements.push({ element: el, text: directText });
      }
    });
    
    // Process in chunks to translate entire page
    translateInChunks(textElements, targetLang, translateBtn, originalHTML);
  } catch (error) {
    console.error('Error in translatePage:', error);
    showNotification('Translation failed: ' + error.message);
    const translateBtn = document.querySelector('[data-action="translate-page"]');
    if (translateBtn) {
      translateBtn.innerHTML = '<span class="ai-btn-icon">🌐</span> Translate Page';
      translateBtn.disabled = false;
    }
  }
}

// Translate page elements in chunks
async function translateInChunks(textElements, targetLang, translateBtn, originalHTML) {
  const CHUNK_SIZE = 30; // Translate 30 elements at a time
  let totalTranslated = 0;
  
  // Split into chunks
  const chunks = [];
  for (let i = 0; i < textElements.length; i += CHUNK_SIZE) {
    chunks.push(textElements.slice(i, i + CHUNK_SIZE));
  }
  
  console.log(`🌐 Translating ${textElements.length} elements in ${chunks.length} chunks`);
  showNotification(`🌐 Translating page... (0/${chunks.length} chunks)`);
  
  // Process chunks sequentially
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    
    // Create batch translation prompt
    const textList = chunk.map((item, i) => `[${i}] ${item.text}`).join('\n');
    const prompt = `Translate these text items to ${targetLang}. Keep the [index] markers and return each translation on a new line with its index. Only translate the text, no explanations:\n\n${textList}\n\nTranslated:`;
    
    try {
      // Use promise to wait for response
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'generateContent',
          task: 'textAssist',
          prompt: prompt
        }, resolve);
      });
      
      if (response?.result) {
        // Parse translations
        const lines = response.result.split('\n');
        const translations = {};
        
        lines.forEach(line => {
          const match = line.match(/^\[(\d+)\]\s*(.+)$/);
          if (match) {
            translations[match[1]] = match[2].trim();
          }
        });
        
        // Apply translations
        chunk.forEach((item, i) => {
          if (translations[i]) {
            // Find and replace text nodes
            Array.from(item.element.childNodes).forEach(node => {
              if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                node.textContent = translations[i];
                totalTranslated++;
              }
            });
          }
        });
        
        // Update progress
        showNotification(`🌐 Translating... (${chunkIndex + 1}/${chunks.length} chunks)`);
      }
    } catch (error) {
      console.error('Translation chunk error:', error);
    }
    
    // Small delay between chunks to avoid rate limits
    if (chunkIndex < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Done!
  translateBtn.innerHTML = originalHTML;
  translateBtn.disabled = false;
  showNotification(`✅ Translated ${totalTranslated} elements! (Reload to restore)`);
}

async function translateSelection() {
  if (!selectedText) {
    alert('Please select some text first!');
    return;
  }
  
  // Show loading indicator on button
  const translateBtn = document.querySelector('[data-action="translate-selection"]');
  const originalHTML = translateBtn.innerHTML;
  translateBtn.innerHTML = '<span class="ai-btn-icon">⏳</span> Translating...';
  translateBtn.disabled = true;
  
  try {
    // Get target language from storage
    const data = await chrome.storage.local.get(['targetLanguage']);
    const langCode = data.targetLanguage || 'es';
    
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
    
    // Better language detection
    const asciiChars = selectedText.replace(/[^a-zA-Z]/g, '').length;
    const totalChars = selectedText.replace(/[^a-zA-Z\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0400-\u04ff]/g, '').length;
    const isEnglish = totalChars > 0 && (asciiChars / totalChars) > 0.7;
    
    // Check if we have HTML structure
    const hasHTML = selectedHTML && selectedHTML !== selectedText && selectedHTML.includes('<');
    
    let prompt;
    if (hasHTML) {
      // Preserve HTML structure
      if (isEnglish && langCode !== 'en') {
        prompt = `Translate this HTML content to ${targetLang}. Preserve all HTML tags (<p>, <br>, <div>, <strong>, etc.) exactly as they are. Only translate the text content inside the tags. Return valid HTML:\n\n${selectedHTML}\n\nTranslated HTML:`;
      } else if (!isEnglish && langCode === 'en') {
        prompt = `Translate this HTML content to English. Preserve all HTML tags (<p>, <br>, <div>, <strong>, etc.) exactly as they are. Only translate the text content inside the tags. Return valid HTML:\n\n${selectedHTML}\n\nTranslated HTML:`;
      } else if (!isEnglish && langCode !== 'en') {
        prompt = `Translate this HTML content to ${targetLang}. Preserve all HTML tags (<p>, <br>, <div>, <strong>, etc.) exactly as they are. Only translate the text content inside the tags. Return valid HTML:\n\n${selectedHTML}\n\nTranslated HTML:`;
      }
    } else {
      // Plain text translation
      if (isEnglish && langCode !== 'en') {
        prompt = `Translate this English text to ${targetLang}. Return ONLY the translated text, no explanations:\n\n${selectedText}\n\nTranslated:`;
      } else if (!isEnglish && langCode === 'en') {
        prompt = `Translate this text to English. Return ONLY the translated text, no explanations:\n\n${selectedText}\n\nTranslated:`;
      } else if (!isEnglish && langCode !== 'en') {
        prompt = `Translate this text to ${targetLang}. Return ONLY the translated text, no explanations:\n\n${selectedText}\n\nTranslated:`;
      } else {
        alert('Text is already in target language');
        translateBtn.innerHTML = originalHTML;
        translateBtn.disabled = false;
        return;
      }
    }
    
    // Use fast background method
    chrome.runtime.sendMessage({
      action: 'generateContent',
      task: 'textAssist',
      prompt: prompt
    }, (response) => {
      translateBtn.innerHTML = originalHTML;
      translateBtn.disabled = false;
      
      if (response?.result) {
        // Replace selected text with translation
        if (hasHTML) {
          replaceSelectedHTML(response.result.trim());
        } else {
          replaceSelectedText(response.result.trim());
        }
        showNotification('✅ Translation complete!');
      } else {
        showNotification('❌ Translation failed: ' + (response?.error || 'Unknown error'));
      }
    });
  } catch (error) {
    console.error('Translation error:', error);
    showNotification('❌ Translation failed: ' + error.message);
    translateBtn.innerHTML = originalHTML;
    translateBtn.disabled = false;
  }
}

async function createMindmap() {
  const content = document.body.innerText.substring(0, 3000);
  chrome.runtime.sendMessage({
    action: 'generateContent',
    task: 'mindmap',
    content: content,
    title: document.title
  });
  chrome.runtime.sendMessage({ action: 'openSidePanel' });
}

async function generateSocialContent() {
  const content = document.body.innerText.substring(0, 3000);
  chrome.runtime.sendMessage({
    action: 'generateContent',
    task: 'social-content',
    content: content,
    url: window.location.href,
    title: document.title
  });
  chrome.runtime.sendMessage({ action: 'openSidePanel' });
}

async function saveBookmark() {
  // Extract domain from URL
  const url = new URL(window.location.href);
  const domain = url.hostname.replace('www.', '');
  
  chrome.storage.local.get(['bookmarks'], (result) => {
    const bookmarks = result.bookmarks || [];
    
    // Add bookmark with domain grouping
    bookmarks.push({
      text: selectedText || document.title,
      url: window.location.href,
      title: document.title,
      domain: domain,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      timestamp: new Date().toISOString()
    });
    
    chrome.storage.local.set({ bookmarks }, () => {
      showNotification('🔖 Bookmark saved!');
      // Notify sidepanel to refresh bookmarks
      chrome.runtime.sendMessage({ action: 'refreshBookmarks' });
    });
  });
}

// TTS state management
let ttsState = {
  isPlaying: false,
  isPaused: false
};

function toggleTTSPlayback() {
  chrome.runtime.sendMessage({ action: 'toggleTTSPlayback' });
}

function updateTTSControlButton(state) {
  const controlBtn = document.querySelector('[data-action="tts-control"]');
  const icon = controlBtn.querySelector('.ai-control-icon');
  
  if (state === 'playing') {
    controlBtn.style.display = 'flex';
    icon.textContent = '⏸'; // Pause
    controlBtn.title = 'Pause';
  } else if (state === 'paused') {
    controlBtn.style.display = 'flex';
    icon.textContent = '▶'; // Play
    controlBtn.title = 'Resume';
  } else if (state === 'stopped') {
    controlBtn.style.display = 'none';
  }
}

async function textToSpeech() {
  if (!selectedText) {
    alert('Please select some text first!');
    return;
  }
  
  // Show loading indicator
  const ttsBtn = document.querySelector('[data-action="text-to-speech"]');
  const originalHTML = ttsBtn.innerHTML;
  ttsBtn.innerHTML = '<span class="ai-btn-icon">⏳</span> Generating...';
  ttsBtn.disabled = true;
  
  try {
    // Send to background/sidepanel for TTS processing
    chrome.runtime.sendMessage({
      action: 'textToSpeech',
      content: selectedText
    });
    
    showNotification('Generating audio...');
  } catch (error) {
    console.error('TTS error:', error);
    showNotification('Text-to-Speech failed: ' + error.message);
  } finally {
    // Reset button after 3 seconds
    setTimeout(() => {
      ttsBtn.innerHTML = originalHTML;
      ttsBtn.disabled = false;
    }, 3000);
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'ai-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Function to inject translated text into page
function injectTranslatedText(translatedText) {
  // Walk through all text nodes and replace content
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  
  // Collect all text nodes
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (text.length > 0 && !isScriptOrStyle(node)) {
      textNodes.push(node);
    }
  }
  
  // Parse translated text and try to match with original nodes
  // For simplicity, we'll replace body innerHTML with formatted translated text
  const translatedHTML = translatedText.replace(/\n/g, '<br>');
  
  // Create overlay with translated content
  const overlay = document.createElement('div');
  overlay.id = 'ai-translation-overlay';
  overlay.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: white;
      color: black;
      padding: 40px;
      overflow-y: auto;
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
    ">
      <div style="max-width: 900px; margin: 0 auto;">
        <div style="
          position: sticky;
          top: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        ">
          <span style="font-weight: 600;">🌐 Translated Page</span>
          <button onclick="document.getElementById('ai-translation-overlay').remove()" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          ">✕ Close Translation</button>
        </div>
        <div style="white-space: pre-wrap; font-size: 16px;">${translatedHTML}</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  showNotification('Page translated! Click "Close Translation" to restore.');
}

// Helper to get all text nodes from an element
function getAllTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip empty text nodes and nodes in script/style/noscript
        if (!node.textContent.trim() || isScriptOrStyle(node)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  return textNodes;
}

// Helper to check if node is in script or style tag
function isScriptOrStyle(node) {
  let parent = node.parentElement;
  while (parent) {
    if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.tagName === 'NOSCRIPT') {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

// Store selection range for replacement
let selectionRange = null;

// Track selection range
document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    selectionRange = selection.getRangeAt(0).cloneRange();
  }
});

// Replace selected text with new text while preserving formatting
function replaceSelectedText(newText) {
  if (!selectionRange) {
    console.warn('No selection range saved');
    return;
  }
  
  try {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectionRange);
    
    // Check if we're in an editable element
    const activeElement = document.activeElement;
    const isEditable = activeElement && (
      activeElement.isContentEditable ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'INPUT'
    );
    
    if (isEditable) {
      // For editable elements, use execCommand or set value
      if (activeElement.isContentEditable) {
        document.execCommand('insertText', false, newText);
      } else {
        // For input/textarea
        const start = activeElement.selectionStart;
        const end = activeElement.selectionEnd;
        const text = activeElement.value;
        activeElement.value = text.substring(0, start) + newText + text.substring(end);
      }
    } else {
      // For non-editable content, replace text node by node preserving structure
      replaceTextNodesInSelection(newText);
    }
  } catch (error) {
    console.error('Error replacing text:', error);
    showNotification('Translation copied to clipboard');
    navigator.clipboard.writeText(newText);
  }
}

// Replace selected HTML with translated HTML
function replaceSelectedHTML(translatedHTML) {
  if (!selectionRange) {
    console.warn('No selection range saved');
    return;
  }
  
  try {
    // Remove markdown code fences if AI added them
    let cleanedHTML = translatedHTML.trim();
    
    // Remove ```html at the start
    if (cleanedHTML.startsWith('```html')) {
      cleanedHTML = cleanedHTML.substring(7).trim();
    } else if (cleanedHTML.startsWith('```')) {
      cleanedHTML = cleanedHTML.substring(3).trim();
    }
    
    // Remove ``` at the end
    if (cleanedHTML.endsWith('```')) {
      cleanedHTML = cleanedHTML.substring(0, cleanedHTML.length - 3).trim();
    }
    
    console.log('Cleaned HTML:', cleanedHTML.substring(0, 100));
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectionRange);
    
    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanedHTML;
    
    // Delete the selected content
    selectionRange.deleteContents();
    
    // Insert the translated HTML
    const fragment = document.createDocumentFragment();
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    
    selectionRange.insertNode(fragment);
    showNotification('✅ Translation complete!');
  } catch (error) {
    console.error('Error replacing HTML:', error);
    showNotification('Translation copied to clipboard');
    navigator.clipboard.writeText(translatedHTML);
  }
}

// Replace text nodes within selection while preserving HTML structure
function replaceTextNodesInSelection(translatedText) {
  try {
    const range = selectionRange.cloneRange();
    const container = range.commonAncestorContainer;
    
    // Get all text nodes in the selection with their original text
    const textNodes = [];
    const originalTexts = [];
    
    const walker = document.createTreeWalker(
      container.nodeType === Node.TEXT_NODE ? container.parentNode : container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Check if node is within selection range
          if (range.intersectsNode(node)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent;
      if (text.trim()) {
        textNodes.push(node);
        originalTexts.push(text);
      }
    }
    
    console.log('Found text nodes in selection:', textNodes.length);
    
    if (textNodes.length === 0) {
      // Fallback: show notification
      showNotification(`Translation: ${translatedText}`);
      navigator.clipboard.writeText(translatedText);
      return;
    }
    
    if (textNodes.length === 1) {
      // Simple case: single text node - preserve leading/trailing whitespace
      const original = originalTexts[0];
      const leadingSpace = original.match(/^\s*/)[0];
      const trailingSpace = original.match(/\s*$/)[0];
      textNodes[0].textContent = leadingSpace + translatedText + trailingSpace;
      showNotification('✅ Translation complete!');
    } else {
      // Multiple text nodes: split translation by sentences/paragraphs
      // Calculate proportion of text for each node
      const totalOriginalLength = originalTexts.reduce((sum, text) => sum + text.trim().length, 0);
      
      // Split translated text into sentences
      const sentences = translatedText.match(/[^。？！.!?]+[。？！.!?]*/g) || [translatedText];
      
      let sentenceIndex = 0;
      textNodes.forEach((node, index) => {
        const original = originalTexts[index];
        const proportion = original.trim().length / totalOriginalLength;
        const sentencesToTake = Math.max(1, Math.round(sentences.length * proportion));
        
        const nodeSentences = sentences.slice(sentenceIndex, sentenceIndex + sentencesToTake);
        sentenceIndex += nodeSentences.length;
        
        // Preserve leading/trailing whitespace from original
        const leadingSpace = original.match(/^\s*/)[0];
        const trailingSpace = original.match(/\s*$/)[0];
        
        node.textContent = leadingSpace + nodeSentences.join('') + trailingSpace;
      });
      
      showNotification('✅ Translation complete!');
    }
  } catch (error) {
    console.error('Error replacing text nodes:', error);
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(translatedText);
    showNotification('Translation copied to clipboard');
  }
}

// Replace all page text with translations
function replacePageText(translatedText) {
  try {
    console.log('Received translation:', translatedText);
    
    // Get all text nodes again
    const textNodes = getAllTextNodes(document.body);
    console.log('Found text nodes:', textNodes.length);
    
    // Parse the translated text to extract individual translations
    // Format: [0]translated text\n[1]translated text\n...
    const lines = translatedText.split('\n');
    const translations = {};
    
    lines.forEach(line => {
      const match = line.match(/^\[(\d+)\](.*)$/);
      if (match) {
        translations[match[1]] = match[2];
      }
    });
    
    console.log('Parsed translations:', Object.keys(translations).length);
    
    // Replace each text node with its translation
    let replaced = 0;
    textNodes.forEach((node, index) => {
      if (translations[index]) {
        node.textContent = translations[index];
        replaced++;
      }
    });
    
    console.log('Replaced nodes:', replaced);
    showNotification(`Page translated! ${replaced} text sections updated.`);
  } catch (error) {
    console.error('Error replacing page text:', error);
    showNotification('Translation error: ' + error.message);
  }
}

// Replace selected text with translation
function replaceSelectedText(translatedText, isHTML = false) {
  if (!selectionRange) {
    showNotification('Selection lost. Please try again.');
    return;
  }
  
  try {
    // Get the parent element to preserve styling
    const commonAncestor = selectionRange.commonAncestorContainer;
    const parentElement = commonAncestor.nodeType === Node.TEXT_NODE 
      ? commonAncestor.parentElement 
      : commonAncestor;
    
    // Store computed styles from the first text node in selection
    const computedStyle = window.getComputedStyle(parentElement);
    
    // Delete the selected content
    selectionRange.deleteContents();
    
    // Create a span to hold translated content with preserved styling
    const span = document.createElement('span');
    
    // Copy relevant styles from original element
    span.style.cssText = `
      font-family: ${computedStyle.fontFamily};
      font-size: ${computedStyle.fontSize};
      font-weight: ${computedStyle.fontWeight};
      font-style: ${computedStyle.fontStyle};
      color: ${computedStyle.color};
      text-decoration: ${computedStyle.textDecoration};
      text-transform: ${computedStyle.textTransform};
      letter-spacing: ${computedStyle.letterSpacing};
      line-height: ${computedStyle.lineHeight};
      white-space: ${computedStyle.whiteSpace};
      display: ${computedStyle.display};
      background: rgba(102, 126, 234, 0.3);
      transition: background 2s;
    `;
    
    // Use innerHTML for HTML content, textContent for plain text
    if (isHTML) {
      span.innerHTML = translatedText;
    } else {
      span.textContent = translatedText;
    }
    
    // Insert the translated content
    selectionRange.insertNode(span);
    
    // Remove highlight after 2 seconds, keeping the styling
    setTimeout(() => {
      span.style.background = 'transparent';
    }, 2000);
    
    showNotification('Text translated and replaced!');
  } catch (error) {
    console.error('Error replacing text:', error);
    showNotification('Could not replace text. Showing in side panel instead.');
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translateSelection') {
    selectedText = request.text;
    translateSelection();
  } else if (request.action === 'saveToBookmarks') {
    selectedText = request.text;
    saveBookmark();
  } else if (request.action === 'getPageContent') {
    // Return page content for chat - this needs sendResponse
    const content = document.body.innerText.substring(0, 5000);
    sendResponse({ content: content });
    return true; // Only return true for async responses
  } else if (request.action === 'injectTranslation') {
    // Inject translated text into page
    injectTranslatedText(request.translatedText);
  } else if (request.action === 'replaceSelection') {
    // Replace selected text with translation
    replaceSelectedText(request.translatedText, request.isHTML);
    // Reset translate button
    const translateBtn = document.querySelector('[data-action="translate-selection"]');
    if (translateBtn) {
      translateBtn.innerHTML = '<span class="ai-btn-icon">🔤</span> Translate Text';
      translateBtn.disabled = false;
    }
  } else if (request.action === 'replacePageText') {
    // Replace all text nodes with translations
    replacePageText(request.translations);
    // Reset translate button
    const translateBtn = document.querySelector('[data-action="translate-page"]');
    if (translateBtn) {
      translateBtn.innerHTML = '<span class="ai-btn-icon">🌐</span> Translate Page';
      translateBtn.disabled = false;
    }
  } else if (request.action === 'updateTTSState') {
    // Update TTS control button state
    updateTTSControlButton(request.state);
  }
  // Don't return true for fire-and-forget messages
});

// Initialize popup when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFloatingPopup);
} else {
  createFloatingPopup();
}
