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
    id: 'saveToBookmarks',
    title: 'Save to AI Bookmarks',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'extractImageText',
    title: 'MindlyAI: Extract texts',
    contexts: ['image']
  });
  
  chrome.contextMenus.create({
    id: 'explainImage',
    title: 'MindlyAI: Explain This Image',
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
  } else if (info.menuItemId === 'saveToBookmarks') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'saveToBookmarks',
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
  if (request.action === 'openSidePanel') {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
    sendResponse({ success: true });
  } else if (request.action === 'grammarCheck') {
    // Handle grammar check with mini-flash-lite model
    console.log('📝 Background: Handling grammar check request');
    handleGrammarCheck(request.prompt)
      .then(result => {
        console.log('✅ Background: Grammar check successful');
        sendResponse({ result });
      })
      .catch(error => {
        console.error('❌ Background: Grammar check error:', error);
        sendResponse({ error: error.message });
      });
    
    return true; // Keep message channel open for async response
  } else if (request.action === 'generateContent' && request.task === 'textAssist') {
    // Handle text assist requests directly in background
    console.log('🔄 Background: Handling text assist request');
    handleTextAssist(request.prompt)
      .then(result => {
        console.log('✅ Background: Text assist successful');
        sendResponse({ result });
      })
      .catch(error => {
        console.error('❌ Background: Text assist error:', error);
        sendResponse({ error: error.message });
      });
    
    return true; // Keep message channel open for async response
  } else if (request.action === 'generateContent') {
    // Other generate content requests (forward to sidepanel)
    chrome.runtime.sendMessage(request);
  }
  return true;
});

// Handle grammar check requests with mini-flash-lite model
async function handleGrammarCheck(prompt) {
  // Get API key from storage
  const data = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = data.geminiApiKey;
  
  if (!apiKey) {
    throw new Error('API key not configured');
  }
  
  console.log('📤 Background: Calling Gemini API (gemini-flash-lite-latest)');
  
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
    console.error('❌ API Error Response:', error);
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }
  
  const data2 = await response.json();
  console.log('✅ Background: API response received');
  
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
  
  console.log('📤 Background: Calling Gemini API');
  
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
    console.error('❌ API Error Response:', error);
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }
  
  const data2 = await response.json();
  console.log('✅ Background: API response received');
  
  if (!data2.candidates || !data2.candidates[0] || !data2.candidates[0].content) {
    throw new Error('API returned unexpected response format');
  }
  
  return data2.candidates[0].content.parts[0].text;
}

// Allow side panel to open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));
