# Grammar Highlight Positioning Fix

## Problem
The red underline highlights for grammar/spelling errors were:
1. **Shifted to the right** - not aligning with the actual error text
2. **Displaying outside the text field** when scrolling
3. **Not moving with the text** when the field was scrolled
4. **Staying in wrong positions after text edits** - highlights don't update immediately when text is changed, deleted, or line breaks are added/removed

## Root Cause
The positioning logic had several issues:

### Issue 1: Character Counting with Line Breaks
The original code used `text.indexOf(error.error)` to find error positions. This is fragile because:
- Line breaks are represented differently in different contexts (`\n` vs `<br>` vs actual line breaks)
- Character counting can drift when there are multiple paragraphs
- Each line break adds cumulative positioning error

### Issue 2: Newlines Not Converted in Mirror Element
In the `getMirrorRect` function, newlines in the error text itself weren't converted to `<br>` tags:
```javascript
// BEFORE (WRONG):
const escapedBefore = this.escapeHtml(textBefore).replace(/\n/g, '<br>');
const escapedError = this.escapeHtml(errorText); // ❌ No newline conversion!
```

This caused the mirror element's layout to not match the actual textarea, resulting in wrong position calculations.

### Issue 3: Incorrect Scroll Offset Calculation
```javascript
// BEFORE (WRONG):
let left = errorRect.left - fieldRect.left - paddingLeft - scrollLeft;
let top = errorRect.top - fieldRect.top - paddingTop - scrollTop;
```

The code was **subtracting** scroll offsets, but it should **add** them because:
- When you scroll down (scrollTop increases), content moves up visually
- The highlight needs to move down to compensate
- Same logic applies for horizontal scrolling

### Issue 2: Inconsistent Position Reference
The overlay was positioned fixed to the viewport, but underlines were calculated relative to the field rect, causing misalignment.

### Issue 3: Update Function Not Using Stored Positions
The `updateUnderlinePositions()` function tried to recalculate positions on scroll, but the logic was flawed and didn't properly account for the scroll offset changes.

## Solution

### 1. Use DOM-Based Text Search (Modern Approach)
Instead of character counting, we now use the browser's native APIs to find text:

**For ContentEditable:**
```javascript
// Use TreeWalker to search through text nodes directly
const walker = document.createTreeWalker(
  this.field,
  NodeFilter.SHOW_TEXT,
  null,
  false
);

while (node = walker.nextNode()) {
  const index = node.textContent.indexOf(errorText);
  if (index !== -1) {
    const range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, index + errorText.length);
    // Use range.getClientRects() for accurate positioning
  }
}
```

**For Textarea/Input:**
```javascript
// Still use mirror, but with fixed positioning
mirror.style.position = 'fixed'; // Not absolute
mirror.style.top = `${fieldRect.top}px`;
```

Benefits:
- No character counting - searches text directly in DOM
- Handles line breaks correctly automatically
- More robust and matches how Grammarly works

### 2. Fixed Position Calculation
```javascript
// AFTER (CORRECT):
const overlayRect = this.overlay.getBoundingClientRect();
let left = errorRect.left - overlayRect.left;
let top = errorRect.top - overlayRect.top;
```

Now we:
- Calculate position relative to the overlay (not the field)
- Don't add scroll offsets during initial positioning (errorRect already accounts for current scroll)
- Store the position with scroll offset for later recalculation
- Use consistent reference points

### 3. Calculate Relative to Overlay
```javascript
// In createUnderlineElement:
const scrollTop = this.field.scrollTop || 0;
const scrollLeft = this.field.scrollLeft || 0;

underline.dataset.originalLeft = left + scrollLeft;
underline.dataset.originalTop = top + scrollTop;
```

We store the position adjusted for the current scroll offset, so we can recalculate correctly later.

### 4. Simplified Update Logic
```javascript
updateUnderlinePositions() {
  const scrollTop = this.field.scrollTop || 0;
  const scrollLeft = this.field.scrollLeft || 0;
  
  underlines.forEach(underline => {
    const originalLeft = parseFloat(underline.dataset.originalLeft);
    const originalTop = parseFloat(underline.dataset.originalTop);
    
    // Subtract scroll to move highlights when scrolling
    const left = originalLeft - scrollLeft;
    const top = originalTop - scrollTop;
    
    underline.style.left = `${left}px`;
    underline.style.top = `${top}px`;
  });
}
```

The update function now:
- Uses stored original positions (which include initial scroll offset)
- Subtracts current scroll offset to move highlights opposite to scroll direction
- Hides highlights that scroll out of view

### 5. Consistent Overlay Positioning
The overlay remains fixed to the viewport and updates its position when:
- The page scrolls
- The window resizes
- The field scrolls internally

## Latest Fix: Immediate Highlight Removal on Text Change

### Problem
When users edited text (typing, deleting, adding line breaks), the red highlights would stay in their old positions for up to 20 seconds until the new grammar check completed. This created a confusing experience where highlights didn't match the actual text.

### Root Cause
The `input` event listener only scheduled a debounced grammar check (1 second delay + AI response time). During this time, the old highlights remained visible at their original positions, even though the text had changed.

### Solution
Added `handleTextChange()` method that immediately removes all highlights when text is edited:

```javascript
handleTextChange() {
  // Immediately remove highlights when text changes
  // This prevents stale highlights from staying in wrong positions
  this.removeOverlay();
}
```

This is called on every `input` event, before scheduling the new grammar check. The flow is now:
1. User types/edits text
2. **Highlights immediately disappear** (instant feedback)
3. After 1 second debounce, new grammar check starts
4. New highlights appear when check completes

### Benefits
- No more stale highlights in wrong positions
- Clean visual feedback - highlights disappear immediately when text changes
- New highlights appear only after the updated text is checked
- Prevents confusion from misaligned error indicators

## Testing
To test the fix:

1. Open `test-grammar.html` in Chrome with the extension loaded
2. Type text with errors in any field
3. Wait 1 second for grammar check - red highlights appear
4. **Edit the text** - highlights should disappear immediately
5. **Add/remove line breaks** - highlights should disappear immediately
6. Wait 1 second - new highlights appear for the updated text
7. **Scroll the text field** - highlights should move with the text
8. **Scroll the page** - highlights should stay aligned with text
9. Hover over highlights to see suggestions

## Files Modified
- `grammar-checker.js`:
  - `attachListeners()` - Added immediate highlight removal on text change
  - `handleTextChange()` - New method to clear highlights instantly
  - `showUnderlines()` - Fixed overlay positioning
  - `addUnderline()` - Fixed initial position calculation
  - `addMultiLineUnderline()` - Fixed multi-line error positioning
  - `updateUnderlinePositions()` - Simplified and fixed scroll handling

## Key Takeaways
- **Avoid character counting** - Use DOM-based text search (TreeWalker, Range API) instead
- Character counting is fragile with line breaks, multiple paragraphs, and special characters
- Use `TreeWalker` for contenteditable elements to search through text nodes directly
- For textarea/input, use a mirror element with **fixed positioning** (not absolute)
- Calculate positions relative to the overlay using `getBoundingClientRect()`
- This approach matches how professional tools like Grammarly work
- Test with both page scroll and field internal scroll
- Test with multiple paragraphs and line breaks
