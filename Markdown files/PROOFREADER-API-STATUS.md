# Proofreader API Status Investigation

## Summary

The **Proofreader API is a real Chrome API** that exists separately from the LanguageModel (Prompt API). However, there were configuration issues in the code.

## Issues Found

### 1. Sidepanel Dashboard Was Checking Wrong API
**Problem:** The provider status dashboard in `sidepanel.js` was checking `LanguageModel` instead of `Proofreader` for the "Proofreader API" status.

```javascript
// BEFORE (WRONG):
{ name: 'Proofreader', id: 'builtinProofreaderStatus', check: 'LanguageModel' }

// AFTER (FIXED):
{ name: 'Proofreader', id: 'builtinProofreaderStatus', check: 'Proofreader' }
```

**Impact:** The dashboard was showing LanguageModel availability instead of actual Proofreader API availability.

### 2. Missing Proofreader API Parameters
**Problem:** The Proofreader API requires `expectedInputLanguages` parameter when checking availability, but this wasn't being passed.

**Fixed:** Added special handling for Proofreader API:
```javascript
else if (api.check === 'Proofreader') {
  availability = await self.Proofreader.availability({
    expectedInputLanguages: ['en']
  });
}
```

### 3. Grammar Checker Not Using Proofreader API
**Problem:** The grammar checker in `grammar-checker.js` sends a full custom prompt with "ANALYZE THIS TEXT" and "JSON array" keywords, which causes `builtin-ai-provider.js` to route it to the Prompt API instead of the Proofreader API.

**Current Flow:**
```
grammar-checker.js (sends full prompt)
  ↓
background.js → handleGrammarCheck()
  ↓
ai-provider-manager.js → checkGrammar()
  ↓
builtin-ai-provider.js → checkGrammar()
  ↓
Detects "JSON array" keyword → routes to checkGrammarWithPromptAPI()
  ↓
Uses LanguageModel (Prompt API) ❌
```

**What Should Happen:**
```
grammar-checker.js (sends plain text)
  ↓
builtin-ai-provider.js → checkGrammar()
  ↓
No keywords detected → routes to checkGrammarWithProofreader()
  ↓
Uses Proofreader API ✅
```

## Proofreader API Details

### Availability
- **Chrome Version:** 141+ (Origin Trial)
- **Origin Trial:** Running in Chrome 141 to 145
- **Flag:** `chrome://flags/#proofreader-api-for-gemini-nano`

### API Usage
```javascript
// Check availability
const availability = await Proofreader.availability({
  expectedInputLanguages: ['en']
});

// Create session
const proofreader = await Proofreader.create({
  expectedInputLanguages: ['en'],
  monitor(m) {
    m.addEventListener('downloadprogress', (e) => {
      console.log(`Downloaded ${e.loaded * 100}%`);
    });
  }
});

// Proofread text
const result = await proofreader.proofread('I seen him yesterday.');

// Result structure:
// {
//   corrected: "I saw him yesterday.",
//   corrections: [
//     {
//       original: "seen",
//       correction: "saw",
//       type: "grammar",
//       explanation: "Use past tense 'saw' instead of past participle 'seen'"
//     }
//   ]
// }
```

## Testing

### Test Page Created
A new test page `test-proofreader-api.html` has been created to:
1. Check if Proofreader API exists in global scope
2. Check availability status
3. Download model if needed
4. Test proofreading functionality

### How to Test
1. Open `test-proofreader-api.html` in Chrome 141+
2. Enable the flag: `chrome://flags/#proofreader-api-for-gemini-nano`
3. Check if the API is detected
4. If "Downloadable", click "Download Model"
5. Once available, click "Test Proofreader"

## Fixes Applied

### ✅ Fixed: Sidepanel Dashboard
- Changed Proofreader check from `LanguageModel` to `Proofreader`
- Added `expectedInputLanguages` parameter for Proofreader availability check

### ⚠️ Not Fixed Yet: Grammar Checker
The grammar checker still uses Prompt API instead of Proofreader API because it sends a full custom prompt. To fix this, we would need to:

1. Modify `grammar-checker.js` to send plain text instead of a full prompt
2. Let `builtin-ai-provider.js` use the native Proofreader API
3. Parse the Proofreader API's native response format

**Trade-offs:**
- **Current (Prompt API):** More flexible, can customize the prompt, returns JSON format
- **Native (Proofreader API):** More efficient, designed specifically for proofreading, but less customizable

## Recommendation

### Current Situation
The **Proofreader API is NOT available yet** - it's in Origin Trial (experimental phase). You need to:
1. Register for the Origin Trial
2. Get a token
3. Add it to your manifest.json

### What to Do

**Option 1: Keep Using Prompt API (Recommended for Now)**
- ✅ Already working
- ✅ No registration needed
- ✅ Available in Chrome 128+
- ✅ Flexible custom prompts
- ❌ Not specifically designed for grammar checking

**Option 2: Register for Proofreader API Origin Trial**
- ✅ Specifically designed for grammar checking
- ✅ May provide better results
- ❌ Requires registration and token
- ❌ Only available in Chrome 141-145 (Origin Trial)
- ❌ Will expire when trial ends

### My Recommendation
**Stick with the Prompt API for now** because:
1. It's already working well
2. No registration hassle
3. More widely available (Chrome 128+ vs 141+)
4. The Proofreader API is experimental and will change

When the Proofreader API becomes stable (not in Origin Trial), then consider switching.

### How to Get Proofreader API (If You Want It)
See the detailed guide: `HOW-TO-GET-PROOFREADER-API.md`
