# Design Document

## Overview

This design document outlines the architecture and implementation strategy for implementing a hybrid AI provider system in the Mentelo Chrome Extension. The system supports both Chrome's Built-in AI APIs (Gemini Nano) and Google Cloud Gemini API, with Built-in AI as the primary provider and Cloud API as a fallback. This approach ensures compliance with the Google Chrome Built-in AI Challenge 2025 requirements while maintaining functionality when Built-in AI is unavailable.

### Design Goals

1. **Built-in AI First**: Default to Chrome's Built-in AI APIs for client-side processing
2. **User Choice**: Allow users to select their preferred AI provider via settings
3. **Automatic Fallback**: Seamlessly fall back to Cloud API when Built-in AI is unavailable
4. **Feature Parity**: Maintain all existing extension features with both providers
5. **Unified Interface**: Abstract provider differences behind a common API
6. **User Experience**: Seamless experience regardless of provider with clear status indicators
7. **Error Resilience**: Graceful handling of errors from both providers
8. **Performance**: Efficient caching and resource management for both providers

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Chrome Browser                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Gemini Nano (Local Model)                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                            ▲                                         │
│                            │ Built-in AI APIs                        │
│  ┌─────────────────────────┴───────────────────────────────────┐    │
│  │          Mentelo Extension - Hybrid Architecture            │    │
│  │                                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │    │
│  │  │   Content    │  │   Service    │  │  Side Panel      │  │    │
│  │  │   Scripts    │◄─┤    Worker    ├─►│  + Settings      │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │    │
│  │         │                  │                    │            │    │
│  │         └──────────────────┴────────────────────┘            │    │
│  │                            │                                 │    │
│  │                  ┌─────────▼──────────┐                     │    │
│  │                  │  AI Provider       │                     │    │
│  │                  │  Abstraction Layer │                     │    │
│  │                  └─────────┬──────────┘                     │    │
│  │                            │                                 │    │
│  │         ┌──────────────────┴──────────────────┐             │    │
│  │         │                                      │             │    │
│  │  ┌──────▼────────┐                   ┌────────▼─────────┐   │    │
│  │  │  Built-in AI  │                   │   Cloud API      │   │    │
│  │  │  Provider     │                   │   Provider       │   │    │
│  │  └───────────────┘                   └──────────────────┘   │    │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────┐
                                    │  Google Cloud Gemini API  │
                                    └───────────────────────────┘
```

### Component Architecture


```
┌─────────────────────────────────────────────────────────────────┐
│              AI Provider Abstraction Layer                      │
│         (ai-provider-manager.js - Central routing)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │   Provider   │  │   Settings   │  │   Fallback       │     │
│  │   Selector   │  │   Manager    │  │   Controller     │     │
│  └──────────────┘  └──────────────┘  └──────────────────┘     │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │   Response   │  │    Cache     │  │    Error         │     │
│  │  Normalizer  │  │   Manager    │  │   Handler        │     │
│  └──────────────┘  └──────────────┘  └──────────────────┘     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    Provider Implementations                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────┐  ┌──────────────────────┐   │
│  │   Built-in AI Provider        │  │  Cloud API Provider  │   │
│  │  (builtin-ai-provider.js)     │  │ (cloud-ai-provider.js│   │
│  ├───────────────────────────────┤  ├──────────────────────┤   │
│  │                               │  │                      │   │
│  │ ┌──────────┐  ┌──────────┐   │  │ ┌────────────────┐  │   │
│  │ │Feature   │  │Download  │   │  │ │  API Key       │  │   │
│  │ │Detection │  │Monitor   │   │  │ │  Manager       │  │   │
│  │ └──────────┘  └──────────┘   │  │ └────────────────┘  │   │
│  │                               │  │                      │   │
│  │ ┌──────────────────────────┐ │  │ ┌────────────────┐  │   │
│  │ │  API Wrappers:           │ │  │ │  Fetch Utils   │  │   │
│  │ │  - Proofreader           │ │  │ │  - Grammar     │  │   │
│  │ │  - Translator            │ │  │ │  - Translation │  │   │
│  │ │  - Summarizer            │ │  │ │  - Summary     │  │   │
│  │ │  - Rewriter              │ │  │ │  - Rewrite     │  │   │
│  │ │  - Writer                │ │  │ │  - Generate    │  │   │
│  │ │  - Prompt                │ │  │ │  - Chat        │  │   │
│  │ └──────────────────────────┘ │  │ └────────────────┘  │   │
│  └───────────────────────────────┘  └──────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. AI Provider Manager (ai-provider-manager.js)

Central module that coordinates all AI operations and routes requests to the appropriate provider.

**Responsibilities:**
- Provider selection and switching
- Settings management (user preferences)
- Automatic fallback when Built-in AI unavailable
- Response normalization from both providers
- Unified caching across providers
- Error handling and user feedback

**Public Interface:**

```javascript
class AIProviderManager {
  // Initialization
  async initialize()
  
  // Provider Management
  async setProvider(providerName) // 'builtin' or 'cloud'
  getActiveProvider()
  async getProviderStatus()
  
  // Settings
  async loadSettings()
  async saveSettings(settings)
  getSettings()
  
  // Grammar & Spelling
  async checkGrammar(text, options)
  
  // Translation
  async translateText(text, sourceLang, targetLang, options)
  
  // Summarization
  async summarizeContent(content, options)
  async summarizeContentStreaming(content, options, onChunk)
  
  // Rewriting
  async rewriteText(text, options)
  async rewriteTextStreaming(text, options, onChunk)
  
  // Content Generation
  async generateContent(prompt, options)
  async generateContentStreaming(prompt, options, onChunk)
  
  // Advanced Prompting
  async createPromptSession(options)
  async prompt(session, input, options)
  async promptStreaming(session, input, options, onChunk)
  
  // Utility
  getAPIStatus()
  clearCache()
  cleanup()
}
```

### 2. Built-in AI Provider (builtin-ai-provider.js)

Implements the provider interface for Chrome's Built-in AI APIs.

**Responsibilities:**
- Feature detection for all Built-in AI APIs
- Availability checking and status management
- Session lifecycle management
- Download progress monitoring
- Built-in AI specific error handling

**Public Interface:**

```javascript
class BuiltInAIProvider {
  constructor()
  
  // Provider Interface
  async initialize()
  isAvailable()
  getName()
  
  // Feature Detection
  isAPISupported(apiName)
  async checkAvailability(apiName)
  
  // Grammar & Spelling
  async checkGrammar(text, options)
  
  // Translation
  async translateText(text, sourceLang, targetLang, options)
  
  // Summarization
  async summarizeContent(content, options)
  async summarizeContentStreaming(content, options, onChunk)
  
  // Rewriting
  async rewriteText(text, options)
  async rewriteTextStreaming(text, options, onChunk)
  
  // Content Generation
  async generateContent(prompt, options)
  async generateContentStreaming(prompt, options, onChunk)
  
  // Advanced Prompting
  async createPromptSession(options)
  async prompt(session, input, options)
  async promptStreaming(session, input, options, onChunk)
  
  // Utility
  getAPIStatus()
  cleanup()
}
```

### 3. Cloud AI Provider (cloud-ai-provider.js)

Implements the provider interface for Google Cloud Gemini API (existing implementation).

**Responsibilities:**
- API key management
- Cloud API request handling
- Response formatting to match provider interface
- Cloud API specific error handling
- Maintains existing cloud functionality

**Public Interface:**

```javascript
class CloudAIProvider {
  constructor()
  
  // Provider Interface
  async initialize()
  isAvailable()
  getName()
  
  // API Key Management
  async setAPIKey(key)
  getAPIKey()
  hasAPIKey()
  
  // Grammar & Spelling (existing implementation)
  async checkGrammar(text, options)
  
  // Translation (existing implementation)
  async translateText(text, sourceLang, targetLang, options)
  
  // Summarization (existing implementation)
  async summarizeContent(content, options)
  async summarizeContentStreaming(content, options, onChunk)
  
  // Rewriting (existing implementation)
  async rewriteText(text, options)
  async rewriteTextStreaming(text, options, onChunk)
  
  // Content Generation (existing implementation)
  async generateContent(prompt, options)
  async generateContentStreaming(prompt, options, onChunk)
  
  // Advanced Prompting (existing implementation)
  async createPromptSession(options)
  async prompt(session, input, options)
  async promptStreaming(session, input, options, onChunk)
  
  // Utility
  cleanup()
}
```

### 4. Settings Panel UI

User interface for configuring AI provider preferences.

**Components:**
- Provider toggle/selector (Built-in AI / Cloud API)
- Provider status indicators
- API key input (for Cloud API)
- Feature availability display
- Benefits comparison

**Interface:**

```javascript
class SettingsPanel {
  constructor(providerManager)
  
  // UI Management
  render()
  show()
  hide()
  
  // Provider Selection
  onProviderChange(provider)
  updateProviderStatus()
  
  // API Key Management
  onAPIKeyChange(key)
  validateAPIKey()
  
  // Status Display
  displayBuiltInAIStatus()
  displayCloudAPIStatus()
  displayFeatureAvailability()
}
```

### 5. Proofreader Wrapper (Built-in AI Provider)



Handles grammar and spelling correction using the Proofreader API.

**Interface:**

```javascript
class ProofreaderWrapper {
  constructor(manager)
  
  async checkAvailability()
  async createSession(options)
  async proofread(text, options)
  
  // Convert API response to extension format
  formatCorrections(apiResponse)
  
  // Cache management
  getCached(text)
  setCached(text, result)
}
```

**Configuration Options:**
- `expectedInputLanguages`: Array of language codes (e.g., ['en', 'es'])
- `monitor`: Callback for download progress

**Output Format:**
```javascript
{
  corrections: [
    {
      error: "original text",
      correction: "corrected text",
      type: "grammar" | "spelling",
      message: "explanation",
      startIndex: number,
      endIndex: number
    }
  ]
}
```

### 3. Translator Wrapper

Handles text translation using the Translator API.

**Interface:**

```javascript
class TranslatorWrapper {
  constructor(manager)
  
  async checkAvailability(sourceLang, targetLang)
  async createSession(sourceLang, targetLang, options)
  async translate(text, options)
  
  // Session caching by language pair
  getSession(sourceLang, targetLang)
  cacheSession(sourceLang, targetLang, session)
}
```

**Configuration Options:**
- `sourceLanguage`: BCP 47 language code (e.g., 'en')
- `targetLanguage`: BCP 47 language code (e.g., 'es')
- `monitor`: Callback for language pack download progress

**Supported Language Pairs:**
- Must check availability for each language pair
- Handle unsupported pairs gracefully

### 4. Summarizer Wrapper

Handles content summarization using the Summarizer API.

**Interface:**

```javascript
class SummarizerWrapper {
  constructor(manager)
  
  async checkAvailability()
  async createSession(options)
  async summarize(content, options)
  async summarizeStreaming(content, options, onChunk)
  
  // Session reuse for similar configurations
  getSession(configHash)
  cacheSession(configHash, session)
}
```

**Configuration Options:**
- `type`: 'key-points' | 'tl;dr' | 'teaser' | 'headline'
- `format`: 'markdown' | 'plain-text'
- `length`: 'short' | 'medium' | 'long'
- `sharedContext`: String for consistent multi-output generation
- `expectedInputLanguages`: Array of language codes
- `outputLanguage`: Language code for output
- `monitor`: Callback for download progress

**Streaming Support:**
- Use `summarizeStreaming()` for real-time updates
- Provide progress callbacks for UI updates

### 5. Rewriter Wrapper

Handles text rewriting and tone adjustment using the Rewriter API.

**Interface:**

```javascript
class RewriterWrapper {
  constructor(manager)
  
  async checkAvailability()
  async createSession(options)
  async rewrite(text, options)
  async rewriteStreaming(text, options, onChunk)
  
  // Session management
  getSession(configHash)
  cacheSession(configHash, session)
}
```

**Configuration Options:**
- `tone`: 'more-formal' | 'more-casual' | 'as-is'
- `format`: 'markdown' | 'plain-text'
- `length`: 'shorter' | 'longer' | 'as-is'
- `sharedContext`: String for consistent context
- `expectedInputLanguages`: Array of language codes
- `expectedContextLanguages`: Array of language codes
- `outputLanguage`: Language code for output
- `monitor`: Callback for download progress

**Per-Request Options:**
- `context`: Specific context for this rewrite
- `tone`: Override session tone

### 6. Writer Wrapper

Handles original content generation using the Writer API.

**Interface:**

```javascript
class WriterWrapper {
  constructor(manager)
  
  async checkAvailability()
  async createSession(options)
  async write(prompt, options)
  async writeStreaming(prompt, options, onChunk)
  
  // Session management
  getSession(configHash)
  cacheSession(configHash, session)
}
```

**Configuration Options:**
- `tone`: 'formal' | 'neutral' | 'casual'
- `format`: 'markdown' | 'plain-text'
- `length`: 'short' | 'medium' | 'long'
- `sharedContext`: String for consistent multi-output generation
- `expectedInputLanguages`: Array of language codes
- `expectedContextLanguages`: Array of language codes
- `outputLanguage`: Language code for output
- `monitor`: Callback for download progress

**Per-Request Options:**
- `context`: Specific context for this generation

### 7. Prompt API Wrapper

Handles advanced prompting with the Prompt API (Language Model).

**Interface:**

```javascript
class PromptWrapper {
  constructor(manager)
  
  async checkAvailability()
  async getModelParams()
  async createSession(options)
  async createMultimodalSession(options)
  async prompt(session, input, options)
  async promptStreaming(session, input, options, onChunk)
  
  // Session management
  destroySession(session)
  getChatHistory(sessionId)
  clearChatHistory(sessionId)
  
  // Multimodal support (AVAILABLE in Chrome Built-in AI)
  async convertFileToPromptFormat(file)
  async convertImageUrlToFile(imageUrl)
  async promptWithImage(session, text, imageInput, options)
  async promptWithImageStreaming(session, text, imageInput, options, onChunk)
  async promptWithAudio(session, text, audioInput, options)
}
```

**Configuration Options:**
- `temperature`: Number (0.0 to maxTemperature)
- `topK`: Number (1 to maxTopK)
- `expectedInputs`: Array of input types (e.g., [{ type: 'text' }, { type: 'image' }])
- `expectedOutputs`: Array of output types (e.g., [{ type: 'text' }])
- `initialPrompts`: Array of initial conversation messages
- `monitor`: Callback for download progress

**Prompt Options:**
- `signal`: AbortSignal for cancellation
- `responseConstraint`: JSON schema for structured output
- `omitResponseConstraintInput`: Boolean to exclude constraint from input
- `followUpPrompt`: Optional text to send after appending multimodal content

**Multimodal Support (CONFIRMED AVAILABLE):**
- **Image input support**: Chrome's Prompt API supports image inputs via File objects
- **Audio input support**: Chrome's Prompt API supports audio inputs via File objects
- **Image URL conversion**: Automatic conversion of image URLs to File objects
- **Format handling**: Supports PNG, JPEG, GIF, WebP for images; WAV, MP3, OGG for audio
- **Session append pattern**: Uses `session.append()` to add multimodal messages, then `session.prompt()` for response
- **Use cases**: Image description, text extraction (OCR), image analysis, audio transcription

#### Multimodal Implementation Pattern

The Chrome Prompt API uses a specific pattern for multimodal inputs:

1. **Create session with expected inputs:**
```javascript
const session = await LanguageModel.create({
  expectedInputs: [
    { type: 'text' },
    { type: 'image' }
  ],
  expectedOutputs: [
    { type: 'text' }
  ]
});
```

2. **Append multimodal content:**
```javascript
await session.append([
  {
    role: 'user',
    content: [
      { type: 'text', value: 'Describe this image' },
      { type: 'image', value: imageFile }  // File object
    ]
  }
]);
```

3. **Get response:**
```javascript
const result = await session.prompt('');  // Empty or follow-up prompt
```

**Key Implementation Details:**
- Image inputs must be File or Blob objects (not base64 strings)
- Image URLs are converted to File objects via fetch + blob conversion
- The `append()` method adds messages to the session context
- After appending, use `prompt()` or `promptStreaming()` to get the response
- Session maintains conversation history including multimodal inputs
- Supports streaming responses for real-time output

**Integration with Existing Features:**
- **"Extract texts from image"**: Use `promptWithImage()` with OCR-focused prompt
- **"Explain This Image"**: Use `promptWithImage()` with description-focused prompt
- Both features can work with Built-in AI or fall back to Cloud API
- Image URL from context menu is automatically converted to File object

## Data Models

### Provider Settings Model

```javascript
{
  preferredProvider: 'builtin' | 'cloud',
  autoFallback: boolean,
  cloudAPIKey: string | null,
  lastUpdated: timestamp
}
```

### Provider Status Model

```javascript
{
  name: 'builtin' | 'cloud',
  available: boolean,
  active: boolean,
  reason: string | null,  // Reason for unavailability
  features: {
    grammar: boolean,
    translation: boolean,
    summarization: boolean,
    rewriting: boolean,
    generation: boolean,
    chat: boolean
  }
}
```

### API Status Model (Built-in AI)

```javascript
{
  apiName: string,
  supported: boolean,
  availability: 'unavailable' | 'downloadable' | 'downloading' | 'available',
  lastChecked: timestamp,
  error: string | null
}
```

### Session Model

```javascript
{
  id: string,
  provider: 'builtin' | 'cloud',
  apiName: string,
  instance: object,  // The actual API instance
  config: object,    // Configuration used to create session
  created: timestamp,
  lastUsed: timestamp,
  usageCount: number
}
```

### Cache Entry Model

```javascript
{
  key: string,       // Hash of input + config + provider
  provider: 'builtin' | 'cloud',
  result: any,       // Cached result
  created: timestamp,
  hits: number
}
```

### Download Progress Model (Built-in AI)

```javascript
{
  apiName: string,
  loaded: number,    // 0.0 to 1.0
  status: 'pending' | 'downloading' | 'complete' | 'error',
  error: string | null
}
```

### Unified Response Model

```javascript
{
  success: boolean,
  provider: 'builtin' | 'cloud',
  data: any,         // Normalized response data
  error: string | null,
  metadata: {
    processingTime: number,
    cached: boolean,
    fallback: boolean  // True if fallback was used
  }
}
```

## Error Handling

### Error Types

**Built-in AI Errors:**
1. **API Unavailable**: Built-in AI API not supported in browser
2. **Model Not Downloaded**: Model needs to be downloaded
3. **Download Failed**: Model download encountered an error
4. **Session Creation Failed**: Failed to create API session
5. **User Activation Required**: Operation needs user interaction
6. **Language Not Supported**: Requested language not available
7. **Token Limit Exceeded**: Input exceeds model token limit

**Cloud API Errors:**
1. **No API Key**: Cloud API key not configured
2. **Invalid API Key**: API key is invalid or expired
3. **Network Error**: Failed to reach cloud API
4. **Rate Limit**: API rate limit exceeded
5. **Quota Exceeded**: API quota exhausted
6. **Server Error**: Cloud API server error

**Provider Management Errors:**
1. **Provider Switch Failed**: Failed to switch providers
2. **Both Providers Unavailable**: Neither provider is available
3. **Fallback Failed**: Automatic fallback encountered an error

### Error Handling Strategy

```javascript
class ErrorHandler {
  handleError(error, context) {
    // Log error for debugging
    console.error(`[${context.apiName}]`, error);
    
    // Determine error type
    const errorType = this.classifyError(error);
    
    // Get user-friendly message
    const message = this.getUserMessage(errorType, context);
    
    // Show UI notification
    this.showNotification(message, errorType);
    
    // Track error for analytics
    this.trackError(errorType, context);
    
    return {
      success: false,
      error: errorType,
      message: message
    };
  }
  
  classifyError(error)
  getUserMessage(errorType, context)
  showNotification(message, type)
  trackError(errorType, context)
}
```

### User Feedback



**Error Messages:**

**Built-in AI:**
- **API Unavailable**: "Built-in AI is not available. Switching to Cloud API..."
- **Model Downloading**: "Downloading AI model... This may take a few moments."
- **Download Failed**: "Failed to download AI model. Switching to Cloud API..."
- **User Activation Required**: "Please click to activate AI features."
- **Language Not Supported**: "Translation between [source] and [target] is not supported by Built-in AI. Trying Cloud API..."

**Cloud API:**
- **No API Key**: "Cloud API requires an API key. Please add one in settings or switch to Built-in AI."
- **Invalid API Key**: "Your API key is invalid. Please check your settings."
- **Network Error**: "Cannot reach Cloud API. Please check your connection."
- **Rate Limit**: "API rate limit exceeded. Please try again later or switch to Built-in AI."

**Provider Management:**
- **Both Unavailable**: "Neither Built-in AI nor Cloud API is available. Please check your settings."
- **Fallback Success**: "Switched to Cloud API as Built-in AI is unavailable."

**UI Indicators:**

- Provider badge showing active provider (Built-in AI / Cloud API)
- Download progress bar with percentage (Built-in AI)
- Status badges (Available, Downloading, Unavailable, Fallback Active)
- Inline error messages in relevant UI components
- Toast notifications for provider switches and transient errors
- Settings icon with indicator when configuration needed

## Testing Strategy

### Unit Testing

**Test Coverage:**

1. **Feature Detection Tests**
   - Test API support detection
   - Test availability checking
   - Test status reporting

2. **Session Management Tests**
   - Test session creation
   - Test session reuse
   - Test session cleanup
   - Test concurrent session handling

3. **API Wrapper Tests**
   - Test each wrapper's core functionality
   - Test configuration options
   - Test error handling
   - Test caching behavior

4. **Error Handler Tests**
   - Test error classification
   - Test user message generation
   - Test notification display

### Integration Testing

**Test Scenarios:**

1. **Grammar Checking Flow**
   - User types in text field
   - Grammar check triggered
   - Corrections displayed
   - User applies correction

2. **Translation Flow**
   - User selects text
   - Translation requested
   - Result displayed in side panel
   - User copies translation

3. **Summarization Flow**
   - User opens side panel
   - Page content extracted
   - Summary generated (streaming)
   - Summary displayed

4. **Text Rewriting Flow**
   - User focuses text field
   - Rewrite assistant appears
   - User selects tone
   - Text rewritten (streaming)

5. **Content Generation Flow**
   - User enters prompt
   - Content generated (streaming)
   - Result displayed
   - User edits/copies result

### Manual Testing

**Test Cases:**

1. **First-Time User Experience**
   - Install extension
   - Trigger AI feature
   - Observe model download
   - Verify feature works after download

2. **Offline Functionality**
   - Use extension with internet
   - Disconnect internet
   - Verify AI features still work
   - Verify no error messages

3. **Multi-Language Testing**
   - Test translation between various language pairs
   - Test grammar checking in different languages
   - Test summarization with multilingual content

4. **Performance Testing**
   - Test with large text inputs
   - Test rapid successive requests
   - Test cache effectiveness
   - Monitor memory usage

5. **Error Scenario Testing**
   - Test with unsupported browser version
   - Test with unavailable language pairs
   - Test with network interruptions during download
   - Test with invalid inputs

### Test Pages

Create dedicated test pages for each API:

- `test-proofreader.html`: Grammar checking tests
- `test-translator.html`: Translation tests
- `test-summarizer.html`: Summarization tests
- `test-rewriter.html`: Rewriting tests
- `test-writer.html`: Content generation tests
- `test-prompt.html`: Advanced prompting tests
- `test-availability.html`: API availability dashboard

## Implementation Strategy

### Phase 1: Provider Abstraction Layer

1. Create `ai-provider-manager.js` module
2. Define provider interface
3. Implement provider selection logic
4. Implement settings management
5. Implement automatic fallback mechanism
6. Create unified response normalization

### Phase 2: Built-in AI Provider Implementation

1. Create `builtin-ai-provider.js` module
2. Implement feature detection
3. Implement availability checking
4. Implement download progress monitoring
5. Implement all API wrappers (Proofreader, Translator, Summarizer, Rewriter, Writer, Prompt)
6. Implement Built-in AI specific error handling

### Phase 3: Cloud AI Provider Refactoring

1. Create `cloud-ai-provider.js` module
2. Extract existing cloud API code into provider
3. Implement provider interface
4. Maintain all existing cloud functionality
5. Implement Cloud API specific error handling
6. Keep API key management

### Phase 4: Settings Panel UI

1. Create settings panel component
2. Implement provider toggle/selector
3. Implement provider status display
4. Implement API key input for Cloud API
5. Implement feature availability display
6. Add benefits comparison

### Phase 5: Integration with Existing Features

1. Update `grammar-checker.js` to use AI Provider Manager
2. Update `textfield-assistant.js` to use AI Provider Manager
3. Update `sidepanel.js` to use AI Provider Manager
4. Update `background.js` to coordinate providers
5. Add provider indicators to UI
6. Test all features with both providers

### Phase 6: Testing and Validation

1. Test Built-in AI provider functionality
2. Test Cloud API provider functionality
3. Test provider switching
4. Test automatic fallback
5. Test with various Chrome versions
6. Verify both providers work correctly
7. Performance profiling for both providers

### Phase 7: Documentation and Polish

1. Update README with hybrid architecture explanation
2. Document provider selection and benefits
3. Add inline code comments
4. Create user guide for settings
5. Document fallback behavior
6. Prepare hackathon submission emphasizing Built-in AI

## Performance Considerations

### Caching Strategy

**Grammar Check Cache:**
- Cache key: Hash of text content
- TTL: 5 minutes
- Max size: 100 entries
- Eviction: LRU (Least Recently Used)

**Translation Cache:**
- Cache key: Hash of (text + sourceLang + targetLang)
- TTL: 30 minutes
- Max size: 50 entries
- Eviction: LRU

**Session Cache:**
- Reuse sessions with same configuration
- Cleanup unused sessions after 10 minutes
- Max concurrent sessions: 5 per API

### Memory Management

- Implement session cleanup on idle
- Clear caches periodically
- Destroy unused API instances
- Monitor memory usage in background

### Optimization Techniques

1. **Lazy Loading**: Create API sessions only when needed
2. **Session Reuse**: Reuse sessions for similar operations
3. **Debouncing**: Debounce grammar checks during typing
4. **Streaming**: Use streaming APIs for long operations
5. **Batching**: Batch similar requests when possible

## Security Considerations

### Data Privacy

- All AI processing happens locally (no data sent to cloud)
- No API keys or credentials stored
- No user data transmitted over network
- Clear privacy benefits in extension description

### Content Security Policy

Maintain strict CSP in manifest:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Permissions

Only request necessary permissions:
- No additional permissions needed for Built-in AI APIs
- Maintain existing permissions for extension functionality
- No host_permissions for external APIs

## Browser Compatibility

### Minimum Requirements

- Chrome 120+ for most Built-in AI APIs
- Chrome 125+ for advanced Prompt API features
- Gemini Nano model availability varies by region/device

### Feature Detection

Always check API support before use:
```javascript
if ('Summarizer' in self) {
  const availability = await Summarizer.availability();
  if (availability !== 'unavailable') {
    // Use API
  }
}
```

### Graceful Degradation

- Inform users when APIs are unavailable
- Provide clear upgrade instructions
- Disable features that require unavailable APIs
- Show status indicators in extension UI

## Hybrid Architecture Benefits

### For Users

1. **Choice and Control**: Users can choose their preferred AI provider based on their needs
2. **Privacy Option**: Built-in AI provides local processing for privacy-conscious users
3. **Reliability**: Automatic fallback ensures features always work
4. **Offline Capability**: Built-in AI works offline after initial download
5. **Cost Efficiency**: Built-in AI has no API costs

### For Development

1. **Risk Mitigation**: Extension works even if Built-in AI is unavailable
2. **Gradual Migration**: Can test and refine Built-in AI while keeping cloud working
3. **Feature Parity**: All features work with both providers
4. **Easy Testing**: Can compare both implementations side-by-side
5. **Future Proof**: Ready for when Built-in AI becomes more widely available

### For Hackathon

1. **Showcases Built-in AI**: Primary focus on Chrome's Built-in AI capabilities
2. **Demonstrates Innovation**: Hybrid approach shows thoughtful architecture
3. **Ensures Functionality**: Works on judges' machines regardless of Built-in AI availability
4. **Highlights Benefits**: Clear comparison between local and cloud processing
5. **Compliance**: Meets requirements while providing excellent user experience

## Deployment Checklist

- [ ] Provider abstraction layer implemented
- [ ] Built-in AI provider implemented and tested
- [ ] Cloud API provider refactored and tested
- [ ] Settings panel UI implemented
- [ ] Provider switching functionality working
- [ ] Automatic fallback working
- [ ] Content scripts integrated with provider manager
- [ ] Side panel integrated with provider manager
- [ ] Background service worker updated
- [ ] Error handling for both providers implemented
- [ ] Download progress UI implemented (Built-in AI)
- [ ] Provider status indicators implemented
- [ ] Caching implemented for both providers
- [ ] Test pages created for both providers
- [ ] All tests passing
- [ ] Documentation updated with hybrid architecture
- [ ] Performance profiled for both providers
- [ ] Security reviewed
- [ ] Browser compatibility verified
- [ ] Hackathon requirements met (Built-in AI as primary)

## Known Limitations

1. **API Availability**: Built-in AI APIs may not be available in all Chrome versions or regions
2. **Language Support**: Not all language pairs supported for translation
3. **Model Size**: Initial model download may take time on slow connections
4. **Token Limits**: Input size limits vary by API
5. **Offline Requirement**: Model must be downloaded before offline use
6. **Feature Parity**: Some advanced Gemini Cloud features may not be available in Gemini Nano

## Future Enhancements

1. **Hybrid Strategy**: Consider Firebase AI Logic for mobile support (if allowed by hackathon)
2. **Advanced Prompting**: Explore multimodal inputs (images, audio)
3. **Custom Models**: Investigate fine-tuning options when available
4. **Performance Metrics**: Add telemetry for optimization
5. **User Preferences**: Allow users to configure AI behavior
6. **Batch Operations**: Optimize for bulk processing scenarios
