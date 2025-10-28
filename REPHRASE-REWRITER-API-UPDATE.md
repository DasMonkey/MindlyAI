# Rephrase Button - Rewriter API Integration

## Summary
Updated the text field assistant's rephrase button to use the Chrome Built-in AI Rewriter API when built-in AI is selected, instead of using generic prompt-based generation.

## Changes Made

### 1. textfield-assistant.js
**Modified `rephrase()` method in AIServices class:**
- Changed from using `generateContent` with a prompt to using dedicated `rewriteText` action
- Now sends `action: 'rewriteText'` message to background script
- Passes Rewriter API-compatible options:
  - `tone: 'as-is'` - maintains original tone
  - `length: 'as-is'` - maintains original length
  - `format: 'plain-text'` - outputs plain text
  - `sharedContext` - provides context for rephrasing

### 2. background.js
**Added new message handler:**
- Added `case 'rewriteText'` handler in message listener
- Created new `handleRewriteText()` function that:
  - Initializes AI Provider Manager
  - Routes to `manager.rewriteText()` method
  - Returns normalized response

### 3. cloud-ai-provider.js
**Enhanced `rewriteText()` method:**
- Updated to support Rewriter API-compatible options
- Now handles:
  - `sharedContext` - overall context for the rewrite
  - `context` - specific context for this rewrite
  - `tone` - supports 'more-formal', 'more-casual', 'as-is'
  - `length` - supports 'shorter', 'longer', 'as-is'
- Builds intelligent prompts based on options
- Maintains backward compatibility

### 4. builtin-ai-provider.js
**Enhanced `rewriteText()` with fallback:**
- Updated to check Rewriter API availability first
- Uses Chrome's native Rewriter API (`self.Rewriter.create()`) when available
- **Falls back to Prompt API** if Rewriter API is unavailable
- Builds intelligent prompts matching Rewriter API options for fallback
- Supports all Rewriter API options in both modes

## How It Works

### When Built-in AI is Selected:
1. User clicks rephrase button
2. `AIServices.rephrase()` sends `rewriteText` action to background
3. Background routes to `builtin-ai-provider.rewriteText()`
4. **Checks Rewriter API availability:**
   - If available: Uses **Chrome's native Rewriter API** (`self.Rewriter.create()`)
   - If unavailable: Falls back to **Prompt API** with intelligent prompts
5. Returns rephrased text using specialized AI model (or general model as fallback)

### When Cloud AI is Selected:
1. User clicks rephrase button
2. `AIServices.rephrase()` sends `rewriteText` action to background
3. Background routes to `cloud-ai-provider.rewriteText()`
4. Builds intelligent prompt based on options
5. Calls Gemini API with structured prompt
6. Returns rephrased text

## Benefits

1. **Better Quality**: Built-in AI uses specialized Rewriter API when available
2. **Graceful Fallback**: Automatically falls back to Prompt API if Rewriter unavailable
3. **Consistency**: Both providers use the same interface and options
4. **Performance**: Rewriter API is optimized for text rewriting tasks
5. **Offline Support**: Built-in AI works offline once model is downloaded
6. **Future-Proof**: Easy to add more rewrite options (tone, length, format)
7. **Reliability**: Always works even if Rewriter API isn't ready yet

## Rewriter API Features Available

The implementation now supports (can be extended):
- **Tone**: `more-formal`, `more-casual`, `as-is`
- **Length**: `shorter`, `longer`, `as-is`
- **Format**: `plain-text`, `markdown`, `as-is`
- **Context**: Shared context and per-request context

## Testing

To test the changes:
1. Open Chrome DevTools Console
2. Select built-in AI in settings
3. Click rephrase button on any text field
4. Check console logs for "🔄 Background: Processing rewrite using AI Provider Manager"
5. Verify it shows "Built-in AI" as the provider
6. Confirm the text is rephrased correctly

## Notes

- The Rewriter API requires Chrome 137+ with origin trial token
- Model downloads automatically on first use (requires ~22GB storage)
- **Automatic fallback chain:**
  1. Built-in AI Rewriter API (if available)
  2. Built-in AI Prompt API (if Rewriter unavailable)
  3. Cloud AI (if built-in AI completely unavailable)
- Maintains cache for performance
- Fallback is transparent to the user - they always get rephrased text


## Troubleshooting

### "Rewriter API not available" Error (Now Fixed)
**Problem**: The Rewriter API may not be available in all Chrome versions or configurations.

**Solution**: The code now includes automatic fallback:
- First tries Rewriter API
- If unavailable, uses Prompt API with the same options
- User experience is seamless - they don't see any error

### Checking Rewriter API Status
To check if Rewriter API is available in your browser:
1. Open DevTools Console
2. Type: `await ai.rewriter.availability()`
3. Possible responses:
   - `"readily"` - API is ready to use
   - `"after-download"` - API available after model download
   - `"no"` - API not available (fallback will be used)

### Enabling Rewriter API for Testing
If you want to test the native Rewriter API:
1. Update Chrome to version 137+
2. Go to `chrome://flags/#rewriter-api-for-gemini-nano`
3. Set to "Enabled"
4. Restart Chrome
5. Add origin trial token to your extension manifest

Note: Even without the Rewriter API, the rephrase feature will work using the Prompt API fallback.
