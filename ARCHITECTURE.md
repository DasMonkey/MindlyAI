# 🏗️ Text Field Assistant Architecture

Visual overview of how the text field assistant works.

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Web Page                                │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  <textarea> │  │ <input>     │  │ [content-   │            │
│  │             │  │ type="text" │  │  editable]  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                     │
│         └────────────────┴────────────────┘                     │
│                          │                                      │
│                          │ Detected by                          │
│                          ▼                                      │
│         ┌────────────────────────────────┐                     │
│         │  TextFieldAssistant (Manager)  │                     │
│         │  - detectExistingFields()      │                     │
│         │  - observeNewFields()          │                     │
│         │  - attachToField()             │                     │
│         └────────────┬───────────────────┘                     │
│                      │                                          │
│                      │ Creates                                  │
│                      ▼                                          │
│         ┌────────────────────────────────┐                     │
│         │  TriggerIcon (✨)              │                     │
│         │  - Positioned bottom-right     │                     │
│         │  - Shows on focus/hover        │                     │
│         │  - Animated appearance         │                     │
│         └────────────┬───────────────────┘                     │
│                      │                                          │
│                      │ User clicks                              │
│                      ▼                                          │
│         ┌────────────────────────────────┐                     │
│         │  Toolbar (Action Panel)        │                     │
│         │  ┌────┬────┬────┬────┬────┐   │                     │
│         │  │Fix │Clear│Cas│Form│Short│  │                     │
│         │  └────┴────┴────┴────┴────┘   │                     │
│         │  ┌────┬────────────────────┐   │                     │
│         │  │Reph│      AI ✨        │   │                     │
│         │  └────┴────────────────────┘   │                     │
│         └────────────┬───────────────────┘                     │
│                      │                                          │
│                      │ User selects action                      │
│                      ▼                                          │
│         ┌────────────────────────────────┐                     │
│         │  AIServices                    │                     │
│         │  - fixGrammar()                │                     │
│         │  - rewriteTone()               │                     │
│         │  - rephrase()                  │                     │
│         │  - callAI() with caching       │                     │
│         └────────────┬───────────────────┘                     │
│                      │                                          │
└──────────────────────┼──────────────────────────────────────────┘
                       │
                       │ chrome.runtime.sendMessage()
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Background Script                              │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  chrome.runtime.onMessage.addListener()                │    │
│  │  - Routes messages to sidepanel                        │    │
│  │  - Manages extension state                             │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Forwards message
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Side Panel (sidepanel.js)                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  handleTextAssist(prompt)                              │    │
│  │  - Receives prompt from AIServices                     │    │
│  │  - Calls callGeminiApi(prompt)                         │    │
│  │  - Returns result via sendResponse()                   │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP POST request
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google Gemini API (2.5 Flash)                      │
│  https://generativelanguage.googleapis.com/v1beta/models/      │
│  gemini-2.5-flash:generateContent                               │
│                                                                 │
│  Input: { prompt, API key }                                     │
│  Output: { transformed_text }                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Returns result
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Side Panel Response                            │
│  - Receives AI-generated text                                   │
│  - Sends back to content script via callback                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Response callback
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Toolbar (Result Display)                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Original          →          Improved                 │    │
│  │  ┌─────────────┐           ┌─────────────┐            │    │
│  │  │ User's text │    →      │ AI improved │            │    │
│  │  └─────────────┘           └─────────────┘            │    │
│  │                                                        │    │
│  │  [Apply]  [Cancel]                                    │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ User clicks "Apply"
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Toolbar.setFieldText()                        │
│  - Updates field.value or field.innerText                       │
│  - Dispatches input/change events for React/Vue                 │
│  - Shows success animation                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                    ✅ COMPLETE!
```

---

## 🔄 Data Flow

### 1. **Field Detection Flow**
```
Page Load → TextFieldAssistant.init()
           ↓
      detectExistingFields()
           ↓
      querySelectorAll(selectors)
           ↓
      forEach field → attachToField(field)
           ↓
      new TriggerIcon(field, assistant)
           ↓
      Icon positioned & listeners attached
```

### 2. **User Action Flow**
```
User focuses field
       ↓
TriggerIcon.show() → Icon animates in
       ↓
User clicks icon
       ↓
assistant.showToolbar(trigger, field)
       ↓
new Toolbar(field, triggerElement)
       ↓
Toolbar.create() → Render 7 buttons
       ↓
User clicks "Fix" button
       ↓
handleAction('fix')
       ↓
services.fixGrammar(text)
       ↓
callAI(prompt, 'grammar')
       ↓
chrome.runtime.sendMessage({ action: 'generateContent', task: 'textAssist', prompt })
```

### 3. **AI Processing Flow**
```
Content Script → Background → Side Panel
       ↓
handleTextAssist(prompt)
       ↓
callGeminiApi(prompt)
       ↓
fetch('https://generativelanguage.googleapis.com/...')
       ↓
{ headers: { 'Content-Type': 'application/json' },
  body: { contents: [{ parts: [{ text: prompt }] }] } }
       ↓
Gemini processes & returns result
       ↓
Side Panel → Background → Content Script
       ↓
sendResponse({ result: improvedText })
       ↓
Toolbar.showResult(improvedText)
```

### 4. **Apply Changes Flow**
```
User clicks "Apply"
       ↓
applyResult()
       ↓
setFieldText(improvedText)
       ↓
if contenteditable:
    field.innerText = text
else:
    field.value = text
       ↓
field.dispatchEvent(new Event('input'))
field.dispatchEvent(new Event('change'))
       ↓
Button shows "✓ Applied"
       ↓
Result panel closes
       ↓
✅ Done!
```

---

## 🧩 Component Interactions

```
┌──────────────────────────────────────────────────────────────┐
│                    TextFieldAssistant                        │
│  (Singleton, manages entire system)                          │
│                                                              │
│  Properties:                                                 │
│  - attachedFields: WeakMap<Element, TriggerIcon>            │
│  - currentTrigger: TriggerIcon | null                       │
│  - activeToolbar: Toolbar | null                            │
│  - observer: MutationObserver                               │
│                                                              │
│  Methods:                                                    │
│  - init()                                                    │
│  - detectExistingFields()                                   │
│  - observeNewFields()                                       │
│  - attachToField(field)                                     │
│  - showToolbar(trigger, field)                              │
│  - closeToolbar()                                           │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ Creates & manages
             │
    ┌────────┴─────────┬─────────────────────────┐
    │                  │                          │
    ▼                  ▼                          ▼
┌─────────┐    ┌──────────┐             ┌────────────┐
│Trigger  │    │Toolbar   │             │AIServices  │
│Icon     │    │          │             │            │
│         │    │ Contains │◄────────────┤ Used by    │
│Per field│    │          │             │ Toolbar    │
└─────────┘    └──────────┘             └────────────┘
```

---

## 🎯 Class Responsibilities

### **TextFieldAssistant**
- **Role**: System coordinator
- **Lifecycle**: Created once on page load
- **Responsibilities**:
  - Scan page for text fields
  - Watch for dynamically added fields
  - Create TriggerIcons for each field
  - Manage single active toolbar
  - Handle global events (Esc, outside clicks)

### **TriggerIcon**
- **Role**: Visual trigger for each field
- **Lifecycle**: One per detected text field
- **Responsibilities**:
  - Position itself relative to field
  - Show/hide based on field state
  - Update position on scroll/resize
  - Notify assistant when clicked

### **Toolbar**
- **Role**: Action interface
- **Lifecycle**: Created on-demand when trigger clicked
- **Responsibilities**:
  - Display 7 action buttons
  - Handle user action selection
  - Show loading state
  - Display before/after comparison
  - Apply improved text to field
  - Clean up on close

### **AIServices**
- **Role**: API communication layer
- **Lifecycle**: One per Toolbar instance
- **Responsibilities**:
  - Format prompts for each action type
  - Send messages to background script
  - Cache responses to avoid duplicate API calls
  - Handle API errors

---

## 🗂️ State Management

```javascript
// Global State (window level)
window.textFieldAssistant = TextFieldAssistant instance

// TextFieldAssistant State
{
  attachedFields: WeakMap {
    textareaElement1 → TriggerIcon1,
    textareaElement2 → TriggerIcon2,
    inputElement1 → TriggerIcon3
  },
  currentTrigger: TriggerIcon | null,  // Currently active trigger
  activeToolbar: Toolbar | null,       // Currently open toolbar
  observer: MutationObserver           // Watches for new fields
}

// TriggerIcon State (per instance)
{
  field: HTMLElement,           // The text field it's attached to
  element: HTMLDivElement,      // The sparkle icon DOM element
  visible: boolean,             // Whether icon is shown
  assistant: TextFieldAssistant // Reference to parent
}

// Toolbar State (per instance)
{
  field: HTMLElement,           // The text field being edited
  triggerElement: HTMLElement,  // The trigger icon (for positioning)
  element: HTMLDivElement,      // The toolbar DOM element
  expanded: boolean,            // Animation state
  improvedText: string | null,  // Result from AI
  services: AIServices          // API communication layer
}

// AIServices State (per instance)
{
  cache: Map<string, string>   // Cached AI responses
}
```

---

## 🔌 Extension Message Flow

```
┌─────────────────┐
│  Content Script │
│ (textfield-     │
│  assistant.js)  │
└────────┬────────┘
         │
         │ chrome.runtime.sendMessage({
         │   action: 'generateContent',
         │   task: 'textAssist',
         │   prompt: '...'
         │ }, callback)
         │
         ▼
┌─────────────────┐
│  Background     │
│  (background.js)│
│                 │
│  onMessage      │
│  listener       │
│  forwards →     │
└────────┬────────┘
         │
         │ chrome.runtime.sendMessage(request)
         │
         ▼
┌─────────────────┐
│  Side Panel     │
│  (sidepanel.js) │
│                 │
│  onMessage      │
│  if task ==     │
│  'textAssist':  │
│    handleText   │
│    Assist()     │
└────────┬────────┘
         │
         │ return sendResponse({ result })
         │
         ▼
┌─────────────────┐
│  Background     │
│  (forwards)     │
└────────┬────────┘
         │
         │ callback(response)
         │
         ▼
┌─────────────────┐
│  Content Script │
│  (receives      │
│   result)       │
└─────────────────┘
```

---

## 📦 Memory Management

### **WeakMap for Field Tracking**
```javascript
attachedFields: WeakMap<HTMLElement, TriggerIcon>
```
- **Why WeakMap?** Automatic garbage collection
- When a text field is removed from DOM, its entry is automatically cleaned up
- No memory leaks from detached elements

### **Single Toolbar Pattern**
```javascript
// Only one toolbar can exist at a time
if (this.activeToolbar) {
  this.closeToolbar(); // Clean up previous
}
this.activeToolbar = new Toolbar(...);
```

### **Cache Expiration**
```javascript
// Cache cleared on page reload
cache: new Map() // In-memory only, no persistence
```

---

## 🎭 Event System

### **Field Events**
```javascript
field.addEventListener('focus', () => trigger.show())
field.addEventListener('blur', () => trigger.hide())
field.addEventListener('mouseenter', () => trigger.show())
```

### **Document Events**
```javascript
document.addEventListener('click', (e) => {
  if (!clickedInsideToolbar) closeToolbar()
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeToolbar()
})
```

### **Window Events**
```javascript
window.addEventListener('scroll', () => trigger.updatePosition(), true)
window.addEventListener('resize', () => trigger.updatePosition())
```

### **Custom Events (for React/Vue)**
```javascript
field.dispatchEvent(new Event('input', { bubbles: true }))
field.dispatchEvent(new Event('change', { bubbles: true }))
```

---

## 🚀 Performance Optimizations

1. **Lazy Instantiation**: Toolbar only created when needed
2. **WeakMap**: Automatic garbage collection
3. **Request Caching**: Duplicate prompts return cached results
4. **Passive Listeners**: Scroll listeners marked passive
5. **Single Observer**: One MutationObserver for entire page
6. **Debouncing**: Position updates debounced on scroll
7. **Early Return**: Skip hidden/small fields immediately

---

**Architecture designed for:**
- 🎯 Simplicity
- ⚡ Performance
- 🛡️ Reliability
- 🔧 Maintainability
- 📈 Scalability
