# Chat with Page - Tab Detection Debug Guide

## Issue
After clicking "New page detected" button and starting a new chat session, the AI still answers questions based on the previous page's content instead of the current page.

## Fixes Applied

### 1. Enhanced Session Tracking
- `checkForTabChange()` now properly compares current tab against `chatSessionTab` (original session tab)
- Updates `currentPageTab` tracking at the end to avoid comparison issues
- Shows/hides "New page detected" button correctly based on whether you're on the session tab or a different tab

### 2. Complete Session Reset
- `startFreshChatSession()` now:
  - Clears `pageContent`, `chatHistory`, and `sessionActivity` completely
  - Resets PDF mode if active
  - Sets current tab as the new session tab
  - Reloads page content from the current tab
  - Adds extensive logging to track the process

### 3. Smart Content Reloading
- `sendChatMessage()` now detects if you're on a different tab than the session and automatically reloads content
- Added logging to track which tab content is being used

### 4. Enhanced Debugging
- Added console logs throughout to track:
  - When `pageContent` is cleared
  - Previous vs new session tab IDs and URLs
  - Content loading success/failure
  - Content length and preview
  - Whether content actually changed

## How to Test

### Test Scenario 1: Basic Tab Switch
1. Open the extension sidepanel
2. Go to Tab A (e.g., google.com)
3. Switch to "Chat with Page" tab in sidepanel
4. Ask a question about Tab A (e.g., "What is this page about?")
5. Switch browser to Tab B (e.g., github.com)
6. **Expected**: "New page detected" button should appear
7. Click "New page detected" button
8. **Check console logs** - you should see:
   ```
   🔄 Starting fresh chat session...
   🧹 Clearing pageContent (was: XXXX chars)
   📍 Previous session tab: [Tab A ID] [Tab A URL]
   📍 New session tab: [Tab B ID] [Tab B URL]
   📥 Loading page content from tab: [Tab B ID] [Tab B URL]
   ✅ Page content loaded, length: YYYY chars
   📄 Content changed: true
   📄 New content preview: [first 150 chars of Tab B]
   ```
9. Ask a question about Tab B (e.g., "What is this page about?")
10. **Check console logs** - you should see:
    ```
    📤 Sending prompt with page content length: YYYY
    📄 Page content preview: [first 200 chars of Tab B]
    ```
11. **Expected**: AI should answer based on Tab B content, not Tab A

### Test Scenario 2: Clear Chat
1. Have an active chat session on Tab A
2. Switch to Tab B
3. Click "Clear Chat" button (trash icon)
4. **Check console logs** - similar to Test Scenario 1
5. Ask a question
6. **Expected**: AI should answer based on Tab B content

### Test Scenario 3: Without Clicking Button
1. Have an active chat session on Tab A
2. Switch to Tab B
3. **Don't click** "New page detected" button
4. Ask a question about Tab B
5. **Check console logs** - you should see:
   ```
   ⚠️ User is asking about a different tab! Session: [Tab A ID] Current: [Tab B ID]
   🔄 Reloaded page content from current tab
   ```
6. **Expected**: AI should still answer based on Tab B content (auto-reload)

## Debugging Steps

If the issue persists:

1. **Open Browser DevTools Console** (F12)
2. **Filter by "🔄" or "📄"** to see relevant logs
3. **Check these specific things**:
   - Is `pageContent` actually being cleared? Look for "🧹 Clearing pageContent"
   - Is the new tab ID different from the old one? Look for "📍 Previous session tab" vs "📍 New session tab"
   - Is `loadPageContent()` being called? Look for "📥 Loading page content from tab"
   - Is content actually loaded? Look for "✅ Page content loaded"
   - Did the content change? Look for "📄 Content changed: true"
   - What content is being sent to AI? Look for "📤 Sending prompt with page content length"

4. **Common Issues**:
   - **Content not changing**: The content script might not be injected on the new page. Try refreshing the page.
   - **Same content on both tabs**: If both tabs have similar content (e.g., two Google search pages), the AI might give similar answers.
   - **Content script error**: Check for "❌ Error loading page content" in console
   - **No content available**: Check for "⚠️ No content available from page" - this means the content script didn't respond

5. **Manual Test**:
   - In console, type: `chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => console.log(tabs[0]))`
   - This shows the current active tab - verify it's the tab you expect

## Expected Console Output

When everything works correctly, you should see this sequence:

```
🔄 Starting fresh chat session...
🧹 Clearing pageContent (was: 5234 chars)
📍 Previous session tab: 123 https://google.com
📍 New session tab: 456 https://github.com
🎯 New chat session initialized with tab: 456 https://github.com
📥 Loading page content from tab: 456 https://github.com
✅ Page content loaded, length: 8765 chars
📄 Content changed: true
📄 New content preview: GitHub is where over 100 million developers...
✅ Page content loaded successfully, length: 8765
📄 First 200 chars: GitHub is where over 100 million developers...
✅ Started fresh chat session with new page
```

Then when you send a message:

```
📤 Sending prompt with page content length: 8765
📄 Page content preview: GitHub is where over 100 million developers...
📤 Calling AI Provider Manager with prompt length: 9123
✅ Response received from builtin
```

## Still Not Working?

If after following all these steps the issue persists, please provide:
1. The complete console log output from the test
2. The URLs of both tabs you're testing with
3. The exact question you're asking
4. The AI's response

This will help identify if the issue is with:
- Content loading
- Content script injection
- Session tracking
- AI context handling
