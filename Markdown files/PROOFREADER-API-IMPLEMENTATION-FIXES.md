# Proofreader API Implementation Fixes

## Issues Found and Fixed

After reviewing the official Proofreader API documentation, I found several critical implementation errors in `builtin-ai-provider.js`.

---

## ❌ Issue 1: Wrong API Call

**Problem:**
```javascript
// WRONG - was using LanguageModel instead of Proofreader
const proofreader = await self.LanguageModel.create(config);
```

**Fix:**
```javascript
// CORRECT - now using the actual Proofreader API
const proofreader = await self.Proofreader.create(config);
```

**Why it matters:** We were calling the wrong API entirely! This would never use the Proofreader API even if it was available.

---

## ❌ Issue 2: Wrong Configuration Parameters

**Problem:**
```javascript
// WRONG - Proofreader API doesn't use outputLanguage
const config = {
  outputLanguage: 'en',
  monitor: this.monitorDownload('Proofreader')
};
```

**Fix:**
```javascript
// CORRECT - Proofreader API requires expectedInputLanguages
const config = {
  expectedInputLanguages: options.expectedInputLanguages || ['en'],
  monitor: this.monitorDownload('Proofreader')
};
```

**Why it matters:** According to the documentation, Proofreader API requires `expectedInputLanguages` parameter, not `outputLanguage`.

---

## ❌ Issue 3: Missing Availability Check Parameters

**Problem:**
```javascript
// WRONG - Proofreader availability check was missing parameters
availability = await API.availability();
```

**Fix:**
```javascript
// CORRECT - Added special handling for Proofreader
else if (apiName === 'Proofreader') {
  availability = await API.availability({
    expectedInputLanguages: ['en']
  });
}
```

**Why it matters:** The Proofreader API requires `expectedInputLanguages` parameter even for availability checks.

---

## ✅ What Was Already Correct

The result formatting was already correct:
```javascript
formatProofreaderResult(apiResult, originalText) {
  if (!apiResult || !apiResult.corrections) {
    return [];
  }

  return apiResult.corrections.map(correction => ({
    error: originalText.substring(correction.startIndex, correction.endIndex),
    correction: correction.correction,
    type: correction.type || 'grammar',
    message: correction.explanation || 'Suggested correction',
    startIndex: correction.startIndex,
    endIndex: correction.endIndex
  }));
}
```

This matches the official API response format:
```javascript
{
  corrected: "fully corrected text",
  corrections: [
    {
      startIndex: 0,
      endIndex: 4,
      correction: "corrected text",
      type: "grammar" | "spelling" | "punctuation",
      explanation: "why this correction is needed"
    }
  ]
}
```

---

## Summary of Changes

### File: `builtin-ai-provider.js`

1. **Line ~408**: Changed `self.LanguageModel.create()` to `self.Proofreader.create()`
2. **Line ~405**: Changed `outputLanguage: 'en'` to `expectedInputLanguages: ['en']`
3. **Line ~105**: Added special case for Proofreader availability check with `expectedInputLanguages` parameter

---

## Testing

Now that the implementation is correct, you can test it:

1. **Enable the Chrome flag:**
   - `chrome://flags/#proofreader-api-for-gemini-nano` → Enabled
   - Restart Chrome

2. **Reload your extension:**
   - `chrome://extensions/` → Reload Mentelo

3. **Test with the test page:**
   - Open `test-proofreader-api.html`
   - Should now correctly detect and use the Proofreader API

4. **Check the dashboard:**
   - Open side panel → Provider Status
   - Proofreader API should show correct status

---

## Important Notes

### Current Behavior

Your grammar checker **still uses Prompt API by default** because:
- `grammar-checker.js` sends a full prompt with "ANALYZE THIS TEXT" keywords
- `builtin-ai-provider.js` detects this and routes to Prompt API
- This is actually good! Prompt API is more stable and widely available

### When Proofreader API Will Be Used

The Proofreader API will only be used if:
1. You send **plain text** (not a full prompt) to `checkGrammar()`
2. The text doesn't contain "JSON array" or "ANALYZE THIS TEXT" keywords
3. The Proofreader API is available (Chrome 141+, flag enabled, token added)

### Recommendation

**Keep the current setup** where grammar checking uses Prompt API. The Proofreader API is now correctly implemented and available as an option, but the Prompt API is:
- ✅ More stable (not in Origin Trial)
- ✅ More widely available (Chrome 128+ vs 141+)
- ✅ More flexible (custom prompts)
- ✅ Won't expire in May 2026

---

## What's Next?

The implementation is now **correct and ready to use**. If you want to switch the grammar checker to use the native Proofreader API:

1. Modify `grammar-checker.js` to send plain text instead of a full prompt
2. The system will automatically use Proofreader API when available
3. It will fall back to Prompt API if Proofreader is unavailable

But I recommend waiting until Proofreader API is stable (not in Origin Trial) before switching.
