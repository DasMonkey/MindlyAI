# HTML-Aware Translation System

## The Problem You Identified 🎯

You're absolutely right! The issue was that we were sending **plain text** to the API, which stripped all formatting.

### Before (Plain Text Only):

```
User selects:
┌─────────────────────────────┐
│ A Little to the Left        │  ← This is in a <div>
│                             │  ← This <br> becomes nothing
│ Description                 │  ← This is in a <p>
│ A Little to the Left is...  │  ← This is also in <p>
└─────────────────────────────┘

window.getSelection().toString():
"A Little to the Left\n\nDescription\nA Little to the Left is..."
                      ↑↑
            Just \n characters, no HTML!

Sent to API:
"Translate: A Little to the Left\n\nDescription\n..."

API Response (may lose line breaks):
"《A Little to the Left》描述《A Little to the Left》是..."
❌ Everything merged together!
```

## The Solution ✅

### Now (HTML-Aware):

```javascript
// Capture BOTH plain text AND HTML structure
const selection = window.getSelection();

// Plain text (fallback)
selectedText = selection.toString();
// "A Little to the Left\n\nDescription\n..."

// HTML structure (preserved!)
const range = selection.getRangeAt(0);
const container = document.createElement('div');
container.appendChild(range.cloneContents());
selectedHTML = container.innerHTML;
// "<div>A Little to the Left</div><br><p>Description</p><p>A Little to the Left is...</p>"
```

### Translation Flow:

```
1. User selects text
   ↓
2. Extension captures:
   - selectedText (plain text backup)
   - selectedHTML (full HTML structure)
   ↓
3. Send to sidepanel:
   {
     content: "plain text...",
     htmlContent: "<div>...</div><br><p>...</p>"
   }
   ↓
4. Sidepanel checks if HTML exists:
   - If YES: Use HTML-aware prompt
   - If NO: Use plain text prompt
   ↓
5. HTML-Aware Prompt:
   "Translate the following HTML content to Chinese.
    Preserve all HTML tags (<br>, <p>, <div>, etc.) exactly.
    Only translate text inside the tags.
    
    <div>A Little to the Left</div>
    <br>
    <p>Description</p>
    <p>A Little to the Left is a cozy puzzle game...</p>"
   ↓
6. API Response:
   "<div>《A Little to the Left》</div>
    <br>
    <p>描述</p>
    <p>《A Little to the Left》是一款温馨的益智游戏...</p>"
   ✅ Line breaks and structure preserved!
   ↓
7. Insert as HTML:
   span.innerHTML = translatedHTML;
   // Renders with proper line breaks and formatting!
```

## Code Changes

### 1. Capture HTML Structure (`content.js`)

**Before:**
```javascript
document.addEventListener('mouseup', () => {
  selectedText = window.getSelection().toString().trim();
  // ❌ Only plain text, no formatting
});
```

**After:**
```javascript
let selectedHTML = '';
document.addEventListener('mouseup', () => {
  selectedText = window.getSelection().toString().trim();
  
  // ✅ Also capture HTML structure
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    selectedHTML = container.innerHTML;
  }
});
```

### 2. Send HTML to API (`content.js`)

**Before:**
```javascript
chrome.runtime.sendMessage({
  action: 'translateAndReplace',
  content: selectedText  // ❌ Plain text only
});
```

**After:**
```javascript
chrome.runtime.sendMessage({
  action: 'translateAndReplace',
  content: selectedText,
  htmlContent: selectedHTML  // ✅ HTML structure included
});
```

### 3. HTML-Aware Prompts (`sidepanel.js`)

**Before:**
```javascript
const prompt = `Translate the following text to ${langName}...
${content}`;
// ❌ Tells API it's just text
```

**After:**
```javascript
const contentToTranslate = htmlContent || content;
const isHTML = !!htmlContent && htmlContent.includes('<');

let prompt;
if (isHTML) {
  // ✅ HTML-specific prompt
  prompt = `Translate the following HTML content to ${langName}.
  Preserve all HTML tags (<br>, <p>, <div>, etc.) exactly as they are.
  Only translate the text content inside the tags.
  Return valid HTML:

  ${contentToTranslate}`;
} else {
  // Fallback to plain text
  prompt = `Translate the following text to ${langName}...
  ${contentToTranslate}`;
}
```

### 4. Render HTML (`content.js`)

**Before:**
```javascript
span.textContent = translatedText;
// ❌ Treats everything as plain text
// "<br>" would show as literal text
```

**After:**
```javascript
if (isHTML) {
  span.innerHTML = translatedText;  // ✅ Renders HTML tags
  // <br> becomes actual line break
} else {
  span.textContent = translatedText;  // Plain text fallback
}
```

## Why This Works

### HTML Preservation Example:

**Input HTML:**
```html
<div style="font-weight:bold">A Little to the Left</div>
<br>
<p style="color:gray">Description</p>
<p>A Little to the Left is a cozy puzzle game that has you sort...</p>
```

**API sees:** The complete structure with tags

**API translates:**
```html
<div style="font-weight:bold">《A Little to the Left》</div>
<br>
<p style="color:gray">描述</p>
<p>《A Little to the Left》是一款温馨的益智游戏，让你整理...</p>
```

**Result:** 
- ✅ Bold title stays bold
- ✅ Line break preserved
- ✅ Gray "Description" stays gray
- ✅ Paragraph structure maintained

## Comparison

| Aspect | Plain Text (Old) | HTML-Aware (New) |
|--------|------------------|------------------|
| **Input** | "Text\n\nMore text" | `<div>Text</div><br><p>More text</p>` |
| **API sees** | Just \n characters | Full HTML tags |
| **API understands** | "Maybe preserve \n?" | "Keep these tags!" |
| **Line breaks** | ❌ Often lost | ✅ Preserved as `<br>` or `</p>` |
| **Formatting** | ❌ Lost | ✅ All styles preserved |
| **Paragraphs** | ❌ Merged | ✅ Separate `<p>` tags |
| **Bold/Italic** | ❌ Lost | ✅ `<strong>`, `<em>` kept |

## Example Translation

### Original (English):
```html
<div class="title" style="font-weight:bold; font-size:24px;">
  A Little to the Left
</div>
<br>
<p style="color:#888; font-size:14px;">Description</p>
<p style="line-height:1.6;">
  A Little to the Left is a cozy puzzle game
  that has you sort, stack, and organize household items
  into pleasing arrangements while you keep an eye out
  for a mischievous cat with an inclination for chaos.
</p>
```

### Translated (Chinese):
```html
<div class="title" style="font-weight:bold; font-size:24px;">
  《A Little to the Left》
</div>
<br>
<p style="color:#888; font-size:14px;">描述</p>
<p style="line-height:1.6;">
  《A Little to the Left》是一款温馨的益智游戏，
  让你整理、堆叠和组织家居用品成令人愉悦的排列，
  同时还要提防一只喜欢制造混乱的顽皮猫咪。
</p>
```

**All formatting preserved!** ✅

## Benefits

1. **Perfect Line Break Preservation** - `<br>` and `<p>` tags stay
2. **Style Preservation** - Inline styles maintained
3. **Structure Preservation** - Headings, paragraphs, divs stay separate
4. **Bold/Italic** - `<strong>`, `<em>` tags preserved
5. **Colors & Fonts** - All CSS preserved

## Fallback Handling

If HTML capture fails or selection is plain text:
- Falls back to plain text mode
- Uses text-focused prompt
- Still works, just without perfect formatting

---

**Summary:** By capturing and sending HTML structure instead of just plain text, the API now understands the document structure and can preserve formatting perfectly!
