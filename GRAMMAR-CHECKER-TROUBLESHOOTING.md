# Grammar Checker Troubleshooting Guide

## 🔍 No Red Underlines Appearing?

Follow these steps to diagnose and fix the issue.

---

## Step 1: Check Console Logs

### Open DevTools Console:
1. Press **F12** or right-click → **Inspect**
2. Click the **Console** tab
3. Type some text with errors in a text field
4. Look for these logs:

### Expected Logs (Everything Working):
```
🔍 Grammar Checker initialized
📝 FieldChecker: Checking grammar for text: I seen him...
📤 Sending grammar check request to background
📥 Received grammar check response: {...}
✅ Returning 1 errors: [{...}]
🎨 FieldChecker: Showing underlines for 1 errors
```

### If You See:
- ❌ **No logs at all** → Grammar checker not loaded (see Step 2)
- ❌ **"Extension context invalidated"** → Reload extension (see Step 3)
- ❌ **"Could not establish connection"** → Extension not running (see Step 3)
- ❌ **"Returning 0 errors"** → AI thinks text is correct (see Step 4)

---

## Step 2: Verify Extension is Loaded

### Check Extension Status:
1. Go to `chrome://extensions/`
2. Find "Mentelo"
3. Make sure it's **Enabled** (toggle should be blue)
4. Check for any error messages

### If Extension Shows Errors:
1. Click **Details**
2. Look at the error messages
3. Click **Reload** button
4. Refresh the test page

---

## Step 3: Reload Everything

### Full Reload Process:
1. **Reload Extension:**
   - `chrome://extensions/` → Find Mentelo → Click **Reload** (🔄)

2. **Reload Test Page:**
   - Press **F5** or **Ctrl+R**

3. **Clear Console:**
   - In DevTools Console, click the 🚫 icon

4. **Test Again:**
   - Type: "I seen him yesterday"
   - Wait 1 second
   - Check for underlines

---

## Step 4: Test with Obvious Errors

The AI might think your text is correct. Try these **guaranteed errors**:

### Test Examples:
```
I seen him yesterday          ← "seen" should be "saw"
He dont like pizza            ← "dont" should be "doesn't"
She go to school everyday     ← "go" should be "goes"
They was happy                ← "was" should be "were"
```

### Copy-Paste Test:
1. Copy one of the examples above
2. Paste into any text field
3. Wait 1 second
4. Red underlines should appear

---

## Step 5: Check AI Provider Settings

### Verify Built-in AI is Selected:
1. Click the Mentelo extension icon
2. Open the side panel
3. Go to **Settings** section
4. Check **AI Provider** is set to "Built-in AI (Gemini Nano)"

### Check Provider Status:
1. In side panel, go to **Provider Status**
2. Look for:
   - **Prompt API**: Should show ✅ Available
   - **Proofreader API**: May show ✅ Available or ❌ Unavailable (both OK)

### If Prompt API is Unavailable:
1. Go to `chrome://on-device-internals`
2. Check if Gemini Nano is downloaded
3. If not, click "Download" and wait
4. Reload extension after download

---

## Step 6: Use Test Page

### Open the Test Page:
1. Open `test-grammar-checker.html` in Chrome
2. Open DevTools Console (F12)
3. Type text with errors in the textarea
4. Watch console for logs

### What the Test Page Shows:
- ✅ Grammar checker initialization status
- ✅ Detailed console logs for debugging
- ✅ Test examples to copy-paste
- ✅ Troubleshooting tips

---

## Step 7: Check for Conflicts

### Disable Other Extensions:
Some extensions might interfere with grammar checking:
1. Go to `chrome://extensions/`
2. Temporarily disable other extensions
3. Test grammar checker again
4. Re-enable extensions one by one to find conflicts

### Common Conflicts:
- Other grammar checkers (Grammarly, LanguageTool)
- Text enhancement extensions
- Content blockers

---

## Step 8: Check Chrome Version

### Minimum Requirements:
- **Chrome 128+** for Prompt API
- **Chrome 141+** for Proofreader API

### Check Your Version:
1. Go to `chrome://settings/help`
2. Look at version number
3. Update if needed

---

## Step 9: Manual Debug Test

### Test the Backend Directly:

Open DevTools Console and run:

```javascript
// Test if grammar checker exists
console.log('Grammar Checker:', window.grammarChecker);

// Test checkText method
if (window.grammarChecker) {
  window.grammarChecker.checkText('I seen him yesterday').then(errors => {
    console.log('Errors found:', errors);
  });
}
```

### Expected Output:
```javascript
Errors found: [
  {
    error: "seen",
    correction: "saw",
    type: "grammar",
    message: "Use past tense 'saw'"
  }
]
```

---

## Step 10: Check Background Script

### Open Background Service Worker:
1. Go to `chrome://extensions/`
2. Find Mentelo
3. Click **Details**
4. Click **Inspect views: service worker**
5. Look for errors in console

### Expected Logs:
```
📝 Background: Handling grammar check request
✅ Background: Grammar check successful
```

### If You See Errors:
- Note the error message
- Check if it's an API availability issue
- Verify AI provider is initialized

---

## Common Issues & Solutions

### Issue: "No errors found" but text has obvious errors

**Cause:** AI is being too lenient or not understanding context

**Solution:**
1. Try more obvious errors
2. Use complete sentences
3. Check if AI provider is working: Open side panel → Test AI

---

### Issue: Underlines appear but disappear immediately

**Cause:** Text is changing or overlay is being removed

**Solution:**
1. Check console for "removing overlay" messages
2. Verify no other scripts are modifying the text field
3. Try on a simple page (use test-grammar-checker.html)

---

### Issue: Works on some sites but not others

**Cause:** Site-specific CSS or JavaScript conflicts

**Solution:**
1. Check if text field is detected: Look for "FieldChecker" logs
2. Try different text fields on the same site
3. Check if site has Content Security Policy blocking the extension

---

### Issue: "Extension context invalidated"

**Cause:** Extension was reloaded while page was open

**Solution:**
1. Reload the extension: `chrome://extensions/` → Reload
2. Reload the page: Press F5
3. Test again

---

## Still Not Working?

### Collect Debug Information:

1. **Console Logs:**
   - Copy all console logs from DevTools
   - Include both page console and background console

2. **Extension Status:**
   - Screenshot of `chrome://extensions/` showing Mentelo
   - Screenshot of side panel Provider Status

3. **Test Results:**
   - What text did you type?
   - What happened (or didn't happen)?
   - Any error messages?

4. **System Info:**
   - Chrome version
   - Operating system
   - Any other extensions installed?

---

## Quick Checklist

Before asking for help, verify:

- [ ] Extension is enabled in `chrome://extensions/`
- [ ] Extension has been reloaded
- [ ] Page has been refreshed
- [ ] Console shows "Grammar Checker initialized"
- [ ] Tried obvious errors like "I seen him"
- [ ] Built-in AI is selected in settings
- [ ] Prompt API shows as available
- [ ] Chrome version is 128 or higher
- [ ] Tested on test-grammar-checker.html
- [ ] No errors in background service worker console

---

## Debug Mode

The grammar checker now has **extensive console logging** to help debug issues. Every step is logged:

- 🔍 Initialization
- 📝 Text checking
- 📤 Request sending
- 📥 Response receiving
- ✅ Error parsing
- 🎨 Underline rendering

Just open the console and watch the logs as you type!
