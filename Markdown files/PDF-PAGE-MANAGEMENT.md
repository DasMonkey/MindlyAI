# PDF Page Management System - Complete Guide

## Overview

The extension now features a **Smart PDF Page Management System** that allows users to capture and accumulate multiple PDF pages, switch between context modes, and have full transparency about what the AI knows.

## 🎯 Key Features

### 1. **Multi-Page Context Management**
- Capture multiple PDF pages and keep them in memory
- Three context modes:
  - **Single Page**: AI only knows the last captured page
  - **Accumulate All**: AI knows all captured pages
  - **Last 3 Pages**: AI knows the most recent 3 pages (sliding window)

### 2. **Smart Page Tracking**
- Automatic page number detection from Chrome's PDF viewer
- Visual display of all captured pages with badges
- Clear indication of which page was most recently loaded

### 3. **Token Usage Monitoring**
- Real-time token counter showing how much context is being used
- Visual progress bar with color-coded warnings:
  - Green: 0-60% (safe)
  - Yellow: 60-80% (warning)
  - Red: 80-100% (danger - approaching limit)

### 4. **User Control**
- One-click recapture of current page
- Individual page deletion (click × on page badge)
- Clear all pages at once
- Switch between context modes on the fly

## 📊 UI Components

### PDF Status Banner (appears in Chat and Mindy tabs)

When a PDF is active, you'll see a banner showing:

```
┌──────────────────────────────────────────────────────────┐
│ 📄 PDF Mode Active                                       │
│                                                           │
│ Pages Captured: 3 (1, 3, 5)          Mode: accumulate   │
│                                                           │
│ [Page 1 ×] [Page 3 ×] [Page 5 ×]                        │
│                                                           │
│ [🔄 Capture Current Page]  [🗑️ Clear All]                │
│                                                           │
│ [Single Page] [Accumulate All] [Last 3]                 │
│                                                           │
│ Token Usage: ~2,400 / 128,000 (1.9%)                    │
│ ▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │
└──────────────────────────────────────────────────────────┘
```

## 🎮 How to Use

### Basic Workflow

1. **Open a PDF in Chrome**
2. **Click "Call Mindy" or go to Chat tab**
3. **Initial page capture happens automatically**
4. **Scroll to different page**
5. **Click "🔄 Capture Current Page" in the banner**
6. **Ask questions** - AI will respond based on your selected context mode

### Context Mode Examples

#### Single Page Mode
```
User captures: Page 1, Page 2, Page 3
AI knows: Page 3 only (most recent)
Good for: Focused questions about one specific page
```

#### Accumulate All Mode (Default)
```
User captures: Page 1, Page 2, Page 3
AI knows: Pages 1, 2, and 3
Good for: Questions spanning multiple pages, building understanding
```

#### Last 3 Pages Mode
```
User captures: Page 1, Page 2, Page 3, Page 4, Page 5
AI knows: Pages 3, 4, and 5 (most recent 3)
Good for: Long documents, prevents token limits
```

## 🔧 Technical Details

### Page Number Detection

The system tries multiple methods to detect the current page:
1. Chrome's PDF viewer page selector input
2. ARIA labels with page information
3. Fallback: Estimate from scroll position (Pages 1-10)

### Token Calculation

- **Rough estimate**: ~4 characters = 1 token
- **Example**: A 2,000 character page ≈ 500 tokens
- **Limit**: Gemini 2.0 Flash supports 128,000 tokens
- **Safe range**: Keep under 100,000 tokens for best performance

### Context Building

When AI processes a request, it receives:

**Single Page Mode:**
```
PDF Document (Page 3)

[Text from page 3 only]
```

**Accumulate All Mode:**
```
PDF Document (3 pages)

--- Page 1 ---
[Text from page 1]

--- Page 2 ---
[Text from page 2]

--- Page 3 ---
[Text from page 3]

[Context: 3 page(s), ~2400 tokens]
```

## 💡 Best Practices

### For Short Documents (1-10 pages)
- Use **Accumulate All** mode
- Capture all pages sequentially
- AI will have complete document context

### For Long Documents (10+ pages)
- Use **Last 3 Pages** mode or **Single Page** mode
- Capture only relevant pages
- Switch modes as needed

### For Jumping Around
- Use **Single Page** mode
- Capture specific pages you're discussing
- Clear context between different sections

### Managing Token Usage
- If token bar turns yellow: Consider clearing old pages
- If token bar turns red: Switch to Single Page or clear some pages
- Each page typically uses 300-1,000 tokens

## 🎨 Visual Indicators

### Page Badges
- **Regular badge**: Captured page
- **Active badge (highlighted)**: Most recently loaded page
- **× button**: Remove this page from context

### Token Bar Colors
- **White/Gray**: Normal usage (0-60%)
- **Yellow**: Approaching limit (60-80%)
- **Red**: High usage (80-100%)

## 📝 Example Use Cases

### Use Case 1: Research Paper
```
1. Open PDF → Page 1 (Introduction) captured
2. Read through → Scroll to Page 5 (Methods)
3. Click "Capture Current Page"
4. Ask: "Compare the introduction with the methods section"
5. AI responds using both pages
```

### Use Case 2: Contract Review
```
1. Mode: Single Page
2. Capture Page 1 (Terms) → Ask questions
3. Capture Page 10 (Payment) → Ask questions
4. Capture Page 15 (Termination) → Ask questions
5. Each page analyzed independently
```

### Use Case 3: Textbook Study
```
1. Mode: Accumulate All
2. Capture Pages 23, 24, 25 (Chapter 3)
3. Ask: "Summarize this chapter"
4. AI uses all 3 pages for comprehensive answer
5. Move to Chapter 4 → Clear All → Start fresh
```

## 🔒 Data Persistence

### Saved Between Sessions
- Captured pages and their content
- Current context mode
- Page numbers
- Timestamps

### Reset When
- Extension reloads
- User clicks "Clear All"
- PDF document closes (optional)
- Chrome restarts (uses local storage)

## 🐛 Troubleshooting

### "No PDF tab found"
- Make sure PDF is still open in the tab
- Try closing the PDF modal and clicking "Call Mindy" again

### Page numbers showing as "Page 1" for all pages
- Chrome's PDF viewer might not expose page numbers
- System falls back to scroll-based estimation
- Pages are still captured correctly, just numbered sequentially

### Token usage seems high
- Large pages or pages with lots of text use more tokens
- Consider using Single Page or Last 3 Pages mode
- Clear old pages you don't need anymore

### AI doesn't know about page I just scrolled to
- You must click "🔄 Capture Current Page" button
- Scrolling doesn't automatically capture (by design - saves API calls)

## 🚀 Future Enhancements (Possible)

- Auto-capture on scroll after X seconds of inactivity
- Page thumbnails in banner
- Export captured pages as text file
- Search within captured pages
- Bookmark specific pages
- Compare two specific pages side-by-side

## 📊 Performance Notes

- **Average capture time**: 2-5 seconds per page
- **API cost**: One vision API call per capture (~$0.0001)
- **Storage**: ~10KB per page in local storage
- **Memory**: Minimal impact (text-only storage)

