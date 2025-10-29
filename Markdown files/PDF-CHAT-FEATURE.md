# PDF Chat Feature - Built-in AI Support

## Overview
The extension now supports chatting with PDFs using both Built-in AI and Cloud AI, with automatic method selection based on the active provider.

## How It Works

### Built-in AI (Text Extraction with OCR Fallback)
- **Primary Method**: Extracts actual text content from PDF files
  - Works with text-based PDFs in PDF.js viewer (Firefox, some sites)
  - No OCR needed - faster and more accurate
  - Uses the existing `pdf-content.js` content script
- **Automatic Fallback**: Uses OCR when text extraction fails
  - Chrome's native PDF viewer doesn't expose text to extensions
  - Automatically switches to OCR (requires API key)
  - User is prompted to switch to Cloud AI or configure API key

### Cloud AI (OCR)
- Takes screenshots of PDF pages
- Uses Gemini Vision API for OCR
- Works with all PDFs (text-based and image-based)
- Works with Chrome's native PDF viewer
- More versatile but requires API key

## Implementation

### Smart Extraction Function
```javascript
// Automatically chooses the right method
async function extractPDFPage(tabId, pageNumber = null) {
  const provider = getCurrentProvider();
  
  if (provider === 'builtin') {
    return await extractPDFPageText(tabId, pageNumber);
  }
  
  return await extractPDFPageWithOCR(tabId, pageNumber);
}
```

### Text Extraction (Built-in AI)
```javascript
async function extractPDFPageText(tabId, pageNumber = null) {
  // Request text from pdf-content.js
  const textResults = await chrome.tabs.sendMessage(tabId, { 
    action: 'getPDFText' 
  });
  
  const extractedText = textResults?.text || '';
  // Returns structured page data
}
```

### OCR Extraction (Cloud AI)
```javascript
async function extractPDFPageWithOCR(tabId, pageNumber = null) {
  // Capture screenshot
  const dataUrl = await chrome.tabs.captureVisibleTab();
  
  // Use Gemini Vision API
  const extractedText = await callGeminiVisionApi(prompt, dataUrl);
  // Returns structured page data
}
```

## User Experience

### With Built-in AI
1. Open a PDF in Chrome
2. Open the extension side panel
3. Go to Chat tab
4. PDF mode activates automatically
5. Ask questions about the PDF
6. Text is extracted directly (no API key needed)

### With Cloud AI
1. Same steps as above
2. Screenshots are taken and OCR'd
3. Works with scanned PDFs and images
4. Requires Gemini API key

## Limitations

### Built-in AI
- **Chrome's Native PDF Viewer**: Cannot extract text directly
  - Automatically falls back to OCR (requires API key)
  - User is prompted to switch to Cloud AI or configure API key
- **PDF.js Viewer**: Works perfectly with text extraction
  - Firefox uses PDF.js by default
  - Some websites use PDF.js viewer
- **Scanned/Image PDFs**: Requires OCR fallback (needs API key)

### Cloud AI
- Requires API key
- Uses more tokens (sends images)
- Slower than text extraction
- Works with all PDF viewers and types

## Files Modified

1. **sidepanel.js**
   - Added `getCurrentProvider()` helper
   - Added `extractPDFPage()` smart selector
   - Added `extractPDFPageText()` for built-in AI
   - Updated all PDF extraction calls to use `extractPDFPage()`

2. **pdf-content.js** (existing)
   - Already extracts text from PDFs
   - Works with PDF.js and Chrome's native viewer

3. **BUILTIN-VS-CLOUD-AI-FEATURES.md**
   - Updated to document PDF chat support

## Testing

### Test with Built-in AI
1. Select Built-in AI in Settings
2. Open a text-based PDF (like a research paper)
3. Go to Chat tab
4. Click "Load Page" or send a message
5. Should extract text without API key
6. Ask questions about the PDF content

### Test with Cloud AI
1. Select Cloud AI in Settings
2. Configure API key
3. Open any PDF (text or image-based)
4. Go to Chat tab
5. Should capture screenshot and use OCR
6. Ask questions about the PDF content

## Error Handling

### Automatic OCR Fallback
When text extraction fails (Chrome native viewer, scanned PDFs):
1. System automatically attempts OCR
2. If no API key configured, user sees:
   ```
   This PDF requires OCR (image-based text extraction).
   
   Built-in AI cannot extract text from Chrome's native PDF viewer.
   
   Options:
   1. Switch to Cloud AI and configure API key for OCR
   2. Open the PDF in a different viewer (Firefox PDF.js)
   
   Would you like to switch to Cloud AI now?
   ```

### Solutions
- **Option 1**: Switch to Cloud AI and configure API key
- **Option 2**: Open PDF in Firefox (uses PDF.js viewer)
- **Option 3**: Use a website that embeds PDFs with PDF.js viewer

## Future Enhancements

- Detect if PDF is image-based and suggest switching to Cloud AI
- Add option to manually choose extraction method
- Support for multi-page text extraction in one go
- Better handling of protected/encrypted PDFs
