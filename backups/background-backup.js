// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Content Assistant installed');
  
  // Create context menu items
  chrome.contextMenus.create({
    id: 'translateText',
    title: 'Translate Selected Text',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'copyToClipboard',
    title: 'Copy to Clipboard',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'extractImageText',
    title: 'Extract texts from image',
    contexts: ['image']
  });
  
  chrome.contextMenus.create({
    id: 'explainImage',
    title: 'Explain This Image',
    contexts: ['image']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translateText') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'translateSelection',
      text: info.selectionText
    });
  } else if (info.menuItemId === 'copyToClipboard') {
    // Copy text to clipboard directly
    chrome.tabs.sendMessage(tab.id, {
      action: 'copyToClipboard',
      text: info.selectionText
    });
  } else if (info.menuItemId === 'extractImageText') {
    // Open side panel and send image URL for text extraction
    chrome.sidePanel.open({ windowId: tab.windowId });
    // Small delay to ensure side panel is ready
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'extractImageText',
        imageUrl: info.srcUrl
      });
    }, 300);
  } else if (info.menuItemId === 'explainImage') {
    // Open side panel and send image URL for explanation
    chrome.sidePanel.open({ windowId: tab.windowId });
    // Small delay to ensure side panel is ready
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'explainImage',
        imageUrl: info.srcUrl
      });
    }, 300);
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request._forwardedFromBackground) {
    return false;
  }

  switch (request.action) {
    case 'openSidePanel': {
      const windowId = sender?.tab?.windowId;
      try {
        if (typeof windowId === 'number') {
          chrome.sidePanel.open({ windowId });
        } else {
          chrome.sidePanel.open({});
        }
      } catch (error) {
        console.error('Error opening side panel:', error);
      }
      if (sendResponse) {
        sendResponse({ success: true });
      }
      return false;
    }

    case 'grammarCheck': {
      // Handle grammar check with mini-flash-lite model
      console.log('?? Background: Handling grammar check request');
      handleGrammarCheck(request.prompt)
        .then(result => {
          console.log('? Background: Grammar check successful');
          sendResponse({ result });
        })
        .catch(error => {
          console.error('? Background: Grammar check error:', error);
          sendResponse({ error: error.message });
        });
      return true; // Keep message channel open for async response
    }

    case 'generateContent': {
      if (request.task === 'textAssist') {
        // Handle text assist requests directly in background
        console.log('?? Background: Handling text assist request');
        handleTextAssist(request.prompt)
          .then(result => {
            console.log('? Background: Text assist successful');
            sendResponse({ result });
          })
          .catch(error => {
            console.error('? Background: Text assist error:', error);
            sendResponse({ error: error.message });
          });
        return true; // Keep message channel open for async response
      }

      forwardToSidePanel(request, sender);
      if (sendResponse) {
        sendResponse({ success: true });
      }
      return false;
    }

    case 'textToSpeech':
    case 'toggleTTSPlayback':
    case 'translateAndInject':
    case 'translateAndReplace':
    case 'translatePageInPlace':
    case 'extractImageText':
    case 'explainImage':
    case 'aiAssistChat': {
      forwardToSidePanel(request, sender);
      if (sendResponse) {
        sendResponse({ success: true });
      }
      return false;
    }

    case 'fetchTranscript': {
      // Fetch YouTube transcript to avoid CORS issues
      console.log('?? Background: Fetching transcript from:', request.url);
      fetch(request.url)
        .then(response => response.text())
        .then(data => {
          console.log('? Background: Transcript fetched, length:', data.length);
          sendResponse({ success: true, data });
        })
        .catch(error => {
          console.error('? Background: Transcript fetch error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep message channel open for async response
    }

    case 'capturePDFScreenshot': {
      // Capture visible tab as screenshot for PDF OCR
      console.log('?? Background: Capturing PDF screenshot');
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error('? Screenshot error:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('? Screenshot captured successfully');
          sendResponse({ success: true, dataUrl });
        }
      });
      return true; // Async response
    }

    default:
      return false;
  }
});

function forwardToSidePanel(message, sender) {
  const forwardPayload = {
    ...message,
    _forwardedFromBackground: true
  };

  const windowId = sender?.tab?.windowId;
  try {
    if (typeof windowId === 'number') {
      chrome.sidePanel.open({ windowId });
    } else {
      chrome.sidePanel.open({});
    }
  } catch (error) {
    console.error('Error opening side panel during forward:', error);
  }

  const attemptForward = (attempt = 0) => {
    chrome.runtime.sendMessage(forwardPayload, () => {
      const error = chrome.runtime.lastError;
      if (error && error.message.includes('Receiving end does not exist')) {
        if (attempt < 5) {
          setTimeout(() => attemptForward(attempt + 1), 150);
        } else {
          console.error('Failed to deliver message to side panel after retries:', error);
        }
      }
    });
  };

  attemptForward();
}

// Handle grammar check requests with mini-flash-lite model
async function handleGrammarCheck(prompt) {
  // Get API key from storage
  const data = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = data.geminiApiKey;
  
  if (!apiKey) {
    throw new Error('API key not configured');
  }
  
  console.log('?? Background: Calling Gemini API (gemini-flash-lite-latest)');
  
  // Use gemini-flash-lite-latest for fast grammar checking
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,  // Lower temperature for more consistent grammar checks
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024  // Smaller output for faster response
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('? API Error Response:', error);
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }
  
  const data2 = await response.json();
  console.log('? Background: API response received');
  
  if (!data2.candidates || !data2.candidates[0] || !data2.candidates[0].content) {
    throw new Error('API returned unexpected response format');
  }
  
  return data2.candidates[0].content.parts[0].text;
}

// Handle text assist requests in background
async function handleTextAssist(prompt) {
  // Get API key from storage
  const data = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = data.geminiApiKey;
  
  if (!apiKey) {
    throw new Error('API key not configured');
  }
  
  console.log('?? Background: Calling Gemini API');
  
  // Call Gemini API directly
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
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
    console.error('? API Error Response:', error);
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }
  
  const data2 = await response.json();
  console.log('? Background: API response received');
  
  if (!data2.candidates || !data2.candidates[0] || !data2.candidates[0].content) {
    throw new Error('API returned unexpected response format');
  }
  
  return data2.candidates[0].content.parts[0].text;
}

// Allow side panel to open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));
