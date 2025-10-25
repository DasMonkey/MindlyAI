// Side panel JavaScript
let currentTask = null;
let apiKey = null;
let pageContent = null;
let chatHistory = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadApiKey();
  await loadTargetLanguageUI();
  await loadMindyVoiceUI();
  await loadTTSSettingsUI();
  await loadBookmarks();
  await loadHistory();
  await loadClipboardHistory();
  setupEventListeners();
  checkApiStatus();
  startClipboardMonitoring();
});

// Load API key from storage
async function loadApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      apiKey = result.geminiApiKey || null;
      if (apiKey) {
        document.getElementById('apiKey').value = apiKey;
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
  
  // Save language preference
  document.getElementById('saveLanguage').addEventListener('click', saveLanguagePreference);
  
  // Save Mindy voice
  document.getElementById('saveMindyVoice').addEventListener('click', saveMindyVoice);
  
  // Save TTS settings
  document.getElementById('saveTTSSettings').addEventListener('click', saveTTSSettings);
  
  // Speech speed slider
  const speedSlider = document.getElementById('ttsSpeechSpeed');
  const speedValue = document.getElementById('ttsSpeechSpeedValue');
  speedSlider.addEventListener('input', (e) => {
    speedValue.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
  });
  
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  // Action buttons
  document.getElementById('copyBtn').addEventListener('click', copyResult);
  document.getElementById('downloadBtn').addEventListener('click', downloadResult);
  document.getElementById('regenerateBtn').addEventListener('click', regenerateContent);
  
  // Bookmarks
  document.getElementById('organizeBtn').addEventListener('click', organizeBookmarks);
  
  // History
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
  
  // Clipboard
  document.getElementById('clearClipboardBtn').addEventListener('click', clearClipboard);
  
  // Chat
  document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  document.getElementById('clearChatBtn').addEventListener('click', clearChat);
  
  // Call Mindy
  document.getElementById('mindyStartBtn').addEventListener('click', startMindyCall);
  document.getElementById('mindyMuteBtn').addEventListener('click', toggleMindyMute);
  document.getElementById('mindyEndBtn').addEventListener('click', endMindyCall);
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateContent') {
    currentTask = request;
    displayCurrentTask();
    generateContent(request);
  } else if (request.action === 'switchToChat') {
    switchTab('chat');
    loadPageContent();
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

// Save API Key
function saveApiKey() {
  const key = document.getElementById('apiKey').value.trim();
  if (!key) {
    alert('Please enter an API key');
    return;
  }
  
  chrome.storage.local.set({ geminiApiKey: key }, () => {
    apiKey = key;
    checkApiStatus();
    alert('API Key saved successfully!');
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
      const voice = result.mindyVoice || 'Puck';
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
      resolve(result.mindyVoice || 'Puck');
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
  const speechSpeed = document.getElementById('ttsSpeechSpeed').value;
  chrome.storage.local.set({ 
    ttsVoice: voice,
    ttsMaxChars: parseInt(maxChars) || 1000,
    ttsSpeechSpeed: parseFloat(speechSpeed) || 1.0
  }, () => {
    alert('TTS settings saved!');
  });
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
      const speechSpeedSlider = document.getElementById('ttsSpeechSpeed');
      const speechSpeedValue = document.getElementById('ttsSpeechSpeedValue');
      
      if (voiceSelect) {
        voiceSelect.value = voice;
      }
      if (maxCharsInput) {
        maxCharsInput.value = maxChars;
      }
      if (speechSpeedSlider) {
        speechSpeedSlider.value = speechSpeed;
      }
      if (speechSpeedValue) {
        speechSpeedValue.textContent = `${speechSpeed.toFixed(1)}x`;
      }
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
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Display current task
function displayCurrentTask() {
  const taskDisplay = document.getElementById('currentTask');
  const taskDescriptions = {
    'summarize': `📄 Summarizing page: ${currentTask.title}`,
    'translate-page': `🌐 Translating page: ${currentTask.title}`,
    'translate-selection': `🔤 Translating selected text`,
    'mindmap': `🧠 Creating mindmap for: ${currentTask.title}`,
    'social-content': `📱 Generating social content for: ${currentTask.title}`
  };
  
  taskDisplay.innerHTML = `<p>${taskDescriptions[currentTask.task] || 'Processing task...'}</p>`;
}

// Generate content using Gemini API
async function generateContent(task) {
  if (!apiKey) {
    showResult('⚠️ Please configure your Gemini API key first!', 'error');
    return;
  }
  
  showLoading(true);
  document.getElementById('actionButtons').style.display = 'none';
  
  try {
    const prompt = await buildPrompt(task);
    const result = await callGeminiApi(prompt);
    showResult(result, 'success');
    saveToHistory(task, result);
    document.getElementById('actionButtons').style.display = 'flex';
  } catch (error) {
    console.error('Error generating content:', error);
    showResult(`❌ Error: ${error.message}`, 'error');
  }
  
  showLoading(false);
}

// Build prompt based on task
async function buildPrompt(task) {
  const targetLang = await loadTargetLanguage();
  const langName = getLanguageName(targetLang);
  
  const prompts = {
    'summarize': `Create a TLDR summary of the following content. 

RULES:
- Use EXACTLY 3-5 bullet points (• symbol)
- Each bullet point should be ONE concise sentence (max 20 words)
- Focus ONLY on key facts, main ideas, or critical takeaways
- NO introductions, NO conclusions, NO fluff
- Start directly with the bullets

Content:
${task.content}`,
    
    'translate-page': `Please translate the following webpage content to ${langName}. Maintain formatting and structure:\n\n${task.content}`,
    
    'translate-selection': `Please translate the following text to ${langName}:\n\n${task.content}`,
    
    'mindmap': `Create a detailed mindmap structure for the following content. Format it as a hierarchical list with main topics and subtopics. Use clear indentation and bullet points:\n\n${task.content}\n\nFormat the mindmap with:\n- Main Topic\n  - Subtopic 1\n    - Detail 1\n    - Detail 2\n  - Subtopic 2`,
    
    'social-content': `Create viral social media content based on the following webpage. Generate posts for Twitter/X, LinkedIn, and Instagram. Each post should have:\n1. A catchy hook\n2. Main content with value\n3. Call to action\n4. Relevant hashtags\n\nSource content:\n${task.content}\n\nURL: ${task.url}`
  };
  
  return prompts[task.task] || task.content;
}

// Call Gemini API
async function callGeminiApi(prompt, imageParts = null) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  // Build parts array
  let parts = [];
  if (imageParts && imageParts.length > 0) {
    parts = [...imageParts, { text: prompt }];
  } else {
    parts = [{ text: prompt }];
  }
  
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
  
  // Check if response has expected structure
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    console.error('Unexpected API response structure:', data);
    throw new Error('API returned unexpected response format');
  }
  
  return data.candidates[0].content.parts[0].text;
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
    
    // Render grouped bookmarks
    listDiv.innerHTML = sortedDomains.map(domain => {
      const domainBookmarks = grouped[domain];
      const favicon = domainBookmarks[0].favicon || '';
      
      return `
        <div class="bookmark-group">
          <div class="bookmark-group-header">
            ${favicon ? `<img src="${favicon}" class="bookmark-favicon" alt="">` : '🌐'}
            <span class="bookmark-domain">${domain}</span>
            <span class="bookmark-count">(${domainBookmarks.length})</span>
          </div>
          <div class="bookmark-group-items">
            ${domainBookmarks.map(bookmark => `
              <div class="bookmark-item">
                <a href="${bookmark.url}" target="_blank" class="bookmark-link">
                  <div class="bookmark-title">${bookmark.title || 'Untitled'}</div>
                  ${bookmark.text && bookmark.text !== bookmark.title ? `<div class="bookmark-text">${bookmark.text.substring(0, 100)}${bookmark.text.length > 100 ? '...' : ''}</div>` : ''}
                </a>
                <div class="bookmark-meta">
                  <span class="bookmark-time">${new Date(bookmark.timestamp).toLocaleDateString()}</span>
                  <button class="btn btn-danger btn-small" onclick="deleteBookmark(${bookmark.originalIndex})">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  });
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

// Organize bookmarks with AI
async function organizeBookmarks() {
  if (!apiKey) {
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
    'social-content': '📱',
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
  return new Promise(async (resolve) => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Error loading page content:', chrome.runtime.lastError);
            pageContent = 'Unable to load page content. Please refresh the page.';
            resolve();
          } else if (response && response.content) {
            pageContent = response.content;
            resolve();
          } else {
            pageContent = 'No content available from this page.';
            resolve();
          }
        });
      } else {
        pageContent = 'No active tab found.';
        resolve();
      }
    } catch (error) {
      console.log('Could not load page content:', error);
      pageContent = 'Error loading page content.';
      resolve();
    }
  });
}

// Send chat message
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  if (!apiKey) {
    alert('Please configure your API key first!');
    return;
  }
  
  // Add user message to chat
  addMessageToChat(message, 'user');
  input.value = '';
  
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
      // Regular chat - load page content if not already loaded
      if (!pageContent) {
        await loadPageContent();
      }
      
      // Build context-aware prompt
      prompt = `You are a helpful assistant answering questions about a webpage. Here is the page content:

${pageContent ? pageContent.substring(0, 3000) : 'No page content available.'}

User question: ${message}

Please provide a helpful and accurate answer based on the page content above.`;
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

// Clear chat
function clearChat() {
  if (!confirm('Are you sure you want to clear the chat history?')) return;
  
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = `
    <div class="chat-message ai-message">
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        <p>Hello! I'm ready to answer questions about this page. What would you like to know?</p>
      </div>
    </div>
  `;
  
  chatHistory = [];
}

// Translate and replace selected text
async function translateAndReplace(content, tabId, htmlContent) {
  if (!apiKey) {
    chrome.tabs.sendMessage(tabId, {
      action: 'replaceSelection',
      translatedText: 'Error: Please configure your API key first in Settings.'
    });
    return;
  }
  
  try {
    const targetLang = await loadTargetLanguage();
    const langName = getLanguageName(targetLang);
    
    // Use HTML content if available for better structure preservation
    const contentToTranslate = htmlContent || content;
    const isHTML = !!htmlContent && htmlContent.includes('<');
    
    let prompt;
    if (isHTML) {
      prompt = `Translate the following HTML content to ${langName}. Preserve all HTML tags (<br>, <p>, <div>, etc.) exactly as they are. Only translate the text content inside the tags. Return valid HTML:\n\n${contentToTranslate}`;
    } else {
      prompt = `Translate the following text to ${langName}. Preserve all line breaks and paragraph structure. Only return the translated text:\n\n${contentToTranslate}`;
    }
    
    const translatedText = await callGeminiApi(prompt);
    
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
  if (!apiKey) {
    chrome.tabs.sendMessage(tabId, {
      action: 'replacePageText',
      translations: '[0]Error: Please configure your API key first in Settings.'
    });
    return;
  }
  
  try {
    const targetLang = await loadTargetLanguage();
    const langName = getLanguageName(targetLang);
    
    console.log('Translating page to:', langName);
    console.log('Content length:', content.length);
    
    const prompt = `Translate the following indexed text to ${langName}. Each line starts with [index] followed by text. You must:
1. Keep the [index] markers exactly as they are
2. Translate only the text after each [index]
3. Keep each translation on the same line as its [index]
4. Do not add or remove line breaks
5. Preserve the exact format

Text to translate:
${content}`;
    
    const translatedText = await callGeminiApi(prompt);
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
  if (!apiKey) {
    chrome.tabs.sendMessage(tabId, {
      action: 'injectTranslation',
      translatedText: 'Error: Please configure your API key first in Settings.'
    });
    return;
  }
  
  try {
    const targetLang = await loadTargetLanguage();
    const langName = getLanguageName(targetLang);
    
    const prompt = `Translate the following text to ${langName}. Maintain the structure and formatting:\n\n${content}`;
    
    const translatedText = await callGeminiApi(prompt);
    
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
          <div class="clipboard-item" onclick="copyClipboardItem(${index})">
            <div class="clipboard-item-header">
              <span class="clipboard-item-type">TEXT</span>
              <span class="clipboard-item-time">${timeAgo}</span>
            </div>
            <div class="clipboard-item-content">
              <div class="clipboard-item-text">${escapeHtml(preview)}</div>
            </div>
            <div class="clipboard-item-actions">
              <button class="btn btn-secondary" onclick="event.stopPropagation(); copyClipboardItem(${index})">📋 Copy</button>
              <button class="btn btn-danger" onclick="event.stopPropagation(); deleteClipboardItem(${index})">🗑️ Delete</button>
            </div>
          </div>
        `;
      } else if (item.type === 'image') {
        return `
          <div class="clipboard-item" onclick="copyClipboardItem(${index})">
            <div class="clipboard-item-header">
              <span class="clipboard-item-type">IMAGE</span>
              <span class="clipboard-item-time">${timeAgo}</span>
            </div>
            <div class="clipboard-item-content">
              <img src="${item.content}" class="clipboard-item-image" alt="Clipboard image">
            </div>
            <div class="clipboard-item-actions">
              <button class="btn btn-secondary" onclick="event.stopPropagation(); copyClipboardItem(${index})">📋 Copy</button>
              <button class="btn btn-danger" onclick="event.stopPropagation(); deleteClipboardItem(${index})">🗑️ Delete</button>
            </div>
          </div>
        `;
      }
    }).join('');
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

function copyClipboardItem(index) {
  chrome.storage.local.get(['clipboardHistory'], async (result) => {
    const history = result.clipboardHistory || [];
    if (history[index]) {
      const item = history[index];
      
      if (item.type === 'text') {
        await navigator.clipboard.writeText(item.content);
        alert('✅ Copied to clipboard!');
      } else if (item.type === 'image') {
        // Convert data URL to blob and copy
        const response = await fetch(item.content);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        alert('✅ Image copied to clipboard!');
      }
    }
  });
}

function deleteClipboardItem(index) {
  if (!confirm('Delete this clipboard item?')) return;
  
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
    
    // Call Gemini with detailed explanation prompt
    const prompt = `Analyze and explain this image in detail. Provide:

1. **Alt-Text Description**: A concise, accessible description suitable for screen readers (1-2 sentences)

2. **Detailed Explanation**: What the image shows, including:
   - Main subject/content
   - Important visual elements
   - Colors, composition, and style
   - Context and setting

3. **Purpose/Message**: What the image is trying to communicate or represent

4. **Additional Insights**: 
   - If it's a chart/graph: Explain the data, trends, and key findings
   - If it's a diagram: Explain the components and relationships
   - If it's a photo: Describe the scene, mood, and notable details
   - If it's an infographic: Summarize the key information presented

Format your response with clear sections and bullet points where appropriate.`;
    
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

async function startMindyCall() {
  if (!apiKey) {
    alert('Please configure your Gemini API key first in Settings.');
    switchTab('settings');
    return;
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

    // Get page context from active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageContext = await getPageContext(tabs[0]);

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
          model: 'models/gemini-2.0-flash-exp',
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
              text: `You are Mindy, a helpful voice assistant. The user is viewing a webpage. Here's the content:\n\n${pageContext}\n\nAnswer questions clearly and concisely. Be friendly and helpful. You can search the internet for current information when needed.`
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
              mimeType: 'audio/pcm'
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
    return;
  }

  if (message.serverContent) {
    const { serverContent } = message;
    console.log('📤 Server content received:', Object.keys(serverContent));

    // Handle interruption - clear audio queue immediately
    if (serverContent.interrupted) {
      console.log('⚠️ Interrupted - clearing audio queue');
      mindyAudioQueue = [];  // Clear audio queue
      mindyIsPlayingAudio = false;
      currentAITranscript = '';  // Clear AI transcript
      updateMindyStatus('listening');
      return;  // Skip processing rest of message
    }

    // Handle input transcription (what you said) - accumulate until turn complete
    if (serverContent.inputTranscription && serverContent.inputTranscription.text) {
      currentUserTranscript += ' ' + serverContent.inputTranscription.text;
      console.log('🎤 User transcript building:', currentUserTranscript);
    }
    
    // Handle output transcription (what AI said) - accumulate until turn complete
    if (serverContent.outputTranscription && serverContent.outputTranscription.text) {
      currentAITranscript += ' ' + serverContent.outputTranscription.text;
      console.log('🔊 AI transcript building:', currentAITranscript);
    }

    // Handle audio output
    if (serverContent.modelTurn && serverContent.modelTurn.parts) {
      console.log('🔊 Model turn with', serverContent.modelTurn.parts.length, 'parts');
      for (const part of serverContent.modelTurn.parts) {
        console.log('Part type:', Object.keys(part));
        if (part.inlineData) {
          console.log('🎵 Audio data received, MIME:', part.inlineData.mimeType);
          playMindyAudio(part.inlineData.data);
          updateMindyStatus('speaking');
        }
        if (part.text) {
          console.log('💬 Text response:', part.text);
          addMindyTranscript('ai', part.text);
        }
      }
    }
    
    if (serverContent.turnComplete) {
      console.log('✅ Turn complete');
      
      // Display accumulated transcripts
      if (currentUserTranscript.trim()) {
        addMindyTranscript('user', currentUserTranscript.trim());
        currentUserTranscript = '';  // Reset
      }
      if (currentAITranscript.trim()) {
        addMindyTranscript('ai', currentAITranscript.trim());
        currentAITranscript = '';  // Reset
      }
      
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
    
    // Play next chunk when this one ends
    source.onended = () => {
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

  mindyIsMuted = false;

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

function clearMindyInfo() {
  const info = document.querySelector('.mindy-info-panel');
  if (info) {
    info.remove();
  }
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
  container.scrollTop = container.scrollHeight;
}

async function getPageContext(tab) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const title = document.title;
        const metaDesc = document.querySelector('meta[name="description"]');
        const description = metaDesc ? metaDesc.content : '';
        const content = document.body.innerText.substring(0, 10000);
        return `Page Title: ${title}\n\n${description ? `Description: ${description}\n\n` : ''}Content:\n${content}`;
      }
    });
    return results[0].result;
  } catch (error) {
    console.error('Failed to get page context:', error);
    return 'Unable to retrieve page content.';
  }
}
