# AI Content Assistant - Chrome Extension

A powerful Chrome extension powered by Google Gemini AI that helps you summarize pages, translate content, create mindmaps, generate social media content, and manage bookmarks with AI organization.

## ✨ Features

### 🎯 Core Features
- **✨ Text Field Assistant**: Grammarly-like AI writing assistant on any text field (NEW!)
- **📄 Page Summarization**: Get AI-powered summaries of any webpage
- **🌐 Page Translation**: Translate entire pages or selected text
- **🧠 Mindmap Generation**: Create visual mindmap structures from content
- **📱 Social Media Content**: Generate viral-format posts for X, LinkedIn, Instagram
- **🔖 Smart Bookmarks**: Save text selections with AI-powered organization

### 🎨 User Interface
- **Floating Popup**: Beautiful, draggable on-page popup with dark theme
- **Side Panel Dashboard**: Comprehensive dashboard for all features
- **Context Menu**: Right-click menu for quick actions
- **Responsive Design**: Works seamlessly on all screen sizes

## 🚀 Installation

### Step 1: Get a Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (keep it secure!)

### Step 2: Install the Extension
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the extension folder
6. The extension icon should appear in your toolbar

### Step 3: Configure the Extension
1. Click the extension icon in the toolbar to open the side panel
2. Paste your Gemini API key in the setup section
3. Click "Save API Key"
4. You're ready to go! ✅

## 📖 How to Use

### ✨ Text Field Assistant (NEW!)
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

See [TEXT-FIELD-ASSISTANT.md](TEXT-FIELD-ASSISTANT.md) for full documentation.

### Floating Popup
A floating popup appears on every page with quick access buttons:
- **Summarize Page**: Get a concise summary of the current page
- **Translate Page**: Translate the entire page content
- **Translate Text**: Translate selected text (select text first)
- **Create Mindmap**: Generate a hierarchical mindmap structure
- **Social Content**: Create viral social media posts
- **Save Bookmark**: Save selected text or page to bookmarks
- **Open Dashboard**: Open the full side panel dashboard

The popup is:
- ✅ Draggable - move it anywhere on the page
- ✅ Collapsible - minimize it when not needed
- ✅ Beautiful dark theme with rounded corners

### Side Panel Dashboard
Click "Open Dashboard" or the extension icon to access:

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

### Context Menu
Right-click on selected text to:
- Translate Selected Text
- Save to AI Bookmarks

## 🛠️ Technical Details

### Built With
- **Manifest V3**: Latest Chrome extension standard
- **Google Gemini API**: Gemini 1.5 Flash model
- **Vanilla JavaScript**: No frameworks, fast and lightweight
- **Modern CSS**: Gradient backgrounds, smooth animations

### File Structure
```
Chrome-ext-GoogleAI/
├── manifest.json               # Extension configuration
├── background.js               # Service worker for background tasks
├── content.js                 # Content script (floating popup)
├── content.css                # Styles for floating popup
├── textfield-assistant.js     # Text field AI assistant (NEW!)
├── textfield-assistant.css    # Text field assistant styles (NEW!)
├── sidepanel.html             # Dashboard HTML
├── sidepanel.css              # Dashboard styles
├── sidepanel.js               # Dashboard functionality
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── TEXT-FIELD-ASSISTANT.md    # Text assistant documentation (NEW!)
├── TESTING-GUIDE.md           # Testing guide (NEW!)
└── README.md                  # This file
```

### Permissions Used
- **activeTab**: Access current tab content
- **storage**: Save API key, bookmarks, history
- **scripting**: Inject content scripts
- **contextMenus**: Right-click menu options
- **sidePanel**: Display side panel dashboard
- **host_permissions**: Access all URLs for content extraction

## 🎯 Features in Detail

### Summarization
Uses AI to extract key points, main ideas, and important takeaways from any webpage. Perfect for:
- Research papers
- News articles
- Blog posts
- Documentation

### Translation
Supports multiple languages:
- Auto-detect source language
- Translate to English, Spanish, French, Chinese
- Maintains formatting and structure
- Works on entire pages or selected text

### Mindmap Generation
Creates hierarchical structures with:
- Main topics
- Subtopics
- Details and connections
- Clear visual organization

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

- ✅ Your API key is stored locally in Chrome storage
- ✅ No data is sent to third-party servers (except Google Gemini API)
- ✅ All processing happens in your browser
- ✅ Bookmarks and history are stored locally

## 🐛 Troubleshooting

### API Key Issues
- Make sure your API key is valid
- Check if you have API quota remaining
- Verify the key is correctly copied (no extra spaces)

### Extension Not Working
- Refresh the page after installation
- Check browser console for errors (F12)
- Ensure "Developer mode" is enabled
- Try reinstalling the extension

### Popup Not Appearing
- Check if the page allows content scripts
- Some pages (chrome://, chrome-extension://) don't support extensions
- Try on a regular webpage like google.com

## 🌟 Future Enhancements

Planned features:
- [ ] Web app for syncing bookmarks across devices
- [ ] Custom AI models selection
- [ ] Export bookmarks to various formats
- [ ] Browser sync for settings
- [ ] More social media platforms
- [ ] Image generation integration
- [ ] Voice input support
- [ ] Multi-language UI

## 📝 Notes

- **API Costs**: The Gemini API has free tier limits. Monitor your usage at [Google AI Studio](https://aistudio.google.com/)
- **Rate Limits**: Avoid rapid consecutive requests
- **Content Length**: Very long pages are automatically truncated to API limits
- **Best Results**: Works best on text-heavy pages

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is for educational and personal use. Respect Google's API terms of service.

## 🙏 Acknowledgments

- Google Gemini API for powerful AI capabilities
- Chrome Extensions documentation
- The open-source community

---

**Enjoy your AI-powered browsing experience!** ✨
