// PDF-specific content script
// This script runs on PDF pages to extract text content

let pdfText = '';

// Wait for PDF to be fully loaded
function waitForPDFLoad() {
  return new Promise((resolve) => {
    // Check if PDF.js viewer is present
    const checkInterval = setInterval(() => {
      // Try to access PDF.js text layer
      const textLayer = document.querySelector('.textLayer');
      if (textLayer) {
        clearInterval(checkInterval);
        resolve(true);
      }
      
      // Also check for Chrome's native PDF viewer
      const embed = document.querySelector('embed[type="application/pdf"]');
      if (embed) {
        clearInterval(checkInterval);
        resolve(false); // Chrome native viewer doesn't expose text easily
      }
    }, 500);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 5000);
  });
}

// Extract text from PDF.js viewer
function extractFromPDFJS() {
  const textLayers = document.querySelectorAll('.textLayer');
  let extractedText = '';
  
  textLayers.forEach(layer => {
    const textContent = Array.from(layer.children)
      .map(span => span.textContent)
      .join(' ');
    extractedText += textContent + '\n\n';
  });
  
  return extractedText.trim();
}

// Extract text from Chrome's native PDF viewer
function extractFromChromeViewer() {
  // Chrome's native PDF viewer uses an embed element
  const embed = document.querySelector('embed[type="application/pdf"]');
  
  if (embed) {
    console.log('⚠️ Chrome native PDF viewer detected - text extraction not supported');
    console.log('💡 Recommend using OCR (Cloud AI) for Chrome native viewer');
    return '';
  }
  
  return '';
}

// Extract text from any visible text on page (fallback)
function extractVisibleText() {
  // First, check if there's a PDF embed - if so, we can't extract text
  const embed = document.querySelector('embed[type="application/pdf"]');
  if (embed) {
    console.log('⚠️ Chrome native PDF viewer - cannot extract text from embed');
    return '';
  }
  
  // Skip extraction from extension UI elements
  const skipSelectors = [
    '#ai-assistant-popup',
    '.ai-assistant-button',
    '[data-extension-id]',
    '.chrome-extension',
    '#pdfPageModal',
    '[id*="extension"]',
    '[class*="extension"]'
  ];
  
  // Also skip by checking for common extension UI text
  const skipTexts = [
    'Mentelo',
    'Summarize Page',
    'Translate Page',
    'Translate Text',
    'Text to Speech',
    'Chat with Page',
    'Call Mindy',
    'Social Content',
    'Save',
    'Bookmark',
    'Open Dashboard',
    'Fix Grammar',
    'Rewrite',
    'Rephrase'
  ];
  
  // Get all text from the page (works for some PDF viewers)
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip script, style, and empty text nodes
        const text = node.textContent.trim();
        if (!text) return NodeFilter.FILTER_REJECT;
        
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        // Skip extension UI elements by selector
        for (const selector of skipSelectors) {
          if (parent.closest(selector)) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        
        // Skip extension UI elements by text content
        for (const skipText of skipTexts) {
          if (text.includes(skipText)) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        
        if (parent.tagName === 'SCRIPT' || 
            parent.tagName === 'STYLE' || 
            parent.tagName === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Check if text is visible
        if (parent.offsetParent === null) {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const textParts = [];
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (text.length > 2) {
      textParts.push(text);
    }
  }
  
  return textParts.join(' ');
}

// Initialize PDF text extraction
async function initPDFExtraction() {
  const hasPDFJS = await waitForPDFLoad();
  
  if (hasPDFJS) {
    // Extract from PDF.js viewer
    pdfText = extractFromPDFJS();
    console.log('📄 Extracted text from PDF.js viewer, length:', pdfText.length);
  } else {
    // Check if it's Chrome's native viewer (has embed element)
    const embed = document.querySelector('embed[type="application/pdf"]');
    if (embed) {
      // Chrome native viewer - cannot extract text
      console.log('⚠️ Chrome native PDF viewer detected - text extraction not supported');
      console.log('💡 Use OCR (Cloud AI) or open PDF in Firefox/PDF.js viewer');
      pdfText = '';
    } else {
      // Fallback: try to get any visible text (for other PDF viewers)
      pdfText = extractVisibleText();
      console.log('📄 Extracted visible text, length:', pdfText.length);
    }
  }
  
  // If we got text, store it globally
  if (pdfText) {
    window.pdfExtractedText = pdfText;
  }
}

// Listen for requests from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPDFText') {
    if (!pdfText) {
      // Try to extract on demand
      initPDFExtraction().then(() => {
        sendResponse({ text: pdfText || 'No text could be extracted from PDF' });
      });
      return true; // Async response
    }
    sendResponse({ text: pdfText });
  }
});

// Start extraction when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPDFExtraction);
} else {
  initPDFExtraction();
}

// Also try after a delay to catch dynamically loaded content
setTimeout(initPDFExtraction, 2000);
