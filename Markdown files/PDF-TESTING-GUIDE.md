# PDF OCR Feature - Testing Guide

## Quick Test Steps

### Test 1: Call Mindy with PDF (Voice Chat)
1. Open a PDF file in Chrome (any PDF URL or local file)
2. Notice the floating AI Assistant popup with PDF Mode notice
3. Click **"Call Mindy"** button
4. A modal appears with "📸 Capture & Analyze Page" button
5. Click the capture button
6. You should see notifications:
   - "📸 Capturing current PDF page..."
   - "✅ Opening Mindy - PDF page will be analyzed!"
7. Mindy tab opens automatically
8. Click "Start Call" to begin voice chat
9. Try asking: "What is this document about?" or "Summarize this page"
10. Mindy should respond based on the PDF content

**Expected Result**: Mindy understands and can answer questions about the visible PDF page content.

### Test 2: Chat with Page (Text Chat)
1. Open a PDF file in Chrome
2. Click **"Open Dashboard"** from the floating popup
3. Navigate to the **"Chat"** tab
4. The page content should load automatically (you may see a brief loading indicator)
5. Type a question like: "What are the main points on this page?"
6. Click Send
7. AI should respond with information from the PDF

**Expected Result**: Chat feature can read and respond to questions about the PDF content.

### Test 3: Multi-Page PDF
1. Open a multi-page PDF
2. Scroll to page 2
3. Click "Call Mindy" and capture the page
4. Ask Mindy about content on page 2
5. Scroll to page 3
6. In Chat, reload the page content (refresh or switch tabs)
7. Ask about page 3 content

**Expected Result**: Only the currently visible page is captured each time.

### Test 4: Large PDF Page
1. Open a PDF with a lot of text on one page
2. Use either Call Mindy or Chat with Page
3. Check the console (F12) for messages about truncation
4. Ask questions - AI should still respond with available content

**Expected Result**: If page has >10,000 characters, content is truncated with a warning note.

### Test 5: PDF with Images and Text
1. Open a PDF that contains both images and text
2. Capture the page
3. Ask about both text content and any images/diagrams visible

**Expected Result**: OCR should extract text and describe visible images.

## Console Debugging

Press `F12` to open Developer Tools and check the Console for these messages:

### Successful PDF Capture:
```
📄 PDF detected, using OCR extraction...
📸 Capturing PDF page screenshot...
✅ Screenshot captured, size: [number]
📤 Calling Gemini Vision API
✅ Vision API Response received
✅ OCR extraction complete, length: [number]
✅ PDF content loaded for chat, length: [number]
```

### If Truncation Occurs:
```
⚠️ Extracted text is large ([number] chars), truncating to 10000
```

### Errors to Watch For:
- `❌ PDF OCR extraction error:` - Problem with extraction
- `Vision API Error Response:` - API issue
- `Failed to get page context:` - General failure

## Common Issues and Solutions

### Issue: "Unable to retrieve page content"
**Solution**: Make sure you have a valid Gemini API key configured in Settings.

### Issue: Floating popup appears in screenshot
**Solution**: This shouldn't happen anymore - the popup is automatically hidden before capture. If it does appear, report it as a bug.

### Issue: OCR text is inaccurate
**Solution**: Try zooming the PDF to make text larger and clearer before capturing.

### Issue: Only partial page captured
**Solution**: This is by design - only the visible portion is captured. Scroll to see different parts and capture multiple times if needed.

### Issue: Very slow extraction
**Solution**: Large pages with lots of content take longer to process. Wait for the completion notification.

## Advanced Testing

### Test Different PDF Types:
- ✅ Text-based PDFs (born-digital)
- ✅ Scanned PDFs (image-based, tests OCR)
- ✅ PDFs with forms
- ✅ PDFs with tables
- ✅ PDFs with mixed content (text, images, diagrams)
- ✅ Password-protected PDFs (if Chrome can open them)
- ✅ Large multi-page documents (50+ pages)

### Test Different Scenarios:
- ✅ Zoom in/out on PDF before capturing
- ✅ Capture at different window sizes
- ✅ Test on both local files and web PDFs
- ✅ Test with poor quality scanned PDFs
- ✅ Test with different languages

## What Should Work

✅ Voice chat about current visible PDF page  
✅ Text chat about current visible PDF page  
✅ Asking factual questions about PDF content  
✅ Summarizing PDF page content  
✅ Extracting specific information from PDFs  
✅ Multi-page PDFs (one page at a time)  
✅ Truncation of very large pages  
✅ Hiding floating menu during capture  

## What Won't Work (By Design)

❌ Automatic multi-page extraction (only current page)  
❌ Scrolling through entire document automatically  
❌ Persistent PDF memory across pages (each capture is independent)  
❌ PDFs that Chrome can't open natively  
❌ Extremely large single pages (will be truncated)  

## Reporting Issues

If you find bugs, please note:
1. What you were trying to do
2. What PDF you were testing with
3. What happened vs. what you expected
4. Any console errors (F12 → Console tab)
5. Screenshots of the issue if possible

