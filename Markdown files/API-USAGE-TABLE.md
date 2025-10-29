# API Usage Table - Complete List

This document provides a comprehensive breakdown of all API keys, models, and features used in the MindlyAI extension.

## API Key Sources

### 1. Google AI Studio (https://ai.studio.google.com/app/apikey)
- **API Key**: Gemini Developer API Key
- **Used For**: All Cloud AI features
- **Storage**: `geminiApiKey` in Chrome storage
- **Status**: SAME as Gemini Developer API key

---

## Complete Feature to API Mapping

| # | Feature | AI Provider | API/Model Used | API Key Required | Implementation Files | Notes |
|---|---------|-------------|----------------|------------------|---------------------|-------|
| 1 | **Grammar Check** | Built-in AI | Chrome Proofreader API + Prompt API (fallback) | ❌ No | `builtin-ai-provider.js`, `grammar-checker.js` | Uses `self.Proofreader` API |
| 1b | **Grammar Check** | Cloud AI | `gemini-2.5-flash-lite-preview-09-2025` | ✅ Yes | `cloud-ai-provider.js`, `grammar-checker.js` | Text-only prompt |
| 2 | **Translation** | Built-in AI | Chrome Translator API | ❌ No | `builtin-ai-provider.js` | Uses `self.Translator` API |
| 2b | **Translation** | Cloud AI | `gemini-2.5-flash-lite-preview-09-2025` | ✅ Yes | `cloud-ai-provider.js` | Text-only prompt |
| 3 | **Summarization** | Built-in AI | Chrome Summarizer API | ❌ No | `builtin-ai-provider.js` | Uses `self.Summarizer` API |
| 3b | **Summarization** | Cloud AI | `gemini-2.5-flash-lite-preview-09-2025` | ✅ Yes | `cloud-ai-provider.js` | Text-only prompt |
| 4 | **Text Rewriting** | Built-in AI | Chrome Rewriter API + Prompt API (fallback) | ❌ No | `builtin-ai-provider.js`, `textfield-assistant.js` | Uses `self.Rewriter` API |
| 4b | **Text Rewriting** | Cloud AI | `gemini-2.5-flash-lite-preview-09-2025` | ✅ Yes | `cloud-ai-provider.js`, `textfield-assistant.js` | Text-only prompt |
| 5 | **Content Generation** | Built-in AI | Chrome Prompt API (LanguageModel) | ❌ No | `builtin-ai-provider.js` | Uses `self.LanguageModel` API |
| 5b | **Content Generation** | Cloud AI | `gemini-2.5-flash-lite-preview-09-2025` | ✅ Yes | `cloud-ai-provider.js`, `sidepanel.js` | Text-only prompt |
| 6 | **Chat with Page** | Both | Prompt API (Built-in) / Gemini API (Cloud) | Cloud only | `sidepanel.js` | Conversational context |
| 7 | **YouTube Summary** | Both | Summarizer API (Built-in) / Gemini API (Cloud) | Cloud only | `youtube-summary.js` | Transcript analysis |
| 8 | **Text Field Assistant** | Both | Multiple APIs (Proofreader, Rewriter, Prompt) | Cloud only | `textfield-assistant.js` | In-field text editing |
| 9 | **Page Translation** | Both | Translator API (Built-in) / Gemini API (Cloud) | Cloud only | `content.js`, `sidepanel.js` | Full page translation |
| 10 | **Page Summarization** | Both | Summarizer API (Built-in) / Gemini API (Cloud) | Cloud only | `content.js`, `sidepanel.js` | Page content summary |
| 11 | **Image Text Extraction (OCR)** | Cloud AI | `gemini-2.0-flash` | ✅ Yes | `cloud-ai-provider.js`, `sidepanel.js` | Multimodal vision API |
| 12 | **Image Explanation** | Cloud AI | `gemini-2.0-flash` | ✅ Yes | `cloud-ai-provider.js`, `sidepanel.js` | Multimodal vision API |
| 13 | **PDF Chat (Text-based PDFs)** | Built-in AI | Prompt API + Text extraction | ❌ No | `pdf-content.js`, `sidepanel.js` | Extracts actual text |
| 13b | **PDF Chat (Image-based PDFs)** | Cloud AI | `gemini-2.0-flash` + OCR | ✅ Yes | `pdf-content.js`, `sidepanel.js` | Screenshot OCR |
| 14 | **Call Mindy (Voice Assistant)** | Cloud AI | `gemini-2.5-flash-native-audio-preview-09-2025` | ✅ Yes | `gemini-live-connection.js` | WebSocket streaming |
| 15 | **Text-to-Speech (TTS)** | Cloud AI | Gemini TTS API | ✅ Yes | `sidepanel.js` | Audio generation |
| 16 | **Organize Bookmarks** | Both | Prompt API (Built-in) / Gemini API (Cloud) | Cloud only | `sidepanel.js` | Content analysis |

---

## Model Details

### Built-in AI Models (Chrome APIs)
These run locally in the browser without API keys:
- **Proofreader API**: `self.Proofreader` - Grammar and spelling
- **Translator API**: `self.Translator` - Text translation
- **Summarizer API**: `self.Summarizer` - Content summarization
- **Rewriter API**: `self.Rewriter` - Text rewriting
- **Prompt API**: `self.LanguageModel` - General content generation
- **Writer API**: `self.Writer` - Content creation (not yet widely available)

### Cloud AI Models (Gemini API)
These require an API key from Google AI Studio:

#### 1. `gemini-2.5-flash-lite-preview-09-2025`
- **Used For**: General text tasks (grammar, translation, summarization, rewriting, generation)
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent`
- **Features**: Text-only, fast responses
- **Files**: `cloud-ai-provider.js` (line 167), `sidepanel.js` (line 1126)

#### 2. `gemini-2.0-flash`
- **Used For**: Multimodal vision tasks (OCR, image analysis)
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Features**: Image + text input, OCR, image understanding
- **Files**: `cloud-ai-provider.js` (line 260)

#### 3. `gemini-2.5-flash-native-audio-preview-09-2025`
- **Used For**: Voice assistant (Call Mindy)
- **Connection**: WebSocket to Gemini Live API
- **Features**: Real-time audio streaming, bidirectional communication
- **Files**: `gemini-live-connection.js` (line 11)

---

## API Configuration by Feature Type

### Text-Only Features
```javascript
// Model: gemini-2.5-flash-lite-preview-09-2025
// Endpoint: /v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent
Features:
- Grammar checking
- Translation
- Summarization
- Text rewriting
- Content generation
- Chat with page
- YouTube summary
- Text field assistant
- Page translation
- Page summarization
- Organize bookmarks
```

### Multimodal (Image) Features
```javascript
// Model: gemini-2.0-flash
// Endpoint: /v1beta/models/gemini-2.0-flash:generateContent
Features:
- Image text extraction (OCR)
- Image explanation
- PDF OCR (for image-based PDFs)
```

### Real-time Audio Features
```javascript
// Model: gemini-2.5-flash-native-audio-preview-09-2025
// Connection: WebSocket
Features:
- Call Mindy (voice assistant)
```

---

## Feature Availability Matrix

| Feature | Built-in AI | Cloud AI | Notes |
|---------|-------------|----------|-------|
| Grammar Check | ✅ Yes | ✅ Yes | Built-in uses Proofreader API |
| Translation | ✅ Yes | ✅ Yes | Built-in uses Translator API |
| Summarization | ✅ Yes | ✅ Yes | Built-in uses Summarizer API |
| Text Rewriting | ✅ Yes | ✅ Yes | Built-in uses Rewriter API |
| Content Generation | ✅ Yes | ✅ Yes | Built-in uses Prompt API |
| Chat with Page | ✅ Yes | ✅ Yes | Same functionality |
| YouTube Summary | ✅ Yes | ✅ Yes | Same functionality |
| Text Field Assistant | ✅ Yes | ✅ Yes | All buttons work |
| Page Translation | ✅ Yes | ✅ Yes | Same functionality |
| Page Summarization | ✅ Yes | ✅ Yes | Same functionality |
| Organize Bookmarks | ✅ Yes | ✅ Yes | Same functionality |
| PDF Chat (text PDFs) | ✅ Yes | ✅ Yes | Uses strokes/text extraction |
| PDF Chat (image PDFs) | ❌ No | ✅ Yes | Requires OCR |
| Image Text Extraction | ❌ No | ✅ Yes | Requires vision API |
| Image Explanation | ❌ No | ✅ Yes | Requires vision API |
| Call Mindy (Voice) | ❌ No | ✅ Yes | Requires audio streaming |
| Text-to-Speech | ❌ No | ✅ Yes | Requires TTS API |

---

## API Endpoint Summary

### Cloud AI Endpoints

#### 1. Text Generation (Most Features)
```
URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent
Method: POST
Headers: { 'Content-Type': 'application/json' }
Body: {
  contents: [{ parts: [{ text: "<prompt>" }] }],
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048
  }
}
Query Param: ?key=<GEMINI_API_KEY>
```

#### 2. Vision (Image Analysis)
```
URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
Method: POST
Headers: { 'Content-Type': 'application/json' }
Body: {
  contents: [{
    parts: [
      { text: "<prompt>" },
      {
        inlineData: {
          mimeType: "image/png",
          data: "<base64_image_data>"
        }
      }
    ]
  }],
  generationConfig: {
    temperature: 0.2,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192
  }
}
Query Param: ?key=<GEMINI_API_KEY>
```

#### 3. Voice Assistant (Call Mindy)
```
URL: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent
Protocol: WebSocket
Headers: {
  "x-goog-api-key": <GEMINI_API_KEY>
}
Setup Message: {
  setup: {
    model: "models/gemini-2.5-flash-native-audio-preview-09-2025",
    generation_config: {
      response_modalities: ["AUDIO"],
      temperature: 0.7
    },
    system_instruction: { parts: [{ text: "<system_prompt>" }] }
  }
}
```

---

## Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `geminiApiKey` | String | Gemini Developer API key from Google AI Studio |
| `preferredProvider` | String | Either "builtin" or "cloud" |
| `aiProviderSettings` | Object | Complete provider settings and preferences |

---

## Provider Selection Logic

```
1. Check preferred provider setting
2. If Built-in AI selected:
   - Use Chrome APIs (no key required)
   - Fallback to Cloud AI if Built-in fails (requires key)
3. If Cloud AI selected:
   - Requires geminiApiKey
   - Fallback to Built-in AI if no key
4. Auto-fallback enabled by default
```

---

## Cost Implications

### Built-in AI
- ✅ **FREE** - No API costs
- ✅ **No Rate Limits** - Within browser
- ✅ **Privacy** - Runs locally
- ❌ **Limited Features** - No image/audio support yet

### Cloud AI
- 💰 **Free Tier**: 15 requests/minute
- 💰 **Pricing**: See Google AI Studio pricing
- ⚠️ **Rate Limits**: Standard API limits apply
- ✅ **Full Features** - All capabilities available

---

## Summary

**API Key Required**: Only for Cloud AI features
**API Key Source**: Google AI Studio (https://ai.studio.google.com/app/apikey) - this is the SAME as Gemini Developer API key
**Built-in AI**: Completely free, runs in browser, uses Chrome APIs
**Cloud AI**: Requires API key, uses Google's Gemini API servers
**Hybrid Approach**: Extension automatically uses Built-in AI when possible, Cloud AI when needed or preferred
