// Side panel JavaScript
let currentTask = null;
let apiKey = null;
let pageContent = null;
let chatHistory = [];

// AI Provider Manager (initialized on load)
let sidePanelProviderManager = null;

// Initialize AI Provider Manager for sidepanel
async function initializeSidePanelProviderManager() {
  // If manager already exists, refresh its provider from storage
  if (sidePanelProviderManager) {
    try {
      const result = await chrome.storage.local.get(['preferredProvider']);
      const preferredProvider = result.preferredProvider || 'builtin';
      const currentProvider = sidePanelProviderManager.getActiveProvider();
      
      // Only update if provider has changed
      if (currentProvider !== preferredProvider) {
        console.log(`🔄 Refreshing provider from ${currentProvider} to ${preferredProvider}`);
        await sidePanelProviderManager.setProvider(preferredProvider);
        sidePanelProviderManager.activeProvider = preferredProvider;
      }
    } catch (error) {
      console.warn('⚠️ Could not refresh provider:', error);
    }
    return sidePanelProviderManager;
  }
  
  try {
    // Create provider instances
    const builtinProvider = new BuiltInAIProvider();
    const cloudProvider = new CloudAIProvider();
    
    // Initialize providers
    await builtinProvider.initialize();
    await cloudProvider.initialize();
    
    // Create and initialize manager
    sidePanelProviderManager = new AIProviderManager();
    await sidePanelProviderManager.initialize();
    
    // Register providers
    sidePanelProviderManager.registerProvider('builtin', builtinProvider);
    sidePanelProviderManager.registerProvider('cloud', cloudProvider);
    
    // Load saved provider preference and set it
    const result = await chrome.storage.local.get(['preferredProvider']);
    const preferredProvider = result.preferredProvider || 'builtin';
    
    await sidePanelProviderManager.setProvider(preferredProvider);
    // Force set activeProvider to ensure it's set
    sidePanelProviderManager.activeProvider = preferredProvider;
    
    console.log('✅ AI Provider Manager initialized in sidepanel');
    console.log(`✅ Active provider set to: ${preferredProvider}`);
    console.log(`✅ Active provider confirmed: ${sidePanelProviderManager.getActiveProvider()}`);
    
    return sidePanelProviderManager;
  } catch (error) {
    console.error('❌ Error initializing sidepanel provider manager:', error);
    throw error;
  }
}

// Initialize provider status badge in sidepanel
let providerStatusUI = null;
let providerBadge = null;

async function initializeProviderBadge() {
  try {
    if (typeof ProviderStatusUI === 'undefined') {
      console.warn('⚠️ ProviderStatusUI not available');
      return;
    }

    // Create provider status UI instance
    providerStatusUI = new ProviderStatusUI();
    await providerStatusUI.initialize(sidePanelProviderManager);

    // Badge removed - no longer showing in header
    console.log('✅ Provider status UI initialized (badge disabled)');
  } catch (error) {
    console.error('❌ Error initializing provider status UI:', error);
  }
}
// Track whether the user has interacted via chat or Mindy
let sessionActivity = {
  hasInteraction: false,
  source: null
};

// Tab tracking for Chat with Page
let currentPageTab = {
  id: null,
  url: null
};

// Track the original chat session tab
let chatSessionTab = {
  id: null,
  url: null
};

// PDF Page Management
let pdfMode = {
  isActive: false,
  currentTab: null,
  capturedPages: [],  // Array of {pageNum, text, timestamp, charCount}
  userViewingPage: null,
  lastLoadedPage: null,
  contextMode: 'accumulate',  // 'single', 'accumulate', 'sliding'
  slidingWindowSize: 3
};

// Show PDF Page Number Modal
function showPDFPageModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById('pdfPageModal');
    const input = document.getElementById('pdfPageInput');
    const confirmBtn = document.getElementById('pdfPageConfirm');
    const cancelBtn = document.getElementById('pdfPageCancel');

    // Reset and show modal
    input.value = '1';
    modal.style.display = 'flex';

    // Focus on input
    setTimeout(() => input.focus(), 100);

    // Handle confirm
    const handleConfirm = () => {
      const pageNum = parseInt(input.value) || 1;
      modal.style.display = 'none';
      cleanup();
      resolve(pageNum);
    };

    // Handle cancel
    const handleCancel = () => {
      modal.style.display = 'none';
      cleanup();
      resolve(1); // Default to page 1
    };

    // Handle Enter key
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleConfirm();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    };

    // Cleanup function
    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      input.removeEventListener('keypress', handleKeyPress);
    };

    // Add event listeners
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    input.addEventListener('keypress', handleKeyPress);
  });
}

// User account state
let userAccount = {
  isLoggedIn: false,
  credits: 0,
  email: null
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Reset chat session tracking on sidepanel open to ensure clean state
  chatSessionTab = { id: null, url: null };
  currentPageTab = { id: null, url: null };
  pageContent = null;
  sessionActivity = { hasInteraction: false, source: null };

  await loadApiKey();
  await loadTargetLanguageUI();
  await loadMindyVoiceUI();
  await loadTTSSettingsUI();
  await loadBookmarks();
  await loadHistory();
  await loadClipboardHistory();
  await loadPDFModeFromStorage();
  await loadUserAccount();
  await initializeProviderSettings(); // Initialize AI provider settings
  await initializeSidePanelProviderManager(); // Initialize AI Provider Manager
  await initializeProviderBadge(); // Initialize provider status badge
  setupEventListeners();
  checkApiStatus();
  startClipboardMonitoring();
  updatePDFStatusBanner();  // Update UI if PDF mode was saved
});

// Load API key from storage
async function loadApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      apiKey = result.geminiApiKey || null;
      if (apiKey) {
        document.getElementById('apiKey').value = apiKey;
        // Show remove button if API key exists
        document.getElementById('removeApiKey').style.display = 'inline-block';
      } else {
        // Hide remove button if no API key
        document.getElementById('removeApiKey').style.display = 'none';
      }
      resolve();
    });
  });
}

// Check API status
function checkApiStatus() {
  const statusIndicator = document.getElementById('apiStatus');
  const statusText = document.getElementById('apiStatusText');

  if (apiKey) {
    statusIndicator.classList.add('active');
    statusText.textContent = 'API Key configured';
  } else {
    statusIndicator.classList.remove('active');
    statusText.textContent = 'Not configured';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Save API Key
  document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
  
  // Remove API Key
  document.getElementById('removeApiKey').addEventListener('click', removeApiKey);

  // Save language preference
  document.getElementById('saveLanguage').addEventListener('click', saveLanguagePreference);

  // Save Mindy voice
  document.getElementById('saveMindyVoice').addEventListener('click', saveMindyVoice);

  // Save TTS settings
  document.getElementById('saveTTSSettings').addEventListener('click', saveTTSSettings);

  // Speech speed buttons with auto-save
  document.getElementById('ttsSpeedSlow').addEventListener('click', () => setTTSSpeed(0.98));
  document.getElementById('ttsSpeedNormal').addEventListener('click', () => setTTSSpeed(1.0));
  document.getElementById('ttsSpeedFast').addEventListener('click', () => setTTSSpeed(1.4));

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Action buttons
  document.getElementById('copyBtn').addEventListener('click', copyResult);
  document.getElementById('downloadBtn').addEventListener('click', downloadResult);
  document.getElementById('regenerateBtn').addEventListener('click', regenerateContent);

  // History
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);

  // Clipboard
  document.getElementById('clearClipboardBtn').addEventListener('click', clearClipboard);

  // Bookmarks
  document.getElementById('clearAllBookmarksBtn').addEventListener('click', clearAllBookmarks);

  // Auth button
  document.getElementById('authButton').addEventListener('click', handleAuthClick);

  // Chat
  document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  document.getElementById('clearChatBtn').addEventListener('click', clearChat);
  document.getElementById('chatRefreshBtn').addEventListener('click', startFreshChatSession);

  // Call Mindy
  document.getElementById('mindyStartBtn').addEventListener('click', startMindyCall);
  document.getElementById('mindyRefreshBtn').addEventListener('click', startFreshMindySession);
  document.getElementById('mindyNewSessionBtn').addEventListener('click', startFreshMindySession);
  document.getElementById('mindyMuteBtn').addEventListener('click', toggleMindyMute);
  document.getElementById('mindyEndBtn').addEventListener('click', endMindyCall);
  
  // Open Built-in AI Test Page
  const openTestPageBtn = document.getElementById('openTestPageBtn');
  if (openTestPageBtn) {
    openTestPageBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('test-builtin-ai-complete.html') });
    });
  }

  // Provider dashboard refresh
  const refreshBtn = document.getElementById('refreshProviderStatus');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '🔄 Refreshing...';
      await updateProviderDashboard();
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄 Refresh Status';
    });
  }
}

// Listen for tab activation changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Check if we're on the chat or mindy tab in sidepanel
  const currentTab = document.querySelector('.tab.active')?.dataset.tab;
  if (currentTab === 'chat' || currentTab === 'mindy') {
    await checkForTabChange();
  }
});

// Listen for tab URL updates (same tab, different URL)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].id === tabId) {
      const currentTab = document.querySelector('.tab.active')?.dataset.tab;
      if (currentTab === 'chat' || currentTab === 'mindy') {
        await checkForTabChange();
      }
    }
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateContent') {
    // Ignore textAssist and youtubeSummary tasks - they're handled in background.js
    if (request.task === 'textAssist' || request.task === 'youtubeSummary') {
      return;
    }
    currentTask = request;
    switchTab('generate'); // Switch to generate tab to show the results
    displayCurrentTask();
    generateContent(request);
  } else if (request.action === 'switchToChat') {
    switchTab('chat');
    // Don't load page content yet - wait for user to send first message
  } else if (request.action === 'switchToMindy') {
    switchTab('mindy');
  } else if (request.action === 'translateAndInject') {
    translateAndInject(request.content, sender.tab.id);
  } else if (request.action === 'translateAndReplace') {
    translateAndReplace(request.content, sender.tab.id, request.htmlContent);
  } else if (request.action === 'translatePageInPlace') {
    translatePageInPlace(request.content, sender.tab.id);
  } else if (request.action === 'textToSpeech') {
    generateTextToSpeech(request.content);
  } else if (request.action === 'toggleTTSPlayback') {
    toggleTTSPlayback();
  } else if (request.action === 'refreshBookmarks') {
    loadBookmarks();
  } else if (request.action === 'extractImageText') {
    extractImageText(request.imageUrl);
  } else if (request.action === 'explainImage') {
    explainImage(request.imageUrl);
  } else if (request.action === 'aiAssistChat') {
    // Text field assistant wants to pre-fill chat
    switchTab('chat');
    if (request.text) {
      // Clear page content so it doesn't interfere
      pageContent = null;

      // Pre-fill the chat input so user can click Send
      const chatInput = document.getElementById('chatInput');
      if (chatInput) {
        chatInput.value = `Improve this text: "${request.text}"`;
        chatInput.focus();
      }
    }
  }

  // Handle text assist requests (return response) - MUST come before the return statement
  if (request.action === 'generateContent' && request.task === 'textAssist') {
    handleTextAssist(request.prompt).then(result => {
      sendResponse({ result });
    }).catch(error => {
      console.error('Text assist error:', error);
      sendResponse({ error: error.message });
    });
    return true; // Keep channel open for async response
  }
  // Don't return true for other messages - these are fire-and-forget
});

// ==================== AI PROVIDER SETTINGS ====================

// Initialize provider settings
async function initializeProviderSettings() {
  // Load saved provider preference
  const result = await chrome.storage.local.get(['preferredProvider']);
  const preferredProvider = result.preferredProvider || 'builtin';
  
  // Set radio button
  const radio = document.getElementById(preferredProvider === 'builtin' ? 'builtinRadio' : 'cloudRadio');
  if (radio) {
    radio.checked = true;
    updateProviderSelection(preferredProvider);
  }
  
  // IMPORTANT: Set the active provider in the provider manager
  if (sidePanelProviderManager) {
    try {
      await sidePanelProviderManager.setProvider(preferredProvider);
      // Force set activeProvider to ensure it's set
      sidePanelProviderManager.activeProvider = preferredProvider;
      console.log(`✅ Provider manager initialized with: ${preferredProvider}`);
      console.log(`✅ Active provider confirmed: ${sidePanelProviderManager.getActiveProvider()}`);
    } catch (error) {
      console.error('Error setting initial provider:', error);
    }
  }
  
  // Check provider availability
  await updateProviderStatus();
  
  // Setup event listeners
  document.getElementById('builtinRadio')?.addEventListener('change', handleProviderChange);
  document.getElementById('cloudRadio')?.addEventListener('change', handleProviderChange);
  
  // Make provider options clickable
  document.getElementById('builtinProvider')?.addEventListener('click', () => {
    document.getElementById('builtinRadio').checked = true;
    handleProviderChange({ target: document.getElementById('builtinRadio') });
  });
  
  document.getElementById('cloudProvider')?.addEventListener('click', () => {
    document.getElementById('cloudRadio').checked = true;
    handleProviderChange({ target: document.getElementById('cloudRadio') });
  });
}

// Handle provider selection change
async function handleProviderChange(event) {
  const provider = event.target.value;
  
  // Reload API key to ensure we have the latest value
  await loadApiKey();
  
  // Check if Cloud AI is selected but API key is not configured
  if (provider === 'cloud' && !apiKey) {
    alert('⚠️ Cloud AI requires a Gemini API key.\n\nPlease configure your API key in Settings first, or use Built-in AI which works without an API key.');
    
    // Revert to Built-in AI
    const builtinRadio = document.getElementById('builtinRadio');
    if (builtinRadio) {
      builtinRadio.checked = true;
      updateProviderSelection('builtin');
    }
    return;
  }
  
  // Save preference (for backward compatibility)
  await chrome.storage.local.set({ preferredProvider: provider });
  
  // Update sidepanel provider manager - force reload settings and set provider
  if (sidePanelProviderManager) {
    try {
      // Reload settings from storage first
      await sidePanelProviderManager.loadSettings();
      // Then set the provider
      await sidePanelProviderManager.setProvider(provider);
      // Force set activeProvider to ensure it's updated
      sidePanelProviderManager.activeProvider = provider;
      console.log(`✅ Sidepanel Provider Manager updated to: ${provider}`);
      console.log(`✅ Active provider confirmed: ${sidePanelProviderManager.getActiveProvider()}`);
    } catch (error) {
      console.error('Error updating sidepanel provider manager:', error);
    }
  }
  
  // Also update background provider manager via message
  try {
    await chrome.runtime.sendMessage({
      action: 'setProvider',
      provider: provider
    });
  } catch (error) {
    console.warn('Could not update background provider:', error);
  }
  
  // Update UI
  updateProviderSelection(provider);
  
  // Refresh content scripts to sync state
  await refreshContentScripts();
  
  console.log(`✅ Provider switched to: ${provider}`);
}

// Update provider selection UI
function updateProviderSelection(provider) {
  // Update selected class
  document.getElementById('builtinProvider')?.classList.toggle('selected', provider === 'builtin');
  document.getElementById('cloudProvider')?.classList.toggle('selected', provider === 'cloud');
}

// Refresh content scripts to sync state with sidepanel
async function refreshContentScripts() {
  try {
    // Get all tabs
    const tabs = await chrome.tabs.query({});
    
    // Send refresh message to all content scripts
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'refreshProviderState',
          apiKey: apiKey,
          provider: sidePanelProviderManager?.getActiveProvider() || 'builtin'
        });
      } catch (error) {
        // Ignore errors for tabs without content scripts
        console.log(`Could not refresh tab ${tab.id}:`, error.message);
      }
    }
    
    console.log('✅ Content scripts refreshed');
  } catch (error) {
    console.error('❌ Error refreshing content scripts:', error);
  }
}

// Update provider status indicators
async function updateProviderStatus() {
  console.log('🔄 Updating provider status...');
  
  // Check Built-in AI availability
  const builtinStatus = document.getElementById('builtinStatusInline') || document.getElementById('builtinStatusCompact');
  if (builtinStatus) {
    try {
      if ('LanguageModel' in self) {
        const availability = await self.LanguageModel.availability({ outputLanguage: 'en' });
        console.log('📊 Built-in AI availability:', availability);
        
        if (availability === 'readily' || availability === 'available') {
          builtinStatus.textContent = '✅ Ready';
          builtinStatus.className = 'provider-status-inline available';
        } else if (availability === 'after-download' || availability === 'downloadable') {
          builtinStatus.textContent = '📥 Downloadable';
          builtinStatus.className = 'provider-status-inline available';
        } else if (availability === 'downloading') {
          builtinStatus.textContent = '⏳ Downloading...';
          builtinStatus.className = 'provider-status-inline';
        } else {
          builtinStatus.textContent = '❌ Unavailable';
          builtinStatus.className = 'provider-status-inline unavailable';
        }
      } else {
        builtinStatus.textContent = '❌ Not supported';
        builtinStatus.className = 'provider-status-inline unavailable';
      }
    } catch (error) {
      builtinStatus.textContent = '❌ Check failed';
      builtinStatus.className = 'provider-status-inline unavailable';
      console.error('Error checking Built-in AI:', error);
    }
  } else {
    console.warn('⚠️ builtinStatusInline/builtinStatusCompact element not found');
  }
  
  // Check Cloud API availability
  const cloudStatus = document.getElementById('cloudStatusInline') || document.getElementById('cloudStatusCompact');
  if (cloudStatus) {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    const hasApiKey = result.geminiApiKey && result.geminiApiKey.trim() !== '';
    console.log('📊 Cloud API key configured:', hasApiKey);
    
    if (hasApiKey) {
      cloudStatus.textContent = '✅ Configured';
      cloudStatus.className = 'provider-status-inline available';
    } else {
      cloudStatus.textContent = '⚠️ API key required';
      cloudStatus.className = 'provider-status-inline unavailable';
    }
  } else {
    console.warn('⚠️ cloudStatusInline/cloudStatusCompact element not found');
  }
  
  console.log('✅ Provider status updated');
  
  // Update dashboard if present
  await updateProviderDashboard();
}

// Update provider status dashboard
async function updateProviderDashboard() {
  try {
    // Update Built-in AI dashboard
    await updateBuiltinAIDashboard();
    
    // Update Cloud API dashboard
    await updateCloudAPIDashboard();
    
    console.log('✅ Provider dashboard updated');
  } catch (error) {
    console.error('❌ Error updating provider dashboard:', error);
  }
}

// Update Built-in AI dashboard status
async function updateBuiltinAIDashboard() {
  const apis = [
    { name: 'Proofreader', id: 'builtinProofreaderStatus', check: 'Proofreader' },
    { name: 'Translator', id: 'builtinTranslatorStatus', check: 'Translator' },
    { name: 'Summarizer', id: 'builtinSummarizerStatus', check: 'Summarizer' },
    { name: 'Rewriter', id: 'builtinRewriterStatus', check: 'Rewriter' },
    { name: 'Writer', id: 'builtinWriterStatus', check: 'Writer' },
    { name: 'Prompt', id: 'builtinPromptStatus', check: 'LanguageModel' }
  ];
  
  let availableCount = 0;
  
  for (const api of apis) {
    const element = document.getElementById(api.id);
    if (!element) continue;
    
    try {
      // Check if the API exists in global scope
      if (api.check in self) {
        let availability;
        
        // Translator API requires language parameters
        if (api.check === 'Translator') {
          availability = await self.Translator.availability({
            sourceLanguage: 'en',
            targetLanguage: 'es'
          });
        } else if (api.check === 'Proofreader') {
          // Proofreader API requires expectedInputLanguages parameter
          availability = await self.Proofreader.availability({
            expectedInputLanguages: ['en']
          });
        } else {
          availability = await self[api.check].availability();
        }
        
        if (availability === 'readily' || availability === 'available') {
          element.innerHTML = '<span class="status-value available">✅ Available</span>';
          availableCount++;
        } else if (availability === 'after-download' || availability === 'downloadable') {
          element.innerHTML = '<span class="status-value downloading clickable" data-api="' + api.check + '" title="Click to download">📥 Downloadable</span>';
          // Add click handler
          const statusEl = element.querySelector('.status-value');
          statusEl.style.cursor = 'pointer';
          statusEl.addEventListener('click', () => downloadAPIModel(api.check, api.name));
        } else if (availability === 'downloading') {
          element.innerHTML = '<span class="status-value downloading">⏳ Downloading</span>';
        } else {
          element.innerHTML = '<span class="status-value unavailable">❌ Unavailable</span>';
        }
      } else {
        element.innerHTML = '<span class="status-value unavailable">❌ Not supported</span>';
      }
    } catch (error) {
      console.error(`Error checking ${api.name}:`, error);
      element.innerHTML = '<span class="status-value unavailable">❌ Check failed</span>';
    }
  }
  
  // Update overall status
  const overallStatus = document.getElementById('builtinOverallStatus');
  if (overallStatus) {
    if (availableCount === apis.length) {
      overallStatus.innerHTML = '<span class="status-value available">✅ All APIs Available</span>';
    } else if (availableCount > 0) {
      overallStatus.innerHTML = `<span class="status-value available">✅ ${availableCount}/${apis.length} APIs Available</span>`;
    } else {
      overallStatus.innerHTML = '<span class="status-value unavailable">❌ No APIs Available</span>';
    }
  }
}

// Download API Model from dashboard
async function downloadAPIModel(apiName, displayName) {
  console.log(`📥 Starting download for ${displayName}...`);
  
  const statusElement = document.getElementById(`builtin${displayName}Status`);
  if (!statusElement) return;
  
  // Show downloading status
  statusElement.innerHTML = '<span class="status-value downloading">⏳ Downloading...</span>';
  
  try {
    let session;
    
    if (apiName === 'Translator') {
      // Translator needs language parameters
      session = await self.Translator.create({
        sourceLanguage: 'en',
        targetLanguage: 'es',
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            const percent = Math.round(e.loaded * 100);
            statusElement.innerHTML = `<span class="status-value downloading">📥 ${percent}%</span>`;
          });
        }
      });
    } else if (apiName === 'Summarizer') {
      session = await self.Summarizer.create({
        type: 'key-points',
        format: 'markdown',
        length: 'medium',
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            const percent = Math.round(e.loaded * 100);
            statusElement.innerHTML = `<span class="status-value downloading">📥 ${percent}%</span>`;
          });
        }
      });
    } else if (apiName === 'LanguageModel') {
      session = await self.LanguageModel.create({
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            const percent = Math.round(e.loaded * 100);
            statusElement.innerHTML = `<span class="status-value downloading">📥 ${percent}%</span>`;
          });
        }
      });
    } else {
      // Generic download for other APIs
      session = await self[apiName].create({
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            const percent = Math.round(e.loaded * 100);
            statusElement.innerHTML = `<span class="status-value downloading">📥 ${percent}%</span>`;
          });
        }
      });
    }
    
    // Success
    statusElement.innerHTML = '<span class="status-value available">✅ Available</span>';
    console.log(`✅ ${displayName} downloaded successfully`);
    
    // Refresh the entire dashboard after a short delay
    setTimeout(() => updateProviderDashboard(), 500);
    
  } catch (error) {
    console.error(`❌ Error downloading ${displayName}:`, error);
    statusElement.innerHTML = '<span class="status-value unavailable">❌ Download failed</span>';
    
    // Revert to downloadable after 2 seconds
    setTimeout(() => updateProviderDashboard(), 2000);
  }
}

// Update Cloud API dashboard status
async function updateCloudAPIDashboard() {
  const apiKeyStatus = document.getElementById('cloudApiKeyStatus');
  const connectionStatus = document.getElementById('cloudConnectionStatus');
  
  if (apiKeyStatus) {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    const hasApiKey = result.geminiApiKey && result.geminiApiKey.trim() !== '';
    
    if (hasApiKey) {
      apiKeyStatus.innerHTML = '<span class="status-value available">✅ Configured</span>';
    } else {
      apiKeyStatus.innerHTML = '<span class="status-value unavailable">❌ Not configured</span>';
    }
  }
  
  if (connectionStatus) {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    const hasApiKey = result.geminiApiKey && result.geminiApiKey.trim() !== '';
    
    if (hasApiKey) {
      connectionStatus.innerHTML = '<span class="status-value available">✅ Ready</span>';
    } else {
      connectionStatus.innerHTML = '<span class="status-value unavailable">⚠️ API key required</span>';
    }
  }
}

// Save API Key
async function saveApiKey() {
  const key = document.getElementById('apiKey').value.trim();
  if (!key) {
    alert('Please enter an API key');
    return;
  }

  chrome.storage.local.set({ geminiApiKey: key }, async () => {
    apiKey = key;
    checkApiStatus();
    
    // Reinitialize cloud provider with new API key in sidepanel
    if (sidePanelProviderManager) {
      const cloudProvider = sidePanelProviderManager.providers.get('cloud');
      if (cloudProvider) {
        await cloudProvider.setAPIKey(key);
        console.log('✅ Sidepanel: Cloud provider reinitialized with new API key');
      }
      
      // Reload provider manager settings to ensure it's in sync
      await sidePanelProviderManager.loadSettings();
      console.log('✅ Sidepanel: Provider manager settings reloaded');
    }
    
    // Also update background provider manager
    try {
      await chrome.runtime.sendMessage({
        action: 'updateApiKey',
        apiKey: key
      });
      console.log('✅ Background: Cloud provider notified of API key update');
    } catch (error) {
      console.warn('Could not update background provider:', error);
    }
    
    // Update provider status after saving key
    await updateProviderStatus();
    
    // Refresh content scripts to sync state
    await refreshContentScripts();
    
    // Show remove button
    document.getElementById('removeApiKey').style.display = 'inline-block';
    
    alert('API Key saved successfully!');
  });
}

// Remove API Key
async function removeApiKey() {
  if (!confirm('Are you sure you want to remove the API key?\n\nCloud AI features will not work without an API key.')) {
    return;
  }

  chrome.storage.local.remove('geminiApiKey', async () => {
    apiKey = null;
    document.getElementById('apiKey').value = '';
    checkApiStatus();
    
    // Reinitialize cloud provider with null API key in sidepanel
    if (sidePanelProviderManager) {
      const cloudProvider = sidePanelProviderManager.providers.get('cloud');
      if (cloudProvider) {
        await cloudProvider.setAPIKey(null);
        console.log('✅ Sidepanel: Cloud provider reinitialized with no API key');
      }
    }
    
    // Also update background provider manager
    try {
      await chrome.runtime.sendMessage({
        action: 'updateApiKey',
        apiKey: null
      });
      console.log('✅ Background: Cloud provider notified of API key removal');
    } catch (error) {
      console.warn('Could not update background provider:', error);
    }
    
    // Update provider status after removing key
    await updateProviderStatus();
    
    // Refresh content scripts to sync state
    await refreshContentScripts();
    
    // Hide remove button
    document.getElementById('removeApiKey').style.display = 'none';
    
    alert('API Key removed successfully!');
  });
}

// Save language preference
function saveLanguagePreference() {
  const lang = document.getElementById('targetLanguage').value;
  chrome.storage.local.set({ targetLanguage: lang }, () => {
    alert('Language preference saved!');
  });
}

// Save Mindy voice preference
function saveMindyVoice() {
  const voice = document.getElementById('mindyVoice').value;
  chrome.storage.local.set({ mindyVoice: voice }, () => {
    alert(`Mindy voice saved! (${voice})\n\nThe new voice will be used in your next call.`);
  });
}

// Load Mindy voice for UI
async function loadMindyVoiceUI() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['mindyVoice'], (result) => {
      const voice = result.mindyVoice || 'Aoede';
      const select = document.getElementById('mindyVoice');
      if (select) {
        select.value = voice;
      }
      resolve();
    });
  });
}

// Load Mindy voice
async function loadMindyVoice() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['mindyVoice'], (result) => {
      resolve(result.mindyVoice || 'Aoede');
    });
  });
}

// Load target language for UI
async function loadTargetLanguageUI() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['targetLanguage'], (result) => {
      const lang = result.targetLanguage || 'en';
      const select = document.getElementById('targetLanguage');
      if (select) {
        select.value = lang;
      }
      resolve();
    });
  });
}

// Load target language
async function loadTargetLanguage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['targetLanguage'], (result) => {
      resolve(result.targetLanguage || 'en');
    });
  });
}

// Get language name from code
function getLanguageName(code) {
  const languages = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese (Simplified)',
    'ar': 'Arabic',
    'hi': 'Hindi'
  };
  return languages[code] || 'English';
}

// Save TTS settings
function saveTTSSettings() {
  const voice = document.getElementById('ttsVoice').value;
  const maxChars = document.getElementById('ttsMaxChars').value;
  chrome.storage.local.set({
    ttsVoice: voice,
    ttsMaxChars: parseInt(maxChars) || 1000
  }, () => {
    alert('TTS settings saved!');
  });
}

// Set TTS speed and auto-save
function setTTSSpeed(speed) {
  chrome.storage.local.set({ ttsSpeechSpeed: speed }, () => {
    updateSpeedButtonStyles(speed);
  });
}

// Update speed button styles to show active state
function updateSpeedButtonStyles(speed) {
  const slowBtn = document.getElementById('ttsSpeedSlow');
  const normalBtn = document.getElementById('ttsSpeedNormal');
  const fastBtn = document.getElementById('ttsSpeedFast');

  // Reset all buttons
  [slowBtn, normalBtn, fastBtn].forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  });

  // Highlight active button
  if (speed <= 0.98) {
    slowBtn.classList.remove('btn-secondary');
    slowBtn.classList.add('btn-primary');
  } else if (speed >= 1.4) {
    fastBtn.classList.remove('btn-secondary');
    fastBtn.classList.add('btn-primary');
  } else {
    normalBtn.classList.remove('btn-secondary');
    normalBtn.classList.add('btn-primary');
  }
}

// Load TTS settings for UI
async function loadTTSSettingsUI() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['ttsVoice', 'ttsMaxChars', 'ttsSpeechSpeed'], (result) => {
      const voice = result.ttsVoice || 'Aoede';
      const maxChars = result.ttsMaxChars || 1000;
      const speechSpeed = result.ttsSpeechSpeed || 1.0;

      const voiceSelect = document.getElementById('ttsVoice');
      const maxCharsInput = document.getElementById('ttsMaxChars');

      if (voiceSelect) {
        voiceSelect.value = voice;
      }
      if (maxCharsInput) {
        maxCharsInput.value = maxChars;
      }

      // Update speed button styles
      updateSpeedButtonStyles(speechSpeed);

      resolve();
    });
  });
}

// Load TTS settings
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

// Switch tabs
async function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}Tab`).classList.add('active');

  // Check the current tab and update PDF banner visibility
  if (tabName === 'chat' || tabName === 'mindy') {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        const tab = tabs[0];
        const isPDF = tab.url.toLowerCase().endsWith('.pdf') || tab.url.includes('.pdf?');

        if (!isPDF) {
          // Not a PDF - deactivate PDF mode and hide banner
          pdfMode.isActive = false;
          updatePDFStatusBanner();
        } else {
          // Check if this is a NEW PDF (different from the stored one)
          const isNewPDF = !pdfMode.currentTab || 
                          pdfMode.currentTab.id !== tab.id || 
                          pdfMode.currentTab.url !== tab.url;

          if (isNewPDF) {
            // New PDF detected - reset captured pages to start fresh
            console.log('🆕 New PDF detected, resetting captured pages');
            pdfMode.capturedPages = [];
            pdfMode.lastLoadedPage = null;
          }

          // PDF - activate PDF mode and show banner
          pdfMode.isActive = true;
          pdfMode.currentTab = tab;
          savePDFModeToStorage();
          updatePDFStatusBanner();
        }
      }
    } catch (error) {
      console.log('Could not check current tab:', error);
    }
  }

  if (tabName === 'chat' || tabName === 'mindy') {
    try {
      await checkForTabChange();
    } catch (error) {
      console.log('Could not verify tab change on tab switch:', error);
    }
  }
}

// Display current task
function displayCurrentTask() {
  const taskDisplay = document.getElementById('currentTask');
  const taskDescriptions = {
    'summarize': `📄 Summarizing page: ${currentTask.title}`,
    'translate-page': `🌐 Translating page: ${currentTask.title}`,
    'translate-selection': `🔤 Translating selected text`,
    'mindmap': `🧠 Creating mindmap for: ${currentTask.title}`
  };

  taskDisplay.innerHTML = `<p>${taskDescriptions[currentTask.task] || 'Processing task...'}</p>`;
}

// Generate content using AI Provider Manager
async function generateContent(task) {
  showLoading(true);
  document.getElementById('actionButtons').style.display = 'none';

  // Add timeout to prevent infinite spinning (60 seconds)
  const timeoutId = setTimeout(() => {
    showLoading(false);
    showResult('❌ Request timed out. The content may be too large. Try a smaller page or use Cloud AI.', 'error');
    document.getElementById('actionButtons').style.display = 'flex';
  }, 60000);

  try {
    const manager = await initializeSidePanelProviderManager();
    const activeProvider = manager.getActiveProvider();
    let result;

    // Use dedicated Built-in AI methods when available
    if (task.task === 'summarize' && activeProvider === 'builtin') {
      try {
        console.log('📄 Using Built-in AI Summarizer API');
        
        // Built-in Summarizer has input limits (~4000 tokens / ~16000 chars)
        // For large content, chunk it or use prompt-based approach
        const MAX_SUMMARIZER_LENGTH = 15000;
        
        if (task.content.length > MAX_SUMMARIZER_LENGTH) {
          console.warn(`⚠️ Content too large (${task.content.length} chars), using prompt-based approach`);
          // Use prompt-based for large content
          const prompt = await buildPrompt(task);
          const response = await manager.generateContent(prompt);
          result = response.data;
        } else {
          // Use Summarizer API for smaller content
          const response = await manager.summarizeContent(task.content, {
            type: 'key-points',
            format: 'markdown',
            length: 'medium'  // Changed from 'short' to 'medium' for more detail
          });
          result = response.data;
          console.log('✅ Summarized using Built-in AI Summarizer API');
        }
      } catch (error) {
        console.warn('⚠️ Built-in Summarizer failed, falling back to prompt-based:', error);
        // Fallback to prompt-based summarization
        const prompt = await buildPrompt(task);
        const response = await manager.generateContent(prompt);
        result = response.data;
      }
    } else {
      // For other tasks or Cloud AI, use prompt-based approach
      const prompt = await buildPrompt(task);
      result = await callGeminiApi(prompt);
    }

    clearTimeout(timeoutId); // Clear timeout on success
    showResult(result, 'success');
    saveToHistory(task, result);
    document.getElementById('actionButtons').style.display = 'flex';
  } catch (error) {
    clearTimeout(timeoutId); // Clear timeout on error
    console.error('Error generating content:', error);
    console.error('Error stack:', error.stack);
    
    // Provide helpful error messages
    let errorMessage = error.message || 'Unknown error occurred';
    
    if (errorMessage.includes('Both providers are unavailable')) {
      errorMessage = '❌ Both AI providers are unavailable.\n\n' +
        '• Built-in AI: May not be ready or content is too large\n' +
        '• Cloud AI: Requires API key configuration\n\n' +
        'Please configure your Gemini API key in Settings or try a smaller page.';
    } else if (errorMessage.includes('Summarizer API not available')) {
      errorMessage = '❌ Summarizer API is not available.\n\n' +
        'Please ensure you have Chrome 138+ and Gemini Nano is downloaded.\n' +
        'Visit chrome://on-device-internals to check status.';
    } else if (errorMessage.includes('User activation required')) {
      errorMessage = '❌ User interaction required. Please click the button again.';
    }
    
    showResult(errorMessage, 'error');
  }

  showLoading(false);
}

// Build prompt based on task
async function buildPrompt(task) {
  const targetLang = await loadTargetLanguage();
  const langName = getLanguageName(targetLang);

  const prompts = {
    'summarize': `Create an engaging and informative summary of the following content.

STRUCTURE:
1. **🎯 Main Point** - One sentence capturing the core message (use bold)
2. **📋 Key Takeaways** - 5-7 bullet points with the most important information
3. **💡 Notable Details** - 2-3 interesting facts or insights worth knowing

STYLE:
- Make it informative yet easy to scan
- Use emojis sparingly for visual interest
- Keep each bullet point clear and specific (15-25 words)
- Focus on actionable insights and key facts
- Make it engaging - this should be fun to read!

Content:
${task.content}`,

    'translate-page': `Please translate the following webpage content to ${langName}. Maintain formatting and structure:\n\n${task.content}`,

    'translate-selection': `Please translate the following text to ${langName}:\n\n${task.content}`,

    'mindmap': `Create a visual mindmap for the following content. Format it as a centered, branching structure with a main topic in the center (use 🎯 emoji), major branches (use ⭐ emoji), and sub-branches (use • emoji). Make it visually distinct and easy to scan:\n\n${task.content}\n\nFormat example:\n\n🎯 Main Topic\n   │\n   ├─⭐ Major Branch 1\n   │   • Sub-point 1\n   │   • Sub-point 2\n   │\n   ├─⭐ Major Branch 2\n   │   • Sub-point 1\n   │\n   └─⭐ Major Branch 3\n       • Sub-point 1`
  };

  return prompts[task.task] || task.content;
}

// Call AI Provider Manager (replaces direct Gemini API calls)
async function callGeminiApi(prompt, imageParts = null) {
  // If there are image parts, use direct Gemini API call (multimodal requires Cloud AI)
  if (imageParts && imageParts.length > 0) {
    return await callGeminiApiLegacy(prompt, imageParts);
  }
  
  // For text-only requests, use provider manager
  try {
    const manager = await initializeSidePanelProviderManager();
    
    console.log('📤 Calling AI Provider Manager with prompt length:', prompt.length);
    
    const response = await manager.generateContent(prompt);
    
    console.log('✅ Response received from', response.provider);
    
    return response.data;
  } catch (error) {
    console.error('❌ AI Provider error:', error);
    throw error;
  }
}

// Legacy function kept for compatibility - now uses provider manager
async function callGeminiApiLegacy(prompt, imageParts = null) {
  // Use latest lite model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent?key=${apiKey}`;

  // Build parts array
  let parts = [];
  if (imageParts && imageParts.length > 0) {
    parts = [...imageParts, { text: prompt }];
  } else {
    parts = [{ text: prompt }];
  }

  console.log('📤 Calling Gemini API (legacy) with prompt length:', prompt.length);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: parts
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
    console.error('API Error Response:', error);
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('API Response:', data);
  console.log('API Response structure check:', {
    hasCandidates: !!data.candidates,
    candidatesLength: data.candidates?.length,
    hasFirstCandidate: !!data.candidates?.[0],
    hasContent: !!data.candidates?.[0]?.content,
    hasParts: !!data.candidates?.[0]?.content?.parts,
    partsLength: data.candidates?.[0]?.content?.parts?.length
  });

  // Check if response has expected structure
  if (!data.candidates || !data.candidates[0]) {
    console.error('Unexpected API response structure:', data);
    throw new Error('API returned unexpected response format: missing candidates');
  }

  const candidate = data.candidates[0];
  if (!candidate.content) {
    console.error('Unexpected API response structure:', data);
    throw new Error('API returned unexpected response format: missing content');
  }

  if (!candidate.content.parts || candidate.content.parts.length === 0) {
    console.error('Unexpected API response structure:', data);
    // Check if content was filtered or blocked
    if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
      throw new Error(`Content blocked: ${candidate.finishReason}. Please try with different content.`);
    }
    throw new Error('API returned unexpected response format: missing parts');
  }

  // Check if parts[0] exists and has text property
  if (!candidate.content.parts[0]) {
    console.error('Unexpected API response structure:', data);
    throw new Error('API returned unexpected response format: parts array is empty');
  }

  // Check for text content
  const text = candidate.content.parts[0].text;
  if (!text) {
    console.error('Unexpected API response structure:', data);
    console.error('parts[0]:', candidate.content.parts[0]);
    throw new Error('API returned unexpected response format: text content is missing');
  }

  return text;
}

// Call Gemini API with vision (multimodal) support
async function callGeminiVisionApi(prompt, imageBase64) {
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  console.log('📤 Calling Gemini Vision API');
  console.log('Prompt:', prompt.substring(0, 100) + '...');
  console.log('Image data length:', imageBase64.length);

  // Remove data URL prefix if present
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,  // Lower temperature for more accurate OCR
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192  // Larger output for long documents
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Vision API Error Response:', error);
    throw new Error(error.error?.message || `Vision API request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ Vision API Response received');

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    console.error('Unexpected Vision API response structure:', data);
    throw new Error('Vision API returned unexpected response format');
  }

  return data.candidates[0].content.parts[0].text;
}

// Get current AI provider
function getCurrentProvider() {
  if (sidePanelProviderManager && sidePanelProviderManager.getActiveProvider()) {
    return sidePanelProviderManager.getActiveProvider();
  }
  // Default to builtin if not set
  return 'builtin';
}

// Smart PDF extraction - chooses method based on AI provider
async function extractPDFPage(tabId, pageNumber = null) {
  const provider = getCurrentProvider();
  
  // Built-in AI: try text extraction first, fall back to OCR if needed
  if (provider === 'builtin') {
    try {
      return await extractPDFPageText(tabId, pageNumber);
    } catch (error) {
      // If OCR fallback also failed and it's due to missing API key
      if (error.message.includes('API key')) {
        // Show helpful message to user
        const userWantsOCR = confirm(
          'This PDF requires OCR (image-based text extraction).\n\n' +
          'Built-in AI cannot extract text from Chrome\'s native PDF viewer.\n\n' +
          'Options:\n' +
          '1. Switch to Cloud AI and configure API key for OCR\n' +
          '2. Open the PDF in a different viewer (Firefox PDF.js)\n\n' +
          'Would you like to switch to Cloud AI now?'
        );
        
        if (userWantsOCR) {
          // Switch to cloud AI
          await switchProvider('cloud');
          throw new Error('Please configure your API key in Settings, then try again.');
        }
      }
      throw error;
    }
  }
  
  // Cloud AI: use OCR for better accuracy with images
  return await extractPDFPageWithOCR(tabId, pageNumber);
}

// Extract PDF page text directly (for built-in AI - no OCR needed)
async function extractPDFPageText(tabId, pageNumber = null) {
  try {
    console.log('📄 Extracting PDF text...');

    // Hide floating popup before extraction
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
          const popup = document.getElementById('ai-assistant-popup');
          if (popup) {
            popup.style.display = 'none';
          }
        }
      });
    } catch (e) {
      console.log('Could not hide popup:', e);
    }

    // Get current page number from the PDF viewer if not provided
    if (!pageNumber) {
      try {
        const pageResults = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: () => {
            // Try PDF.js viewer
            if (window.PDFViewerApplication && window.PDFViewerApplication.pdfViewer) {
              const pageNum = window.PDFViewerApplication.pdfViewer.currentPageNumber;
              return { page: pageNum, method: 'pdfjs' };
            }
            return { page: 1, method: 'default' };
          }
        });
        pageNumber = pageResults[0]?.result?.page || 1;
      } catch (e) {
        console.log('Could not detect page number, defaulting to page 1:', e.message);
        pageNumber = 1;
      }
    }

    console.log('📄 Extracting text from page:', pageNumber);

    // Request text from pdf-content.js
    const textResults = await chrome.tabs.sendMessage(tabId, { action: 'getPDFText' });
    const extractedText = textResults?.text || '';

    // Check if extraction failed or returned empty/invalid text
    if (!extractedText || 
        extractedText === 'No text could be extracted from PDF' ||
        extractedText.length < 10) {
      
      console.warn('⚠️ Text extraction failed or returned minimal text');
      console.log('💡 Chrome native PDF viewer detected - switching to OCR fallback');
      
      // Automatically fall back to OCR for Chrome's native viewer
      return await extractPDFPageWithOCR(tabId, pageNumber);
    }

    console.log('✅ Text extraction complete, length:', extractedText.length);

    // Filter out extension UI text that might have slipped through
    const menuTexts = [
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
      'Open Dashboard'
    ];
    
    let cleanedText = extractedText;
    for (const menuText of menuTexts) {
      // Remove menu text and surrounding whitespace
      const regex = new RegExp(`\\s*${menuText}\\s*`, 'gi');
      cleanedText = cleanedText.replace(regex, ' ');
    }
    
    // Clean up multiple spaces
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
    
    console.log('🧹 Cleaned text, length:', cleanedText.length);

    // Apply context limit safeguards
    const maxChars = 10000;
    const truncated = cleanedText.length > maxChars;
    const finalText = truncated ? cleanedText.substring(0, maxChars) : cleanedText;

    if (truncated) {
      console.warn(`⚠️ Extracted text is large (${cleanedText.length} chars), truncating to ${maxChars}`);
    }

    // Restore popup
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
          const popup = document.getElementById('ai-assistant-popup');
          if (popup) {
            popup.style.display = '';
          }
        }
      });
    } catch (e) {
      console.log('Could not restore popup:', e);
    }

    return {
      text: finalText,
      truncated: truncated,
      originalLength: extractedText.length,
      pageNumber: pageNumber,
      timestamp: Date.now(),
      charCount: finalText.length,
      method: 'text-extraction'
    };
  } catch (error) {
    console.error('❌ PDF text extraction error:', error);
    console.log('🔄 Falling back to OCR...');
    
    // Restore popup before falling back
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
          const popup = document.getElementById('ai-assistant-popup');
          if (popup) {
            popup.style.display = '';
          }
        }
      });
    } catch (e) {
      console.log('Could not restore popup:', e);
    }
    
    // Fall back to OCR if text extraction fails
    try {
      return await extractPDFPageWithOCR(tabId, pageNumber);
    } catch (ocrError) {
      console.error('❌ OCR fallback also failed:', ocrError);
      throw new Error('Could not extract text from PDF using either method. Please ensure you have a valid API key configured for OCR.');
    }
  }
}

// Extract PDF page content using OCR (for cloud AI with vision capabilities)
async function extractPDFPageWithOCR(tabId, pageNumber = null) {
  try {
    console.log('📸 Capturing PDF page screenshot...');

    // Get current page number from the PDF viewer if not provided
    if (!pageNumber) {
      try {
        const pageResults = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: () => {
            // Try PDF.js viewer (works with Firefox PDF viewer and custom viewers)
            if (window.PDFViewerApplication && window.PDFViewerApplication.pdfViewer) {
              const pageNum = window.PDFViewerApplication.pdfViewer.currentPageNumber;
              console.log('✅ Found page via PDFViewerApplication.pdfViewer:', pageNum);
              return { page: pageNum, method: 'pdfjs' };
            }

            // Chrome's native viewer doesn't expose page numbers to extensions
            console.log('⚠️ Chrome native PDF viewer detected - cannot auto-detect page');
            return { page: null, method: 'chrome-native' };
          }
        });
        const result = pageResults[0]?.result;

        // For Chrome's native viewer or detection failure, default to page 1
        if (!result || !result.page || result.method === 'chrome-native') {
          pageNumber = 1;
          console.log('📄 Using default page 1 (Chrome native viewer or detection failed)');
        } else {
          pageNumber = result.page;
          console.log(`✅ Page detected via ${result.method}:`, pageNumber);
        }
      } catch (e) {
        console.log('Could not detect page number, defaulting to page 1:', e.message);
        pageNumber = 1;
      }
    }

    console.log('📄 Detected page number:', pageNumber);

    // Capture the visible tab as screenshot
    const dataUrl = await new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(dataUrl);
        }
      });
    });

    console.log('✅ Screenshot captured, size:', dataUrl.length);

    // Use Gemini Vision API to extract text from screenshot
    const prompt = `Extract all text from this PDF page. Return only the text content, maintaining paragraph structure and formatting. Be thorough and accurate.`;

    const extractedText = await callGeminiVisionApi(prompt, dataUrl);

    console.log('✅ OCR extraction complete, length:', extractedText.length);

    // Apply context limit safeguards
    const maxChars = 10000;
    const truncated = extractedText.length > maxChars;
    const finalText = truncated ? extractedText.substring(0, maxChars) : extractedText;

    if (truncated) {
      console.warn(`⚠️ Extracted text is large (${extractedText.length} chars), truncating to ${maxChars}`);
    }

    return {
      text: finalText,
      truncated: truncated,
      originalLength: extractedText.length,
      pageNumber: pageNumber,
      timestamp: Date.now(),
      charCount: finalText.length
    };
  } catch (error) {
    console.error('❌ PDF OCR extraction error:', error);
    throw error;
  }
}

// PDF Page Management Functions

// Add captured page to PDF mode
function addCapturedPage(pageData) {
  // Check if page already exists
  const existingIndex = pdfMode.capturedPages.findIndex(p => p.pageNumber === pageData.pageNumber);

  if (existingIndex >= 0) {
    // Update existing page
    pdfMode.capturedPages[existingIndex] = pageData;
    console.log(`📄 Updated page ${pageData.pageNumber} in captured pages`);
  } else {
    // Add new page
    pdfMode.capturedPages.push(pageData);
    console.log(`📄 Added page ${pageData.pageNumber} to captured pages`);
  }

  // Sort by page number
  pdfMode.capturedPages.sort((a, b) => a.pageNumber - b.pageNumber);

  pdfMode.lastLoadedPage = pageData.pageNumber;

  // Save to storage
  savePDFModeToStorage();

  // Update UI
  updatePDFStatusBanner();
}

// Build context based on selected mode
function buildPDFContext() {
  if (pdfMode.capturedPages.length === 0) {
    return 'No PDF pages captured yet.';
  }

  let pages = [];

  switch (pdfMode.contextMode) {
    case 'single':
      // Only the last loaded page
      pages = pdfMode.capturedPages.filter(p => p.pageNumber === pdfMode.lastLoadedPage);
      break;

    case 'accumulate':
      // All captured pages
      pages = pdfMode.capturedPages;
      break;

    case 'sliding':
      // Last N pages
      pages = pdfMode.capturedPages.slice(-pdfMode.slidingWindowSize);
      break;
  }

  if (pages.length === 0) {
    return 'No PDF pages in current context mode.';
  }

  // Build context string
  let context = `PDF Document (${pdfMode.contextMode === 'single' ? 'Page ' + pages[0].pageNumber : pages.length + ' pages'})\n\n`;

  pages.forEach((page, idx) => {
    if (pages.length > 1) {
      context += `--- Page ${page.pageNumber} ---\n`;
    }
    context += page.text;
    if (idx < pages.length - 1) {
      context += '\n\n';
    }
  });

  // Add metadata
  const totalChars = pages.reduce((sum, p) => sum + p.charCount, 0);
  const estimatedTokens = Math.ceil(totalChars / 4); // Rough estimate: 4 chars per token

  if (pdfMode.contextMode !== 'single') {
    context += `\n\n[Context: ${pages.length} page(s), ~${estimatedTokens} tokens]`;
  }

  return context;
}

// Calculate total token usage
function calculatePDFTokens() {
  const totalChars = pdfMode.capturedPages.reduce((sum, p) => sum + p.charCount, 0);
  return Math.ceil(totalChars / 4); // Rough estimate
}

// Clear captured pages
function clearCapturedPages(pageNumber = null) {
  if (pageNumber) {
    // Clear specific page
    pdfMode.capturedPages = pdfMode.capturedPages.filter(p => p.pageNumber !== pageNumber);
    console.log(`🗑️ Cleared page ${pageNumber}`);
  } else {
    // Clear all pages
    pdfMode.capturedPages = [];
    pdfMode.lastLoadedPage = null;
    console.log('🗑️ Cleared all captured pages');
  }

  savePDFModeToStorage();
  updatePDFStatusBanner();
}

// Save PDF mode state to storage
function savePDFModeToStorage() {
  chrome.storage.local.set({ pdfMode: pdfMode }, () => {
    console.log('💾 PDF mode saved to storage');
  });
}

// Load PDF mode state from storage
async function loadPDFModeFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pdfMode'], (result) => {
      if (result.pdfMode) {
        pdfMode = result.pdfMode;
        console.log('📂 Loaded PDF mode from storage:', pdfMode);
      }
      resolve();
    });
  });
}

// Update PDF status banner UI
function updatePDFStatusBanner() {
  if (!pdfMode.isActive) {
    // Hide banners if not in PDF mode
    document.getElementById('pdfStatusBannerChat').style.display = 'none';
    document.getElementById('pdfStatusBannerMindy').style.display = 'none';
    return;
  }

  // Save current input value before regenerating HTML
  const currentInputValue = document.getElementById('pdfPageNumberInput')?.value || '1';

  // Build banner HTML
  const capturedPagesList = pdfMode.capturedPages.map(p => p.pageNumber).join(', ');
  const totalPages = pdfMode.capturedPages.length;
  const tokens = calculatePDFTokens();
  const maxTokens = 128000; // Gemini 2.0 Flash limit
  const tokenPercent = (tokens / maxTokens) * 100;

  let bannerHTML = `
    <div class="pdf-banner-header">
      <div class="pdf-banner-title">
        📄 PDF Mode Active
      </div>
    </div>
    
    <div class="pdf-banner-info">
      <div class="pdf-banner-info-item">
        <strong>Pages Captured:</strong> ${totalPages} ${totalPages === 0 ? '(none yet)' : `(${capturedPagesList})`}
      </div>
    </div>
  `;

  if (totalPages > 0) {
    bannerHTML += `
      <div class="pdf-banner-pages">
        ${pdfMode.capturedPages.map(page => `
          <div class="pdf-page-badge ${page.pageNumber === pdfMode.lastLoadedPage ? 'active' : ''}" data-page="${page.pageNumber}">
            Page ${page.pageNumber}
            <span class="pdf-page-badge-close" data-page="${page.pageNumber}">×</span>
          </div>
        `).join('')}
      </div>
      
      <div class="pdf-banner-controls">
        <div class="pdf-capture-group">
          <button class="pdf-banner-btn primary" id="pdfRecaptureBtn">
            Capture Page
          </button>
          <input type="number" class="pdf-page-input" id="pdfPageNumberInput" placeholder="Page #" min="1" value="1" />
        </div>
        <button class="pdf-banner-btn" id="pdfClearAllBtn">
          🗑️ Clear All
        </button>
      </div>
      
      <div class="pdf-token-usage">
        <div>Token Usage: ~${tokens.toLocaleString()} / ${maxTokens.toLocaleString()} (${tokenPercent.toFixed(1)}%)</div>
        <div class="pdf-token-bar">
          <div class="pdf-token-fill ${tokenPercent > 80 ? 'danger' : tokenPercent > 60 ? 'warning' : ''}" style="width: ${Math.min(100, tokenPercent)}%"></div>
        </div>
      </div>
    `;
  } else {
    bannerHTML += `
      <div class="pdf-banner-controls">
        <div class="pdf-capture-group">
          <button class="pdf-banner-btn primary" id="pdfRecaptureBtn">
            Capture Page
          </button>
          <input type="number" class="pdf-page-input" id="pdfPageNumberInput" placeholder="Page #" min="1" value="1" />
        </div>
      </div>
    `;
  }

  // Update both banners
  document.getElementById('pdfStatusBannerChat').innerHTML = bannerHTML;
  document.getElementById('pdfStatusBannerMindy').innerHTML = bannerHTML;
  document.getElementById('pdfStatusBannerChat').style.display = 'block';
  document.getElementById('pdfStatusBannerMindy').style.display = 'block';

  // Restore the input value after HTML regeneration
  const restoredInputs = document.querySelectorAll('#pdfPageNumberInput');
  restoredInputs.forEach(input => {
    input.value = currentInputValue;
  });

  // Add event listeners after HTML is inserted (CSP-compliant, no inline onclick)
  const setupBannerListeners = (bannerId) => {
    const banner = document.getElementById(bannerId);
    if (!banner) return;

    // Recapture button - pass the banner reference so it can find the correct input
    const recaptureBtn = banner.querySelector('#pdfRecaptureBtn');
    if (recaptureBtn) {
      recaptureBtn.addEventListener('click', () => recapturePDFPage(banner));
    }

    // Clear all button
    const clearAllBtn = banner.querySelector('#pdfClearAllBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => clearCapturedPages());
    }

    // Page badge close buttons
    banner.querySelectorAll('.pdf-page-badge-close').forEach(closeBtn => {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't trigger page badge click
        const pageNum = parseInt(e.currentTarget.getAttribute('data-page'));
        clearCapturedPages(pageNum);
      });
    });
  };

  setupBannerListeners('pdfStatusBannerChat');
  setupBannerListeners('pdfStatusBannerMindy');
}

// Recapture PDF page
async function recapturePDFPage(bannerElement) {
  if (!pdfMode.currentTab) {
    alert('No PDF tab found');
    return;
  }

  try {
    // Get page number from inline input within the specific banner
    const pageInput = bannerElement ? bannerElement.querySelector('#pdfPageNumberInput') : document.getElementById('pdfPageNumberInput');
    const pageNumber = pageInput ? parseInt(pageInput.value) || 1 : 1;

    console.log('🔄 Starting recapture for tab:', pdfMode.currentTab.id);
    console.log('📋 Banner element:', bannerElement?.id || 'none');
    console.log('📋 Input element:', pageInput);
    console.log('📋 Input value:', pageInput?.value);
    console.log('📋 Parsed page number:', pageNumber);

    // Hide popup
    await chrome.scripting.executeScript({
      target: { tabId: pdfMode.currentTab.id },
      function: () => {
        const popup = document.getElementById('ai-assistant-popup');
        if (popup) popup.style.display = 'none';
      }
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Extract PDF content with specified page number
    console.log('📸 Extracting PDF content...');
    const result = await extractPDFPage(pdfMode.currentTab.id, pageNumber);
    console.log('✅ Extraction complete. Page:', result.pageNumber, 'Length:', result.charCount);

    // Update the viewing page
    pdfMode.userViewingPage = result.pageNumber;

    addCapturedPage(result);

    // Restore popup
    await chrome.scripting.executeScript({
      target: { tabId: pdfMode.currentTab.id },
      function: () => {
        const popup = document.getElementById('ai-assistant-popup');
        if (popup) popup.style.display = '';
      }
    });

    // Rebuild context
    pageContent = buildPDFContext();
    console.log('📄 Context rebuilt, total pages:', pdfMode.capturedPages.length);

    // Update banner
    updatePDFStatusBanner();

    // Log success without popup
    console.log(`✅ Page ${result.pageNumber} captured! ${result.charCount} characters. Total pages: ${pdfMode.capturedPages.length}`);
  } catch (error) {
    console.error('❌ Error recapturing PDF:', error);
    // Show error in banner or status instead of popup
  }
}

// Switch PDF context mode
function switchPDFMode(mode) {
  pdfMode.contextMode = mode;
  pageContent = buildPDFContext();
  savePDFModeToStorage();
  updatePDFStatusBanner();
  console.log(`Switched to ${mode} mode`);
}

// Show/hide loading
function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
  document.getElementById('result').style.display = show ? 'none' : 'block';
}

// Show result
function showResult(content, type) {
  const resultDiv = document.getElementById('result');

  // Convert markdown to HTML for better display
  const htmlContent = convertMarkdownToHtml(content);

  resultDiv.innerHTML = htmlContent;
  resultDiv.className = `result-content ${type}`;
}

// Convert markdown to HTML
function convertMarkdownToHtml(markdown) {
  let html = markdown;

  // Remove markdown headers (##, ###, etc) and make them bold
  html = html.replace(/^#{1,6}\s+(.+)$/gm, '<strong>$1</strong>');

  // Bold text **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic text *text* or _text_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Bullet points (- item or * item)
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '• $1');

  // Numbered lists (1. item)
  html = html.replace(/^\d+\.\s+(.+)$/gm, '→ $1');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

// Copy result
function copyResult() {
  const result = document.getElementById('result').innerText;
  navigator.clipboard.writeText(result).then(() => {
    alert('Copied to clipboard!');
  });
}

// Download result
function downloadResult() {
  const result = document.getElementById('result').innerText;
  const blob = new Blob([result], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-result-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Regenerate content
function regenerateContent() {
  if (currentTask) {
    generateContent(currentTask);
  }
}

// Save to history
function saveToHistory(task, result) {
  chrome.storage.local.get(['history'], (data) => {
    const history = data.history || [];
    history.unshift({
      task: task.task,
      title: task.title || 'Untitled',
      result: result.substring(0, 200) + '...',
      fullResult: result,
      timestamp: new Date().toISOString()
    });

    // Keep only last 50 items
    if (history.length > 50) {
      history.length = 50;
    }

    chrome.storage.local.set({ history }, () => {
      loadHistory();
    });
  });
}

// Load bookmarks
async function loadBookmarks() {
  chrome.storage.local.get(['bookmarks'], (result) => {
    const bookmarks = result.bookmarks || [];
    const listDiv = document.getElementById('bookmarksList');

    if (bookmarks.length === 0) {
      listDiv.innerHTML = '<p class="placeholder">No bookmarks saved yet.</p>';
      return;
    }

    // Group bookmarks by domain
    const grouped = {};
    bookmarks.forEach((bookmark, index) => {
      const domain = bookmark.domain || 'Other';
      if (!grouped[domain]) {
        grouped[domain] = [];
      }
      grouped[domain].push({ ...bookmark, originalIndex: index });
    });

    // Sort domains alphabetically
    const sortedDomains = Object.keys(grouped).sort();

    // Render grouped bookmarks with collapsible functionality
    listDiv.innerHTML = sortedDomains.map((domain, groupIndex) => {
      const domainBookmarks = grouped[domain];
      const favicon = domainBookmarks[0].favicon || '';
      const groupId = `bookmark-group-${groupIndex}`;

      return `
        <div class="bookmark-group">
          <div class="bookmark-group-header" data-group-id="${groupId}">
            <span class="bookmark-group-toggle" id="${groupId}-toggle">▼</span>
            ${favicon ? `<img src="${favicon}" class="bookmark-favicon" alt="">` : '🌐'}
            <span class="bookmark-domain">${domain}</span>
            <span class="bookmark-count">(${domainBookmarks.length})</span>
          </div>
          <div class="bookmark-group-items" id="${groupId}">
            ${domainBookmarks.map(bookmark => `
              <div class="bookmark-item">
                <a href="${bookmark.url}" target="_blank" class="bookmark-link">
                  <div class="bookmark-title">${bookmark.title || 'Untitled'}</div>
                  ${bookmark.text && bookmark.text !== bookmark.title ? `<div class="bookmark-text">${bookmark.text.substring(0, 100)}${bookmark.text.length > 100 ? '...' : ''}</div>` : ''}
                </a>
                <div class="bookmark-meta">
                  <span class="bookmark-time">${new Date(bookmark.timestamp).toLocaleDateString()}</span>
                  <button class="btn btn-danger btn-small" data-bookmark-index="${bookmark.originalIndex}">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners for group headers (toggle collapse)
    document.querySelectorAll('#bookmarksList .bookmark-group-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const groupId = header.getAttribute('data-group-id');
        toggleBookmarkGroup(groupId);
      });
    });

    // Add event listeners for delete buttons
    document.querySelectorAll('#bookmarksList .btn-danger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(btn.getAttribute('data-bookmark-index'));
        deleteBookmark(index);
      });
    });
  });
}

// Toggle bookmark group visibility
function toggleBookmarkGroup(groupId) {
  const group = document.getElementById(groupId);
  const toggle = document.getElementById(`${groupId}-toggle`);

  if (group.style.display === 'none') {
    group.style.display = 'block';
    toggle.textContent = '▼';
  } else {
    group.style.display = 'none';
    toggle.textContent = '▶';
  }
}

// Delete bookmark
function deleteBookmark(index) {
  chrome.storage.local.get(['bookmarks'], (result) => {
    const bookmarks = result.bookmarks || [];
    bookmarks.splice(index, 1);
    chrome.storage.local.set({ bookmarks }, () => {
      loadBookmarks();
    });
  });
}

// Clear all bookmarks
function clearAllBookmarks() {
  if (!confirm('Delete all bookmarks?')) return;

  chrome.storage.local.set({ bookmarks: [] }, () => {
    loadBookmarks();
  });
}

// Organize bookmarks with AI
async function organizeBookmarks() {
  // Check if API key is needed (only for cloud AI)
  const manager = await initializeSidePanelProviderManager();
  const activeProvider = manager.getActiveProvider();
  
  if (activeProvider === 'cloud' && !apiKey) {
    alert('Please configure your API key first!');
    return;
  }

  chrome.storage.local.get(['bookmarks'], async (result) => {
    const bookmarks = result.bookmarks || [];
    if (bookmarks.length === 0) {
      alert('No bookmarks to organize!');
      return;
    }

    showLoading(true);

    try {
      const bookmarkTexts = bookmarks.map(b => b.text).join('\n---\n');
      const prompt = `Analyze the following bookmarks and organize them into logical groups. For each group, provide a name and list the bookmarks that belong to it. Format as:\n\nGroup: [Name]\n- Bookmark text\n- Bookmark text\n\nBookmarks:\n${bookmarkTexts}`;

      const result = await callGeminiApi(prompt);
      displayOrganizedGroups(result);
    } catch (error) {
      alert('Error organizing bookmarks: ' + error.message);
    }

    showLoading(false);
  });
}

// Display organized groups
function displayOrganizedGroups(groups) {
  const groupsSection = document.getElementById('groupsSection');
  const groupsList = document.getElementById('groupsList');

  groupsSection.style.display = 'block';
  groupsList.innerHTML = `<div class="group-item"><pre style="white-space: pre-wrap; color: rgba(255,255,255,0.9);">${groups}</pre></div>`;
}

// Load history
async function loadHistory() {
  chrome.storage.local.get(['history'], (result) => {
    const history = result.history || [];
    const listDiv = document.getElementById('historyList');

    if (history.length === 0) {
      listDiv.innerHTML = '<p class="placeholder">No history yet.</p>';
      return;
    }

    listDiv.innerHTML = history.map((item, index) => `
      <div class="history-item">
        <div class="history-task">${getTaskIcon(item.task)} ${item.title}</div>
        <div class="history-meta">
          <span>${new Date(item.timestamp).toLocaleString()}</span>
        </div>
        <div class="bookmark-actions">
          <button class="btn btn-secondary" onclick="viewHistoryItem(${index})">👁️ View</button>
          <button class="btn btn-secondary" onclick="deleteHistoryItem(${index})">🗑️ Delete</button>
        </div>
      </div>
    `).join('');
  });
}

// Get task icon
function getTaskIcon(task) {
  const icons = {
    'summarize': '📄',
    'translate-page': '🌐',
    'translate-selection': '🔤',
    'mindmap': '🧠',
    'extract-image-text': '🖼️',
    'explain-image': '🔍'
  };
  return icons[task] || '📝';
}

// View history item
function viewHistoryItem(index) {
  chrome.storage.local.get(['history'], (result) => {
    const history = result.history || [];
    if (history[index]) {
      switchTab('generate');
      showResult(history[index].fullResult, 'success');
      document.getElementById('actionButtons').style.display = 'flex';
    }
  });
}

// Delete history item
function deleteHistoryItem(index) {
  chrome.storage.local.get(['history'], (result) => {
    const history = result.history || [];
    history.splice(index, 1);
    chrome.storage.local.set({ history }, () => {
      loadHistory();
    });
  });
}

// Clear all history
function clearHistory() {
  if (confirm('Are you sure you want to clear all history?')) {
    chrome.storage.local.set({ history: [] }, () => {
      loadHistory();
    });
  }
}

// Load page content for chat
async function loadPageContent() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      pageContent = 'No active tab found.';
      console.log('❌ No active tab found');
      return;
    }

    const tab = tabs[0];
    console.log('📥 Loading page content from tab:', tab.id, tab.url);

    // Check if this is a PDF
    const isPDF = tab.url.toLowerCase().endsWith('.pdf') || tab.url.includes('.pdf?');

    if (isPDF) {
      console.log('📄 PDF detected in chat');

      // Activate PDF mode but DON'T capture yet
      pdfMode.isActive = true;
      pdfMode.currentTab = tab;
      updatePDFStatusBanner();

      // Check if we already have captured pages
      if (pdfMode.capturedPages.length > 0) {
        // Use existing captured pages
        pageContent = buildPDFContext();
        console.log('✅ Using existing PDF context, length:', pageContent.length);
      } else {
        // No pages captured yet - will capture on first message send
        pageContent = null;
        console.log('📄 PDF mode active, waiting for user to send message to capture page');
      }

      return;
    } else {
      // Not a PDF - deactivate PDF mode
      pdfMode.isActive = false;
      updatePDFStatusBanner(); // Hide the banner
    }

    // Regular webpage - use message passing to content script
    return new Promise((resolve) => {
      // Add timeout to handle cases where content script isn't ready
      const timeout = setTimeout(() => {
        console.warn('⏱️ Content script timeout - content script may not be injected');
        pageContent = 'Unable to load page content. The content script may not be loaded on this page. Try refreshing the page.';
        resolve();
      }, 5000);
      
      chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' }, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          console.log('❌ Error loading page content:', chrome.runtime.lastError.message);
          pageContent = 'Unable to load page content. The content script may not be loaded on this page. Try refreshing the page.';
          resolve();
        } else if (response && response.content) {
          const oldContent = pageContent;
          pageContent = response.content;
          console.log('✅ Page content loaded, length:', pageContent.length, 'chars');
          console.log('📄 Content changed:', oldContent !== pageContent);
          console.log('📄 New content preview:', pageContent.substring(0, 150));
          resolve();
        } else {
          pageContent = 'No content available from this page.';
          console.log('⚠️ No content available from page - empty response');
          resolve();
        }
      });
    });
  } catch (error) {
    console.log('❌ Could not load page content:', error);
    pageContent = 'Error loading page content.';
  }
}

// Detect tab changes and show refresh button if needed
async function checkForTabChange() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]) return;
  
  const newTabId = tabs[0].id;
  const newUrl = tabs[0].url;

  // Only check if a conversation session exists (chat or Mindy)
  if (!chatSessionTab.id) {
    // No session yet - update current page tracking but don't show button
    currentPageTab.id = newTabId;
    currentPageTab.url = newUrl;
    return;
  }

  const hasChatInteraction = chatHistory.length > 0;
  const hasSessionInteraction = hasChatInteraction || sessionActivity.hasInteraction;

  if (!hasSessionInteraction) {
    // User hasn't interacted yet - update tracking but keep button hidden
    currentPageTab.id = newTabId;
    currentPageTab.url = newUrl;
    return;
  }

  // Get the currently active sidepanel tab
  const currentTab = document.querySelector('.tab.active')?.dataset.tab;
  
  // Determine which button to show based on active sidepanel tab
  let refreshBtn = null;
  if (currentTab === 'chat') {
    refreshBtn = document.getElementById('chatRefreshBtn');
  } else if (currentTab === 'mindy') {
    refreshBtn = document.getElementById('mindyRefreshBtn');
  }

  // Check if this is a different tab or URL from the session tab
  const isDifferentFromSession = (chatSessionTab.id !== newTabId || chatSessionTab.url !== newUrl);
  
  if (isDifferentFromSession) {
    // Different page from session - show button
    if (refreshBtn) {
      refreshBtn.style.display = 'flex';
      console.log('🔄 Tab changed - showing refresh button. Session:', chatSessionTab.id, 'Current:', newTabId);
    }
  } else {
    // Back to original session tab - hide button
    if (refreshBtn) {
      refreshBtn.style.display = 'none';
      console.log('✅ Back to session tab - hiding refresh button');
    }
  }

  // Update current page tracking
  currentPageTab.id = newTabId;
  currentPageTab.url = newUrl;
}

// Start fresh chat session with new page
async function startFreshChatSession() {
  console.log('🔄 Starting fresh chat session...');
  
  // Clear chat messages except welcome message
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = `
    <div class="chat-message ai-message">
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        <p>Hello! I'm ready to answer questions about this page. What would you like to know?</p>
      </div>
    </div>
  `;

  // Clear page content and chat history completely
  console.log('🧹 Clearing pageContent (was:', pageContent?.length || 0, 'chars)');
  pageContent = null;
  chatHistory = [];
  sessionActivity = { hasInteraction: false, source: null };

  // Clear captured PDF pages if in PDF mode
  if (pdfMode.isActive) {
    pdfMode.capturedPages = [];
    pdfMode.lastLoadedPage = null;
    pdfMode.isActive = false; // Reset PDF mode
    savePDFModeToStorage();
    updatePDFStatusBanner();
  }

  // Get current tab and set it as the new session tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]) {
    console.log('📍 Previous session tab:', chatSessionTab.id, chatSessionTab.url);
    console.log('📍 New session tab:', tabs[0].id, tabs[0].url);
    chatSessionTab.id = tabs[0].id;
    chatSessionTab.url = tabs[0].url;
    currentPageTab.id = tabs[0].id;
    currentPageTab.url = tabs[0].url;
    console.log('🎯 New chat session initialized with tab:', tabs[0].id, tabs[0].url);
  }

  // Load new page content from the current tab
  await loadPageContent();
  
  // Verify content was loaded
  if (pageContent) {
    console.log('✅ Page content loaded successfully, length:', pageContent.length);
    console.log('📄 First 200 chars:', pageContent.substring(0, 200));
  } else {
    console.warn('⚠️ Page content is still null after loadPageContent()');
  }

  // Hide refresh button
  const refreshBtn = document.getElementById('chatRefreshBtn');
  if (refreshBtn) {
    refreshBtn.style.display = 'none';
  }

  console.log('✅ Started fresh chat session with new page');
}

// Start fresh Mindy session with new page
async function startFreshMindySession() {
  console.log('🔄 Starting fresh Mindy session...');
  
  // Clear Mindy transcript
  const mindyTranscript = document.getElementById('mindyTranscriptPanel');
  mindyTranscript.innerHTML = `
    <p class="mindy-info-panel">Click "Start Call" to begin. I'll have access to this page's content and can answer your questions via voice.</p>
  `;

  // Clear page content and session activity completely
  pageContent = null;
  chatHistory = []; // Also clear chat history for consistency
  sessionActivity = { hasInteraction: false, source: null };

  // Clear captured PDF pages if in PDF mode
  if (pdfMode.isActive) {
    pdfMode.capturedPages = [];
    pdfMode.lastLoadedPage = null;
    pdfMode.isActive = false; // Reset PDF mode
    savePDFModeToStorage();
    updatePDFStatusBanner();
  }

  // Get current tab and set it as the new session tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]) {
    chatSessionTab.id = tabs[0].id;
    chatSessionTab.url = tabs[0].url;
    currentPageTab.id = tabs[0].id;
    currentPageTab.url = tabs[0].url;
    console.log('🎯 New Mindy session initialized with tab:', tabs[0].id, tabs[0].url);
  }

  // Load new page content from the current tab
  await loadPageContent();

  // Hide refresh button
  const refreshBtn = document.getElementById('mindyRefreshBtn');
  if (refreshBtn) {
    refreshBtn.style.display = 'none';
  }

  console.log('✅ Started fresh Mindy session with new page');
}

// Send chat message
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();

  if (!message) return;

  // Check if API key is needed (only for cloud AI)
  const manager = await initializeSidePanelProviderManager();
  const activeProvider = manager.getActiveProvider();
  
  // Reload API key from storage to ensure we have the latest value
  await loadApiKey();
  
  if (activeProvider === 'cloud' && !apiKey) {
    alert('Please configure your API key first!');
    return;
  }

  // Add user message to chat
  addMessageToChat(message, 'user');
  input.value = '';
  sessionActivity.hasInteraction = true;
  sessionActivity.source = 'chat';

  // Show typing indicator
  showTypingIndicator();

  try {
    let prompt;

    // Check if this is a text improvement request (from text field assistant)
    if (message.toLowerCase().includes('improve this text:') ||
      message.toLowerCase().includes('fix this text:') ||
      message.toLowerCase().includes('rewrite this')) {
      // Direct text improvement - no page context needed
      prompt = message;
    } else {
      // Regular chat - check if we're on a different tab than the session
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        const currentTabId = tabs[0].id;
        const currentUrl = tabs[0].url;
        
        // Initialize chat session ONLY when user sends first message
        if (!chatSessionTab.id) {
          chatSessionTab.id = currentTabId;
          chatSessionTab.url = currentUrl;
          currentPageTab.id = currentTabId;
          currentPageTab.url = currentUrl;
          console.log('🎯 Chat session initialized on first message with tab:', currentTabId, currentUrl);
        }
        
        // Check if user is on a different tab than the session
        if (chatSessionTab.id !== currentTabId || chatSessionTab.url !== currentUrl) {
          console.warn('⚠️ User is asking about a different tab! Session:', chatSessionTab.id, 'Current:', currentTabId);
          // Force reload page content from current tab
          pageContent = null;
          await loadPageContent();
          console.log('🔄 Reloaded page content from current tab');
        } else if (!pageContent) {
          // Same tab but no content loaded yet
          await loadPageContent();
        }
      }

      // For PDFs, capture page 1 if no pages captured yet
      if (pdfMode.isActive && pdfMode.capturedPages.length === 0) {
        console.log('📸 Capturing PDF page 1 on first message...');
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const result = await extractPDFPage(tabs[0].id, 1);
          addCapturedPage(result);
          pageContent = buildPDFContext();
        }
      }

      // Build context-aware prompt
      let pdfInstructions = '';
      if (pdfMode.isActive) {
        const capturedPageNumbers = pdfMode.capturedPages.map(p => p.pageNumber).join(', ');
        pdfInstructions = `\n\nIMPORTANT: This is a PDF document. Currently captured pages: ${capturedPageNumbers || 'Page 1'}. If the user asks about content that doesn't appear to be in the captured pages, politely remind them: "I can only see page(s) ${capturedPageNumbers || '1'} of this PDF. If your question is about a different page, please use the page number input in the PDF banner above and click 'Send' to capture that specific page first."`;
      }

      prompt = `You are a helpful assistant answering questions about a webpage. Here is the page content:

${pageContent ? pageContent.substring(0, 3000) : 'No page content available.'}

User question: ${message}

Please provide a helpful and accurate answer based on the page content above.${pdfInstructions}`;
      
      // Debug logging
      console.log('📤 Sending prompt with page content length:', pageContent?.length || 0);
      console.log('📄 Page content preview:', pageContent ? pageContent.substring(0, 200) : 'null');
    }

    // Call API
    const response = await callGeminiApi(prompt);

    // Remove typing indicator
    removeTypingIndicator();

    // Add AI response to chat
    addMessageToChat(response, 'ai');

    // Save to chat history
    chatHistory.push(
      { role: 'user', content: message },
      { role: 'ai', content: response }
    );
  } catch (error) {
    removeTypingIndicator();
    addMessageToChat('Sorry, I encountered an error: ' + error.message, 'ai');
  }
}

// Add message to chat UI
function addMessageToChat(message, role) {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${role === 'user' ? 'user-message' : 'ai-message'}`;

  const avatar = role === 'user' ? '👤' : '🤖';

  // Convert markdown to HTML for AI messages
  const formattedMessage = role === 'ai' ? convertMarkdownToHtml(message) : message;

  messageDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">${formattedMessage}</div>
  `;

  chatMessages.appendChild(messageDiv);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
  const chatMessages = document.getElementById('chatMessages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message ai-message chat-loading';
  typingDiv.id = 'typingIndicator';

  typingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;

  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.remove();
  }
}

// Clear chat and start fresh session
async function clearChat() {
  console.log('🧹 Clearing chat and resetting session...');

  // Clear chat messages except welcome message
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = `
    <div class="chat-message ai-message">
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        <p>Hello! I'm ready to answer questions about this page. What would you like to know?</p>
      </div>
    </div>
  `;

  // Clear page content and chat history completely
  pageContent = null;
  chatHistory = [];
  sessionActivity = { hasInteraction: false, source: null };

  // Clear captured PDF pages if in PDF mode
  if (pdfMode.isActive) {
    pdfMode.capturedPages = [];
    pdfMode.lastLoadedPage = null;
    pdfMode.isActive = false; // Reset PDF mode
    savePDFModeToStorage();
    updatePDFStatusBanner();
  }

  // Get current tab and set it as the new session tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]) {
    chatSessionTab.id = tabs[0].id;
    chatSessionTab.url = tabs[0].url;
    currentPageTab.id = tabs[0].id;
    currentPageTab.url = tabs[0].url;
    console.log('🎯 Chat cleared and reset to current tab:', tabs[0].id, tabs[0].url);
  }

  // Load new page content from the current tab
  await loadPageContent();

  // Hide refresh button
  const refreshBtn = document.getElementById('chatRefreshBtn');
  if (refreshBtn) {
    refreshBtn.style.display = 'none';
  }

  console.log('✅ Chat cleared and fresh session started');
}

// Translate and replace selected text
async function translateAndReplace(content, tabId, htmlContent) {
  try {
    const targetLang = await loadTargetLanguage();
    const langName = getLanguageName(targetLang);

    // Use HTML content if available for better structure preservation
    const contentToTranslate = htmlContent || content;
    const isHTML = !!htmlContent && htmlContent.includes('<');

    // Get AI Provider Manager
    const manager = await initializeSidePanelProviderManager();
    
    // Check which provider is active
    const activeProvider = manager.getActiveProvider();
    let translatedText;

    // If Built-in AI and Translator API is available, use it directly
    if (activeProvider === 'builtin') {
      try {
        // Detect source language (assume English for now, could use Language Detector API)
        const sourceLang = 'en';
        
        // Use Built-in Translator API for direct translation
        const response = await manager.translateText(contentToTranslate, sourceLang, targetLang);
        translatedText = response.data;
        
        console.log(`✅ Translated using Built-in AI Translator API (${sourceLang} → ${targetLang})`);
      } catch (error) {
        console.warn('⚠️ Built-in Translator failed, falling back to prompt-based translation:', error);
        // Fallback to prompt-based translation
        const prompt = isHTML
          ? `Translate the following HTML content to ${langName}. Preserve all HTML tags exactly. Only translate text content:\n\n${contentToTranslate}`
          : `Translate the following text to ${langName}. Preserve formatting:\n\n${contentToTranslate}`;
        
        const response = await manager.generateContent(prompt);
        translatedText = response.data;
      }
    } else {
      // Cloud AI: use prompt-based translation
      const prompt = isHTML
        ? `Translate the following HTML content to ${langName}. Preserve all HTML tags (<br>, <p>, <div>, etc.) exactly as they are. Only translate the text content inside the tags. Return valid HTML:\n\n${contentToTranslate}`
        : `Translate the following text to ${langName}. Preserve all line breaks and paragraph structure. Only return the translated text:\n\n${contentToTranslate}`;
      
      const response = await manager.generateContent(prompt);
      translatedText = response.data;
      
      console.log(`✅ Translated using Cloud AI (${activeProvider})`);
    }

    // Send translated text to content script to replace selection
    chrome.tabs.sendMessage(tabId, {
      action: 'replaceSelection',
      translatedText: translatedText.trim(),
      isHTML: isHTML
    });
  } catch (error) {
    console.error('Translation error:', error);
    chrome.tabs.sendMessage(tabId, {
      action: 'replaceSelection',
      translatedText: 'Translation error: ' + error.message
    });
  }
}

// Translate page in-place (replace all text nodes)
async function translatePageInPlace(content, tabId) {
  try {
    const targetLang = await loadTargetLanguage();
    const langName = getLanguageName(targetLang);

    console.log('Translating page to:', langName);
    console.log('Content length:', content.length);

    // Get AI Provider Manager
    const manager = await initializeSidePanelProviderManager();
    const activeProvider = manager.getActiveProvider();
    
    let translatedText;

    // For page translation, we need to use prompt-based approach for both providers
    // because we need to preserve the [index] markers for text node replacement
    const prompt = `Translate the following indexed text to ${langName}. Each line starts with [index] followed by text. You must:
1. Keep the [index] markers exactly as they are
2. Translate only the text after each [index]
3. Keep each translation on the same line as its [index]
4. Do not add or remove line breaks
5. Preserve the exact format

Text to translate:
${content}`;

    const response = await manager.generateContent(prompt);
    translatedText = response.data;
    
    console.log(`✅ Page translated using ${activeProvider === 'builtin' ? 'Built-in AI' : 'Cloud AI'}`)
    console.log('Translation received, length:', translatedText.length);

    // Send translated text to content script to replace all text nodes
    chrome.tabs.sendMessage(tabId, {
      action: 'replacePageText',
      translations: translatedText
    });
  } catch (error) {
    console.error('Page translation error:', error);
    // Send error in proper format so it doesn't break parsing
    chrome.tabs.sendMessage(tabId, {
      action: 'replacePageText',
      translations: `[0]⚠️ Translation failed: ${error.message}\n[1]Please check console for details.`
    });
  }
}

// Translate and inject into page (old overlay method - kept for compatibility)
async function translateAndInject(content, tabId) {
  try {
    const targetLang = await loadTargetLanguage();
    const langName = getLanguageName(targetLang);

    // Get AI Provider Manager
    const manager = await initializeSidePanelProviderManager();
    const activeProvider = manager.getActiveProvider();
    
    let translatedText;

    // If Built-in AI and Translator API is available, use it directly
    if (activeProvider === 'builtin') {
      try {
        // Detect source language (assume English for now)
        const sourceLang = 'en';
        
        // Use Built-in Translator API
        const response = await manager.translateText(content, sourceLang, targetLang);
        translatedText = response.data;
        
        console.log(`✅ Translated using Built-in AI Translator API`);
      } catch (error) {
        console.warn('⚠️ Built-in Translator failed, falling back to prompt-based:', error);
        // Fallback to prompt-based
        const prompt = `Translate the following text to ${langName}. Maintain the structure and formatting:\n\n${content}`;
        const response = await manager.generateContent(prompt);
        translatedText = response.data;
      }
    } else {
      // Cloud AI: use prompt-based translation
      const prompt = `Translate the following text to ${langName}. Maintain the structure and formatting:\n\n${content}`;
      const response = await manager.generateContent(prompt);
      translatedText = response.data;
      
      console.log(`✅ Translated using Cloud AI`);
    }

    // Send translated text to content script to inject
    chrome.tabs.sendMessage(tabId, {
      action: 'injectTranslation',
      translatedText: translatedText
    });
  } catch (error) {
    console.error('Translation error:', error);
    chrome.tabs.sendMessage(tabId, {
      action: 'injectTranslation',
      translatedText: 'Translation error: ' + error.message
    });
  }
}

// Helper function to convert PCM to WAV format
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

// TTS Queue Management
let ttsQueue = [];
let currentAudio = null;
let isPlaying = false;
let isPaused = false;
let currentChunkIndex = 0;

function updateTTSState(state) {
  // Notify content script about state change
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateTTSState',
        state: state
      });
    }
  });
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
  updateTTSState('stopped');
}

function pauseTTS() {
  if (currentAudio && isPlaying) {
    currentAudio.pause();
    isPaused = true;
    isPlaying = false;
    updateTTSState('paused');
  }
}

function resumeTTS() {
  if (currentAudio && isPaused) {
    currentAudio.play();
    isPaused = false;
    isPlaying = true;
    updateTTSState('playing');
  }
}

function toggleTTSPlayback() {
  if (isPlaying) {
    pauseTTS();
  } else if (isPaused) {
    resumeTTS();
  }
}

// Split text into chunks (paragraphs or sentences)
function splitIntoChunks(text, maxChars = 500) {
  const chunks = [];

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
  updateTTSState('playing');

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

// Generate Text-to-Speech from selected text
async function generateTextToSpeech(content) {
  // TTS requires cloud AI (uses Gemini TTS model)
  const manager = await initializeSidePanelProviderManager();
  const activeProvider = manager.getActiveProvider();
  
  if (activeProvider !== 'cloud') {
    alert('Text-to-Speech requires Cloud AI. Please switch to Cloud AI in Settings.');
    return;
  }
  
  if (!apiKey) {
    alert('Please configure your API key first in Settings!');
    return;
  }

  try {
    console.log('Generating TTS for:', content.substring(0, 50) + '...');

    // Stop any currently playing audio
    stopTTS();

    // Load TTS settings
    const settings = await loadTTSSettings();
    console.log('Using voice:', settings.voice, 'Max chars:', settings.maxChars, 'Speed:', settings.speechSpeed);

    // Split content into chunks
    const chunks = splitIntoChunks(content, 500); // 500 chars per chunk
    console.log(`📄 Split into ${chunks.length} chunks`);

    // Map speed to instruction
    let speedInstruction = '';
    if (settings.speechSpeed <= 0.98) {
      speedInstruction = 'in a calm and clear voice';
    } else if (settings.speechSpeed >= 1.4) {
      speedInstruction = 'quickly';
    } else {
      speedInstruction = 'in a natural voice';
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    // Generate audio for each chunk
    ttsQueue = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`📦 Generating chunk ${i + 1}/${chunks.length}...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Read this ${speedInstruction}: ${chunks[i]}` }]
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

      const data = await response.json();

      // Check if response has audio data
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error('Unexpected TTS response:', data);
        throw new Error('TTS returned unexpected response format');
      }

      const audioData = data.candidates[0].content.parts[0].inlineData.data;

      // Convert base64 to audio bytes
      const audioBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));

      // Convert PCM to WAV format
      const wavBlob = convertPCMtoWAV(audioBytes, 24000, 1, 16);
      ttsQueue.push(wavBlob);

      console.log(`✅ Chunk ${i + 1}/${chunks.length} ready`);

      // Start playing the first chunk immediately
      if (i === 0) {
        currentChunkIndex = 0;
        playNextChunk();
      }
    }

    console.log('🎵 All chunks generated and queued');

  } catch (error) {
    console.error('Text-to-Speech error:', error);
    alert(`Text-to-Speech failed: ${error.message}`);
  }
}

// Clipboard History Management
let clipboardMonitorInterval = null;
let lastClipboardContent = '';

function startClipboardMonitoring() {
  // Check clipboard every 500ms for faster detection
  clipboardMonitorInterval = setInterval(async () => {
    try {
      // Try to read clipboard items (supports images)
      const clipboardItems = await navigator.clipboard.read();

      for (const item of clipboardItems) {
        // Check for images first
        const imageTypes = item.types.filter(type => type.startsWith('image/'));
        if (imageTypes.length > 0) {
          const blob = await item.getType(imageTypes[0]);
          const reader = new FileReader();
          reader.onloadend = async () => {
            const dataUrl = reader.result;
            if (dataUrl !== lastClipboardContent) {
              lastClipboardContent = dataUrl;
              await addToClipboardHistory('image', dataUrl);
            }
          };
          reader.readAsDataURL(blob);
          return; // Exit after processing image
        }

        // Check for text
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          if (text && text !== lastClipboardContent) {
            lastClipboardContent = text;
            await addToClipboardHistory('text', text);
          }
          return;
        }
      }
    } catch (error) {
      // Fallback to text-only reading
      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== lastClipboardContent) {
          lastClipboardContent = text;
          await addToClipboardHistory('text', text);
        }
      } catch (e) {
        // Clipboard read might fail if not focused or permission denied
        // Silent fail is okay
      }
    }
  }, 500); // Check every 500ms for faster updates
}

async function addToClipboardHistory(type, content) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['clipboardHistory'], (result) => {
      const history = result.clipboardHistory || [];

      // Don't add duplicates of the last item
      if (history.length > 0 && history[0].content === content) {
        resolve();
        return;
      }

      history.unshift({
        type: type,
        content: content,
        timestamp: new Date().toISOString()
      });

      chrome.storage.local.set({ clipboardHistory: history }, () => {
        loadClipboardHistory();
        resolve();
      });
    });
  });
}

async function loadClipboardHistory() {
  chrome.storage.local.get(['clipboardHistory'], (result) => {
    const history = result.clipboardHistory || [];
    const listDiv = document.getElementById('clipboardList');

    if (history.length === 0) {
      listDiv.innerHTML = '<p class="placeholder">No clipboard items yet. Copy something to get started!</p>';
      return;
    }

    listDiv.innerHTML = history.map((item, index) => {
      const timeAgo = getTimeAgo(new Date(item.timestamp));

      if (item.type === 'text') {
        const preview = item.content.length > 200 ? item.content.substring(0, 200) + '...' : item.content;
        return `
          <div class="clipboard-item" data-clipboard-index="${index}">
            <div class="clipboard-item-header">
              <span class="clipboard-item-type">TEXT</span>
              <span class="clipboard-item-time">${timeAgo}</span>
            </div>
            <div class="clipboard-item-content">
              <div class="clipboard-item-text">${escapeHtml(preview)}</div>
            </div>
            <div class="clipboard-item-actions">
              <button class="btn btn-secondary clipboard-copy-btn" data-clipboard-index="${index}">📋 Copy</button>
              <button class="btn btn-danger clipboard-delete-btn" data-clipboard-index="${index}">🗑️ Delete</button>
            </div>
          </div>
        `;
      } else if (item.type === 'image') {
        return `
          <div class="clipboard-item" data-clipboard-index="${index}">
            <div class="clipboard-item-header">
              <span class="clipboard-item-type">IMAGE</span>
              <span class="clipboard-item-time">${timeAgo}</span>
            </div>
            <div class="clipboard-item-content">
              <img src="${item.content}" class="clipboard-item-image" alt="Clipboard image">
            </div>
            <div class="clipboard-item-actions">
              <button class="btn btn-secondary clipboard-copy-btn" data-clipboard-index="${index}">📋 Copy</button>
              <button class="btn btn-danger clipboard-delete-btn" data-clipboard-index="${index}">🗑️ Delete</button>
            </div>
          </div>
        `;
      }
    }).join('');

    // Attach event listeners to clipboard items
    const clipboardItems = listDiv.querySelectorAll('.clipboard-item');
    clipboardItems.forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking on buttons
        if (e.target.closest('button')) return;
        const index = parseInt(item.dataset.clipboardIndex);
        // Find the copy button within this item for visual feedback
        const copyBtn = item.querySelector('.clipboard-copy-btn');
        copyClipboardItem(index, copyBtn);
      });
    });

    // Attach event listeners to copy buttons
    const copyButtons = listDiv.querySelectorAll('.clipboard-copy-btn');
    copyButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.clipboardIndex);
        copyClipboardItem(index, btn);
      });
    });

    // Attach event listeners to delete buttons
    const deleteButtons = listDiv.querySelectorAll('.clipboard-delete-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.clipboardIndex);
        deleteClipboardItem(index);
      });
    });
  });
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function copyClipboardItem(index, buttonElement) {
  chrome.storage.local.get(['clipboardHistory'], async (result) => {
    const history = result.clipboardHistory || [];
    if (history[index]) {
      const item = history[index];

      try {
        if (item.type === 'text') {
          await navigator.clipboard.writeText(item.content);
        } else if (item.type === 'image') {
          // Convert data URL to blob and copy
          const response = await fetch(item.content);
          const blob = await response.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
          ]);
        }

        // Update button text to show "Copied"
        if (buttonElement) {
          const originalText = buttonElement.textContent;
          buttonElement.textContent = '✓ Copied';
          buttonElement.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

          // Reset after 2 seconds
          setTimeout(() => {
            buttonElement.textContent = originalText;
            buttonElement.style.background = '';
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  });
}

function deleteClipboardItem(index) {
  chrome.storage.local.get(['clipboardHistory'], (result) => {
    const history = result.clipboardHistory || [];
    history.splice(index, 1);
    chrome.storage.local.set({ clipboardHistory: history }, () => {
      loadClipboardHistory();
    });
  });
}

function clearClipboard() {
  if (!confirm('Clear all clipboard history?')) return;

  chrome.storage.local.set({ clipboardHistory: [] }, () => {
    loadClipboardHistory();
  });
}

// Handle text assist requests from textfield assistant
async function handleTextAssist(prompt) {
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  try {
    const result = await callGeminiApi(prompt);
    return result.trim();
  } catch (error) {
    console.error('Text assist error:', error);
    throw error;
  }
}

// Explain image using Gemini Vision API
async function explainImage(imageUrl) {
  // Image explanation requires cloud AI (multimodal support)
  const manager = await initializeSidePanelProviderManager();
  const activeProvider = manager.getActiveProvider();
  
  if (activeProvider !== 'cloud') {
    showResult('⚠️ Image explanation requires Cloud AI. Please switch to Cloud AI in Settings.', 'error');
    return;
  }
  
  // Refresh API key from storage to ensure we have the latest value
  const result = await chrome.storage.local.get(['geminiApiKey']);
  apiKey = result.geminiApiKey || null;
  
  if (!apiKey) {
    showResult('⚠️ Please configure your Gemini API key first!', 'error');
    return;
  }

  // Switch to Generate tab
  switchTab('generate');

  // Display task
  const taskDisplay = document.getElementById('currentTask');
  taskDisplay.innerHTML = `<p>🔍 Analyzing and explaining image...</p>`;

  showLoading(true);
  document.getElementById('actionButtons').style.display = 'none';

  try {
    // Fetch image and convert to base64
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Convert blob to base64
    const base64Data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });

    // Determine MIME type
    const mimeType = blob.type || 'image/jpeg';

    // Create image part for Gemini
    const imageParts = [{
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    }];

    // Call Gemini with concise TLDR-style prompt
    const prompt = `Provide a concise TLDR description of this image in 2-3 sentences. Focus on:
- What is it? (main subject/content)
- Key visual elements or data (if applicable)
- Purpose or main message

Keep it brief and informative, like a quick summary for someone who can't see the image.`;

    const result = await callGeminiApi(prompt, imageParts);

    // Show result
    showResult(result, 'success');
    document.getElementById('actionButtons').style.display = 'flex';

    // Save to history
    saveToHistory({
      task: 'explain-image',
      title: 'Image Explanation',
      url: imageUrl,
      content: imageUrl
    }, result);

  } catch (error) {
    console.error('Error explaining image:', error);
    showResult(`❌ Error: ${error.message}`, 'error');
  }

  showLoading(false);
}

// Extract text from image using Gemini Vision API
async function extractImageText(imageUrl) {
  // Image text extraction requires cloud AI (multimodal support)
  const manager = await initializeSidePanelProviderManager();
  const activeProvider = manager.getActiveProvider();
  
  if (activeProvider !== 'cloud') {
    showResult('⚠️ Image text extraction requires Cloud AI. Please switch to Cloud AI in Settings.', 'error');
    return;
  }
  
  // Refresh API key from storage to ensure we have the latest value
  const result = await chrome.storage.local.get(['geminiApiKey']);
  apiKey = result.geminiApiKey || null;
  
  if (!apiKey) {
    showResult('⚠️ Please configure your Gemini API key first!', 'error');
    return;
  }

  // Switch to Generate tab
  switchTab('generate');

  // Display task
  const taskDisplay = document.getElementById('currentTask');
  taskDisplay.innerHTML = `<p>🖼️ Extracting text from image...</p>`;

  showLoading(true);
  document.getElementById('actionButtons').style.display = 'none';

  try {
    // Fetch image and convert to base64
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Convert blob to base64
    const base64Data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });

    // Determine MIME type
    const mimeType = blob.type || 'image/jpeg';

    // Create image part for Gemini
    const imageParts = [{
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    }];

    // Call Gemini with image
    const prompt = `Extract all text from this image. Return the text in a clean, structured format. If there are multiple sections, organize them clearly. If no text is found, say "No text found in image."`;

    const result = await callGeminiApi(prompt, imageParts);

    // Show result
    showResult(result, 'success');
    document.getElementById('actionButtons').style.display = 'flex';

    // Save to history
    saveToHistory({
      task: 'extract-image-text',
      title: 'Image Text Extraction',
      url: imageUrl,
      content: imageUrl
    }, result);

  } catch (error) {
    console.error('Error extracting image text:', error);
    showResult(`❌ Error: ${error.message}`, 'error');
  }

  showLoading(false);
}

// Make functions global for inline onclick
window.deleteBookmark = deleteBookmark;
window.toggleBookmarkGroup = toggleBookmarkGroup;
window.viewHistoryItem = viewHistoryItem;
window.deleteHistoryItem = deleteHistoryItem;
window.copyClipboardItem = copyClipboardItem;
window.deleteClipboardItem = deleteClipboardItem;

// ===== CALL MINDY - Voice AI =====
let mindyConnection = null;
let mindyAudioContext = null;
let mindyMediaStream = null;
let mindyAudioWorklet = null;
let mindyIsMuted = false;
let currentUserTranscript = '';
let currentAITranscript = '';
let mindyTimerStart = null;
let mindyTimerInterval = null;

async function startMindyCall() {
  // Reload API key from storage to ensure we have the latest value
  await loadApiKey();
  
  // Mindy requires Cloud API with an API key
  if (!apiKey) {
    alert('Call Mindy requires a Gemini API key.\n\nPlease configure your API key in Settings first.');
    switchTab('settings');
    return;
  }
  
  // Mindy always uses Cloud AI (regardless of the selected provider in settings)
  // Initialize provider manager and ensure it's ready
  const manager = await initializeSidePanelProviderManager();
  
  // Temporarily switch to cloud provider for this call (without changing user's preference)
  const originalProvider = manager.getActiveProvider();
  try {
    // Force cloud provider for Mindy
    manager.activeProvider = 'cloud';
    console.log('✅ Mindy: Using Cloud AI provider');
  } catch (error) {
    console.error('Error setting cloud provider for Mindy:', error);
  }

  // Check if microphone permission was previously granted
  const { microphonePermissionGranted } = await chrome.storage.local.get(['microphonePermissionGranted']);

  if (!microphonePermissionGranted) {
    // Open permission request popup
    updateMindyStatus('Opening permission window...');

    chrome.windows.create({
      url: chrome.runtime.getURL('mic-permission.html'),
      type: 'popup',
      width: 440,
      height: 300,
      focused: true
    });

    updateMindyStatus('Please grant microphone permission in the popup window');
    return;
  }

  // Permission already granted, proceed with call
  updateMindyStatus('Starting call...');

  try {
    // Get page context from active tab FIRST to detect PDF
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab) {
      throw new Error('Unable to detect the active tab for Mindy.');
    }

    // Check if this is a PDF and update PDF mode immediately
    const isPDF = activeTab.url.toLowerCase().endsWith('.pdf') || activeTab.url.includes('.pdf?');

    if (isPDF) {
      console.log('📄 PDF detected, activating PDF mode...');
      pdfMode.isActive = true;
      pdfMode.currentTab = activeTab;
      updatePDFStatusBanner();
    } else {
      // Not a PDF - deactivate PDF mode
      pdfMode.isActive = false;
      updatePDFStatusBanner(); // Hide the banner
    }

    // Request microphone access
    mindyMediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    console.log('✅ Microphone access granted!');
    console.log('Stream:', mindyMediaStream);

    updateMindyStatus('Connecting to Gemini...');

    // Set up session tracking
    chatSessionTab.id = activeTab.id;
    chatSessionTab.url = activeTab.url;
    currentPageTab.id = activeTab.id;
    currentPageTab.url = activeTab.url;
    sessionActivity.hasInteraction = true;
    sessionActivity.source = 'mindy';

    const pageContext = await getPageContext(activeTab);

    // Build PDF instructions if in PDF mode
    let pdfInstructions = '';
    if (pdfMode.isActive && pdfMode.capturedPages.length > 0) {
      const capturedPageNumbers = pdfMode.capturedPages.map(p => p.pageNumber).join(', ');
      pdfInstructions = `\n\nIMPORTANT: This is a PDF document. You currently have access to page(s): ${capturedPageNumbers}. If the user asks about content that doesn't appear to be in these pages, politely remind them: "I can only see page ${capturedPageNumbers.includes(',') ? 's' : ''} ${capturedPageNumbers} of this PDF. If your question is about a different page, please enter the page number in the PDF banner input and click the Capture Page button to capture that specific page first."`;
    }

    // Initialize audio context
    mindyAudioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000
    });

    const source = mindyAudioContext.createMediaStreamSource(mindyMediaStream);
    console.log('✅ Media stream source created');

    // Load AudioWorklet from external file (CSP-compliant)
    const workletUrl = chrome.runtime.getURL('microphone-processor.js');
    console.log('📥 Loading AudioWorklet from:', workletUrl);

    try {
      await mindyAudioContext.audioWorklet.addModule(workletUrl);
      console.log('✅ AudioWorklet module loaded');
    } catch (error) {
      console.error('❌ Failed to load AudioWorklet:', error);
      throw error;
    }

    mindyAudioWorklet = new AudioWorkletNode(mindyAudioContext, 'microphone-processor');
    console.log('✅ AudioWorklet node created');

    source.connect(mindyAudioWorklet);
    mindyAudioWorklet.connect(mindyAudioContext.destination);
    console.log('✅ Audio pipeline connected');
    console.log('🎤 Microphone is now active - speak to test');

    // Connect to Gemini Live API
    console.log('🔌 Connecting to Gemini Live API...');
    console.log('API Key present:', !!apiKey);

    const ws = new WebSocket(
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`
    );

    mindyConnection = ws;

    ws.onopen = async () => {
      console.log('✅ WebSocket connected!');
      updateMindyStatus('Setting up...');

      // Load voice preference
      const voiceName = await loadMindyVoice();
      console.log('🎵 Using voice:', voiceName);

      // Send setup message (format per official Gemini Live API docs)
      const setupMessage = {
        setup: {
          model: 'models/gemini-2.5-flash-native-audio-preview-09-2025',
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName
                }
              }
            },
            temperature: 0.7
          },
          systemInstruction: {
            parts: [{
              text: `Your name is Mindy. You are a helpful voice assistant designed to help users understand and interact with web content. When the user speaks to you, they're calling for "Mindy". Always respond as Mindy - introduce yourself when appropriate and refer to yourself by this name.\n\nThe user is viewing a webpage. Here's the content:\n\n${pageContext}\n\nAnswer questions clearly and concisely. Be friendly and helpful. You can search the internet for current information when needed.${pdfInstructions}`
            }]
          },
          tools: [{
            googleSearch: {}
          }],
          realtimeInputConfig: {
            activityHandling: 'START_OF_ACTIVITY_INTERRUPTS'  // Enable barge-in/interruption (default)
          },
          inputAudioTranscription: {},  // Enable live captions for user speech
          outputAudioTranscription: {}  // Enable live captions for AI speech
        }
      };

      console.log('📤 Sending setup message:', setupMessage);
      ws.send(JSON.stringify(setupMessage));
    };

    ws.onmessage = async (event) => {
      try {
        let data = event.data;

        // Handle Blob data (convert to text first)
        if (data instanceof Blob) {
          console.log('📦 Received Blob data, converting to text...');
          data = await data.text();
        }

        console.log('📥 Received message:', data);
        const message = JSON.parse(data);
        handleMindyMessage(message);
      } catch (error) {
        console.error('❌ Error parsing message:', error);
        console.error('Raw data:', event.data);
        console.error('Data type:', typeof event.data, event.data instanceof Blob ? '(Blob)' : '');
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      console.error('Error details:', {
        type: error.type,
        target: error.target,
        readyState: ws.readyState
      });
      updateMindyStatus('Connection error - check console');
      alert('WebSocket connection failed. Check the console for details.');
      endMindyCall();
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      if (event.code !== 1000) {
        console.error('Abnormal closure. Code:', event.code, 'Reason:', event.reason);
      }
      endMindyCall();
    };

    // Handle audio data from worklet
    let audioChunkCount = 0;
    mindyAudioWorklet.port.onmessage = (event) => {
      if (!mindyIsMuted && ws.readyState === WebSocket.OPEN) {
        audioChunkCount++;
        if (audioChunkCount % 50 === 0) {
          console.log(`🎤 Sent ${audioChunkCount} audio chunks`);
        }

        const audioData = event.data.audioData;
        const bytes = new Uint8Array(audioData.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);

        ws.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              data: base64Audio,
              mimeType: 'audio/pcm;rate=16000'
            }]
          }
        }));
      }
    };

    // Update UI
    document.getElementById('mindyStartBtn').style.display = 'none';
    document.getElementById('mindyMuteBtn').style.display = 'inline-block';
    document.getElementById('mindyEndBtn').style.display = 'inline-block';
    clearMindyInfo();

  } catch (error) {
    console.error('Failed to start call:', error);
    let errorMsg = 'Failed to start call: ';
    if (error.name === 'NotAllowedError') {
      errorMsg = `Microphone access denied. Please:\n\n1. Right-click this page and select "Inspect"\n2. Click the lock icon (🔒) in the address bar\n3. Set Microphone to "Allow"\n4. Close and reopen the sidebar\n5. Try again\n\nOR go to: chrome://settings/content/microphone\nAnd add this extension to allowed sites.`;
    } else {
      errorMsg += error.message;
    }
    alert(errorMsg);
    endMindyCall();
  }
}

function handleMindyMessage(message) {
  console.log('📨 Message received:', JSON.stringify(message, null, 2).substring(0, 500));

  if (message.setupComplete) {
    console.log('✅ Setup complete! Ready to listen.');
    updateMindyStatus('listening');
    startMindyTimer();
    return;
  }

  if (message.serverContent) {
    const { serverContent } = message;
    console.log('📤 Server content received:', Object.keys(serverContent));

    // Handle interruption - clear audio queue immediately
    if (serverContent.interrupted) {
      console.log('⚠️ Interrupted - clearing audio queue and stopping playback');
      mindyAudioQueue = [];  // Clear audio queue
      mindyIsPlayingAudio = false;
      
      // Stop currently playing audio immediately
      if (mindyCurrentAudioSource) {
        try {
          mindyCurrentAudioSource.stop();
          mindyCurrentAudioSource.disconnect();
        } catch (e) {
          // Audio source may already be stopped
        }
        mindyCurrentAudioSource = null;
      }
      
      currentAITranscript = '';  // Clear AI transcript
      updateMindyStatus('listening');
      return;  // Skip processing rest of message
    }

    // Handle input transcription (what you said) - show live
    if (serverContent.inputTranscription && serverContent.inputTranscription.text) {
      const newText = serverContent.inputTranscription.text.trim();
      if (newText) {
        // Only add space if we already have text
        if (currentUserTranscript) {
          currentUserTranscript += ' ' + newText;
        } else {
          currentUserTranscript = newText;
        }
        console.log('🎤 User transcript building:', currentUserTranscript);
        // Update live transcript display
        updateLiveTranscript('user', currentUserTranscript.trim());
      }
    }

    // Handle output transcription (what AI said) - show live
    if (serverContent.outputTranscription && serverContent.outputTranscription.text) {
      const newText = serverContent.outputTranscription.text.trim();
      if (newText) {
        // Only add space if we already have text
        if (currentAITranscript) {
          currentAITranscript += ' ' + newText;
        } else {
          currentAITranscript = newText;
        }
        console.log('🔊 AI transcript building:', currentAITranscript);
        // Update live transcript display
        updateLiveTranscript('ai', currentAITranscript.trim());
      }
    }

    // Handle audio output
    if (serverContent.modelTurn && serverContent.modelTurn.parts) {
      console.log('🔊 Model turn with', serverContent.modelTurn.parts.length, 'parts');

      // Only process audio if we're not already speaking to prevent overlapping
      let hasNewAudio = false;
      for (const part of serverContent.modelTurn.parts) {
        console.log('Part type:', Object.keys(part));
        if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.includes('audio')) {
          console.log('🎵 Audio data received, MIME:', part.inlineData.mimeType, 'Size:', part.inlineData.data.length);
          playMindyAudio(part.inlineData.data);
          hasNewAudio = true;
        }
        // Note: Don't display part.text here - it's formatted text, not the transcript
        // The actual audio transcript comes from outputTranscription
        if (part.text) {
          console.log('💬 Text response received (not displaying - waiting for audio transcript):', part.text.substring(0, 100));
        }
      }

      if (hasNewAudio) {
        updateMindyStatus('speaking');
      }
    }

    if (serverContent.turnComplete) {
      console.log('✅ Turn complete');

      // Finalize transcripts (remove live indicators)
      finalizeLiveTranscripts();

      // Reset transcript accumulators
      currentUserTranscript = '';
      currentAITranscript = '';

      updateMindyStatus('listening');
    }
  }

  if (message.toolCall) {
    console.log('🔧 Tool call requested:', message.toolCall);
  }
}

// Audio queue to prevent overlapping
let mindyAudioQueue = [];
let mindyIsPlayingAudio = false;
let mindyCurrentAudioSource = null;  // Track current playing audio source for interruption

async function playMindyAudio(base64Data) {
  // Add to queue
  mindyAudioQueue.push(base64Data);

  // Start playing if not already playing
  if (!mindyIsPlayingAudio) {
    playNextAudioChunk();
  }
}

async function playNextAudioChunk() {
  if (mindyAudioQueue.length === 0) {
    mindyIsPlayingAudio = false;
    return;
  }

  mindyIsPlayingAudio = true;
  const base64Data = mindyAudioQueue.shift();

  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    if (!mindyAudioContext) {
      mindyAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioBuffer = mindyAudioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = mindyAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(mindyAudioContext.destination);
    
    // Track current audio source for interruption
    mindyCurrentAudioSource = source;

    // Play next chunk when this one ends
    source.onended = () => {
      mindyCurrentAudioSource = null;
      playNextAudioChunk();
    };

    source.start();
  } catch (error) {
    console.error('Failed to play audio:', error);
    // Continue with next chunk even if this one fails
    playNextAudioChunk();
  }
}

function toggleMindyMute() {
  mindyIsMuted = !mindyIsMuted;
  const btn = document.getElementById('mindyMuteBtn');
  const icon = document.getElementById('mindyMuteIcon');
  const text = document.getElementById('mindyMuteText');

  if (mindyIsMuted) {
    if (mindyMediaStream) {
      mindyMediaStream.getAudioTracks().forEach(track => track.enabled = false);
    }
    icon.textContent = '🔇';
    text.textContent = 'Unmute';
    btn.classList.add('btn-danger');
    btn.classList.remove('btn-secondary');
  } else {
    if (mindyMediaStream) {
      mindyMediaStream.getAudioTracks().forEach(track => track.enabled = true);
    }
    icon.textContent = '🎤';
    text.textContent = 'Mute';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-secondary');
  }
}

function endMindyCall() {
  if (mindyConnection) {
    mindyConnection.close();
    mindyConnection = null;
  }

  if (mindyMediaStream) {
    mindyMediaStream.getTracks().forEach(track => track.stop());
    mindyMediaStream = null;
  }

  if (mindyAudioWorklet) {
    mindyAudioWorklet.disconnect();
    mindyAudioWorklet = null;
  }

  if (mindyAudioContext) {
    mindyAudioContext.close();
    mindyAudioContext = null;
  }

  // Clear audio queue and stop current playback
  mindyAudioQueue = [];
  mindyIsPlayingAudio = false;
  
  // Stop currently playing audio
  if (mindyCurrentAudioSource) {
    try {
      mindyCurrentAudioSource.stop();
      mindyCurrentAudioSource.disconnect();
    } catch (e) {
      // Audio source may already be stopped
    }
    mindyCurrentAudioSource = null;
  }

  // Clear transcript accumulators
  currentUserTranscript = '';
  currentAITranscript = '';

  // Clear live transcript elements
  liveTranscriptElements = { user: null, ai: null };

  mindyIsMuted = false;

  // Stop timer
  stopMindyTimer();

  // Reset UI
  document.getElementById('mindyStartBtn').style.display = 'inline-block';
  document.getElementById('mindyMuteBtn').style.display = 'none';
  document.getElementById('mindyEndBtn').style.display = 'none';
  updateMindyStatus('Ready to start');
}

function updateMindyStatus(status) {
  const statusText = document.getElementById('mindyStatusPanel');
  const statusIcon = document.querySelector('.mindy-status-panel');

  if (!statusText || !statusIcon) return;

  statusIcon.classList.remove('listening', 'speaking');

  switch (status) {
    case 'listening':
      statusText.textContent = 'Listening...';
      statusIcon.classList.add('listening');
      break;
    case 'speaking':
      statusText.textContent = 'Mindy is speaking...';
      statusIcon.classList.add('speaking');
      break;
    default:
      statusText.textContent = status;
  }
}

function startMindyTimer() {
  const timerDisplay = document.getElementById('mindyTimer');
  const timerText = document.getElementById('mindyTimerText');

  if (!timerDisplay || !timerText) return;

  // Show the timer
  timerDisplay.style.display = 'flex';

  // Set start time
  mindyTimerStart = Date.now();

  // Update timer every second
  mindyTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - mindyTimerStart) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    // Format as MM:SS
    timerText.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, 1000);

  // Set initial display
  timerText.textContent = '00:00';
}

function stopMindyTimer() {
  const timerDisplay = document.getElementById('mindyTimer');
  const timerText = document.getElementById('mindyTimerText');

  // Clear the interval
  if (mindyTimerInterval) {
    clearInterval(mindyTimerInterval);
    mindyTimerInterval = null;
  }

  // Hide the timer
  if (timerDisplay) {
    timerDisplay.style.display = 'none';
  }

  // Reset timer text
  if (timerText) {
    timerText.textContent = '00:00';
  }

  // Reset start time
  mindyTimerStart = null;
}

function clearMindyInfo() {
  const info = document.querySelector('.mindy-info-panel');
  if (info) {
    info.remove();
  }
}

// Live transcript tracking
let liveTranscriptElements = {
  user: null,
  ai: null
};

// Clean transcript text (remove filler words and fix broken words)
function cleanTranscriptText(text) {
  console.log('🧹 Original transcript:', text);

  // First, remove standalone filler words with word boundaries
  const fillerWords = /\b(um|uh|uhh|ahh|ehh|er|hmm)\b\s*/gi;
  let cleaned = text.replace(fillerWords, '');

  // Fix only single-letter breaks: "g a m e" -> "game", "t h e" -> "the"
  // Match pattern: single letter + space + single letter (not full words)
  cleaned = cleaned.replace(/\b([a-z])\s+(?=[a-z](?:\s+[a-z]|\s*\b))/gi, '$1');

  // Do multiple passes for chains like "g a m e"
  for (let i = 0; i < 3; i++) {
    cleaned = cleaned.replace(/\b([a-z])\s+(?=[a-z](?:\s+[a-z]|\s*\b))/gi, '$1');
  }

  const result = cleaned
    .replace(/\s+/g, ' ')               // Collapse multiple spaces
    .replace(/\s+([.,!?])/g, '$1')      // Fix spacing before punctuation
    .replace(/\s*,\s*/g, ', ')          // Normalize comma spacing  
    .trim()                             // Remove leading/trailing spaces
    .replace(/^[a-z]/, (c) => c.toUpperCase()); // Capitalize first letter

  console.log('✨ Cleaned transcript:', result);
  return result;
}

// Update live transcript (streaming as speech happens)
function updateLiveTranscript(role, text) {
  clearMindyInfo();

  const container = document.getElementById('mindyTranscriptPanel');
  if (!container) return;

  // Clean the transcript text
  const cleanedText = cleanTranscriptText(text);

  // Check if we already have a live message element for this role
  if (!liveTranscriptElements[role]) {
    // Create new live message element
    const message = document.createElement('div');
    message.className = `mindy-message-panel ${role} live-transcript`;
    message.innerHTML = `
      <div class="mindy-message-label-panel">${role === 'user' ? 'You' : 'Mindy'} <span class="live-indicator">●</span></div>
      <p class="mindy-message-text-panel">${cleanedText}</p>
    `;

    container.appendChild(message);
    liveTranscriptElements[role] = message;
  } else {
    // Update existing live message
    const textElement = liveTranscriptElements[role].querySelector('.mindy-message-text-panel');
    if (textElement) {
      textElement.textContent = cleanedText;
    }
  }

  // Auto-scroll to bottom - scroll the parent container with overflow
  const scrollContainer = container.parentElement;
  if (scrollContainer) {
    setTimeout(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }, 0);
  }
}

// Finalize live transcripts (remove live indicator when turn completes)
function finalizeLiveTranscripts() {
  // Remove live indicators and mark as final
  Object.values(liveTranscriptElements).forEach(element => {
    if (element) {
      element.classList.remove('live-transcript');
      const liveIndicator = element.querySelector('.live-indicator');
      if (liveIndicator) {
        liveIndicator.remove();
      }
    }
  });

  // Clear tracking
  liveTranscriptElements = {
    user: null,
    ai: null
  };
}

function addMindyTranscript(role, text) {
  clearMindyInfo();

  const container = document.getElementById('mindyTranscriptPanel');
  if (!container) return;

  const message = document.createElement('div');
  message.className = `mindy-message-panel ${role}`;
  message.innerHTML = `
    <div class="mindy-message-label-panel">${role === 'user' ? 'You' : 'Mindy'}</div>
    <p class="mindy-message-text-panel">${text}</p>
  `;

  container.appendChild(message);
  // Auto-scroll to bottom - scroll the parent container with overflow
  const scrollContainer = container.parentElement;
  if (scrollContainer) {
    setTimeout(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }, 0);
  }
}

async function getPageContext(tab) {
  try {
    // First check if this is a PDF by checking the URL
    const isPDF = tab.url.toLowerCase().endsWith('.pdf') || tab.url.includes('.pdf?');

    if (isPDF) {
      console.log('📄 PDF detected for Mindy');

      // Activate PDF mode
      pdfMode.isActive = true;
      pdfMode.currentTab = tab;
      updatePDFStatusBanner();

      // Check if we already have captured pages
      if (pdfMode.capturedPages.length > 0) {
        // Use existing captured pages
        const context = buildPDFContext();
        console.log('✅ Using existing PDF context for Mindy, length:', context.length);
        return context;
      } else {
        // No pages captured yet - capture page 1 now for Mindy
        console.log('📸 Capturing PDF page 1 for Mindy call...');

        // Hide floating popup before screenshot
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
              const popup = document.getElementById('ai-assistant-popup');
              if (popup) {
                popup.style.display = 'none';
              }
            }
          });
        } catch (e) {
          console.log('Could not hide popup:', e);
        }

        // Small delay to ensure popup is hidden
        await new Promise(resolve => setTimeout(resolve, 100));

        // Extract PDF content (page 1)
        const result = await extractPDFPage(tab.id, 1);

        // Add to captured pages
        addCapturedPage(result);

        // Restore popup
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
              const popup = document.getElementById('ai-assistant-popup');
              if (popup) {
                popup.style.display = '';
              }
            }
          });
        } catch (e) {
          console.log('Could not restore popup:', e);
        }

        // Build context based on mode
        const context = buildPDFContext();
        console.log('✅ PDF page 1 captured for Mindy, context length:', context.length);

        return context;
      }
    } else {
      // Not a PDF - deactivate PDF mode
      pdfMode.isActive = false;
      updatePDFStatusBanner(); // Hide the banner
    }

    // Regular webpage - execute script to get content
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const title = document.title;
        const metaDesc = document.querySelector('meta[name="description"]');
        const description = metaDesc ? metaDesc.content : '';
        let content = document.body.innerText.substring(0, 10000);

        // Check if on YouTube and try to get transcript
        const isYouTube = window.location.hostname.includes('youtube.com') && window.location.pathname === '/watch';
        let transcript = '';

        if (isYouTube) {
          // Try to access the transcript from YouTubeSummary class if available
          if (window.youtubeTranscript) {
            transcript = window.youtubeTranscript;
          } else {
            // Try to get from ytInitialPlayerResponse
            try {
              const scripts = document.querySelectorAll('script');
              for (const script of scripts) {
                const scriptContent = script.textContent;
                if (scriptContent.includes('captionTracks')) {
                  const match = scriptContent.match(/"captionTracks":\s*(\[\{[^\]]+\}\])/);
                  if (match) {
                    const tracks = JSON.parse(match[1]);
                    const track = tracks.find(t => t.languageCode === 'en') || tracks[0];
                    if (track?.baseUrl) {
                      // Note: Can't fetch here due to async, but indicate transcript is available
                      transcript = '[YouTube video with captions available - ask me about the video content]';
                    }
                  }
                  break;
                }
              }
            } catch (e) {
              console.log('Could not extract transcript info');
            }
          }
        }

        return `Page Title: ${title}\n\n${description ? `Description: ${description}\n\n` : ''}${transcript ? `Video Transcript Preview: ${transcript}\n\n` : ''}Content:\n${content}`;
      }
    });
    return results[0].result;
  } catch (error) {
    console.error('Failed to get page context:', error);
    return 'Unable to retrieve page content.';
  }
}

// User Account Management Functions

// Load user account from storage
async function loadUserAccount() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userAccount'], (result) => {
      if (result.userAccount) {
        userAccount = result.userAccount;
      }
      updateUserAccountUI();
      resolve();
    });
  });
}

// Update user account UI
function updateUserAccountUI() {
  const creditAmount = document.getElementById('creditAmount');
  const authButton = document.getElementById('authButton');

  // Update credits display
  creditAmount.textContent = userAccount.credits.toLocaleString();

  // Update auth button based on login status
  if (userAccount.isLoggedIn) {
    authButton.textContent = userAccount.email ? userAccount.email.split('@')[0] : 'Account';
  } else {
    authButton.textContent = 'Login';
  }
}

// Handle auth button click
function handleAuthClick() {
  if (userAccount.isLoggedIn) {
    // Show account menu
    showAccountMenu();
  } else {
    // Show login/signup dialog
    showAuthDialog();
  }
}

// Show account menu (when logged in)
function showAccountMenu() {
  const menu = confirm(`Account: ${userAccount.email}\nCredits: ${userAccount.credits}\n\nWould you like to log out?`);
  if (menu) {
    logoutUser();
  }
}

// Show auth dialog (when not logged in)
function showAuthDialog() {
  // For now, show a simple prompt - you can replace this with a proper modal later
  const action = confirm('Welcome to Mentelo!\n\nClick OK to Sign Up or Cancel to Login');
  
  if (action) {
    // Sign up flow
    const email = prompt('Enter your email to sign up:');
    if (email && email.includes('@')) {
      signupUser(email);
    }
  } else {
    // Login flow
    const email = prompt('Enter your email to login:');
    if (email && email.includes('@')) {
      loginUser(email);
    }
  }
}

// Signup user (mock implementation - replace with real API)
function signupUser(email) {
  // Mock signup - in production, call your backend API
  userAccount = {
    isLoggedIn: true,
    credits: 100, // Welcome bonus
    email: email
  };
  
  saveUserAccount();
  updateUserAccountUI();
  alert(`Welcome! You've received 100 free credits to get started.`);
}

// Login user (mock implementation - replace with real API)
function loginUser(email) {
  // Mock login - in production, call your backend API
  userAccount = {
    isLoggedIn: true,
    credits: 50, // Example existing credits
    email: email
  };
  
  saveUserAccount();
  updateUserAccountUI();
  alert(`Welcome back! You have ${userAccount.credits} credits.`);
}

// Logout user
function logoutUser() {
  userAccount = {
    isLoggedIn: false,
    credits: 0,
    email: null
  };
  
  saveUserAccount();
  updateUserAccountUI();
  alert('You have been logged out.');
}

// Save user account to storage
function saveUserAccount() {
  chrome.storage.local.set({ userAccount: userAccount }, () => {
    console.log('💾 User account saved');
  });
}

// Deduct credits (call this when user uses AI features)
function deductCredits(amount) {
  if (!userAccount.isLoggedIn) {
    // Allow usage without login for now, but show a message
    console.log('⚠️ User not logged in, no credits deducted');
    return true;
  }
  
  if (userAccount.credits >= amount) {
    userAccount.credits -= amount;
    saveUserAccount();
    updateUserAccountUI();
    return true;
  } else {
    alert(`Insufficient credits! You need ${amount} credits but only have ${userAccount.credits}.\n\nPlease purchase more credits to continue.`);
    return false;
  }
}

// Add credits (for purchases or rewards)
function addCredits(amount) {
  userAccount.credits += amount;
  saveUserAccount();
  updateUserAccountUI();
}
