# Implementation Plan

## Overview
This implementation adds Built-in AI support to the existing extension WITHOUT modifying the current Cloud API implementation. All existing code remains unchanged. We're adding a new provider system that allows users to choose between Built-in AI and Cloud API.

### Key Principles
1. **NO DELETION**: Do not remove any existing Cloud API code
2. **NO REWRITING**: Do not rewrite existing functions - only add new provider routing
3. **ADDITIVE ONLY**: All changes are additions, not replacements
4. **PRESERVE BEHAVIOR**: Existing features must work exactly as before
5. **USER CHOICE**: Users can switch between providers via settings

### Architecture Summary
```
User Interaction
       ↓
AI Provider Manager (NEW - routes to selected provider)
       ↓
   ┌───┴───┐
   ↓       ↓
Built-in   Cloud API
AI Provider Provider
(NEW)      (EXISTING - refactored into provider interface)
```

### What Gets Modified
- **grammar-checker.js**: Change API call to use providerManager.checkGrammar()
- **textfield-assistant.js**: Change API calls to use providerManager methods
- **sidepanel.js**: Change API calls to use providerManager methods
- **background.js**: Add provider manager initialization

### What Stays Unchanged
- All existing Cloud API logic
- All existing UI components
- All existing error handling
- All existing caching
- All existing user experience

- [x] 1. Create AI Provider Abstraction Layer



  - Create `ai-provider-manager.js` with provider routing logic
  - Implement provider interface definition
  - Implement provider selection mechanism (Built-in AI / Cloud API)
  - Implement settings management for user preferences
  - Implement automatic fallback when Built-in AI unavailable
  - Implement response normalization from both providers
  - **Note: This is NEW code, does not modify existing implementation**
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 2. Create Built-in AI Provider Implementation



  - Create `builtin-ai-provider.js` implementing the provider interface
  - Implement feature detection for all Built-in AI APIs (Proofreader, Translator, Summarizer, Rewriter, Writer, Prompt)
  - Implement availability checking with status caching
  - Implement download progress monitoring system
  - Implement Built-in AI specific error handling
  - **Note: This is NEW code, completely separate from existing Cloud API code**
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2, 5.3, 5.4_

- [x] 3. Implement Built-in AI Proofreader Wrapper


  - [x] 3.1 Create ProofreaderWrapper class in builtin-ai-provider.js

    - Implement availability checking specific to Proofreader API
    - Implement session creation with expectedInputLanguages configuration
    - Implement download progress monitoring for Proofreader model
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 3.2 Implement proofread() method with caching

    - Implement text proofreading using Proofreader.proofread() API
    - Convert API corrections format to unified extension format (error, correction, type, message)
    - Implement result caching with LRU eviction
    - _Requirements: 6.1, 6.5, 6.8_
  
  - [x] 3.3 Implement error handling for Proofreader operations

    - Handle API unavailability gracefully
    - Handle session creation failures
    - Handle proofreading operation errors
    - _Requirements: 6.6, 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 4. Implement Built-in AI Translator Wrapper


  - [x] 4.1 Create TranslatorWrapper class in builtin-ai-provider.js

    - Implement availability checking for language pairs
    - Implement session creation with sourceLanguage and targetLanguage
    - Implement session caching by language pair
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 4.2 Implement translate() method with caching

    - Implement text translation using Translator.translate() API
    - Implement language pack download progress monitoring
    - Implement translation result caching
    - _Requirements: 7.1, 7.3_
  
  - [x] 4.3 Implement error handling for translation operations

    - Handle unsupported language pairs
    - Handle download failures
    - Handle translation errors
    - _Requirements: 7.6, 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 5. Implement Built-in AI Summarizer Wrapper




  - [x] 5.1 Create SummarizerWrapper class in builtin-ai-provider.js


    - Implement availability checking for Summarizer API
    - Implement session creation with type, format, length options
    - Implement session reuse for similar configurations
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  


  - [x] 5.2 Implement summarize() and summarizeStreaming() methods

    - Implement batch summarization using Summarizer.summarize()
    - Implement streaming summarization using Summarizer.summarizeStreaming()
    - Implement progress callbacks for streaming updates
    - _Requirements: 8.1, 8.7_

  

  - [x] 5.3 Implement language configuration for summarization


    - Implement expectedInputLanguages configuration
    - Implement outputLanguage configuration
    - Implement sharedContext for consistent outputs
    - _Requirements: 8.1, 8.2, 8.3_
  



  - [x] 5.4 Implement error handling for summarization operations

    - Handle API unavailability
    - Handle token limit exceeded errors
    - Handle streaming errors
    - _Requirements: 8.8, 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 6. Implement Built-in AI Rewriter Wrapper


  - [x] 6.1 Create RewriterWrapper class in builtin-ai-provider.js



    - Implement availability checking for Rewriter API
    - Implement session creation with tone, format, length options
    - Implement session caching by configuration
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [x] 6.2 Implement rewrite() and rewriteStreaming() methods
    - Implement batch rewriting using Rewriter.rewrite()
    - Implement streaming rewriting using Rewriter.rewriteStreaming()
    - Implement per-request context and tone overrides
    - _Requirements: 9.1, 9.7_
  
  - [x] 6.3 Implement language configuration for rewriting
    - Implement expectedInputLanguages configuration
    - Implement expectedContextLanguages configuration
    - Implement outputLanguage configuration
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 6.4 Implement error handling for rewriting operations
    - Handle API unavailability
    - Handle unsupported language combinations
    - Handle streaming errors
    - _Requirements: 9.8, 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 7. Implement Built-in AI Writer Wrapper





  - [x] 7.1 Create WriterWrapper class in builtin-ai-provider.js


    - Implement availability checking for Writer API
    - Implement session creation with tone, format, length options
    - Implement session caching by configuration
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 7.2 Implement write() and writeStreaming() methods

    - Implement batch content generation using Writer.write()
    - Implement streaming generation using Writer.writeStreaming()
    - Implement sharedContext for consistent multi-output generation
    - _Requirements: 10.1, 10.6_
  
  - [x] 7.3 Implement language configuration for content generation

    - Implement expectedInputLanguages configuration
    - Implement expectedContextLanguages configuration
    - Implement outputLanguage configuration
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 7.4 Implement error handling for content generation

    - Handle API unavailability
    - Handle generation failures
    - Handle streaming errors
    - _Requirements: 10.7, 14.1, 14.2, 14.3, 14.4, 14.5_
-

- [x] 8. Implement Built-in AI Prompt API Wrapper




  - [x] 8.1 Create PromptWrapper class in builtin-ai-provider.js


    - Implement availability checking for Prompt API (LanguageModel)
    - Implement model parameters retrieval (temperature, topK)
    - Implement session creation with configurable parameters
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 8.2 Implement prompt() and promptStreaming() methods


    - Implement batch prompting using session.prompt()
    - Implement streaming prompting using session.promptStreaming()
    - Implement AbortController support for cancellation
    - _Requirements: 11.1, 11.7_
  
  - [x] 8.3 Implement structured output with JSON schema


    - Implement responseConstraint for JSON schema validation
    - Implement omitResponseConstraintInput option
    - Parse and validate JSON responses
    - _Requirements: 11.5_
  
  - [x] 8.4 Implement session lifecycle management


    - Implement session creation with user activation check
    - Implement session cleanup and destruction
    - Implement chat history management
    - _Requirements: 11.6, 11.8, 5.1, 5.2, 5.3, 5.4_
  
  - [x] 8.5 Implement multimodal input support



    - Implement image input conversion and prompting (File objects and URLs)
    - Implement audio input conversion and prompting (File objects)
    - Implement createMultimodalSession() with expectedInputs configuration
    - Implement promptWithImage() and promptWithImageStreaming() methods
    - Implement promptWithAudio() method
    - Implement convertImageUrlToFile() for URL-to-File conversion
    - Handle multimodal API availability
    - _Requirements: 11.4_
    - _Note: Chrome's Prompt API DOES support multimodal inputs (images, audio) via File objects_
  
  - [x] 8.6 Implement error handling for prompting operations


    - Handle API unavailability
    - Handle session creation failures
    - Handle prompt execution errors
    - Handle cancellation scenarios
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 9. Refactor Existing Cloud API into Provider



  - Create `cloud-ai-provider.js` implementing the provider interface
  - Extract existing Cloud API code from background.js, grammar-checker.js, sidepanel.js
  - Wrap existing Cloud API functions in provider interface methods
  - Maintain ALL existing Cloud API functionality unchanged
  - Implement provider interface methods that call existing code
  - **Note: This is REFACTORING existing code into a provider, NOT rewriting it**
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 10. Implement User Activation Checking for Built-in AI

  - Implement user activation verification using navigator.userActivation.isActive in builtin-ai-provider.js
  - Implement user activation waiting mechanism for session creation
  - Implement user activation UI prompts when needed
  - Update all Built-in AI wrappers to check user activation before session creation
  - **Note: Only applies to Built-in AI, Cloud API doesn't need this**
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Implement Caching System for Both Providers

  - [x] 11.1 Create unified cache manager with LRU eviction

    - Implement cache key generation (hash of input + config + provider)
    - Implement LRU eviction policy
    - Implement TTL (Time To Live) for cache entries
    - Implement separate cache size limits per provider
    - _Requirements: 12.7_
  
  - [x] 11.2 Integrate caching into Built-in AI wrappers

    - Integrate cache into ProofreaderWrapper
    - Integrate cache into TranslatorWrapper
    - Integrate cache into SummarizerWrapper (for batch operations)
    - _Requirements: 12.7_
  
  - [x] 11.3 Maintain existing Cloud API caching

    - Keep existing cache logic in Cloud API provider
    - Ensure Cloud API cache works independently
    - **Note: Do NOT modify existing Cloud API cache**
    - _Requirements: 12.7_
  
  - [x] 11.4 Implement cache management utilities


    - Implement cache clearing functionality for both providers
    - Implement cache statistics tracking
    - Implement cache cleanup on idle
    - _Requirements: 12.7_

- [x] 12. Create Settings Panel UI


  - [x] 12.1 Create settings panel HTML and CSS


    - Create settings panel component in sidepanel.html
    - Add provider toggle/selector UI (Built-in AI / Cloud API)
    - Add provider status display section
    - Add API key input field for Cloud API
    - Add benefits comparison section
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  
  - [x] 12.2 Implement settings panel JavaScript


    - Implement provider selection handler
    - Implement settings save/load functionality
    - Implement provider status updates
    - Implement API key validation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  
  - [x] 12.3 Integrate settings with AI Provider Manager


    - Connect settings UI to ai-provider-manager.js
    - Implement real-time provider switching
    - Display current active provider
    - Show Built-in AI availability status
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 13. Integrate AI Provider Manager into Grammar Checker


  - [x] 13.1 Update grammar-checker.js to use AI Provider Manager


    - Import ai-provider-manager.js
    - Replace direct Cloud API calls with providerManager.checkGrammar()
    - **Keep existing checkText() method structure, only change the API call**
    - _Requirements: 6.1, 6.2, 6.7, 16.1_
  
  - [x] 13.2 Maintain ALL existing grammar checker functionality

    - Ensure error highlighting still works exactly as before
    - Ensure suggestion popups still work exactly as before
    - Ensure correction application still works exactly as before
    - **No changes to UI or user experience**
    - _Requirements: 6.7, 16.2_
  
  - [x] 13.3 Add provider indicator to grammar checker UI

    - Show small badge indicating which provider is active
    - Show download progress when Built-in AI model is downloading
    - Handle provider switch notifications
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 13.4 Test grammar checker with both providers

    - Test with Built-in AI provider
    - Test with Cloud API provider
    - Test provider switching
    - Test automatic fallback
    - _Requirements: 16.4, 18.4_

- [x] 14. Integrate AI Provider Manager into Text Field Assistant


  - [x] 14.1 Update textfield-assistant.js to use AI Provider Manager


    - Import ai-provider-manager.js
    - Replace direct Cloud API calls with providerManager.rewriteText() and providerManager.generateContent()
    - **Keep existing text field assistant structure, only change the API calls**
    - _Requirements: 9.1, 9.2, 10.1, 10.2, 16.1_
  
  - [x] 14.2 Add streaming support for both providers

    - Implement streaming rewriting with real-time UI updates
    - Implement streaming content generation with real-time UI updates
    - Ensure streaming works with both Built-in AI and Cloud API
    - _Requirements: 9.7, 10.6, 16.2_
  
  - [x] 14.3 Maintain ALL existing text field assistant functionality

    - Ensure assistant popup still appears on field focus exactly as before
    - Ensure tone selection still works exactly as before
    - Ensure text replacement still works exactly as before
    - **No changes to UI or user experience**
    - _Requirements: 9.8, 16.2_
  
  - [x] 14.4 Add provider indicator to text field assistant

    - Show small badge indicating which provider is active
    - Show streaming progress indicator
    - Handle provider switch notifications
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 14.5 Test text field assistant with both providers

    - Test with Built-in AI provider
    - Test with Cloud API provider
    - Test provider switching
    - Test streaming with both providers
    - _Requirements: 16.4, 18.4_

- [x] 15. Integrate AI Provider Manager into Side Panel Translation


  - [x] 15.1 Update sidepanel.js translation feature


    - Import ai-provider-manager.js
    - Replace direct Cloud API translation calls with providerManager.translateText()
    - **Keep existing translateText() function structure, only change the API call**
    - _Requirements: 7.1, 7.2, 17.1, 17.2_
  
  - [x] 15.2 Add provider-specific UI elements

    - Show download progress for language packs (Built-in AI only)
    - Show supported language pairs for active provider
    - Handle unsupported language pair errors with fallback
    - Add provider indicator badge
    - _Requirements: 7.3, 7.4, 7.5, 7.8, 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 15.3 Maintain ALL existing translation functionality

    - Ensure language selector still works exactly as before
    - Ensure translation display still works exactly as before
    - Ensure copy functionality still works exactly as before
    - **No changes to core UI or user experience**
    - _Requirements: 7.7, 17.3_
  
  - [x] 15.4 Test translation with both providers

    - Test various language pairs with Built-in AI
    - Test various language pairs with Cloud API
    - Test provider switching
    - Test automatic fallback for unsupported pairs
    - _Requirements: 18.4_

- [x] 16. Integrate AI Provider Manager into Side Panel Summarization


  - [x] 16.1 Update sidepanel.js summarization feature


    - Import ai-provider-manager.js
    - Replace direct Cloud API summarization calls with providerManager.summarizeContent()
    - **Keep existing summarizePage() function structure, only change the API call**
    - _Requirements: 8.1, 8.2, 17.1, 17.2_
  
  - [x] 16.2 Add summarization options UI (Built-in AI only)

    - Add UI for summary type selection (key-points, tl;dr, teaser, headline) when Built-in AI is active
    - Add UI for summary length selection (short, medium, long) when Built-in AI is active
    - Add UI for summary format selection (markdown, plain-text) when Built-in AI is active
    - Hide these options when Cloud API is active (uses existing behavior)
    - _Requirements: 8.3, 8.4, 8.5, 8.6_
  
  - [x] 16.3 Add streaming progress UI for both providers

    - Show partial summaries as they're generated
    - Show progress indicator during summarization
    - Handle streaming errors gracefully
    - Add provider indicator badge
    - _Requirements: 8.7, 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 16.4 Maintain ALL existing summarization functionality

    - Ensure summary display still works exactly as before
    - Ensure copy functionality still works exactly as before
    - Ensure page content extraction still works exactly as before
    - **No changes to core UI or user experience**
    - _Requirements: 8.9, 17.3_
  
  - [x] 16.5 Test summarization with both providers

    - Test with various web pages using Built-in AI
    - Test with various web pages using Cloud API
    - Test different summary types (Built-in AI)
    - Test provider switching
    - Test streaming with both providers
    - _Requirements: 18.4_

- [x] 17. Integrate AI Provider Manager into Side Panel Chat


  - [x] 17.1 Update sidepanel.js chat feature

    - Import ai-provider-manager.js
    - Replace direct Cloud API chat calls with providerManager.prompt()
    - **Keep existing chat function structure, only change the API call**
    - _Requirements: 11.1, 11.2, 11.8, 17.1, 17.2_
  
  - [x] 17.2 Add streaming support for both providers

    - Implement streaming prompts for chat messages
    - Update UI to show streaming responses from both providers
    - Implement message cancellation with AbortController
    - _Requirements: 11.1, 11.7_
  
  - [x] 17.3 Implement session management for both providers

    - Create session on first chat message (provider-specific)
    - Maintain session across multiple messages
    - Cleanup session when side panel closes
    - Handle Built-in AI user activation requirement
    - _Requirements: 11.6, 11.8, 5.1, 5.2_
  
  - [x] 17.4 Maintain ALL existing chat functionality

    - Ensure message display still works exactly as before
    - Ensure input field still works exactly as before
    - Ensure send button still works exactly as before
    - **No changes to core UI or user experience**
    - _Requirements: 11.9, 17.3_
  
  - [x] 17.5 Add provider indicator to chat UI

    - Show badge indicating which provider is active
    - Show streaming progress indicator
    - Handle provider switch notifications
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 17.6 Test chat with both providers

    - Test multi-turn conversations with Built-in AI
    - Test multi-turn conversations with Cloud API
    - Test streaming responses from both providers
    - Test provider switching
    - Test message cancellation
    - _Requirements: 18.4_

- [x] 18. Update Background Service Worker for Provider Coordination




  - [x] 18.1 Add AI Provider Manager to background.js


    - Import ai-provider-manager.js
    - Initialize provider manager on extension load
    - **DO NOT remove existing Cloud API code**
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [x] 18.2 Add message handlers for provider management


    - Add handler for provider status requests
    - Add handler for provider switching
    - Add handler for settings updates
    - **Keep all existing message handlers unchanged**
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [x] 18.3 Maintain ALL existing background functionality


    - Ensure context menu creation still works exactly as before
    - Ensure side panel opening still works exactly as before
    - Ensure message passing still works exactly as before
    - Ensure existing Cloud API handlers still work
    - **No changes to existing functionality**
    - _Requirements: 15.5_
  
  - [x] 18.4 Test background service worker


    - Test context menu functionality
    - Test side panel opening
    - Test message passing between components
    - Test provider coordination
    - _Requirements: 18.4_

- [x] 19. Update Manifest Configuration



  - **DO NOT remove any existing configurations**
  - Verify all existing permissions are maintained (including host_permissions for Cloud API)
  - Verify manifest_version 3 compliance
  - Verify content_security_policy is correct
  - Update extension description to highlight hybrid AI approach with Built-in AI as primary
  - Add web_accessible_resources for new provider files if needed
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 20.1, 20.2, 20.3, 20.7, 20.8, 20.9_

- [x] 20. Implement Provider Status UI Components



  - [x] 20.1 Create provider indicator badges


    - Create badge component showing active provider (Built-in AI / Cloud API)
    - Create status indicators (Available, Downloading, Unavailable, Fallback Active)
    - Create download progress bar for Built-in AI models
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 20.2 Integrate provider indicators into extension UI


    - Add provider badge to grammar checker
    - Add provider badge to side panel
    - Add provider badge to text field assistant
    - Add provider badge to chat interface
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 20.3 Implement provider status dashboard in settings


    - Show Built-in AI availability for each API
    - Show Cloud API status (API key configured, etc.)
    - Show download status for Built-in AI models
    - Show supported features for each provider
    - _Requirements: 4.3, 4.4, 4.5_

- [ ] 21. Create Test Pages for Both Providers
  - [ ] 21.1 Create test-provider-switching.html
    - Create UI for testing provider switching
    - Add provider selector
    - Add status display for both providers
    - Test all features with both providers
    - _Requirements: 18.1, 18.2_
  
  - [ ] 21.2 Create test-builtin-ai-apis.html
    - Create UI for testing all Built-in AI APIs
    - Add test cases for Proofreader, Translator, Summarizer, Rewriter, Writer, Prompt
    - Add availability status display
    - Add download progress monitoring
    - _Requirements: 18.1, 18.2_
  
  - [ ] 21.3 Create test-cloud-api.html
    - Create UI for testing Cloud API functionality
    - Verify existing Cloud API still works
    - Test all Cloud API features
    - _Requirements: 18.1, 18.2_
  
  - [ ] 21.4 Create test-automatic-fallback.html
    - Create UI for testing automatic fallback
    - Simulate Built-in AI unavailability
    - Verify fallback to Cloud API works
    - Test fallback notifications
    - _Requirements: 18.1, 18.2_
  
  - [ ] 21.5 Create test-settings-panel.html
    - Test settings panel UI
    - Test provider selection
    - Test API key management
    - Test settings persistence
    - _Requirements: 18.1, 18.2_

- [ ] 22. Implement Error Handling and Fallback UI
  - Create error notification system for both providers
  - Implement user-friendly error messages for Built-in AI errors
  - Implement user-friendly error messages for Cloud API errors
  - Implement automatic fallback notifications
  - Add error recovery suggestions
  - Implement error logging for debugging
  - **Keep existing Cloud API error handling unchanged**
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ] 23. Implement Context Management for Built-in AI
  - Implement sharedContext management for Built-in AI APIs
  - Implement per-request context handling for Built-in AI
  - Implement context size validation
  - Implement context cleanup strategies
  - **Cloud API context management remains unchanged**
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 24. Implement Language Configuration for Built-in AI
  - Add language preference settings for Built-in AI
  - Implement language validation before Built-in AI operations
  - Handle unsupported language combinations with fallback to Cloud API
  - Show supported languages for each provider
  - **Cloud API language handling remains unchanged**
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 25. Performance Optimization for Both Providers
  - [ ] 25.1 Implement session reuse optimization for Built-in AI
    - Cache Built-in AI sessions by configuration hash
    - Reuse sessions for similar operations
    - Implement session cleanup on idle
    - **Cloud API session management remains unchanged**
    - _Requirements: 14.3, 14.4_
  
  - [ ] 25.2 Maintain existing debouncing for grammar checks
    - Ensure existing debounce logic still works
    - Apply debouncing to both providers
    - **Do not modify existing debounce implementation**
    - _Requirements: 14.5_
  
  - [ ] 25.3 Monitor and optimize memory usage for both providers
    - Implement memory usage tracking for both providers
    - Cleanup unused sessions and caches for both providers
    - Optimize cache sizes for both providers
    - _Requirements: 14.4_

- [ ] 26. Testing and Validation for Hybrid System
  - [ ] 26.1 Verify both providers work correctly
    - Test all features with Built-in AI provider
    - Test all features with Cloud API provider
    - Verify Cloud API still makes requests to generativelanguage.googleapis.com
    - Verify Built-in AI makes NO external requests
    - _Requirements: 18.5, 20.1, 20.2, 20.3_
  
  - [ ] 26.2 Test provider switching
    - Test manual provider switching via settings
    - Test automatic fallback when Built-in AI unavailable
    - Test provider switch notifications
    - Verify features work after switching
    - _Requirements: 18.4_
  
  - [ ] 26.3 Test all features end-to-end with both providers
    - Test grammar checking with both providers
    - Test translation with both providers
    - Test summarization with both providers
    - Test text rewriting with both providers
    - Test content generation with both providers
    - Test chat functionality with both providers
    - _Requirements: 18.4_
  
  - [ ] 26.4 Test error scenarios and fallback
    - Test with Built-in AI unavailable (should fallback to Cloud)
    - Test with Cloud API unavailable (no API key)
    - Test with both providers unavailable
    - Test with unsupported languages (should fallback)
    - Test with network disconnected (Built-in AI should work, Cloud should fail)
    - _Requirements: 18.4_
  
  - [ ] 26.5 Test Built-in AI download scenarios
    - Test first-time model download
    - Test download progress UI
    - Test download interruption
    - Test download completion
    - _Requirements: 18.4_
  
  - [ ] 26.6 Performance testing for both providers
    - Test with large text inputs on both providers
    - Test rapid successive requests on both providers
    - Test cache effectiveness for both providers
    - Monitor memory usage for both providers
    - Compare performance between providers
    - _Requirements: 18.4_
  
  - [ ] 26.7 Verify existing functionality unchanged
    - Test that all existing Cloud API features work exactly as before
    - Verify no regressions in existing functionality
    - Verify UI/UX remains consistent
    - _Requirements: 18.4_

- [ ] 27. Documentation for Hybrid Architecture
  - [ ] 27.1 Update README.md
    - Document hybrid AI architecture (Built-in AI + Cloud API)
    - Explain provider selection and benefits
    - Add setup instructions for both providers
    - Document automatic fallback behavior
    - Add feature comparison table
    - Add troubleshooting guide for both providers
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 20.9_
  
  - [ ] 27.2 Add inline code comments
    - Comment AI Provider Manager code
    - Comment Built-in AI Provider code
    - Comment Cloud AI Provider code
    - Comment integration points
    - Document provider interface
    - _Requirements: 19.1_
  
  - [ ] 27.3 Create user guide
    - Document how to choose between providers
    - Document settings panel usage
    - Document Built-in AI model download process
    - Document privacy benefits of Built-in AI
    - Document offline capabilities with Built-in AI
    - Document when to use each provider
    - _Requirements: 19.5, 20.4, 20.5_
  
  - [ ]* 27.4 Create developer documentation
    - Document hybrid architecture design
    - Document provider interface specification
    - Document how to add new providers
    - Document testing procedures for both providers
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

- [ ] 28. Final Hackathon Compliance Check
  - Verify extension defaults to Chrome Built-in AI APIs
  - Verify Built-in AI is prominently featured in UI and documentation
  - Verify Built-in AI makes NO external API calls
  - Verify Cloud API works as fallback option
  - Verify client-side AI processing with Built-in AI
  - Verify privacy, offline, and cost-efficiency benefits are demonstrated
  - Verify extension works with Gemini Nano
  - Verify settings panel clearly shows provider selection
  - Verify automatic fallback works correctly
  - Prepare hackathon submission materials emphasizing Built-in AI
  - Create demo video showing Built-in AI features
  - Document hybrid architecture benefits in submission
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9_
