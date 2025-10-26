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

// Extract text from any visible text on page
function extractVisibleText() {
  // Get all text from the page (works for some PDF viewers)
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip script, style, and empty text nodes
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        
        const parent = node.parentElement;
        if (parent && (parent.tagName === 'SCRIPT' || 
                       parent.tagName === 'STYLE' || 
                       parent.tagName === 'NOSCRIPT')) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Check if text is visible
        if (parent && parent.offsetParent === null) {
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
    // Fallback: try to get any visible text
    pdfText = extractVisibleText();
    console.log('📄 Extracted visible text, length:', pdfText.length);
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
