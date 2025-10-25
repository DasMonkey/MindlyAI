# Setup Guide

## Quick Start

### 1. Create Extension Icons

The extension needs icon files. You have two options:

#### Option A: Use an Online Icon Generator (Easiest)
1. Visit https://www.favicon-generator.org/
2. Upload any image or create a simple design
3. Download the generated icons
4. Rename them to: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
5. Place them in the `icons/` folder

#### Option B: Create Simple Colored Squares (Quick Test)
You can create simple colored PNG files using any image editor:
- **icon16.png**: 16x16 pixels
- **icon32.png**: 32x32 pixels
- **icon48.png**: 48x48 pixels
- **icon128.png**: 128x128 pixels

Just use a purple/blue color (#667eea) to match the extension theme.

#### Option C: Use PowerShell to Generate Basic Icons
Run this PowerShell script in the extension folder:

```powershell
# This creates basic placeholder icons
Add-Type -AssemblyName System.Drawing

$sizes = @(16, 32, 48, 128)
$color = [System.Drawing.Color]::FromArgb(102, 126, 234)

foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $brush = New-Object System.Drawing.SolidBrush($color)
    $graphics.FillRectangle($brush, 0, 0, $size, $size)
    
    $bitmap.Save("icons\icon$size.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

Write-Host "Icons created successfully!"
```

### 2. Get Your Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (you'll need it later)

### 3. Load Extension in Chrome

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `Chrome-ext-GoogleAI` folder
6. The extension should now appear in your extensions list

### 4. Configure the Extension

1. Click the extension icon in your toolbar
2. In the side panel, paste your Gemini API key
3. Click "Save API Key"
4. The status indicator should turn green

### 5. Test It!

1. Open any webpage (e.g., wikipedia.org)
2. You should see a floating popup in the top-right corner
3. Click "Summarize Page" to test the extension
4. The side panel will open showing the AI-generated summary

## Troubleshooting

### Icons Not Found Error
If you get an error about missing icons, make sure:
- The `icons/` folder exists
- All 4 icon files are present (16, 32, 48, 128)
- Files are named exactly: `icon16.png`, `icon32.png`, etc.

### Extension Won't Load
- Make sure all files are in the correct location
- Check that manifest.json is valid JSON (no syntax errors)
- Look at the Chrome extensions page for specific error messages

### Popup Not Showing
- Refresh the webpage after loading the extension
- Some pages (like chrome:// URLs) don't allow extensions
- Try on a regular website like google.com or wikipedia.org

### API Errors
- Verify your API key is correct (no spaces)
- Check you have API quota remaining at https://aistudio.google.com/
- Make sure you're connected to the internet

## File Checklist

Verify you have all these files:
- ✅ manifest.json
- ✅ background.js
- ✅ content.js
- ✅ content.css
- ✅ sidepanel.html
- ✅ sidepanel.css
- ✅ sidepanel.js
- ✅ README.md
- ✅ SETUP.md (this file)
- ✅ icons/icon16.png
- ✅ icons/icon32.png
- ✅ icons/icon48.png
- ✅ icons/icon128.png

## Development Tips

### Debugging
- Right-click on the floating popup → Inspect to see console logs
- Go to chrome://extensions/ → Click "Inspect views: service worker" for background script logs
- Open DevTools (F12) on the side panel for dashboard logs

### Making Changes
After modifying any file:
1. Go to chrome://extensions/
2. Click the refresh icon on your extension
3. Reload any open webpages to see changes

### Testing Features
- **Summarize**: Try on news articles or Wikipedia pages
- **Translate**: Works best with content in non-English languages
- **Mindmap**: Test on structured content like tutorials
- **Social Content**: Try on blog posts or product pages
- **Bookmarks**: Select any text and save it

## Advanced Configuration

### Changing the AI Model
Edit `sidepanel.js`, line 153:
```javascript
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
```

Available models:
- `gemini-1.5-flash` (fast, recommended - currently used)
- `gemini-1.5-pro` (more capable, slower)
- `gemini-1.0-pro` (stable, older version)

### Customizing the Popup Position
Edit `content.css`, lines 3-5:
```css
#ai-assistant-popup {
  top: 20px;    /* Change this */
  right: 20px;  /* Change this */
}
```

### Adjusting Content Length
Edit `content.js` to change how much content is sent to AI:
- Line 132: `substring(0, 5000)` for summarize
- Line 169: `substring(0, 3000)` for mindmap

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify all files are present and correctly named
3. Make sure your API key is valid
4. Try on a simple webpage first (e.g., example.com)

---

**You're all set! Enjoy your AI-powered browsing! 🚀**
