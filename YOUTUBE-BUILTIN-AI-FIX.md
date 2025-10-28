# YouTube Button Built-in AI Integration Fix

## Problem
The YouTube summary buttons were hardcoded to only work with Cloud API (Gemini API key). They would not show up or work when Built-in AI was selected as the preferred provider.

## Solution
Updated the YouTube summary feature to respect the AI provider choice and route requests through the AI Provider Manager.

## Changes Made

### 1. youtube-summary.js

#### Updated `init()` method
- **Before**: Only checked for Gemini API key, wouldn't show buttons without it
- **After**: Checks provider settings and shows buttons regardless of provider choice
- Now loads `preferredProvider` from storage
- Stores API key for fallback purposes only

```javascript
async init() {
  // Check AI provider settings - buttons should show regardless of provider
  const providerSettings = await this.getProviderSettings();
  this.preferredProvider = providerSettings.preferredProvider || 'builtin';
  this.apiKey = providerSettings.apiKey; // For cloud API fallback
  
  console.log('YouTube Summary: Using provider:', this.preferredProvider);
  // ... rest of initialization
}
```

#### Added `getProviderSettings()` method
New method to retrieve both the preferred provider and API key from storage:

```javascript
async getProviderSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['preferredProvider', 'geminiApiKey'], (result) => {
      resolve({
        preferredProvider: result.preferredProvider || 'builtin',
        apiKey: result.geminiApiKey
      });
    });
  });
}
```

#### Updated `generateSummary()` method
- **Before**: Directly called Gemini Cloud API
- **After**: Routes through AI Provider Manager via background script
- Supports automatic fallback to Cloud API if Built-in AI fails and API key is available

```javascript
async generateSummary(action) {
  // ... prompt generation
  
  try {
    // Use AI Provider Manager via background script
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'generateContent',
        task: 'youtubeSummary',
        prompt: prompt
      }, (response) => {
        // Handle response
      });
    });
    
    return response;
  } catch (error) {
    // Fallback to Cloud API if needed
    if (this.preferredProvider === 'builtin' && this.apiKey) {
      return await this.generateSummaryWithCloudAPI(prompt);
    }
    throw error;
  }
}
```

#### Added `generateSummaryWithCloudAPI()` method
Fallback method for when Built-in AI is unavailable but Cloud API key exists:

```javascript
async generateSummaryWithCloudAPI(prompt) {
  // Direct Gemini API call as fallback
}
```

### 2. background.js

#### Updated `generateContent` case handler
- **Before**: Only handled `textAssist` task in background
- **After**: Also handles `youtubeSummary` task
- Both tasks now route through the AI Provider Manager

```javascript
case 'generateContent': {
  if (request.task === 'textAssist' || request.task === 'youtubeSummary') {
    // Handle both tasks directly in background using AI Provider Manager
    handleTextAssist(request.prompt)
      .then(result => {
        sendResponse({ result });
      })
      .catch(error => {
        sendResponse({ error: error.message });
      });
    return true;
  }
  // ... other tasks forwarded to side panel
}
```

#### Enhanced `handleTextAssist()` function
Added better error handling and logging to diagnose issues:
- Logs active provider before making requests
- Validates response structure before returning
- Provides detailed error messages with stack traces

### 3. sidepanel.js

#### Updated message listener
- **Before**: Only ignored `textAssist` tasks
- **After**: Also ignores `youtubeSummary` tasks
- Prevents sidepanel from trying to process YouTube summaries (which are handled in background)

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateContent') {
    // Ignore textAssist and youtubeSummary tasks - they're handled in background.js
    if (request.task === 'textAssist' || request.task === 'youtubeSummary') {
      return;
    }
    // ... process other tasks
  }
});
```

This fix prevents the error: "Cannot read properties of undefined (reading 'length')" which occurred when sidepanel tried to access `task.content.length` on YouTube summary tasks that only have `task.prompt`.

### 4. builtin-ai-provider.js

#### Updated `generateContent()` method
Added `outputLanguage: 'en'` parameter to suppress Chrome warnings:

```javascript
async generateContent(prompt, options = {}) {
  const session = await promptWrapper.createSession({
    temperature: options.temperature || 1.0,
    topK: options.topK || 40,
    outputLanguage: options.outputLanguage || 'en' // Required to suppress warnings
  });
  // ... rest of implementation
}
```

## How It Works Now

### Flow Diagram
```
User clicks YouTube button
    ↓
YouTube Summary checks preferredProvider
    ↓
Sends request to background.js
    ↓
Background.js → AI Provider Manager
    ↓
AI Provider Manager routes to:
    - Built-in AI Provider (if preferredProvider === 'builtin')
    - Cloud AI Provider (if preferredProvider === 'cloud')
    ↓
Response returned to YouTube Summary
    ↓
Summary displayed to user
```

### Fallback Behavior
1. If Built-in AI is selected but unavailable
2. AND Cloud API key is configured
3. System automatically falls back to Cloud API
4. User gets their summary regardless

## Benefits

✅ **Buttons always show**: No longer dependent on API key presence
✅ **Respects user choice**: Uses the provider selected in settings
✅ **Automatic fallback**: Gracefully handles Built-in AI unavailability
✅ **Consistent behavior**: Works the same as other extension features
✅ **Better UX**: Users don't need to configure API keys to use YouTube features

## Additional Fix: Transcript Loading Issue

### Problem
The transcript extraction was interfering with YouTube's native transcript UI:
- Transcript panel would get stuck in loading state
- 3-dot menu wouldn't appear
- Users had to click Chapters then back to Transcript to make it work

### Root Cause
The `extractFromTranscriptPanel()` method was clicking the transcript button but:
1. Not waiting long enough for content to load
2. Closing the panel immediately after extraction
3. Not checking if panel was already open

### Solution - Improved Transcript Panel Method
Re-enabled the transcript panel method with major improvements:

1. **Check if already open**: Detects if transcript is already loaded before clicking
2. **Polling mechanism**: Waits up to 10 seconds with 500ms checks for content to load
3. **Leave panel open**: Doesn't close the panel after extraction (prevents UI issues)
4. **Better detection**: Checks button aria-label to determine panel state

```javascript
async extractFromTranscriptPanel() {
  // Check if already open
  if (segments.length > 0) {
    return this.extractSegmentsFromDOM(segments);
  }
  
  // Click to open
  transcriptButton.click();
  
  // Poll for content (up to 10 seconds)
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 500));
    segments = document.querySelectorAll('ytd-transcript-segment-renderer');
    if (segments.length > 0) break;
  }
  
  // Extract and LEAVE PANEL OPEN
  return this.extractSegmentsFromDOM(segments);
}
```

### Extraction Priority
1. Extract from `ytInitialPlayerResponse` (most reliable, no UI interaction)
2. Extract from transcript panel (improved method with polling)
3. Fetch caption tracks via background script (API fallback)

## Testing Checklist

- [ ] YouTube buttons appear when Built-in AI is selected
- [ ] YouTube buttons appear when Cloud API is selected
- [ ] Summaries work with Built-in AI provider
- [ ] Summaries work with Cloud API provider
- [ ] Fallback works when Built-in AI unavailable but API key exists
- [ ] All 6 summary types work (TLDR, Detailed, Concepts, Chapters, Takeaways, Notes)
- [ ] Error messages are clear when both providers fail
- [ ] YouTube's native transcript panel loads normally (no stuck loading)
- [ ] 3-dot menu appears in transcript panel
- [ ] No interference with YouTube's native UI

## Related Files
- `youtube-summary.js` - YouTube button injection and summary generation
- `background.js` - Message routing and AI Provider Manager integration
- `ai-provider-manager.js` - Central provider routing logic
- `builtin-ai-provider.js` - Built-in AI implementation
- `cloud-ai-provider.js` - Cloud API implementation
