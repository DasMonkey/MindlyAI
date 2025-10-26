# 🧪 Text Field Assistant Testing Guide

Quick guide to test the new Grammarly-like text field assistant feature.

---

## 🚀 Installation & Setup

### 1. Load Extension

```powershell
# You're already in the project directory
# Just reload the extension in Chrome
```

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Reload** on your "AI Content Assistant" extension
4. Verify new files are loaded:
   - `textfield-assistant.js`
   - `textfield-assistant.css`

### 2. Configure API Key

1. Click the extension icon in Chrome toolbar
2. Go to **Settings** tab
3. Enter your **Google Gemini API Key**
4. Click **Save API Key**
5. Verify green "API Key configured" status

---

## 🎯 Test Cases

### Test 1: Basic Trigger Appearance

**Sites to Test:**
- Gmail: https://mail.google.com (compose new email)
- Twitter: https://twitter.com/compose/tweet
- Any simple form: https://www.google.com/forms (search box won't work, but create a test form)

**Steps:**
1. Navigate to site
2. Click on a text field or textarea
3. **Expected**: Purple sparkle icon (✨) appears in bottom-right corner of field
4. Move mouse away from field
5. **Expected**: Icon fades away after a moment

**✅ Pass Criteria:**
- Icon appears smoothly with scale animation
- Icon is positioned correctly relative to field
- Icon disappears when not focused

---

### Test 2: Toolbar Expansion

**Steps:**
1. Focus a text field to make icon appear
2. Click the sparkle icon
3. **Expected**: Toolbar expands with 7 buttons:
   - Fix ✓
   - Clear 💡
   - Casual 😊
   - Formal 👔
   - Shorter ✂️
   - Rephrase 🔄
   - AI ✨

**✅ Pass Criteria:**
- Toolbar animates smoothly (spring effect)
- All 7 buttons are visible
- Buttons have hover effects
- Clicking outside closes toolbar
- Pressing `Esc` closes toolbar

---

### Test 3: Grammar Fix

**Test Text:**
```
Me and him went to the store yesterday and bought some apple's. We was very happy with the purchase.
```

**Steps:**
1. Paste test text into any text field (e.g., Gmail compose)
2. Click sparkle icon → Click **Fix** button
3. **Expected**: 
   - Loading spinner appears with "Fixing..." text
   - After 1-3 seconds, before/after comparison shows:
     - Left: Original text
     - Right: Corrected text (green background)
   - "Apply" and "Cancel" buttons appear

4. Click **Apply**
5. **Expected**: 
   - Text in field is replaced with corrected version
   - Button shows "✓ Applied" briefly
   - Result panel closes

**✅ Pass Criteria:**
- Grammar errors are fixed:
  - "Me and him" → "He and I"
  - "apple's" → "apples"
  - "We was" → "We were"
- Apply successfully replaces text
- No errors in console

---

### Test 4: Tone Rewriting

**Test Text:**
```
Hey bro, just wanted to say the presentation you did yesterday was super cool and everyone loved it!
```

**Test Actions:**

#### A. Make Formal
**Expected Output:**
```
I wanted to express my appreciation for the excellent presentation you delivered yesterday. It was very well received by all attendees.
```

#### B. Make Casual (on formal text)
**Expected Output:**
```
Great presentation yesterday! Everyone really enjoyed it.
```

#### C. Make Shorter (on any long text)
**Expected Output:**
A condensed version maintaining key points

**✅ Pass Criteria:**
- Each tone produces appropriate transformation
- Text style matches requested tone
- Meaning is preserved

---

### Test 5: Cross-Site Compatibility

Test on multiple popular sites:

| Site | URL | Field Type | Status |
|------|-----|------------|--------|
| Gmail | mail.google.com | Compose | ✅ |
| Twitter/X | twitter.com | Tweet | ✅ |
| LinkedIn | linkedin.com | Post | ✅ |
| Facebook | facebook.com | Status | ✅ |
| GitHub | github.com | Issue/PR | ✅ |
| Reddit | reddit.com | Comment | ✅ |
| Slack (web) | slack.com | Message | ✅ |
| Discord (web) | discord.com | Message | ✅ |

**Steps for Each:**
1. Navigate to site
2. Find text input (compose, comment, message, etc.)
3. Verify trigger icon appears
4. Test one action (e.g., "Fix" or "Formal")
5. Verify text applies correctly

**✅ Pass Criteria:**
- Icon appears on focus
- Toolbar functions correctly
- Text applies without errors
- No layout breaking

---

### Test 6: Contenteditable Fields

**Test Site:** Create a simple HTML file:

```html
<!DOCTYPE html>
<html>
<body>
  <div contenteditable="true" style="border: 1px solid black; padding: 20px; min-height: 200px; width: 400px;">
    Type your text here with some grammar mistake's and see if the AI can fix it.
  </div>
</body>
</html>
```

**Steps:**
1. Save as `test.html` and open in browser with extension loaded
2. Click in the contenteditable div
3. Verify trigger icon appears
4. Test "Fix" action

**✅ Pass Criteria:**
- Works same as regular textarea
- Text replacement preserves cursor position (mostly)

---

### Test 7: Multiple Fields on Same Page

**Test Site:** Create test HTML:

```html
<!DOCTYPE html>
<html>
<body>
  <h1>Multiple Field Test</h1>
  
  <label>Field 1:</label>
  <textarea rows="4" cols="50">Test text one</textarea>
  <br><br>
  
  <label>Field 2:</label>
  <textarea rows="4" cols="50">Test text two</textarea>
  <br><br>
  
  <label>Field 3:</label>
  <input type="text" style="width: 300px" value="Test text three">
</body>
</html>
```

**Steps:**
1. Click on Field 1 → verify icon appears
2. Click on Field 2 → verify icon moves to Field 2
3. Open toolbar on Field 2 → perform action
4. Click on Field 3 → verify previous toolbar closed

**✅ Pass Criteria:**
- Only one toolbar open at a time
- Each field gets its own trigger icon
- No memory leaks or duplicate icons

---

### Test 8: Error Handling

#### A. No API Key
1. Remove API key from settings
2. Try to use any action
3. **Expected**: Error message "API key not configured"

#### B. Invalid Text
1. Leave field empty
2. Click toolbar action
3. **Expected**: "Please enter some text first" error

#### C. API Error (simulate)
1. Use invalid API key temporarily
2. Try an action
3. **Expected**: "Failed to process. Please try again." error

**✅ Pass Criteria:**
- All errors display clearly
- No console exceptions
- Extension doesn't crash

---

### Test 9: Performance Test

**Steps:**
1. Open page with 10+ text fields (e.g., a form)
2. Check browser console for performance
3. Open Chrome Task Manager (Shift+Esc)
4. Monitor extension memory usage

**✅ Pass Criteria:**
- Extension memory < 50MB
- No console errors
- Trigger icons attach within 200ms
- Page remains responsive

---

### Test 10: AI Assistant Integration

**Steps:**
1. Type text in any field
2. Click sparkle icon → Click **AI** button (purple one)
3. **Expected**: 
   - Side panel opens automatically
   - Switches to Chat tab
   - Pre-fills chat input with: `Help me improve this text: "..."`

**✅ Pass Criteria:**
- Side panel opens
- Chat tab is active
- Text is pre-filled correctly

---

## 🐛 Known Issues to Watch For

### Common Problems:

1. **Icon doesn't appear**
   - Check if field is too small (< 100x30px)
   - Verify extension loaded properly
   - Check console for errors

2. **Toolbar appears off-screen**
   - Test on small browser windows
   - Verify positioning logic handles edge cases

3. **Text doesn't apply to React apps**
   - Some apps (like Discord) may need special handling
   - Check if events are being fired

4. **Position doesn't update on scroll**
   - Scroll the page while icon is visible
   - Verify icon moves with field

---

## 📊 Performance Benchmarks

Track these metrics while testing:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Icon appear time | < 100ms | ___ | ⏱️ |
| Toolbar open animation | 300ms | ___ | ⏱️ |
| AI response time | 500-2000ms | ___ | ⏱️ |
| Text apply time | < 50ms | ___ | ⏱️ |
| Memory per field | ~5KB | ___ | ⏱️ |

---

## 🎥 Test Scenarios

### Scenario 1: Email Composition
1. Open Gmail
2. Click "Compose"
3. Type informal email
4. Use "Formal" to make it professional
5. Use "Shorter" to condense
6. Send email

### Scenario 2: Social Media Post
1. Open Twitter/LinkedIn
2. Draft a long post
3. Use "Shorter" to fit character limit
4. Use "Clear" to improve readability
5. Post

### Scenario 3: Customer Support Reply
1. Open any support platform (or Gmail)
2. Draft reply to customer
3. Use "Formal" for professionalism
4. Use "Fix" for grammar
5. Send

---

## 🔍 Debugging Tips

### Enable Verbose Logging

Add to `textfield-assistant.js`:
```javascript
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[TextFieldAssistant]', ...args);
}
```

### Inspect Elements

1. Right-click trigger icon → Inspect
2. Check applied styles
3. Verify z-index and positioning

### Check Event Listeners

```javascript
// In browser console
getEventListeners(document.querySelector('textarea'))
```

---

## ✅ Final Checklist

Before marking feature complete:

- [ ] Trigger icon appears on all text field types
- [ ] All 7 actions work correctly
- [ ] Before/after comparison displays properly
- [ ] Text applies successfully to fields
- [ ] Works on at least 5 major websites
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Mobile responsive (if applicable)
- [ ] Accessibility (keyboard navigation)
- [ ] Error handling works
- [ ] Cache prevents duplicate API calls
- [ ] Documentation is complete

---

## 📝 Bug Report Template

If you find issues, document them:

```
**Bug Title:** [Brief description]

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- Chrome Version: ___
- Extension Version: ___
- Website: ___
- Console Errors: ___

**Screenshots/Video:**
[If applicable]
```

---

## 🚀 Next Steps

After testing is complete:

1. **Document issues** found
2. **Prioritize fixes** (critical vs. nice-to-have)
3. **Test again** after fixes
4. **Record demo video** showing feature in action
5. **Update README** with new feature
6. **Consider Phase 2 features** (real-time grammar checking)

---

**Happy Testing!** 🎉

Report any issues or suggestions for improvement.
