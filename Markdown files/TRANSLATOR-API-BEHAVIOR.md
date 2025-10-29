# Translator API Behavior Explained

## Why "Downloadable" Always Shows

The Translator API has a unique privacy-focused behavior:

### Normal Behavior
- The API **always reports "downloadable"** status for privacy reasons
- This happens even when language models are already cached/downloaded
- Chrome doesn't expose whether specific language pairs are cached

### What Actually Happens
1. **First download**: Model downloads and gets cached
2. **Subsequent uses**: Model loads instantly from cache
3. **Status still shows**: "Downloadable" (by design)

This is **intentional** and **not a bug**. The API prioritizes user privacy by not revealing which language models are cached on the device.

## Dashboard Improvements

### Clickable Download Status
- "Downloadable" statuses in the dashboard are now **clickable**
- Click to trigger model download directly from the dashboard
- Progress shows during download
- Status updates to "Available" when complete

### Auto-Refresh After Download
- Dashboard automatically refreshes after downloads
- Shows updated status for all APIs
- Helps verify successful downloads

## How to Use

### From Dashboard
1. Go to Settings → Provider Status Dashboard
2. Look for APIs showing "📥 Downloadable"
3. **Click the "Downloadable" status** to start download
4. Watch progress indicator
5. Status updates to "✅ Available" when done

### From Test Page
1. Click "🧪 Test" button in dashboard
2. Opens comprehensive test page
3. Download and test each API individually
4. See detailed progress and results

## Translator API Specifics

### Language Pairs
- Each language pair (e.g., en→es, fr→de) is a separate model
- Downloading one pair doesn't download others
- Models are cached after first download
- Subsequent uses of same pair are instant

### Testing
- Test page allows selecting different language pairs
- First use of a pair may trigger download
- Same pair used again loads instantly
- Status still shows "downloadable" (privacy feature)

## Tips

1. **Don't worry about "Downloadable" status** - Models are cached after first use
2. **Click to download** from dashboard for convenience
3. **Use test page** for comprehensive testing
4. **Language pairs cache separately** - download as needed
5. **Instant loading** means model is cached (even if status says downloadable)

## Technical Details

### Why This Design?
- **Privacy**: Doesn't reveal user's language preferences
- **Security**: Doesn't expose cached model information
- **Consistency**: Same API behavior across all users

### Cache Location
- Models cached by Chrome
- Managed automatically
- Persists across browser sessions
- Cleared when browser cache is cleared

### Performance
- Cached models: Instant loading
- New models: Download once, use forever
- No re-downloads unless cache cleared
