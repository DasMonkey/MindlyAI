// Background service worker

// Import AI Provider Manager and Providers
importScripts('ai-provider-manager.js', 'builtin-ai-provider.js', 'cloud-ai-provider.js');

// Initialize AI Provider Manager
let providerManager = null;

async function initializeProviderManager() {
  if (providerManager) return providerManager;

  try {
    // Create provider instances
    const builtinProvider = new BuiltInAIProvider();
    const cloudProvider = new CloudAIProvider();

    // Initialize providers
    await builtinProvider.initialize();
    await cloudProvider.initialize();

    // Create and initialize manager
    providerManager = new AIProviderManager();
    await providerManager.initialize();

    // Register providers
    providerManager.registerProvider('builtin', builtinProvider);
    providerManager.registerProvider('cloud', cloudProvider);

    console.log('✅ AI Provider Manager initialized in background');
    return providerManager;
  } catch (error) {
    console.error('❌ Error initializing provider manager:', error);
    throw error;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Content Assistant installed');

  // Initialize provider manager
  initializeProviderManager().catch(console.error);

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

    case 'setProvider': {
      // Handle provider selection change
      console.log('📍 Background: Setting provider to:', request.provider);
      initializeProviderManager()
        .then(async (manager) => {
          await manager.setProvider(request.provider);
          console.log('✅ Background: Provider updated to:', request.provider);
          if (sendResponse) {
            sendResponse({ success: true });
          }
        })
        .catch(error => {
          console.error('❌ Background: Error setting provider:', error);
          if (sendResponse) {
            sendResponse({ error: error.message });
          }
        });
      return true; // Keep message channel open for async response
    }

    case 'grammarCheck': {
      // Handle grammar check - accepts either 'text' (plain text) or 'prompt' (custom prompt)
      console.log('📝 Background: Handling grammar check request');
      const input = request.text || request.prompt;  // Support both formats
      handleGrammarCheck(input)
        .then(result => {
          console.log('✅ Background: Grammar check successful');
          sendResponse({ result });
        })
        .catch(error => {
          console.error('❌ Background: Grammar check error:', error);
          sendResponse({ error: error.message });
        });
      return true; // Keep message channel open for async response
    }

    case 'generateContent': {
      if (request.task === 'textAssist' || request.task === 'youtubeSummary') {
        // Handle text assist and YouTube summary requests directly in background
        console.log('?? Background: Handling', request.task, 'request');
        handleTextAssist(request.prompt)
          .then(result => {
            console.log('? Background:', request.task, 'successful');
            sendResponse({ result });
          })
          .catch(error => {
            console.error('? Background:', request.task, 'error:', error);
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

    case 'rewriteText': {
      // Handle rewrite text requests using AI Provider Manager
      console.log('🔄 Background: Handling rewriteText request');
      handleRewriteText(request.text, request.options)
        .then(result => {
          console.log('✅ Background: rewriteText successful');
          sendResponse({ result });
        })
        .catch(error => {
          console.error('❌ Background: rewriteText error:', error);
          sendResponse({ error: error.message });
        });
      return true; // Keep message channel open for async response
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

    case 'getProviderStatus': {
      // Handle provider status requests
      console.log('📊 Background: Getting provider status');
      initializeProviderManager()
        .then(manager => manager.getProviderStatus())
        .then(status => {
          console.log('✅ Background: Provider status retrieved');
          sendResponse({ success: true, status });
        })
        .catch(error => {
          console.error('❌ Background: Error getting provider status:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Async response
    }

    case 'setProvider': {
      // Handle provider switching
      console.log('🔄 Background: Switching provider to', request.provider);
      initializeProviderManager()
        .then(manager => manager.setProvider(request.provider))
        .then(result => {
          console.log('✅ Background: Provider switched successfully');
          sendResponse({ success: true, provider: result.provider });
        })
        .catch(error => {
          console.error('❌ Background: Error switching provider:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Async response
    }

    case 'updateSettings': {
      // Handle settings updates
      console.log('⚙️ Background: Updating settings');
      initializeProviderManager()
        .then(manager => manager.saveSettings(request.settings))
        .then(() => {
          console.log('✅ Background: Settings updated successfully');
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('❌ Background: Error updating settings:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Async response
    }

    case 'getSettings': {
      // Handle settings retrieval
      console.log('⚙️ Background: Getting settings');
      initializeProviderManager()
        .then(manager => {
          const settings = manager.getSettings();
          console.log('✅ Background: Settings retrieved');
          sendResponse({ success: true, settings });
        })
        .catch(error => {
          console.error('❌ Background: Error getting settings:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Async response
    }

    case 'getAPIStatus': {
      // Handle API status requests
      console.log('📊 Background: Getting API status');
      initializeProviderManager()
        .then(manager => manager.getAPIStatus())
        .then(status => {
          console.log('✅ Background: API status retrieved');
          sendResponse({ success: true, status });
        })
        .catch(error => {
          console.error('❌ Background: Error getting API status:', error);
          sendResponse({ success: false, error: error.message });
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

// Handle grammar check requests using AI Provider Manager
async function handleGrammarCheck(prompt) {
  try {
    // Ensure provider manager is initialized
    const manager = await initializeProviderManager();

    console.log('📤 Background: Checking grammar using AI Provider Manager');

    // Use provider manager to check grammar
    // The manager will automatically route to the appropriate provider
    const response = await manager.checkGrammar(prompt);

    console.log('✅ Background: Grammar check completed via', response.provider);

    // Return the data (unwrap from normalized response)
    return response.data;
  } catch (error) {
    console.error('❌ Grammar check error:', error);
    throw error;
  }
}

// Handle text assist requests using AI Provider Manager
async function handleTextAssist(prompt) {
  try {
    // Ensure provider manager is initialized
    const manager = await initializeProviderManager();

    console.log('📤 Background: Processing text assist using AI Provider Manager');
    console.log('📤 Background: Active provider:', manager.getActiveProvider());
    console.log('📤 Background: Prompt length:', prompt?.length, 'chars');

    // Use provider manager to generate content
    // The manager will automatically route to the appropriate provider
    const response = await manager.generateContent(prompt);

    console.log('✅ Background: Text assist completed via', response?.provider);
    console.log('📦 Background: Response structure:', {
      hasResponse: !!response,
      hasData: !!response?.data,
      dataType: typeof response?.data,
      dataLength: response?.data?.length
    });

    // Return the data (unwrap from normalized response)
    if (!response || !response.data) {
      throw new Error('Invalid response from AI provider: missing data');
    }

    return response.data;
  } catch (error) {
    console.error('❌ Text assist error:', error);
    throw error;
  }
}

// Handle rewrite text requests using AI Provider Manager
async function handleRewriteText(text, options = {}) {
  try {
    // Ensure provider manager is initialized
    const manager = await initializeProviderManager();

    console.log('🔄 Background: Processing rewrite using AI Provider Manager');
    console.log('🔄 Background: Active provider:', manager.getActiveProvider());
    console.log('🔄 Background: Text length:', text?.length, 'chars');
    console.log('🔄 Background: Options:', options);

    // Use provider manager to rewrite text
    // For built-in AI, this will use the Rewriter API
    // For cloud AI, it will fall back to generateContent with a prompt
    const response = await manager.rewriteText(text, options);

    console.log('✅ Background: Rewrite completed via', response?.provider);

    // Return the data (unwrap from normalized response)
    if (!response || !response.data) {
      throw new Error('Invalid response from AI provider: missing data');
    }

    return response.data;
  } catch (error) {
    console.error('❌ Text assist error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}

// Allow side panel to open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));
