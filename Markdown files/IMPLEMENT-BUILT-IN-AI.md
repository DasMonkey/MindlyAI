# 🚀 How to Implement Chrome Built-in AI APIs in Your Extension

Based on official Chrome documentation from [developer.chrome.com](https://developer.chrome.com/docs/ai/built-in)

---

## 📋 Overview

Your extension currently uses Gemini Cloud API. Here's how to integrate Chrome's Built-in AI APIs for client-side processing.

---

## ✅ Step 1: Update manifest.json

Add permissions for Built-in AI APIs:

```json
{
  "manifest_version": 3,
  "name": "Mentelo",
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "contextMenus",
    "sidePanel",
    "clipboardRead",
    "clipboardWrite"
  ],
  "optional_permissions": [
    "proofreader.api",
    "translator.api",
    "summarizer.api",
    "rewriter.api",
    "writer.api",
    "prompt.api"
  ]
}
```

**Note:** These are "optional_permissions" because they may not be available in all Chrome versions.

---

## 🔧 Step 2: Create Built-in AI Wrapper

Create a new file `builtin-ai-helper.js`:

```javascript
// builtin-ai-helper.js
// Wrapper for Chrome Built-in AI APIs

class BuiltInAI {
  constructor() {
    this.isAvailable = this.checkAvailability();
  }

  async checkAvailability() {
    // Check if any Built-in AI API is available
    return typeof Summarizer !== 'undefined' ||
           typeof Translator !== 'undefined' ||
           typeof Proofreader !== 'undefined' ||
           typeof Rewriter !== 'undefined';
  }

  // ==================== PROOFREADER API ====================
  
  async checkGrammar(text) {
    if (typeof Proofreader === 'undefined') {
      console.log('Proofreader API not available, using fallback');
      return null;
    }

    try {
      // Check availability
      const availability = await Proofreader.availability();
      if (availability === 'unavailable') {
        return null;
      }

      // Create proofreader instance
      const proofreader = await Proofreader.create({
        expectedInputLanguages: ["en"],
        monitor(m) {
          m.addEventListener("downloadprogress", e => {
            console.log(`Model download: ${e.loaded * 100}%`);
          });
        }
      });

      // Proofread the text
      const result = await proofreader.proofread(text);
      
      // Convert to your expected format
      const errors = result.corrections.map(correction => ({
        error: text.substring(correction.startIndex, correction.endIndex),
        correction: correction.correction,
        type: correction.type,
        message: correction.explanation || 'No explanation available'
      }));

      return errors;
    } catch (error) {
      console.error('Proofreader API error:', error);
      return null;
    }
  }

  // ==================== TRANSLATOR API ====================
  
  async translateText(text, targetLang = 'es', sourceLang = 'en') {
    if (typeof Translator === 'undefined') {
      console.log('Translator API not available, using fallback');
      return null;
    }

    try {
      // Create translator instance
      const translator = await Translator.create({
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        monitor(m) {
          m.addEventListener("downloadprogress", e => {
            console.log(`Language pack download: ${e.loaded * 100}%`);
          });
        }
      });

      // Translate
      const translation = await translator.translate(text);
      
      return translation;
    } catch (error) {
      console.error('Translator API error:', error);
      return null;
    }
  }

  // ==================== SUMMARIZER API ====================
  
  async summarizeContent(content, options = {}) {
    if (typeof Summarizer === 'undefined') {
      console.log('Summarizer API not available, using fallback');
      return null;
    }

    try {
      const availability = await Summarizer.availability();
      if (availability === 'unavailable') {
        return null;
      }

      const config = {
        type: options.type || 'key-points',
        length: options.length || 'medium',
        format: options.format || 'plain-text',
        ...options
      };

      const summarizer = await Summarizer.create(config);
      
      // Check if streaming is requested
      if (options.streaming) {
        const stream = summarizer.summarizeStreaming(content, {
          context: options.context
        });
        
        let fullSummary = '';
        for await (const chunk of stream) {
          fullSummary += chunk;
          // Call progress callback if provided
          if (options.onProgress) {
            options.onProgress(fullSummary);
          }
        }
        return fullSummary;
      } else {
        // Batch summarization
        const summary = await summarizer.summarize(content, {
          context: options.context
        });
        return summary;
      }
    } catch (error) {
      console.error('Summarizer API error:', error);
      return null;
    }
  }

  // ==================== REWRITER API ====================
  
  async rephraseText(text, options = {}) {
    if (typeof Rewriter === 'undefined') {
      console.log('Rewriter API not available, using fallback');
      return null;
    }

    try {
      const availability = await Rewriter.availability();
      if (availability === 'unavailable') {
        return null;
      }

      const config = {
        tone: options.tone || 'more-formal',
        ...options
      };

      const rewriter = await Rewriter.create(config);
      
      if (options.streaming) {
        const stream = rewriter.rewriteStreaming(text, {
          context: options.context,
          tone: options.tone
        });
        
        let fullText = '';
        for await (const chunk of stream) {
          fullText += chunk;
          if (options.onProgress) {
            options.onProgress(fullText);
          }
        }
        return fullText;
      } else {
        const result = await rewriter.rewrite(text, {
          context: options.context,
          tone: options.tone
        });
        return result;
      }
    } catch (error) {
      console.error('Rewriter API error:', error);
      return null;
    }
  }

  // ==================== WRITER API ====================
  
  async generateContent(prompt, options = {}) {
    if (typeof Writer === 'undefined') {
      console.log('Writer API not available, using fallback');
      return logo
    }

    try {
      const availability = await Writer.availability();
      if (availability === 'unavailable') {
        return null;
      }

      const writer = await Writer.create(options);
      const content = await writer.write(prompt);
      
      return content;
    } catch (error) {
      console.error('Writer API error:', error);
      return null;
    }
  }
}

// Export for use in extension
const builtInAI = new BuiltInAI();
```

---

## 🔄 Step 3: Update grammar-checker.js

Modify your grammar checker to use Built-in AI first, then fallback to Gemini:

```javascript
// In grammar-checker.js

async checkText(text) {
  const cacheKey = text.trim().toLowerCase();
  
  // Check cache first
  if (this.checkCache.has(cacheKey)) {
    return this.checkCache.get(cacheKey);
  }

  // Try Built-in AI first
  if (builtInAI && builtInAI.isAvailable) {
    const builtInResult = await builtInAI.checkGrammar(text);
    if (builtInResult) {
      this.checkCache.set(cacheKey, builtInResult);
      return builtInResult;
    }
  }

  // Fallback to Gemini API
  return await this.checkWithGemini(text);
}

async checkWithGemini(text) {
  // Your existing Gemini API code
  const prompt = `...`;
  const response = await chrome.runtime.sendMessage({
    action: 'grammarCheck',
    prompt: prompt
  });
  
  // Process and return errors...
  return errors;
}
```

---

## 🌐 Step 4: Update Translation in sidepanel.js

Modify translation to use Built-in AI:

```javascript
// In sidepanel.js

async function translateText(text, targetLang) {
  // Try Built-in AI first
  if (builtInAI && builtInAI.isAvailable) {
    const result = await builtInAI.translateText(text, targetLang);
    if (result) {
      return result;
    }
  }

  // Fallback to Gemini API
  return await translateWithGemini(text, targetLang);
}
```

---

## 📄 Step 5: Update Summarization

Modify page summarization:

```javascript
// In content.js or sidepanel.js

async function summarizePage() {
  const pageContent = document.body.innerText;

  // Try Built-in AI first
  if (builtInAI && builtInAI.isAvailable) {
    const summary = await builtInAI.summarizeContent(pageContent, {
      type: 'key-points',
      length: 'medium',
      onProgress: (partialSummary) => {
        // Update UI with partial summary
        updateSummaryDisplay(partialSummary);
      }
    });
    
    if (summary) {
      return summary;
    }
  }

  // Fallback to Gemini API
  return await summarizeWithGemini(pageContent);
}
```

---

## ✏️ Step 6: Update Text Field Assistant

Modify the text field rewriter:

```javascript
// In textfield-assistant.js

async function applyRewrite(text, tone) {
  // Try Built-in AI first
  if (builtInAI && builtInAI.isAvailable) {
    const result = await builtInAI.rephraseText(text, {
      tone: tone, // 'more-formal', 'more-casual', 'shorter', etc.
      streaming: true,
      onProgress: (partialResult) => {
        // Update field with partial result
        updateTextField(partialResult);
      }
    });
    
    if (result) {
      return result;
    }
  }

  // Fallback to Gemini API
  return await rewriteWithGemini(text, tone);
}
```

---

## 📝 Step 7: Include Built-in AI Helper in Manifest

Update `manifest.json` content scripts:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": [
        "builtin-ai-helper.js",
        "content.js", 
        "textfield-assistant.js", 
        "grammar-checker.js",
        "youtube-summary.js"
      ]
    }
  ]
}
```

---

## 🎯 Step 8: Add Feature Detection

Create a fallback system that gracefully handles when APIs aren't available:

```javascript
// Feature detection
if (typeof Proofreader !== 'undefined') {
  console.log('✅ Proofreader API available');
} else {
  console.log('⚠️ Proofreader API not available, using Gemini API');
}

if (typeof Translator !== 'undefined') {
  console.log('✅ Translator API available');
} else {
  console.log('⚠️ Translator API not available, using Gemini API');
}

if (typeof Summarizer !== 'undefined') {
  console.log('✅ Summarizer API available');
} else {
  console.log('⚠️ Summarizer API not available, using Gemini API');
}
```

---

## 📊 Step 9: Update UI to Show AI Source

Show users whether they're using Built-in AI or Gemini:

```javascript
function displayAIStatus() {
  const status = {
    proofreader: typeof Proofreader !== 'undefined' ? 'Built-in AI' : 'Gemini API',
    translator: typeof Translator !== 'undefined' ? 'Built-in AI' : 'Gemini API',
    summarizer: typeof Summarizer !== 'undefined' ? 'Built-in AI' : 'Gemini API'
  };

  console.log('AI Sources:', status);
  
  // Update UI badge
  if (Object.values(status).some(s => s === 'Built-in AI')) {
    updateBadge('Client-side AI active', '#4CAF50');
  }
}
```

---

## ✅ Benefits of This Approach

1. **Privacy First** - Uses Built-in AI when available
2. **Graceful Fallback** - Works even if APIs aren't available
3. **Best of Both Worlds** - Client-side + cloud features
4. **Future Proof** - Ready for full Built-in AI migration
5. **Backward Compatible** - Works with current Chrome versions

---

## 🧪 Testing

1. Open your extension in Chrome
2. Check console for AI availability
3. Test each feature:
   - Grammar checking
   - Translation
   - Summarization
   - Text rewriting

---

## 📚 API Reference

### Proofreader API
```javascript
const proofreader = await Proofreader.create({
  expectedInputLanguages: ["en"]
});
const result = await proofreader.proofread("Text to check");
```

### Translator API
```javascript
const translator = await Translator.create({
  sourceLanguage: 'en',
  targetLanguage: 'es'
});
const translation = await translator.translate("Hello");
```

### Summarizer API
```javascript
const summarizer = await Summarizer.create({
  type: 'key-points',
  length: 'medium'
});
const summary = await summarizer.summarize(longText);
```

### Rewriter API
```javascript
const rewriter = await Rewriter.create({
  tone: 'more-formal'
});
const result = await rewriter.rewrite(text);
```

---

**Need help with implementation? Ask me to implement any specific feature!** 🚀

