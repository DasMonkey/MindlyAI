# Image Analysis Features

## Overview
The Chrome extension now supports two powerful image analysis features using Google's Gemini Vision AI:

1. **Extract Texts**: OCR to extract all text from images
2. **Explain This Image**: Detailed analysis, alt-text generation, and explanations of charts/diagrams/photos

## How It Works

### Feature 1: Extract Texts (OCR)

#### Technical Implementation
1. **Context Menu**: When you right-click on any image, select "MindlyAI: Extract texts"
2. **Image Processing**: The extension fetches the image, converts it to base64, and sends it to Gemini API
3. **Vision API**: Gemini 2.5 Flash analyzes the image and extracts all visible text
4. **Display**: Results appear in the side panel's "Generate" tab with options to copy or download

### Feature 2: Explain This Image

#### Technical Implementation
1. **Context Menu**: When you right-click on any image, select "MindlyAI: Explain This Image"
2. **Image Processing**: Same as above - fetches and converts to base64
3. **Vision API**: Gemini analyzes and provides comprehensive explanation
4. **Output**: Structured response with alt-text, detailed explanation, purpose, and insights

### Usage Steps

#### For Text Extraction:
1. **Right-click any image** on a webpage
2. **Select "MindlyAI: Extract texts"** from the context menu
3. **Wait for processing** - the side panel will open automatically
4. **View extracted text** in the Generate tab
5. **Copy or download** the results using the action buttons

#### For Image Explanation:
1. **Right-click any image** on a webpage
2. **Select "MindlyAI: Explain This Image"** from the context menu
3. **Wait for analysis** - the side panel will open automatically
4. **View comprehensive explanation** including:
   - Alt-text description (accessibility-friendly)
   - Detailed visual analysis
   - Purpose and message
   - Chart/diagram/photo insights
5. **Copy or download** the explanation

## Features

### Text Extraction Capabilities
- ✅ Printed text (documents, screenshots, photos of text)
- ✅ Handwritten text (varies by legibility)
- ✅ Text in different languages
- ✅ Text from signs, posters, infographics
- ✅ Text from memes, social media posts
- ✅ Multiple text sections (organized automatically)

### Image Explanation Capabilities
- ✅ **Alt-Text Generation**: Screen reader-friendly descriptions
- ✅ **Chart Analysis**: Explain data trends, key findings, comparisons
- ✅ **Diagram Explanation**: Component identification and relationships
- ✅ **Photo Description**: Scene, mood, subjects, composition, colors
- ✅ **Infographic Summary**: Key information and message extraction
- ✅ **Accessibility Support**: Detailed descriptions for visually impaired users
- ✅ **Context Understanding**: Purpose and intent of the image

### Supported Image Formats
- JPEG/JPG
- PNG
- GIF
- WebP
- BMP

## Code Changes

### Files Modified
1. **background.js**: Added two context menu items for images (extract & explain)
2. **sidepanel.js**: Added `extractImageText()` function with vision API integration
3. **sidepanel.js**: Added `explainImage()` function for detailed analysis
4. **sidepanel.js**: Updated `callGeminiApi()` to support image inputs

### Key Functions

#### `extractImageText(imageUrl)`
```javascript
async function extractImageText(imageUrl) {
  // 1. Fetch image from URL
  // 2. Convert to base64
  // 3. Send to Gemini Vision API with OCR prompt
  // 4. Display extracted text
}
```

#### `explainImage(imageUrl)`
```javascript
async function explainImage(imageUrl) {
  // 1. Fetch image from URL
  // 2. Convert to base64
  // 3. Send to Gemini Vision API with detailed analysis prompt
  // 4. Display comprehensive explanation with:
  //    - Alt-text description
  //    - Visual analysis
  //    - Purpose/message
  //    - Type-specific insights (chart/diagram/photo)
}
```

#### Updated `callGeminiApi(prompt, imageParts)`
Now accepts optional `imageParts` parameter for multimodal requests:
```javascript
const imageParts = [{
  inlineData: {
    mimeType: 'image/jpeg',
    data: base64Data
  }
}];
```

## API Details

### Gemini Vision API
- **Model**: `gemini-2.5-flash`
- **Endpoint**: `/v1beta/models/gemini-2.5-flash:generateContent`
- **Input**: Text prompt + base64-encoded image
- **Output**: Extracted text in structured format

### Request Format
```json
{
  "contents": [{
    "parts": [
      {
        "inlineData": {
          "mimeType": "image/jpeg",
          "data": "<base64-image-data>"
        }
      },
      {
        "text": "Extract all text from this image..."
      }
    ]
  }]
}
```

## Error Handling
- ❌ **No API Key**: Prompts user to configure API key
- ❌ **Image Load Failed**: Shows error message
- ❌ **No Text Found**: Returns "No text found in image"
- ❌ **API Error**: Displays detailed error message

## History & Tracking
- **Text Extractions** are saved to history with icon 🖼️
- **Image Explanations** are saved to history with icon 🔍
- Includes timestamp and source image URL
- Can be viewed, copied, or deleted from History tab

## Performance
- **Speed**: Typically 2-5 seconds depending on image size
- **Image Size**: Works best with images under 4MB
- **Quality**: Higher resolution = better text recognition

## Limitations
- Cannot extract text from password-protected images
- May struggle with very low-quality or blurry images
- Handwriting recognition accuracy varies
- Requires active internet connection

## Future Enhancements
- [ ] Batch processing (multiple images)
- [ ] OCR language detection
- [ ] Text translation after extraction
- [ ] Image annotation/highlighting
- [ ] Export to multiple formats (PDF, DOCX)
- [ ] Compare multiple images side-by-side
- [ ] Generate captions for social media
- [ ] Detect and explain QR codes/barcodes
- [ ] Identify objects and landmarks
- [ ] Suggest improvements for accessibility

## Testing Checklist
- [x] Context menu appears on image right-click
- [x] Side panel opens automatically
- [x] Image is fetched and converted to base64
- [x] Text extraction works with various image types
- [x] Results display correctly in Generate tab
- [x] History saves extraction records
- [x] Error handling works properly
- [x] Copy/download functions work

## Example Use Cases

### Text Extraction
1. **Screenshots**: Extract text from code screenshots
2. **Documents**: OCR scanned PDFs or photos of documents
3. **Memes**: Extract text from meme images
4. **Social Media**: Get text from Instagram/Twitter posts
5. **Signs**: Extract text from photos of signs or posters
6. **Receipts**: Extract text from receipt photos
7. **Business Cards**: Extract contact information

### Image Explanation
1. **Accessibility**: Generate alt-text for images on websites
2. **Data Charts**: Understand trends in bar charts, line graphs, pie charts
3. **Flowcharts**: Understand process flows and decision trees
4. **Technical Diagrams**: Understand architecture diagrams, circuit diagrams
5. **Educational**: Explain scientific diagrams, historical photos
6. **Art Analysis**: Understand composition, style, and meaning in artwork
7. **Product Images**: Get detailed descriptions of products
8. **Infographics**: Extract and summarize key information
9. **Medical Images**: Understand labeled anatomy or medical diagrams
10. **Geography**: Explain maps, terrain features, satellite images

---

**Enjoy the new image text extraction feature! 🖼️✨**
