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
    // Recalculate and maintain right positioning for right-to-left expansion
    const currentRight = viewportWidth - popupRect.right;
    floatingPopup.style.right = currentRight + "px";
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
  
  // Check if this is a PDF
  const isPDF = document.contentType === 'application/pdf' || 
                window.location.pathname.toLowerCase().endsWith('.pdf') ||
                document.querySelector('embed[type="application/pdf"]') !== null;

  floatingPopup = document.createElement('div');
  floatingPopup.id = 'ai-assistant-popup';
  
  floatingPopup.innerHTML = `
    <div class="ai-popup-header">
      <span class="ai-popup-title">
        <img src="${chrome.runtime.getURL('icons/Mentelo-logo-wh.png')}" alt="Mentelo" style="width: 16px; height: 16px; margin-right: 4px;">
        <span class="ai-popup-text">Mentelo</span>
      </span>
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
      <div class="ai-btn-row">
        <button class="ai-btn ai-btn-tts" data-action="text-to-speech">
          <span class="ai-btn-icon">🔊</span>
          Text to Speech
        </button>
        <button class="ai-btn-control" data-action="tts-control" title="Play/Pause" style="display: none;">
          <span class="ai-control-icon">⏸</span>
        </button>
      </div>
      <button class="ai-btn ai-btn-secondary" data-action="chat-page">
        <span class="ai-btn-icon">💬</span>
        Chat with Page
      </button>
      <button class="ai-btn ai-btn-primary" data-action="call-mindy">
        <span class="ai-btn-icon">🎤</span>
        Call Mindy
      </button>
      <div class="ai-btn-row">
        <button class="ai-btn" data-action="social-content">
          <span class="ai-btn-icon">📱</span>
          Social Content
        </button>
        <button class="ai-btn" data-action="save-bookmark">
          <span class="ai-btn-icon">🔖</span>
          Save Bookmark
        </button>
        <button class="ai-btn ai-btn-secondary" data-action="open-panel">
          <span class="ai-btn-icon">⚙️</span>
          Open Dashboard
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(floatingPopup);

  // Ensure initial right positioning for right-to-left expansion
  floatingPopup.style.right = '20px';
  floatingPopup.style.left = 'auto';

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
    // Add transitioning class to prevent scrollbar flash
    content.classList.add('transitioning');
    
    content.classList.toggle('collapsed');
    const collapsed = content.classList.contains('collapsed');
    toggleBtn.textContent = collapsed ? '+' : '−';
    
    // Remove transitioning class after transition completes
    setTimeout(() => {
      content.classList.remove('transitioning');
    }, 300);
    
    // Save state to localStorage
    localStorage.setItem('ai-popup-collapsed', collapsed);
  });

  // Button handlers
  floatingPopup.querySelectorAll('.ai-btn').forEach(btn => {
    btn.addEventListener('click', handleButtonClick);
  });
  
  // Pause/Play button handler
  const controlBtn = floatingPopup.querySelector('[data-action="tts-control"]');
  if (controlBtn) {
    controlBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTTSPlayback();
    });
  }
  
  // Initial check for side panel
  setTimeout(() => checkSidePanelAndAdjustPopup(), 100);
}

function makeDraggable(element) {
  let initialX = 0, initialY = 0;
  let currentTop = 0, currentRight = 0;
  const header = element.querySelector('.ai-popup-header');

  header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Get current position values
    const computedStyle = window.getComputedStyle(element);
    currentTop = parseInt(computedStyle.top) || 0;
    currentRight = parseInt(computedStyle.right) || 0;
    
    // Store initial mouse position
    initialX = e.clientX;
    initialY = e.clientY;
    
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate how much mouse moved
    const deltaX = initialX - e.clientX;
    const deltaY = initialY - e.clientY;
    
    // Update position directly based on deltas
    element.style.top = (currentTop - deltaY) + "px";
    element.style.right = (currentRight + deltaX) + "px";
    element.style.left = "auto";
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
      // PDFs are now handled automatically with the PDF Status Banner
      chrome.runtime.sendMessage({ action: 'openSidePanel' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Extension context invalidated:', chrome.runtime.lastError.message);
          return;
        }
        // Small delay to ensure sidepanel is open before switching tabs
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'switchToMindy' }, (response) => {
            if (chrome.runtime.lastError) {
              console.log('Extension context invalidated:', chrome.runtime.lastError.message);
            }
          });
        }, 100);
      });
      break;
    case 'chat-page':
      // Open sidebar and switch to Chat tab
      chrome.runtime.sendMessage({ action: 'openSidePanel' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Extension context invalidated:', chrome.runtime.lastError.message);
          return;
        }
        // Small delay to ensure sidepanel is open before switching tabs
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'switchToChat' }, (response) => {
            if (chrome.runtime.lastError) {
              console.log('Extension context invalidated:', chrome.runtime.lastError.message);
            }
          });
        }, 100);
      });
      break;
    case 'open-panel':
      chrome.runtime.sendMessage({ action: 'openSidePanel' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Extension context invalidated:', chrome.runtime.lastError.message);
        }
      });
      break;
  }
}

// Track text selection
let selectedHTML = '';
document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  
  // Get selected text with proper line breaks
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    
    // Store HTML
    selectedHTML = container.innerHTML;
    
    // Get text with preserved structure - use textContent to capture ALL text regardless of CSS styling
    selectedText = container.textContent || selection.toString();
    selectedText = selectedText.trim();
    
    console.log('📋 Selected text captured:', selectedText.length, 'characters');
  } else {
    selectedText = '';
    selectedHTML = '';
  }
});

// Helper function to extract text from page (including PDFs)
async function getPageText(forceExtract = false) {
  // Check if it's a PDF file
  const isPDF = document.contentType === 'application/pdf' || 
                window.location.pathname.toLowerCase().endsWith('.pdf') ||
                document.querySelector('embed[type="application/pdf"]') !== null;
  
  if (isPDF) {
    console.log('📄 PDF detected, attempting text extraction...');
    
    // Try to get text from PDF
    try {
      // First check if we have extracted text available globally
      if (window.pdfExtractedText && window.pdfExtractedText.length > 100) {
        console.log('✅ Using cached PDF text, length:', window.pdfExtractedText.length);
        return window.pdfExtractedText.substring(0, 10000);
      }
      
      // If force extract (like for Call Mindy), try harder to get content
      if (forceExtract) {
        console.log('🔍 Attempting to extract all PDF text...');
        
        // First, remove the floating popup to avoid capturing it
        const popup = document.getElementById('ai-assistant-popup');
        let removedPopup = null;
        if (popup) {
          removedPopup = popup;
          popup.remove();
          console.log('🗑️ Temporarily removed popup for clean extraction');
        }
        
        // Method 1a: Try to find PDF plugin/embed and extract text
        const embed = document.querySelector('embed[type="application/pdf"]');
        if (embed) {
          try {
            // Try to access the embed's window/document
            if (embed.contentWindow && embed.contentWindow.document) {
              const embedText = embed.contentWindow.document.body.innerText;
              if (embedText && embedText.length > 100) {
                console.log('✅ Extracted text from embed, length:', embedText.length);
                window.pdfExtractedText = embedText;
                return embedText.substring(0, 10000);
              }
            }
          } catch (e) {
            console.log('Cannot access embed content:', e.message);
          }
        }
        
        // Method 1b: Try keyboard shortcut simulation
        console.log('Trying programmatic select all...');
        
        // Store current selection
        const oldSelection = window.getSelection().toString();
        
        // Try select all
        try {
          // Focus the document first
          window.focus();
          
          // Try select all command
          const success = document.execCommand('selectAll');
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait longer
          
          const allText = window.getSelection().toString();
          
          // Clear selection to avoid visual clutter
          window.getSelection().removeAllRanges();
          
          // Restore popup before returning
          if (removedPopup) {
            document.body.appendChild(removedPopup);
          }
          
          if (allText && allText.length > 100) {
            console.log('✅ Extracted PDF text using select-all, length:', allText.length);
            window.pdfExtractedText = allText; // Cache it
            return allText.substring(0, 10000);
          }
        } catch (e) {
          console.log('Select all failed:', e.message);
        }
        
        // Restore popup after all extraction attempts
        if (removedPopup) {
          document.body.appendChild(removedPopup);
        }
      }
      
      // Method 2: Check if user already selected text (from Ctrl+A or manual selection)
      const selection = window.getSelection().toString();
      if (selection && selection.length > 100) {
        console.log('✅ Using user-selected PDF text, length:', selection.length);
        // Filter out floating menu text
        if (!selection.includes('Mentelo') && !selection.includes('Summarize Page')) {
          window.pdfExtractedText = selection; // Cache it
          return selection;
        } else {
          console.warn('⚠️ Selected text contains menu items, skipping');
        }
      }
      
      // Method 3: Request from PDF content script via message
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getPDFText' }, (response) => {
          resolve(response);
        });
        // Timeout after 2 seconds
        setTimeout(() => resolve({ text: null }), 2000);
      });
      
      if (response?.text && response.text.length > 100) {
        console.log('✅ Got PDF text from content script, length:', response.text.length);
        window.pdfExtractedText = response.text; // Cache it
        return response.text.substring(0, 10000);
      }
      
      // Last resort: inform user
      console.warn('⚠️ Could not extract PDF text automatically');
      return '⚠️ PDF detected but text could not be extracted automatically.\n\nTo use this feature:\n1. Press Ctrl+A (or Cmd+A on Mac) to select all text in the PDF\n2. Then click "Call Mindy" again\n\nOR select specific text you want to discuss.';
    } catch (e) {
      console.error('❌ PDF text extraction error:', e);
      return '❌ PDF text extraction failed. Please select text manually with Ctrl+A or by highlighting specific sections.';
    }
  }
  
  // Regular webpage - exclude floating popup from extraction
  const popup = document.getElementById('ai-assistant-popup');
  let removedPopup = null;
  
  if (popup) {
    // Temporarily remove the popup from DOM completely
    removedPopup = popup;
    popup.remove();
  }
  
  // Get text content without the popup
  let content = document.body.innerText.substring(0, 10000);
  
  // Restore popup
  if (removedPopup) {
    document.body.appendChild(removedPopup);
  }
  
  console.log('✅ Extracted page text, length:', content.length);
  return content;
}

async function summarizePage() {
  const content = await getPageText();
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

async function generateSocialContent() {
  // Prioritize selected text if available
  let content;
  if (selectedText && selectedText.trim().length > 50) {
    console.log('✅ Using selected text for social content, length:', selectedText.length);
    content = selectedText;
  } else {
    console.log('📄 No selection found, using page content');
    content = await getPageText();
  }
  
  chrome.runtime.sendMessage({
    action: 'generateContent',
    task: 'social-content',
    content: content.substring(0, 3000),
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

function toggleTTSPlayback() {
  if (isPlaying) {
    pauseTTS();
  } else if (isPaused) {
    resumeTTS();
  }
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

// TTS Queue Management
let ttsQueue = [];
let currentAudio = null;
let isPlaying = false;
let isPaused = false;
let currentChunkIndex = 0;

// Load TTS Settings
async function loadTTSSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['ttsVoice', 'ttsMaxChars', 'ttsSpeechSpeed'], (result) => {
      resolve({
        voice: result.ttsVoice || 'Aoede',
        maxChars: result.ttsMaxChars || 1000,
        speechSpeed: result.ttsSpeechSpeed || 1.0
      });
    });
  });
}

// Split text into chunks (paragraphs or sentences)
function splitIntoChunks(text, maxChars = 500) {
  const chunks = [];
  
  // If text is short enough, don't split at all
  if (text.length <= maxChars) {
    return [text];
  }
  
  // First, try splitting by paragraphs
  const paragraphs = text.split(/\n\n+/);
  
  for (const para of paragraphs) {
    if (para.trim().length === 0) continue;
    
    if (para.length <= maxChars) {
      chunks.push(para.trim());
    } else {
      // Split long paragraphs by sentences
      const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxChars) {
          currentChunk += sentence;
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = sentence;
        }
      }
      if (currentChunk) chunks.push(currentChunk.trim());
    }
  }
  
  return chunks;
}

// Convert PCM to WAV format
function convertPCMtoWAV(pcmData, sampleRate, numChannels, bitsPerSample) {
  const dataLength = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  
  // WAV file header
  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  
  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // byte rate
  view.setUint16(32, numChannels * bitsPerSample / 8, true); // block align
  view.setUint16(34, bitsPerSample, true);
  
  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write PCM samples
  for (let i = 0; i < pcmData.length; i++) {
    view.setUint8(44 + i, pcmData[i]);
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

// Helper to write strings to DataView
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function stopTTS() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  isPlaying = false;
  isPaused = false;
  ttsQueue = [];
  currentChunkIndex = 0;
  updateTTSControlButton('stopped');
}

function pauseTTS() {
  if (currentAudio && isPlaying) {
    currentAudio.pause();
    isPaused = true;
    isPlaying = false;
    updateTTSControlButton('paused');
  }
}

function resumeTTS() {
  if (currentAudio && isPaused) {
    currentAudio.play();
    isPaused = false;
    isPlaying = true;
    updateTTSControlButton('playing');
  }
}

// Play next chunk in queue
async function playNextChunk() {
  if (currentChunkIndex >= ttsQueue.length) {
    stopTTS();
    console.log('✅ All chunks played');
    return;
  }
  
  const audioBlob = ttsQueue[currentChunkIndex];
  const audioUrl = URL.createObjectURL(audioBlob);
  
  currentAudio = new Audio(audioUrl);
  isPlaying = true;
  updateTTSControlButton('playing');
  
  currentAudio.onerror = (e) => {
    console.error('Audio playback error:', e);
    URL.revokeObjectURL(audioUrl);
    currentChunkIndex++;
    playNextChunk();
  };
  
  currentAudio.onended = () => {
    URL.revokeObjectURL(audioUrl);
    currentChunkIndex++;
    console.log(`🎵 Chunk ${currentChunkIndex}/${ttsQueue.length} finished`);
    playNextChunk();
  };
  
  try {
    await currentAudio.play();
    console.log(`🔊 Playing chunk ${currentChunkIndex + 1}/${ttsQueue.length}`);
  } catch (error) {
    console.error('Play error:', error);
    URL.revokeObjectURL(audioUrl);
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
    console.log('📝 Full selected text length:', selectedText.length);
    console.log('📝 Full selected text:', selectedText);
    console.log('Generating TTS for:', selectedText.substring(0, 50) + '...');
    
    // Stop any currently playing audio
    stopTTS();
    
    // Get API key
    const data = await chrome.storage.local.get(['geminiApiKey']);
    const apiKey = data.geminiApiKey;
    
    if (!apiKey) {
      alert('Please configure your API key first in Settings!');
      ttsBtn.innerHTML = originalHTML;
      ttsBtn.disabled = false;
      return;
    }
    
    // Load TTS settings
    const settings = await loadTTSSettings();
    console.log('Using voice:', settings.voice, 'Max chars:', settings.maxChars, 'Speed:', settings.speechSpeed);
    
    // Split content into chunks
    const chunks = splitIntoChunks(selectedText, 500); // 500 chars per chunk
    console.log(`📄 Split into ${chunks.length} chunks`);
    
    // Build speed instruction based on speed value
    let speedInstruction = '';
    if (settings.speechSpeed < 0.8) {
      speedInstruction = 'very slowly';
    } else if (settings.speechSpeed < 1.0) {
      speedInstruction = 'slowly';
    } else if (settings.speechSpeed > 1.5) {
      speedInstruction = 'very quickly';
    } else if (settings.speechSpeed > 1.2) {
      speedInstruction = 'quickly';
    } else {
      speedInstruction = 'at a normal pace';
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    
    // Generate audio for each chunk
    ttsQueue = [];
    
    showNotification(`Generating audio... (0/${chunks.length})`);
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`📦 Generating chunk ${i + 1}/${chunks.length}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Read the following text ${speedInstruction} in a clear and natural voice: ${chunks[i]}` }]
          }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: settings.voice
                }
              }
            }
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('TTS API Error:', error);
        throw new Error(error.error?.message || `TTS API failed: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Check if response has audio data
      if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content) {
        console.error('Unexpected TTS response:', responseData);
        throw new Error('TTS returned unexpected response format');
      }
      
      const audioData = responseData.candidates[0].content.parts[0].inlineData.data;
      
      // Convert base64 to audio bytes
      const audioBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
      
      // Convert PCM to WAV format
      const wavBlob = convertPCMtoWAV(audioBytes, 24000, 1, 16);
      ttsQueue.push(wavBlob);
      
      console.log(`✅ Chunk ${i + 1}/${chunks.length} ready`);
      showNotification(`Generating audio... (${i + 1}/${chunks.length})`);
      
      // Start playing the first chunk immediately
      if (i === 0) {
        currentChunkIndex = 0;
        playNextChunk();
      }
    }
    
    console.log('🎵 All chunks generated and queued');
    showNotification('✅ Playing audio!');
    
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

function showNotification(message, duration = 2000) {
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
  }, duration);
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
          background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
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
  } else if (request.action === 'copyToClipboard') {
    // Copy text to clipboard
    navigator.clipboard.writeText(request.text).then(() => {
      showNotification('✓ Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      showNotification('✗ Failed to copy to clipboard');
    });
  } else if (request.action === 'getPageContent') {
    // Return page content for chat - this needs sendResponse
    // Check if PDF and force extraction
    const isPDF = document.contentType === 'application/pdf' || 
                  window.location.pathname.toLowerCase().endsWith('.pdf') ||
                  document.querySelector('embed[type="application/pdf"]') !== null;
    
    getPageText(isPDF).then(content => {
      console.log('📦 Sending page content to chat, length:', content.length, 'isPDF:', isPDF);
      console.log('🔍 First 200 chars:', content.substring(0, 200));
      
      // Check if on YouTube and include transcript if already extracted
      const isYouTube = window.location.hostname.includes('youtube.com') && window.location.pathname === '/watch';
      if (isYouTube && window.youtubeTranscript) {
        content = `VIDEO TRANSCRIPT:\n${window.youtubeTranscript}\n\nPAGE CONTENT:\n${content}`;
      }
      
      sendResponse({ content: content });
    });
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

// PDF instruction overlay removed - now using PDF Status Banner in sidepanel instead

// Initialize popup when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFloatingPopup);
} else {
  createFloatingPopup();
}




