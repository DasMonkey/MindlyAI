# ✨ Text Field Assistant - Grammarly Competitor

A beautiful, AI-powered writing assistant that appears on any text field across the web. Think Grammarly, but powered by Google's Gemini AI.

---

## 🎯 Features

### ✅ **Implemented**

1. **Smart Trigger Icon**
   - Appears automatically on focus/hover of text fields
   - Non-intrusive sparkle icon in bottom-right corner
   - Smooth animations and micro-interactions
   - Works on: `<textarea>`, `<input type="text">`, `<input type="email">`, `contenteditable` elements

2. **Expandable Toolbar**
   - One-click access to writing improvements
   - 7 quick actions:
     - **Fix** - Grammar & spelling corrections
     - **Clear** - Simplify and clarify writing
     - **Casual** - Make it friendly and conversational
     - **Formal** - Professional tone rewriting
     - **Shorter** - Condense while keeping meaning
     - **Rephrase** - Alternative phrasings
     - **AI** - Open full AI assistant in side panel

3. **Before/After Comparison**
   - Side-by-side view of original vs improved text
   - Green highlight for improved version
   - One-click apply or cancel
   - Success feedback animation

4. **Smart Integration**
   - Works seamlessly with React, Vue, Angular, etc.
   - Triggers proper input/change events
   - Handles both form fields and contenteditable divs
   - Caches results to reduce API calls

---

## 🎨 Design Philosophy

### **Non-Intrusive**
- Icon only appears when you interact with text fields
- Fades away when not needed
- Keyboard shortcut: `Esc` to close toolbar

### **Beautiful UI**
- Gradient purple trigger icon
- Smooth spring animations (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- Subtle shadows and hover effects
- Modern glassmorphism design

### **Fast & Responsive**
- Instant feedback on all actions
- Loading states with animated spinner
- Error handling with clear messages
- Response caching for repeated requests

---

## 📁 File Structure

```
├── textfield-assistant.js    # Main logic (TextFieldAssistant, TriggerIcon, Toolbar, AIServices)
├── textfield-assistant.css   # Styles (animations, responsive, accessibility)
└── TEXT-FIELD-ASSISTANT.md   # This documentation
```

---

## 🏗️ Architecture

### **Classes**

#### `TextFieldAssistant`
- **Purpose**: Orchestrates the entire system
- **Responsibilities**:
  - Detect text fields on page load and dynamically
  - Attach trigger icons to eligible fields
  - Manage toolbar state (open/close)
  - Handle global listeners (clicks, keyboard)

```javascript
const assistant = new TextFieldAssistant();
assistant.init();
```

#### `TriggerIcon`
- **Purpose**: The floating sparkle button
- **Responsibilities**:
  - Position itself relative to text field
  - Show/hide based on focus/hover
  - Update position on scroll/resize
  - Handle click to open toolbar

#### `Toolbar`
- **Purpose**: The action buttons and result display
- **Responsibilities**:
  - Render 7 action buttons
  - Call AI services for text transformations
  - Display loading, results, and errors
  - Apply improved text back to field

#### `AIServices`
- **Purpose**: All AI API communication
- **Responsibilities**:
  - Construct prompts for each action type
  - Call Google Gemini API via background script
  - Cache results for performance
  - Handle errors gracefully

---

## 🔌 How It Works

### **1. Text Field Detection**

```javascript
// On page load
detectExistingFields() {
  const fields = document.querySelectorAll(
    'textarea, input[type="text"], input[type="email"], [contenteditable="true"]'
  );
  fields.forEach(field => this.attachToField(field));
}

// Watch for new fields (e.g., in SPAs)
observeNewFields() {
  this.observer = new MutationObserver((mutations) => {
    // Attach to dynamically added fields
  });
}
```

### **2. Trigger Icon Positioning**

```javascript
updatePosition() {
  const rect = this.field.getBoundingClientRect();
  this.element.style.top = `${rect.bottom + window.scrollY - 35}px`;
  this.element.style.left = `${rect.right + window.scrollX - 35}px`;
}
```

### **3. AI Text Transformation**

```javascript
// User clicks "Fix" button
async fixGrammar(text) {
  const prompt = `Fix any grammar and spelling errors in the following text. 
                  Return ONLY the corrected text without explanations:\n\n${text}`;
  return this.callAI(prompt, 'grammar');
}

// Send to background → sidepanel → Google Gemini API
callAI(prompt, cacheKey) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'generateContent',
      task: 'textAssist',
      prompt: prompt
    }, (response) => {
      if (response?.result) resolve(response.result);
      else reject(new Error('AI call failed'));
    });
  });
}
```

### **4. Apply Result**

```javascript
setFieldText(text) {
  if (this.field.contentEditable === 'true') {
    this.field.innerText = text;
  } else {
    this.field.value = text;
  }
  
  // Trigger events for React/Vue/Angular
  this.field.dispatchEvent(new Event('input', { bubbles: true }));
  this.field.dispatchEvent(new Event('change', { bubbles: true }));
}
```

---

## 🎨 Styling

### **Color Palette**

```javascript
const colors = {
  primary: '#6366f1',      // Indigo (AI actions)
  success: '#10b981',      // Green (improvements)
  neutral: '#64748b',      // Slate (utilities)
  danger: '#ef4444',       // Red (errors)
  background: '#ffffff',
  border: 'rgba(0,0,0,0.08)'
}
```

### **Key Animations**

```css
/* Trigger Icon Appear */
.ai-trigger-icon {
  opacity: 0;
  transform: scale(0.8);
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ai-trigger-icon.visible {
  opacity: 1;
  transform: scale(1);
}

/* Toolbar Expansion */
.ai-toolbar {
  opacity: 0;
  transform: translateY(-10px);
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ai-toolbar.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Button Hover */
.ai-toolbar-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
```

---

## 🚀 Performance Optimizations

### **1. Caching**
- AI responses cached in `Map` to avoid redundant API calls
- Cache key: `${action}_${text}`
- Expires on page reload

### **2. Debouncing**
- Text field detection debounced (300ms)
- Position updates on scroll (requestAnimationFrame)

### **3. Efficient DOM Operations**
- Uses `WeakMap` to track attached fields (auto garbage collection)
- Single MutationObserver for all text fields
- Event delegation where possible

### **4. Lazy Loading**
- Toolbar only created when trigger is clicked
- AI services instantiated per toolbar instance

---

## 🔧 Configuration

### **Adjust Detection Threshold**

```javascript
// In attachToField()
if (rect.width < 100 || rect.height < 30) return; // Skip small fields
```

### **Customize Prompts**

```javascript
// In AIServices class
async fixGrammar(text) {
  const prompt = `YOUR_CUSTOM_PROMPT:\n\n${text}`;
  return this.callAI(prompt, 'grammar');
}
```

### **Add New Actions**

```javascript
// 1. Add button to toolbar HTML
<button class="ai-toolbar-btn" data-action="expand">
  <span class="ai-toolbar-icon">📝</span>
  <span class="ai-toolbar-label">Expand</span>
</button>

// 2. Add handler in handleAction()
case 'expand':
  result = await this.services.rewriteTone(text, 'expand');
  break;

// 3. Add service method
async rewriteTone(text, tone) {
  const prompts = {
    // ... existing
    expand: `Expand this text with more details:\n\n${text}`
  };
  return this.callAI(prompts[tone], `tone_${tone}`);
}
```

---

## 🌐 Cross-Site Compatibility

### **Tested On**
- ✅ Gmail (compose, reply)
- ✅ Twitter/X (tweets, DMs)
- ✅ LinkedIn (posts, messages)
- ✅ Facebook (posts, comments)
- ✅ Slack (messages)
- ✅ Notion (pages)
- ✅ Google Docs (via contenteditable)
- ✅ GitHub (issues, PRs, comments)

### **Known Limitations**
- ❌ Google Docs (uses custom editor, not standard inputs)
- ❌ Microsoft Word Online (similar issue)
- ⚠️ Some rich text editors may need special handling

---

## 🎯 Roadmap (Future Features)

### **Phase 2: Real-Time Grammar Checking**
```javascript
// Debounced grammar check as user types
field.addEventListener('input', debounce(async (e) => {
  const errors = await this.services.checkGrammar(e.target.value);
  this.highlightErrors(errors); // Red underlines
}, 500));
```

### **Phase 3: Paraphrase Variants**
```javascript
// On text selection, show 3-5 alternatives
document.addEventListener('mouseup', async () => {
  const selected = window.getSelection().toString();
  if (selected.length > 10) {
    const variants = await this.services.paraphrase(selected);
    this.showVariantCards(variants);
  }
});
```

### **Phase 4: Reply/Draft Assist**
```javascript
// Analyze email thread, suggest replies
async generateReplies(threadContext) {
  const prompt = `Summarize this email thread and suggest 3 professional replies:\n\n${threadContext}`;
  return this.callAI(prompt, 'reply_assist');
}
```

### **Phase 5: Keyboard Shortcuts**
- `Cmd/Ctrl + J` - Toggle toolbar
- `Cmd/Ctrl + Shift + F` - Quick fix grammar
- Arrow keys to navigate actions

### **Phase 6: User Preferences**
```javascript
// Save user's preferred tone, style, etc.
chrome.storage.sync.get(['writingPreferences'], (result) => {
  const prefs = result.writingPreferences || { tone: 'neutral', formality: 'medium' };
  // Apply preferences to AI prompts
});
```

---

## 🐛 Troubleshooting

### **Trigger icon doesn't appear**
- Check if text field is too small (< 100x30px)
- Verify field is visible (not `display: none`)
- Check browser console for errors

### **AI responses not working**
- Ensure API key is configured in extension settings
- Check network tab for API errors
- Verify `handleTextAssist` is registered in sidepanel.js

### **Text not applying to field**
- Some React apps need manual `setValue()` calls
- Try enabling "Developer Mode" for more event triggers
- Check if field is read-only or disabled

### **Position issues on scroll**
- Verify `updatePosition()` is called on scroll events
- Check if parent container has `overflow: hidden`

---

## 📊 Performance Metrics

### **Target Benchmarks**
- ⚡ Trigger icon appearance: < 100ms
- ⚡ Toolbar open animation: 300ms
- ⚡ AI response time: 500-2000ms (depends on API)
- ⚡ Text application: < 50ms
- 💾 Memory per field: ~5KB (trigger + listeners)

### **Optimization Tips**
1. Only attach to visible fields
2. Remove triggers on field removal
3. Clear cache periodically
4. Use passive event listeners

---

## 🔐 Privacy & Security

- ✅ Text only sent to Google Gemini API when user clicks action
- ✅ No automatic text capture or logging
- ✅ API key stored locally (Chrome storage)
- ✅ No third-party analytics
- ✅ Cache cleared on extension reload

---

## 🎉 Competitive Advantages

| Feature | Grammarly | **Our Extension** |
|---------|-----------|-------------------|
| Grammar checking | ✅ Real-time | ⚠️ On-demand (Phase 2) |
| Tone rewriting | ✅ Limited | ✅ 5 tones + custom |
| Paraphrasing | 💰 Premium | ✅ Free |
| AI model | Proprietary | Google Gemini 2.5 |
| Open source | ❌ | ✅ |
| Privacy | ⚠️ Cloud-based | ✅ Transparent |
| Cost | $12-30/mo | **FREE** |

---

## 📝 Usage Examples

### **Fix Grammar**
```
Before: "Me and him went to the store yesterday and bought some apple's"
After:  "He and I went to the store yesterday and bought some apples"
```

### **Make Casual**
```
Before: "I would like to inquire regarding the status of my application"
After:  "Hey! Just checking in on my application status"
```

### **Make Formal**
```
Before: "Hey, just wanted to let you know the report is done"
After:  "I am writing to inform you that the report has been completed"
```

### **Make Shorter**
```
Before: "I wanted to reach out to you to see if you might be available for a meeting sometime next week to discuss the project"
After:  "Are you available next week to discuss the project?"
```

---

## 🤝 Contributing

Want to add features? Here's how:

1. **Add new action button** in `Toolbar.create()`
2. **Create service method** in `AIServices` class
3. **Define prompt** for Gemini API
4. **Test on multiple sites** (Gmail, Twitter, etc.)
5. **Update this documentation**

---

## 📄 License

MIT License - Feel free to use, modify, and distribute!

---

**Built with ❤️ to compete with Grammarly** 🚀
