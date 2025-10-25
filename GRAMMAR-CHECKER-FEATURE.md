# Grammar & Spelling Checker Feature

## Overview
Grammarly-like inline grammar and spelling corrections powered by Gemini API.

## Features

### ✅ Real-time Error Detection
- Monitors text input in textarea, input fields, and contenteditable elements
- **Debounced checking** (1 second delay) to minimize API calls
- **Smart caching** to avoid redundant checks for the same text

### ✅ Visual Feedback
- **Red dotted underlines** appear beneath errors (just like Grammarly)
- Underlines follow text positioning dynamically
- Non-intrusive overlay system that doesn't modify the DOM

### ✅ Hover Suggestions
- **Popup appears on hover** with:
  - Error type (grammar/spelling)
  - Original text with strikethrough
  - Suggested correction highlighted in green
  - Brief explanation of the error
- **One-click application** of corrections
- Popup stays visible when hovering over it

### ✅ Smart Corrections
- Powered by Gemini API for context-aware suggestions
- Preserves original formatting and styling
- Updates the field and triggers input events for React/Vue compatibility

## How It Works

### 1. Text Monitoring
```javascript
// Debounced checking on input/focus
field.addEventListener('input', () => scheduleCheck());
// 1 second delay before API call
```

### 2. Error Detection
```javascript
// Gemini API returns structured JSON:
[{
  "error": "teh",
  "correction": "the",
  "type": "spelling",
  "message": "Spelling error"
}]
```

### 3. Visual Overlay
- Creates a positioned overlay matching the text field dimensions
- Calculates error positions using text measurement
- Adds clickable underlines at exact error locations

### 4. Suggestion Popup
- Appears on underline hover
- Shows side-by-side comparison (error → correction)
- "Apply" button replaces text instantly
- "Ignore" dismisses the suggestion

## Technical Implementation

### Architecture
```
GrammarChecker (Main Controller)
├── FieldChecker (per text field)
│   ├── Monitors input
│   ├── Calls API (debounced)
│   ├── Creates overlay with underlines
│   └── Positions underlines accurately
└── SuggestionPopup (on hover)
    ├── Shows error details
    ├── Applies corrections
    └── Re-checks after correction
```

### Caching Strategy
- **Cache key**: Lowercase trimmed text
- **Cache limit**: 100 entries (LRU eviction)
- **Result**: Instant suggestions for repeated text

### Performance Optimizations
1. **Debouncing**: 1-second delay prevents excessive API calls
2. **Caching**: Avoids re-checking identical text
3. **Lazy initialization**: Only attaches to visible fields (>100x30px)
4. **Smart cleanup**: Removes overlays on blur/scroll

### Rate Limiting
- Debounce timer: 1000ms per field
- Only checks when text changes
- Skips checks for very short text (<3 chars)

## Usage

### For Users
1. **Type in any text field** on any website
2. **Wait 1 second** after typing
3. **See red underlines** appear on errors
4. **Hover over underline** to see suggestion
5. **Click "Apply"** to fix instantly

### For Developers
The grammar checker automatically attaches to:
- `<textarea>`
- `<input type="text">`
- `<input type="email">`
- `[contenteditable="true"]`

No configuration needed - works out of the box!

## Files

### Core Files
- **grammar-checker.js** - Main logic (466 lines)
  - `GrammarChecker` - Global coordinator
  - `FieldChecker` - Per-field monitoring
  - `SuggestionPopup` - Hover popup UI

- **grammar-checker.css** - Styling (157 lines)
  - Underline styles
  - Popup animations
  - Button states

### Integration
- Added to `manifest.json` content_scripts
- Loads alongside existing text field assistant
- No conflicts with other features

## API Usage

### Model Used
- **gemini-flash-lite-latest** - Optimized for fast, accurate grammar checking
- Lower temperature (0.3) for consistent results
- Smaller token limit (1024) for faster responses

### Request Format
```javascript
chrome.runtime.sendMessage({
  action: 'grammarCheck',
  prompt: `Check this text for grammar and spelling errors...`
});
```

### Response Format
```json
[
  {
    "error": "recieve",
    "correction": "receive",
    "type": "spelling",
    "message": "Incorrect spelling"
  }
]
```

## Cost Optimization

### API Call Reduction
- ✅ 1-second debounce
- ✅ Cache with 100-entry limit
- ✅ Skip checks for unchanged text
- ✅ Skip checks for very short text

### Estimated Usage
- Average text: ~200 tokens per check
- With caching: ~30-50% reduction
- With debouncing: ~70-80% reduction
- **Total reduction: ~85-90%**

## Future Enhancements

### Potential Improvements
1. **User toggle** - Enable/disable via extension popup
2. **Custom dictionary** - User-defined words to ignore
3. **Language detection** - Auto-detect and check multiple languages
4. **Advanced grammar rules** - Style suggestions, clarity improvements
5. **Bulk apply** - Fix all errors with one click
6. **Keyboard shortcuts** - Navigate between errors with Tab

### Advanced Features
- **AI explanations** - Detailed grammar lessons
- **Writing stats** - Readability score, word count
- **Tone analysis** - Detect and adjust tone
- **Plagiarism detection** - Check for duplicated content

## Testing

### Test Cases
1. **Basic spelling error**
   - Type: "I recieved the packege"
   - Expected: Underlines on "recieved" and "packege"

2. **Grammar error**
   - Type: "He don't know nothing"
   - Expected: Underlines with corrections

3. **Multiple errors**
   - Type: "teh qick brown fox"
   - Expected: Multiple underlines

4. **No errors**
   - Type: "The quick brown fox"
   - Expected: No underlines

5. **Apply correction**
   - Hover → Click "Apply"
   - Expected: Text replaced, underline removed

### Browser Testing
- ✅ Chrome (Manifest V3)
- ✅ Edge (Chromium-based)
- ⚠️ Firefox (requires manifest adjustments)

## Troubleshooting

### Underlines not appearing?
- Check browser console for errors
- Verify API key is set in extension
- Ensure field is large enough (>100x30px)

### Suggestions not showing?
- Check if underline is clickable
- Verify popup isn't blocked by z-index
- Look for CSS conflicts with page styles

### High API usage?
- Increase debounce timer (default: 1000ms)
- Reduce cache size if memory is constrained
- Add minimum text length requirement

## Credits
Built using:
- **Gemini API** for AI-powered grammar checking
- **Chrome Extension API** for content script injection
- Inspired by **Grammarly** UX patterns
