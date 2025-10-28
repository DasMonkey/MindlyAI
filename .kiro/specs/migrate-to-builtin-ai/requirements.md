# Requirements Document

## Introduction

This document outlines the requirements for implementing a hybrid AI architecture in the Mentelo Chrome Extension to comply with the Google Chrome Built-in AI Challenge 2025 hackathon requirements. The extension will support both Chrome's Built-in AI APIs (Gemini Nano) for client-side processing and Google Cloud Gemini API as a fallback option. Users will be able to choose their preferred AI provider through a settings toggle, with Built-in AI as the default and primary implementation. This approach showcases Chrome's Built-in AI capabilities while maintaining functionality when Built-in AI is unavailable.

## Glossary

- **Built-in AI APIs**: Chrome's client-side AI APIs that run locally using Gemini Nano model
- **Gemini Nano**: Google's on-device AI model that powers Chrome's Built-in AI APIs
- **Cloud API**: Google Cloud Gemini API for server-side AI processing
- **AI Provider**: The selected AI backend (Built-in AI or Cloud API)
- **Hybrid Architecture**: System supporting both Built-in AI and Cloud API with runtime switching
- **Prompt API**: Chrome API for generating dynamic prompts with multimodal support
- **Proofreader API**: Chrome API for grammar and spelling correction
- **Summarizer API**: Chrome API for content summarization
- **Translator API**: Chrome API for text translation
- **Writer API**: Chrome API for original content generation
- **Rewriter API**: Chrome API for content improvement and tone adjustment
- **Extension**: The Mentelo Chrome Extension
- **Service Worker**: The background.js file that handles API requests
- **Content Script**: JavaScript files injected into web pages (grammar-checker.js, textfield-assistant.js, etc.)
- **Side Panel**: The extension's UI panel (sidepanel.js)
- **Settings Panel**: UI for configuring extension preferences including AI provider selection
- **User Activation**: Required user interaction (click, keypress) before creating AI sessions
- **Availability Status**: API readiness state ('unavailable', 'downloadable', 'downloading', 'available')
- **Provider Toggle**: UI control for switching between Built-in AI and Cloud API

## Requirements

### Requirement 1: Hybrid AI Provider Architecture

**User Story:** As a user, I want to choose between Built-in AI (local, private) and Cloud API (more features), so that I can balance privacy, performance, and functionality based on my needs.

#### Acceptance Criteria

1. THE Extension SHALL support two AI providers: Built-in AI (primary) and Cloud API (fallback)
2. THE Extension SHALL default to Built-in AI when available
3. THE Extension SHALL provide a settings toggle for users to manually select their preferred AI provider
4. THE Extension SHALL automatically fall back to Cloud API when Built-in AI is unavailable
5. THE Extension SHALL persist the user's AI provider preference in chrome.storage
6. THE Extension SHALL display the current active AI provider in the UI
7. THE Extension SHALL maintain all existing features regardless of selected provider

### Requirement 2: Manifest Configuration

**User Story:** As a Chrome Extension developer, I want to properly configure the manifest.json file to support both AI providers, so that the extension can access both Chrome's client-side AI capabilities and cloud services.

#### Acceptance Criteria

1. THE Extension SHALL maintain existing permissions (activeTab, storage, scripting, contextMenus, sidePanel, clipboardRead, clipboardWrite)
2. THE Extension SHALL maintain host_permissions for cloud API access
3. THE Extension SHALL maintain manifest_version 3 compliance
4. THE Extension SHALL include proper content_security_policy for extension pages
5. THE Extension SHALL NOT require additional permissions for Built-in AI APIs (accessed via JavaScript feature detection)

### Requirement 3: Feature Detection and Availability Checking

**User Story:** As a user, I want the extension to detect which Built-in AI APIs are available on my browser, so that I can use AI features when supported.

#### Acceptance Criteria

1. WHEN the extension initializes, THE Extension SHALL check for Built-in AI API support using JavaScript feature detection (e.g., 'Summarizer' in self)
2. WHEN an AI API is not available, THE Extension SHALL check the availability status using the API's availability() method
3. THE Extension SHALL handle all availability states: 'unavailable', 'downloadable', 'downloading', 'available'
4. WHEN Built-in AI is unavailable, THE Extension SHALL automatically use Cloud API as fallback
5. THE Extension SHALL display Built-in AI availability status in settings
6. THE Extension SHALL allow manual provider selection even when Built-in AI is available

### Requirement 4: Settings Panel with Provider Toggle

**User Story:** As a user, I want a settings panel where I can configure my AI provider preference, so that I have control over how my data is processed.

#### Acceptance Criteria

1. THE Extension SHALL provide a settings panel accessible from the side panel
2. THE Extension SHALL display a toggle/selector for AI provider (Built-in AI / Cloud API)
3. THE Extension SHALL show the current active provider with visual indicator
4. THE Extension SHALL display Built-in AI availability status (Available, Downloading, Unavailable)
5. THE Extension SHALL show benefits of each provider (Built-in: privacy, offline; Cloud: more features)
6. THE Extension SHALL save provider preference immediately when changed
7. THE Extension SHALL apply the new provider setting without requiring extension reload
8. THE Extension SHALL display API key status when Cloud API is selected

### Requirement 5: User Activation Requirement

**User Story:** As a Chrome user, I want AI model downloads to only occur after I interact with the extension, so that my browser doesn't download models without my knowledge.

#### Acceptance Criteria

1. WHEN creating an AI session, THE Extension SHALL verify user activation using navigator.userActivation.isActive
2. THE Extension SHALL NOT create AI sessions without user activation (click, keypress, or similar interaction)
3. WHEN user activation is missing, THE Extension SHALL wait for user interaction before proceeding
4. THE Extension SHALL handle user activation checks for all AI APIs (Summarizer, Translator, Proofreader, Writer, Rewriter, Prompt)

### Requirement 6: Grammar and Spelling Correction with Provider Support

**User Story:** As a user typing in text fields, I want grammar and spelling corrections that respect my AI provider preference, so that I can choose between local processing or cloud-based checking.

#### Acceptance Criteria

1. WHEN Built-in AI provider is selected, THE Extension SHALL use the Proofreader API's proofread() method
2. WHEN Cloud API provider is selected, THE Extension SHALL use the existing Gemini Cloud API grammar checking
3. THE Extension SHALL create a Proofreader instance with expectedInputLanguages configuration when using Built-in AI
4. THE Extension SHALL monitor download progress using the monitor callback with downloadprogress events for Built-in AI
5. THE Extension SHALL convert both API responses to a unified error format (error, correction, type, message)
6. THE Extension SHALL handle errors from both providers gracefully
7. THE Extension SHALL maintain the existing UI for displaying grammar corrections regardless of provider
8. THE Extension SHALL cache results from both providers to avoid redundant checks

### Requirement 7: Translation Feature with Provider Support

**User Story:** As a user, I want to translate text using my preferred AI provider, so that I can choose between local translation or cloud-based translation with more language pairs.

#### Acceptance Criteria

1. WHEN Built-in AI provider is selected, THE Extension SHALL use the Translator API's translate() method
2. WHEN Cloud API provider is selected, THE Extension SHALL use the existing Gemini Cloud API translation
3. THE Extension SHALL create a Translator instance with sourceLanguage and targetLanguage parameters when using Built-in AI
4. THE Extension SHALL monitor language pack download progress using the monitor callback for Built-in AI
5. THE Extension SHALL support all language pairs available in the selected provider
6. THE Extension SHALL handle translation errors from both providers and provide user feedback
7. THE Extension SHALL maintain the existing translation UI in the side panel regardless of provider
8. THE Extension SHALL indicate which provider is being used for translation

### Requirement 8: Content Summarization with Provider Support

**User Story:** As a user, I want to summarize web page content using my preferred AI provider, so that I can choose between local processing or cloud-based summarization.

#### Acceptance Criteria

1. WHEN Built-in AI provider is selected, THE Extension SHALL use the Summarizer API's summarize() or summarizeStreaming() methods
2. WHEN Cloud API provider is selected, THE Extension SHALL use the existing Gemini Cloud API summarization
3. THE Extension SHALL create a Summarizer instance with configurable options (type, format, length) when using Built-in AI
4. THE Extension SHALL support summarization types: 'key-points', 'tl;dr', 'teaser', 'headline' for Built-in AI
5. THE Extension SHALL support output formats: 'markdown', 'plain-text' for Built-in AI
6. THE Extension SHALL support length options: 'short', 'medium', 'long' for Built-in AI
7. THE Extension SHALL provide streaming updates for long summarization tasks from both providers
8. THE Extension SHALL handle summarization errors from both providers and provide user feedback
9. THE Extension SHALL maintain consistent UI regardless of provider

### Requirement 9: Text Rewriting and Tone Adjustment with Provider Support

**User Story:** As a user, I want to rewrite text with different tones using my preferred AI provider, so that I can choose between local processing or cloud-based rewriting.

#### Acceptance Criteria

1. WHEN Built-in AI provider is selected, THE Extension SHALL use the Rewriter API's rewrite() or rewriteStreaming() methods
2. WHEN Cloud API provider is selected, THE Extension SHALL use the existing Gemini Cloud API rewriting
3. THE Extension SHALL create a Rewriter instance with tone configuration when using Built-in AI
4. THE Extension SHALL support tone options: 'more-formal', 'more-casual', 'as-is' for Built-in AI
5. THE Extension SHALL support format options: 'markdown', 'plain-text' for Built-in AI
6. THE Extension SHALL support length options: 'shorter', 'longer', 'as-is' for Built-in AI
7. THE Extension SHALL provide streaming updates for real-time rewriting feedback from both providers
8. THE Extension SHALL maintain the existing text field assistant UI regardless of provider

### Requirement 10: Content Generation with Provider Support

**User Story:** As a user, I want to generate original content using my preferred AI provider, so that I can choose between local processing or cloud-based generation.

#### Acceptance Criteria

1. WHEN Built-in AI provider is selected, THE Extension SHALL use the Writer API's write() or writeStreaming() methods
2. WHEN Cloud API provider is selected, THE Extension SHALL use the existing Gemini Cloud API content generation
3. THE Extension SHALL create a Writer instance with configurable options (tone, format, length) when using Built-in AI
4. THE Extension SHALL support tone options: 'formal', 'neutral', 'casual' for Built-in AI
5. THE Extension SHALL support sharedContext for consistent multi-output generation for Built-in AI
6. THE Extension SHALL provide streaming updates for long content generation from both providers
7. THE Extension SHALL handle errors from both providers and provide user feedback
8. THE Extension SHALL maintain consistent UI regardless of provider

### Requirement 11: Advanced Prompting with Provider Support

**User Story:** As a user, I want advanced AI interactions using my preferred AI provider, so that I can have conversational AI experiences with my choice of local or cloud processing.

#### Acceptance Criteria

1. WHEN Built-in AI provider is selected, THE Extension SHALL use the Prompt API's prompt() or promptStreaming() methods
2. WHEN Cloud API provider is selected, THE Extension SHALL use the existing Gemini Cloud API prompting
3. THE Extension SHALL create a LanguageModel session with configurable parameters (temperature, topK) when using Built-in AI
4. THE Extension SHALL support multimodal inputs (text, images, audio) for both Built-in AI and Cloud API providers
5. THE Extension SHALL convert image URLs and File objects to appropriate formats for multimodal prompting
6. THE Extension SHALL support structured JSON output using responseConstraint for Built-in AI
7. THE Extension SHALL handle session management and cleanup for both providers
8. THE Extension SHALL support AbortController for canceling long-running prompts from both providers
9. THE Extension SHALL maintain chat history for conversational context regardless of provider
10. THE Extension SHALL provide consistent chat experience regardless of provider
11. THE Extension SHALL support image description and text extraction using multimodal capabilities

### Requirement 12: AI Provider Abstraction Layer

**User Story:** As a developer, I want a unified abstraction layer for both AI providers, so that feature implementations don't need to know which provider is being used.

#### Acceptance Criteria

1. THE Extension SHALL implement a provider abstraction layer that handles routing to Built-in AI or Cloud API
2. THE Extension SHALL provide a unified interface for all AI operations (grammar check, translation, summarization, etc.)
3. THE Extension SHALL automatically route requests to the selected provider
4. THE Extension SHALL handle provider-specific configuration and initialization
5. THE Extension SHALL normalize responses from both providers to a consistent format
6. THE Extension SHALL handle provider switching without requiring code changes in feature implementations
7. THE Extension SHALL maintain separate caches for each provider

### Requirement 13: Download Progress Monitoring

**User Story:** As a user, I want to see download progress when AI models are being downloaded, so that I understand what's happening and can wait appropriately.

#### Acceptance Criteria

1. WHEN an AI model is downloading, THE Extension SHALL display download progress to the user
2. THE Extension SHALL use the monitor callback with downloadprogress event listeners
3. THE Extension SHALL calculate and display percentage progress (e.loaded * 100)
4. THE Extension SHALL provide visual feedback (progress bar, percentage, or status message)
5. THE Extension SHALL handle download completion and errors gracefully

### Requirement 14: Error Handling and Automatic Fallback Strategy

**User Story:** As a user, I want the extension to handle errors gracefully and automatically fall back to Cloud API when Built-in AI is unavailable, so that I can always use the extension's features.

#### Acceptance Criteria

1. WHEN Built-in AI provider is selected but unavailable, THE Extension SHALL automatically fall back to Cloud API
2. WHEN automatic fallback occurs, THE Extension SHALL notify the user with a clear message
3. THE Extension SHALL handle API errors from both providers without crashing the extension
4. THE Extension SHALL log errors to the console for debugging
5. THE Extension SHALL provide meaningful error messages to users for both providers
6. WHEN Cloud API is unavailable (no API key), THE Extension SHALL inform the user and suggest adding an API key
7. THE Extension SHALL allow users to manually switch providers at any time

### Requirement 12: Language Configuration

**User Story:** As a multilingual user, I want to configure language preferences for AI operations, so that the extension works with my preferred languages.

#### Acceptance Criteria

1. WHEN creating AI instances, THE Extension SHALL support expectedInputLanguages configuration
2. THE Extension SHALL support expectedContextLanguages configuration
3. THE Extension SHALL support outputLanguage configuration
4. THE Extension SHALL validate language support before processing
5. THE Extension SHALL handle unsupported language combinations gracefully

### Requirement 13: Context and Shared Context Management

**User Story:** As a user, I want AI operations to use relevant context, so that results are more accurate and aligned with my needs.

#### Acceptance Criteria

1. WHEN performing AI operations, THE Extension SHALL provide relevant context to improve results
2. THE Extension SHALL use sharedContext for consistent multi-output scenarios
3. THE Extension SHALL use per-request context for specific customization
4. THE Extension SHALL manage context size to avoid token limits
5. THE Extension SHALL clear context when appropriate to prevent stale information

### Requirement 14: Performance and Caching

**User Story:** As a user, I want fast AI responses, so that the extension feels responsive and doesn't slow down my browsing.

#### Acceptance Criteria

1. WHEN the same text is checked multiple times, THE Extension SHALL use cached results
2. THE Extension SHALL implement appropriate cache invalidation strategies
3. THE Extension SHALL reuse AI instances when possible to avoid recreation overhead
4. THE Extension SHALL clean up unused AI sessions to free memory
5. THE Extension SHALL optimize for minimal latency in user interactions

### Requirement 15: Background Service Worker Migration

**User Story:** As a developer, I want the background service worker to coordinate Built-in AI operations, so that the extension architecture remains clean and maintainable.

#### Acceptance Criteria

1. THE Extension SHALL remove all cloud API key management code from background.js
2. THE Extension SHALL remove all fetch() calls to Google Cloud Gemini API endpoints
3. THE Extension SHALL coordinate Built-in AI operations between content scripts and side panel
4. THE Extension SHALL handle message passing for AI requests
5. THE Extension SHALL maintain existing context menu and side panel functionality

### Requirement 16: Content Script Integration

**User Story:** As a user, I want AI features to work seamlessly in web pages, so that I can use grammar checking, translation, and other features without disruption.

#### Acceptance Criteria

1. THE Extension SHALL integrate Built-in AI APIs into content scripts (grammar-checker.js, textfield-assistant.js)
2. THE Extension SHALL maintain existing UI components and styling
3. THE Extension SHALL handle cross-origin iframe restrictions using Permissions Policy
4. THE Extension SHALL ensure AI operations don't block page rendering
5. THE Extension SHALL clean up resources when content scripts are unloaded

### Requirement 17: Side Panel AI Integration

**User Story:** As a user, I want the side panel to use Built-in AI for all features, so that I have a consistent local-first AI experience.

#### Acceptance Criteria

1. THE Extension SHALL integrate Built-in AI APIs into sidepanel.js
2. THE Extension SHALL remove all cloud API calls from the side panel
3. THE Extension SHALL maintain existing side panel UI and features
4. THE Extension SHALL handle AI operations within the side panel context
5. THE Extension SHALL provide status indicators for AI operations

### Requirement 18: Testing and Validation

**User Story:** As a developer, I want to test Built-in AI integration thoroughly, so that I can ensure the extension works correctly before submission.

#### Acceptance Criteria

1. THE Extension SHALL include test pages for each Built-in AI API
2. THE Extension SHALL validate API availability on extension load
3. THE Extension SHALL log API status and errors for debugging
4. THE Extension SHALL provide a way to test each feature independently
5. THE Extension SHALL verify that no cloud API calls are made

### Requirement 19: Documentation and Code Comments

**User Story:** As a developer, I want clear documentation and code comments, so that I can understand and maintain the Built-in AI integration.

#### Acceptance Criteria

1. THE Extension SHALL include inline comments explaining Built-in AI usage
2. THE Extension SHALL document API configuration options
3. THE Extension SHALL provide examples of proper API usage
4. THE Extension SHALL document error handling strategies
5. THE Extension SHALL maintain a README with Built-in AI setup instructions

### Requirement 20: Hackathon Compliance with Hybrid Approach

**User Story:** As a hackathon participant, I want the extension to showcase Built-in AI as the primary implementation while maintaining cloud fallback, so that it's eligible for judging and demonstrates the full potential of Chrome's Built-in AI.

#### Acceptance Criteria

1. THE Extension SHALL default to Chrome Built-in AI APIs as the primary AI provider
2. THE Extension SHALL prominently showcase Built-in AI capabilities in the UI and documentation
3. THE Extension SHALL demonstrate client-side AI processing with Built-in AI
4. THE Extension SHALL showcase privacy, offline access, and cost-efficiency benefits of Built-in AI
5. THE Extension SHALL work with Gemini Nano model running locally in Chrome
6. THE Extension SHALL support Cloud API as a fallback option for when Built-in AI is unavailable
7. THE Extension SHALL clearly indicate which provider is active in the UI
8. THE Extension SHALL emphasize Built-in AI in hackathon submission materials
9. THE Extension SHALL include documentation explaining the hybrid architecture and its benefits
