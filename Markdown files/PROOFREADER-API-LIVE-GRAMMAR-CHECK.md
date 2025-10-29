# Using Proofreader API for Live Grammar Check

## ✅ What I Changed

I've updated your extension to automatically use the Proofreader API for live grammar checking when available, with automatic fallback to Prompt API.

---

## Changes Made

### 1. `grammar-checker.js` - Simplified to Send Plain Text

**Before:**
```javascript
// Sent a full custom prompt with instructions
const prompt = `You are an expert grammar checker...`;
chrome.runtime.sendMessage({
  action: 'grammarCheck',
  prompt: prompt  // Full prompt
});
```

**After:**
```javascript
// Sends plain text only
chrome.runtime.sendMessage({
  action: 'grammarCheck',
  text: text  // Just the text to check
});
```

**Why:** Sending plain text allows the backend to choose the best API (Proofreader or Prompt).

---

### 2. `builtin-ai-provider.js` - Smart API Selection

**New Logic:**
```javascript
async checkGrammar(textOrPrompt, options = {}) {
  // 1. Try Proofreader API first (if available)
  if (proofreaderAvailable) {
    return await checkGrammarWithProofreader(text);
  }
  
  // 2. Fallback to Prompt API
  return await checkGrammarWithPromptAPI(generatedPrompt);
}
```

**Features:**
- ✅ Automatically tries Proofreader API first
- ✅ Falls back to Prompt API if Proofreader fails
- ✅ Generates appropriate prompt for Prompt API
- ✅ Caches results for performance

---

## How It Works Now

### Flow Diagram

```
User types in text field
         ↓
grammar-checker.js detects text
         ↓
Sends plain text to background.js
         ↓
background.js → AI Provider Manager
         ↓
builtin-ai-provider.js checks:
         ↓
    Is Proofreader API available?
         ↓
    YES → Use Proofreader API ✨
         ↓
    NO → Use Prompt API 🔤
         ↓
Returns error array
         ↓
grammar-checker.js displays underlines
```

---

## API Priority

### When Proofreader API is Used:
1. ✅ Chrome 141+ with flag enabled
2. ✅ Origin trial token added to manifest
3. ✅ Gemini Nano model downloaded
4. ✅ Plain text sent (not a custom prompt)

### When Prompt API is Used:
1. ✅ Proofreader API not available
2. ✅ Proofreader API fails
3. ✅ Chrome 128+ (more widely available)
4. ✅ Automatic fallback

---

## Testing

### Step 1: Enable Proofreader API
```bash
1. chrome://flags/#proofreader-api-for-gemini-nano → Enabled
2. Restart Chrome
3. chrome://extensions/ → Reload Mentelo
```

### Step 2: Test Live Grammar Check
1. Go to any website with a text field
2. Type text with errors: "I seen him yesterday"
3. Watch for red underlines
4. Hover to see corrections

### Step 3: Check Which API is Being Used
Open DevTools Console and look for:
- `✨ Using Proofreader API for grammar check` ← Proofreader API
- `🔤 Using Prompt API for grammar check` ← Prompt API (fallback)

---

## Response Format

Both APIs now return the same format:

```javascript
[
  {
    error: "seen",           // The wrong text
    correction: "saw",       // The correct text
    type: "grammar",         // Type: grammar, spelling, or punctuation
    message: "Use past tense 'saw'",  // Explanation
    startIndex: 2,          // Position in text (optional)
    endIndex: 6             // End position (optional)
  }
]
```

---

## Advantages of This Approach

### Proofreader API (When Available):
- ✅ **Faster** - Optimized specifically for grammar checking
- ✅ **More accurate** - Trained specifically for proofreading
- ✅ **Native format** - Returns structured corrections
- ✅ **Better explanations** - Provides detailed error explanations

### Prompt API (Fallback):
- ✅ **More available** - Works in Chrome 128+
- ✅ **More stable** - Not in Origin Trial
- ✅ **Flexible** - Can customize prompts
- ✅ **Reliable** - Won't expire in May 2026

---

## Configuration

### To Force Prompt API Only:
If you want to disable Proofreader API and only use Prompt API:

```javascript
// In builtin-ai-provider.js, change:
if (proofreaderStatus && proofreaderStatus.availability !== 'unavailable') {
  // to:
if (false) {  // Always skip Proofreader API
```

### To Customize Prompt API Behavior:
Edit the `generateGrammarCheckPrompt()` method in `builtin-ai-provider.js`:

```javascript
generateGrammarCheckPrompt(text) {
  return `Your custom prompt here: ${text}`;
}
```

---

## Troubleshooting

### "Proofreader API not available"
**Solutions:**
1. Check Chrome version (need 141+)
2. Enable flag: `chrome://flags/#proofreader-api-for-gemini-nano`
3. Verify token in manifest.json
4. Reload extension

### "Grammar check not working at all"
**Solutions:**
1. Check if Gemini Nano is downloaded: `chrome://on-device-internals`
2. Check console for errors
3. Verify built-in AI is selected in settings
4. Try reloading the page

### "Using Prompt API instead of Proofreader"
**This is normal if:**
- Chrome version < 141
- Flag not enabled
- Token not added
- Model not downloaded

**The extension will work fine with Prompt API!**

---

## Performance Comparison

| Feature | Proofreader API | Prompt API |
|---------|----------------|------------|
| **Speed** | ⚡ Very Fast | ⚡ Fast |
| **Accuracy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Availability** | Chrome 141+ | Chrome 128+ |
| **Stability** | ⚠️ Experimental | ✅ Stable |
| **Expires** | May 2026 | Never |

---

## Summary

Your live grammar checker now:
1. ✅ **Automatically uses Proofreader API** when available
2. ✅ **Falls back to Prompt API** if needed
3. ✅ **Works seamlessly** - no user action required
4. ✅ **Provides better results** with Proofreader API
5. ✅ **Always works** with Prompt API fallback

The best part? **Users don't need to do anything** - the extension automatically chooses the best API based on what's available! 🎉
