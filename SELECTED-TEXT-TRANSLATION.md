# Selected Text In-Place Translation Feature

## Overview
This feature allows you to translate selected text on any webpage and **replace it directly in the page** using your preferred language setting from the Settings tab.

## How It Works

### User Flow
1. **Select text** on any webpage
2. **Right-click** and choose **"Translate Selected Text"**
3. A **confirmation dialog** appears asking:
   - "Translate in page?" → Replaces selected text
   - "Cancel" → Shows translation in side panel (old behavior)
4. If confirmed, the selected text is **replaced with the translation** and **highlighted** temporarily

### Technical Implementation

#### Content Script (`content.js`)
- **Selection tracking**: Stores the Range object when user selects text
- **Confirmation dialog**: Uses `window.confirm()` to ask user preference
- **Message routing**: 
  - Sends `translateAndReplace` message to sidepanel for in-page translation
  - Sends `generateContent` message for side panel translation (legacy)
- **Text replacement**: `replaceSelectedText()` function
  - Replaces text in the original selection range
  - Adds yellow highlight for 3 seconds
  - Preserves the document structure

#### Side Panel (`sidepanel.js`)
- **Message handler**: Listens for `translateAndReplace` action
- **Translation function**: `translateAndReplace(content, tabId)`
  - Loads user's preferred language from Settings
  - Builds translation prompt with target language
  - Calls Gemini API
  - Sends translated text back to content script via `replaceSelection` message
- **Language preferences**: Uses `loadTargetLanguage()` and `getLanguageName()` helpers

#### Message Flow
```
User selects text → content.js confirms
                    ↓ (if Yes)
              translateAndReplace message → sidepanel.js
                                            ↓
                                   Calls Gemini API
                                            ↓
                              replaceSelection message → content.js
                                                         ↓
                                                Replaces text in page
```

## Features

### In-Place Translation
- ✅ Replaces selected text with translation
- ✅ Maintains document structure (no DOM corruption)
- ✅ Visual feedback with temporary yellow highlight (3s)
- ✅ Uses preferred language from Settings tab
- ✅ Works on any text content (paragraphs, headings, links, etc.)

### Language Support
The feature supports all languages configured in the Settings tab:
- English, Spanish, French, German, Italian
- Portuguese, Russian, Japanese, Korean
- Chinese (Simplified), Arabic, Hindi

### Error Handling
- API key validation
- Network error handling
- Selection range preservation
- Graceful fallback to side panel if errors occur

## Usage Instructions

### For End Users
1. **Configure language preference**:
   - Open side panel → Settings tab
   - Select your preferred target language
   - Click "Save Language"

2. **Translate selected text in-place**:
   - Select any text on a webpage
   - Right-click → "Translate Selected Text"
   - Click "OK" in the confirmation dialog
   - Watch the text get replaced with translation + highlight

3. **Alternative (Side Panel)**:
   - Select text and right-click → "Translate Selected Text"
   - Click "Cancel" in the confirmation dialog
   - Translation appears in side panel (old behavior)

## Customization

### Changing Highlight Duration
Edit `content.js`, find `replaceSelectedText()` function:
```javascript
setTimeout(() => {
  highlight.remove();
}, 3000); // Change 3000 to desired milliseconds
```

### Changing Highlight Color
Edit `content.js`, find the highlight style:
```javascript
highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.4)'; // Change color here
```

### Disabling Confirmation Dialog
Edit `content.js`, find the context menu click handler:
```javascript
if (info.menuItemId === 'translate-selection') {
  // Remove or comment out the confirmation dialog
  // const translateInPage = window.confirm("...");
  const translateInPage = true; // Always translate in-page
  
  // ... rest of code
}
```

## Comparison: In-Place vs Side Panel

| Feature | In-Place Translation | Side Panel Translation |
|---------|---------------------|------------------------|
| **Location** | Replaces text on page | Shows in side panel |
| **Visual** | Yellow highlight | Formatted text box |
| **Persistence** | Permanent until refresh | Stays in side panel |
| **Use Case** | Quick reading/editing | Review/copy translation |
| **Confirmation** | Required | Auto (cancel dialog) |

## Technical Details

### Selection Range Tracking
```javascript
let selectionRange = null;

// Store range when text is selected
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelection') {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      selectionRange = selection.getRangeAt(0);
    }
  }
});
```

### Text Replacement
```javascript
function replaceSelectedText(translatedText) {
  if (!selectionRange) return;
  
  // Delete original content
  selectionRange.deleteContents();
  
  // Insert new text
  const textNode = document.createTextNode(translatedText);
  selectionRange.insertNode(textNode);
  
  // Add highlight
  const highlight = document.createElement('span');
  highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
  highlight.textContent = translatedText;
  
  // Replace text node with highlighted span
  textNode.parentNode.replaceChild(highlight, textNode);
  
  // Remove highlight after 3 seconds
  setTimeout(() => highlight.remove(), 3000);
}
```

## Limitations

1. **Selection Range Loss**: If user clicks elsewhere before translation completes, the range is lost
2. **Complex HTML**: Only replaces text content, not nested HTML structures
3. **Dynamic Content**: May not work on single-page apps with virtual DOM (React, Vue)
4. **Undo**: Browser's undo (Ctrl+Z) may not work after replacement

## Future Enhancements

- [ ] Add undo button after replacement
- [ ] Support for translating nested HTML elements
- [ ] Translation history tracking
- [ ] Keyboard shortcut for translate + replace
- [ ] Option to keep original text as tooltip
- [ ] Batch translation of multiple selections

## Troubleshooting

### Selection disappears before translation
- This is expected behavior. The text is replaced based on the stored range.
- Avoid clicking elsewhere while waiting for translation.

### Text not replaced
- Check if API key is configured in Settings
- Ensure target language is set in Settings
- Open DevTools Console for error messages

### Wrong text replaced
- This can happen if the page content changes dynamically
- Refresh the page and try again

### Highlight doesn't appear
- Check browser console for errors
- Try selecting simpler text (no complex formatting)

---

**Note**: This feature works alongside the existing side panel translation. Users can choose which method to use via the confirmation dialog.
