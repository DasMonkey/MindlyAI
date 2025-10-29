# Mentelo - AI Content Assistant Chrome Extension

A powerful Chrome extension that combines Chrome's Built-in AI (Gemini Nano) with Cloud AI fallback, providing intelligent assistance for writing, reading, and browsing the web with privacy-first, offline-capable features.

## ✨ Features

### 🎯 Core Features
- **✨ Text Field Assistant**: Grammarly-like AI writing assistant on any text field
- **📝 Grammar Checker**: Real-time grammar and spelling corrections with visual feedback (Built-in AI Proofreader API)
- **📄 Page Summarization**: Get AI-powered summaries of any webpage (Built-in AI Summarizer)
- **🌐 Translation**: Translate entire pages or selected text with HTML preservation (Built-in AI Translator)
- **🎤 Call Mindy**: Voice AI assistant with real-time conversation
- **💬 Chat with Page**: Context-aware chat about any webpage
- **🔊 Text to Speech**: Listen to selected text with voice control
- **📱 Social Media Content**: Generate viral posts for X, LinkedIn, Instagram
- **🔖 Smart Bookmarks**: Save text selections with AI-powered organization
- **📹 YouTube Summaries**: 7 types of video summaries with timestamps
- **📄 PDF OCR**: Extract and analyze text from PDF documents
- **🖼️ Image Analysis**: Extract text from images and get detailed explanations

### 🔒 Privacy-First Hybrid AI Architecture
- **Built-in AI (Gemini Nano)**: Runs locally on your device for grammar checking, translation, and summarization - no data leaves your browser
- **Cloud AI Fallback**: Seamlessly switches to Gemini API when Built-in AI is unavailable
- **Smart Provider Selection**: Automatically chooses the best AI provider based on availability and task requirements
- **Offline Capable**: Core features work without internet when Built-in AI is available

## 🚀 Installation

### Prerequisites
- **Chrome Browser**: Version 127+ (for Built-in AI support)
- **Chrome Flags** (for Built-in AI features):
  1. Navigate to `chrome://flags`
  2. Enable these flags:
     - `#optimization-guide-on-device-model` → Enabled BypassPerfRequirement
     - `#text-safety-classifier` → Enabled
     - `#summarization-api-for-gemini-nano` → Enabled
     - `#translation-api` → Enabled
     - `#rewriter-api` → Enabled
     - `#writer-api` → Enabled
  3. Restart Chrome
  4. Wait for Gemini Nano to download (check `chrome://components`)

### Step 1: Get a Gemini API Key (Optional - for Cloud AI fallback)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (keep it secure!)

**Note**: The extension works with Built-in AI without an API key, but having one enables cloud fallback for advanced features.

### Step 2: Install the Extension
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the extension folder
6. The extension icon should appear in your toolbar

### Step 3: Configure the Extension
1. Click the extension icon in the toolbar to open the side panel
2. Check the AI Provider Status to see which features are available
3. (Optional) Paste your Gemini API key for cloud fallback features
4. Click "Save API Key"
5. You're ready to go! ✅

### AI Provider Status
The extension shows real-time status of available AI providers:
- **🟢 Built-in AI Available**: Features run locally on your device
- **🟡 Cloud AI Available**: Features use Gemini API (requires API key)
- **🔴 Unavailable**: Feature not accessible (check Chrome flags or API key)

## 📖 How to Use

### ✨ Text Field Assistant
Your AI-powered writing companion that appears on any text field:

**How it works:**
1. Focus any text field (Gmail, Twitter, LinkedIn, etc.)
2. A purple sparkle icon (✨) appears in the bottom-right corner
3. Click it to open the toolbar with 7 quick actions:
   - **Fix** - Correct grammar & spelling
   - **Clear** - Simplify and clarify
   - **Casual** - Friendly, conversational tone
   - **Formal** - Professional writing
   - **Shorter** - Condense while keeping meaning
   - **Rephrase** - Alternative phrasings
   - **AI** - Open full AI assistant

**Features:**
- ✅ Works on Gmail, Twitter, LinkedIn, Facebook, GitHub, and more
- ✅ Before/after comparison view
- ✅ One-click apply
- ✅ Beautiful animations
- ✅ Keyboard shortcuts (Esc to close)

### 📝 Grammar Checker
Real-time grammar and spelling corrections as you type using Chrome's Built-in Proofreader API:

**How it works:**
1. Type in any text field
2. Red dotted underlines appear on errors (1 second after typing)
3. Hover over underline to see suggestions
4. Click "Apply" to fix instantly

**Features:**
- ✅ Automatic error detection using Built-in AI (runs locally)
- ✅ Visual feedback with underlines
- ✅ Hover suggestions with explanations
- ✅ One-click corrections
- ✅ Privacy-first: No data sent to cloud
- ✅ Works offline when Built-in AI is available

### 🎤 Call Mindy - Voice AI Assistant
Have natural voice conversations with AI about any webpage:

**How it works:**
1. Click "Call Mindy" button in floating popup
2. Allow microphone access
3. Start speaking - AI responds with voice
4. See real-time transcription of both sides

**Features:**
- ✅ Real-time voice conversation
- ✅ Context-aware (understands page content)
- ✅ High-quality voice synthesis (24kHz)
- ✅ Interrupt support
- ✅ Beautiful purple gradient UI

### 💬 Chat with Page
Ask questions about the current page:

**How it works:**
1. Click "Chat with Page" button
2. Dashboard opens with context from current page
3. Type your question
4. AI responds based on page content

**Features:**
- ✅ Context-aware responses
- ✅ Works with PDFs (OCR-based)
- ✅ Chat history maintained
- ✅ Clean conversation UI

### 🔊 Text to Speech
Listen to any selected text:

**How it works:**
1. Select text on the page
2. Click "Text to Speech" button
3. Audio plays automatically
4. Use pause/resume controls

**Features:**
- ✅ Multiple voice options
- ✅ Speed control (0.5x - 2.0x)
- ✅ Pause/Resume controls
- ✅ Queue management for long text

### 📹 YouTube Summaries
Get instant summaries of YouTube videos:

**How it works:**
1. Navigate to any YouTube video
2. Panel appears in right sidebar
3. Choose from 7 summary types:
   - ⚡ TLDR
   - 📝 Detailed Summary
   - 📚 Key Concepts
   - ⏱️ Timestamped Chapters
   - 💡 Main Takeaways
   - 📋 Study Notes
   - 📱 Social Media Posts
4. Click to generate

**Features:**
- ✅ 7 different summary types
- ✅ Clickable timestamps for navigation
- ✅ Copy to clipboard
- ✅ Collapsible panel

### 📄 PDF OCR
Extract and analyze text from PDF documents:

**How it works:**
1. Open a PDF in Chrome
2. Click "Call Mindy" or "Chat with Page"
3. Current visible page is captured and analyzed
4. AI extracts text using OCR

**Features:**
- ✅ Automatic PDF detection
- ✅ OCR-based text extraction
- ✅ Works with scanned PDFs
- ✅ Context limits protected (10K chars)

### 🖼️ Image Analysis
Extract text and get explanations from images:

**How it works:**
1. Right-click any image
2. Select "MindlyAI: Extract texts" or "Explain This Image"
3. Results appear in dashboard

**Features:**
- ✅ OCR text extraction
- ✅ Detailed image explanations
- ✅ Alt-text generation
- ✅ Chart/diagram analysis

### Floating Popup
A floating popup appears on every page with quick access buttons:
- **Summarize Page**: Get a concise summary of the current page
- **Translate Page**: Translate the entire page content
- **Translate Text**: Translate selected text (select text first)
- **Text to Speech**: Listen to selected text
- **Chat with Page**: Ask questions about the current page
- **Call Mindy**: Start a voice conversation
- **Social Content**: Create viral social media posts
- **Save Bookmark**: Save selected text or page to bookmarks
- **Open Dashboard**: Open the full side panel dashboard

The popup is:
- ✅ Draggable - move it anywhere on the page
- ✅ Collapsible - minimize it when not needed
- ✅ Beautiful dark theme with rounded corners
- ✅ Adapts to side panel position

### Side Panel Dashboard
Click "Open Dashboard" or the extension icon to access:

#### ⚙️ Settings Tab
- Configure Gemini API key
- Set translation target language
- Choose Mindy voice
- Customize TTS settings
- View API status

#### 💬 Chat Tab
- Chat with page context
- View conversation history
- Refresh or start new session
- Context-aware responses

#### 🎤 Mindy Tab
- Voice AI assistant controls
- Real-time conversation
- Microphone mute/unmute
- End call and new session

#### 📝 Generate Tab
- View current task status
- See AI-generated results
- Copy, download, or regenerate content

#### 🔖 Bookmarks Tab
- View all saved bookmarks
- AI-powered organization into groups
- Delete individual bookmarks
- Visit original pages

#### 📜 History Tab
- View all generation history
- Revisit previous results
- Clear history

#### 📋 Clipboard Tab
- View clipboard history
- Paste recent items
- Clear clipboard

### Context Menu
Right-click on selected text to:
- Translate Selected Text
- Copy to Clipboard

Right-click on images to:
- Extract texts from image (OCR)
- Explain This Image (detailed analysis)

## 🛠️ Technical Details

### Built With
- **Manifest V3**: Latest Chrome extension standard
- **Chrome Built-in AI APIs**:
  - Proofreader API (grammar checking)
  - Translator API (translation)
  - Summarizer API (summarization)
  - Rewriter API (text rewriting)
  - Writer API (content generation)
- **Google Gemini API** (Cloud fallback):
  - Gemini 2.5 Flash (general tasks and TTS)
  - Gemini 2.5 Flash Native Audio (voice conversations - Mindy)
  - Gemini 2.0 Flash (legacy general tasks)
  - Gemini Flash Lite (grammar checking fallback)
- **Vanilla JavaScript**: No frameworks, fast and lightweight
- **Modern CSS**: Gradient backgrounds, smooth animations
- **Web Audio API**: For voice capture and playback
- **WebSocket**: Real-time communication for Mindy

### File Structure
```
MindlyAI/
├── manifest.json               # Extension configuration
├── background.js               # Service worker for background tasks
├── content.js                  # Content script (floating popup)
├── content.css                 # Styles for floating popup
├── textfield-assistant.js      # Text field AI assistant
├── textfield-assistant.css     # Text field assistant styles
├── grammar-checker.js          # Grammar checker logic
├── grammar-checker.css         # Grammar checker styles
├── youtube-summary.js          # YouTube summary feature
├── youtube-summary.css         # YouTube summary styles
├── pdf-content.js              # PDF support
├── gemini-live-connection.js   # Mindy voice assistant
├── gemini-live-modal.html      # Mindy UI
├── gemini-live-modal.css       # Mindy styles
├── audio-processor.js          # Audio processing
├── sidepanel.html              # Dashboard HTML
├── sidepanel.css               # Dashboard styles
├── sidepanel.js                # Dashboard functionality
├── icons/                      # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── Markdown files/             # Documentation
│   ├── TEXT-FIELD-ASSISTANT.md
│   ├── GRAMMAR-CHECKER-FEATURE.md
│   ├── CALL_MINDY_README.md
│   ├── YOUTUBE-SUMMARY-FEATURE.md
│   └── more...
└── README.md                   # This file
```

### Permissions Used
- **activeTab**: Access current tab content
- **storage**: Save API key, bookmarks, history, settings
- **scripting**: Inject content scripts
- **contextMenus**: Right-click menu options
- **sidePanel**: Display side panel dashboard
- **clipboardRead/Write**: Clipboard operations
- **host_permissions**: Access all URLs for content extraction

## 🎯 Features in Detail

### Summarization
Uses AI to extract key points, main ideas, and important takeaways from any webpage. Perfect for:
- Research papers
- News articles
- Blog posts
- Documentation

### Translation
Supports multiple languages with HTML preservation:
- Auto-detect source language
- Translate to English, Spanish, French, German, Chinese, Japanese, Korean, Portuguese, Russian, Arabic, Hindi, Italian
- Maintains formatting, structure, and HTML tags
- Works on entire pages or selected text
- In-place translation with visual feedback

### YouTube Summaries
7 different summary types:
- **TLDR**: Quick 3-5 bullet points
- **Detailed Summary**: Comprehensive overview
- **Key Concepts**: Educational focus
- **Timestamped Chapters**: 5-8 navigable sections
- **Main Takeaways**: Actionable insights
- **Study Notes**: Structured learning guide
- **Social Media Posts**: Twitter, LinkedIn, Instagram formats

### Voice Features

**Call Mindy:**
- Real-time voice conversation
- Context-aware responses
- High-quality synthesis (24kHz)
- Interrupt support
- Visual transcription

**Text to Speech:**
- Multiple voice options (Aoede, Kore, Austris, etc.)
- Speed control (0.5x - 2.0x)
- Queue management
- Pause/Resume controls

### PDF & Image Support

**PDF OCR:**
- Automatic text extraction
- Works with scanned PDFs
- Page-by-page analysis
- Context limit protection

**Image Analysis:**
- OCR text extraction
- Detailed explanations
- Alt-text generation
- Chart/diagram analysis

### Social Media Content
Generates viral-format posts with:
- **Hook**: Attention-grabbing opening
- **Main Content**: Value-packed information
- **Call to Action**: Engagement driver
- **Hashtags**: Relevant and trending

Optimized for:
- Twitter/X (character limits)
- LinkedIn (professional tone)
- Instagram (visual descriptions)

### AI Bookmark Organization
Automatically groups bookmarks by:
- Topic similarity
- Content type
- Theme patterns
- Semantic relationships

## 🔒 Privacy & Security

- ✅ **Built-in AI runs locally**: Grammar checking, translation, and summarization happen on your device
- ✅ **No data leaves your browser** when using Built-in AI features
- ✅ Your API key is stored locally in Chrome storage
- ✅ Cloud AI only used when Built-in AI is unavailable or for advanced features
- ✅ All bookmarks and history are stored locally
- ✅ Transparent provider status: Always know which AI is being used

## 🐛 Troubleshooting

### Built-in AI Not Available
- Check Chrome version (127+ required)
- Verify Chrome flags are enabled (see Installation)
- Check `chrome://components` for Gemini Nano download status
- Restart Chrome after enabling flags
- Wait for model download to complete (can take several minutes)

### API Key Issues
- Make sure your API key is valid
- Check if you have API quota remaining
- Verify the key is correctly copied (no extra spaces)
- Built-in AI features work without an API key

### Extension Not Working
- Refresh the page after installation
- Check browser console for errors (F12)
- Ensure "Developer mode" is enabled
- Try reinstalling the extension
- Check AI Provider Status in the side panel

### Popup Not Appearing
- Check if the page allows content scripts
- Some pages (chrome://, chrome-extension://) don't support extensions
- Try on a regular webpage like google.com

## 🌟 Future Enhancements

Planned features:
- [ ] Multi-page PDF support with page navigation
- [ ] Voice selection for Mindy
- [ ] Batch image processing
- [ ] Export chat history
- [ ] Custom AI prompts
- [ ] Keyboard shortcuts
- [ ] Dark/light theme toggle
- [ ] Multi-language UI

## 📝 Notes

- **API Costs**: The Gemini API has free tier limits. Monitor your usage at [Google AI Studio](https://aistudio.google.com/)
- **Rate Limits**: Avoid rapid consecutive requests
- **Content Length**: Very long pages are automatically truncated to API limits
- **Best Results**: Works best on text-heavy pages

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Submit bug reports and feature requests via GitHub Issues
- Fork the repository and submit Pull Requests
- Improve documentation
- Share feedback and suggestions

Please follow standard coding practices and include clear commit messages.

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

Copyright 2024 Mentelo

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## 🙏 Acknowledgments

- Google Gemini API for powerful AI capabilities
- Chrome Extensions documentation
- The open-source community

---

**Enjoy your AI-powered browsing experience!** ✨
