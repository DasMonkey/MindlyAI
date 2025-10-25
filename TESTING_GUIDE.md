# 🧪 Testing Guide - Call Mindy

## Prerequisites
- ✅ Chrome extension loaded in Developer Mode
- ✅ Gemini API key configured in dashboard
- ✅ HTTPS website (required for microphone access)
- ✅ Working microphone and speakers

## Quick Test (5 minutes)

### Step 1: Load Extension
```bash
1. Open Chrome
2. Navigate to chrome://extensions/
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the Chrome-ext-GoogleAI folder
6. Click "Reload" button on the extension
```

### Step 2: Open Test Page
```bash
Navigate to any HTTPS website, for example:
- https://www.irs.gov/forms-pubs/about-form-1040
- https://en.wikipedia.org/wiki/Artificial_intelligence
- https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
```

### Step 3: Start Call
```bash
1. Look for floating "AI Assistant" popup (top-right corner)
2. Click "Call Mindy" button (orange gradient)
3. Allow microphone access when prompted
4. Wait for "Listening..." status (green circle)
```

### Step 4: Test Basic Conversation
```bash
Speak: "Hello, can you hear me?"
Expected: 
- "You: Hello, can you hear me?" appears in transcript
- Mindy responds with voice
- "Mindy: [response]" appears in transcript
- Status changes to "Speaking" (orange) then back to "Listening" (green)
```

### Step 5: Test Context Awareness
```bash
Speak: "What is this page about?"
Expected:
- Mindy provides summary based on page content
- Response is relevant to the current webpage
```

## Detailed Test Cases

### Test 1: Connection & Permissions
**Objective**: Verify basic connectivity

1. Click "Call Mindy"
2. ✅ Modal appears with purple gradient
3. ✅ Shows "Requesting microphone access..."
4. ✅ Browser shows microphone permission prompt
5. ✅ After allowing, shows "Connecting to Mindy..."
6. ✅ Status changes to "Listening..." with green pulse

**Expected Time**: 2-3 seconds

---

### Test 2: Voice Input & Transcription
**Objective**: Test speech-to-text

1. Ensure status is "Listening..."
2. Speak clearly: "Testing one two three"
3. ✅ User transcript appears within 1-2 seconds
4. ✅ Text matches what you said (approximately)
5. ✅ Transcript bubble is blue/purple (user style)

**Expected Accuracy**: 90%+ for clear speech

---

### Test 3: AI Response & Audio
**Objective**: Test text-to-speech output

1. Ask: "Can you count to five?"
2. ✅ Status changes to "Speaking" (orange pulse)
3. ✅ Audio plays through speakers
4. ✅ AI transcript appears (gray bubble)
5. ✅ Audio matches transcript
6. ✅ Status returns to "Listening" when done

**Expected Audio Quality**: Clear, natural voice, 24kHz

---

### Test 4: Context Understanding
**Objective**: Verify page context is used

**On Wikipedia AI page:**
```
You: "What are the main types of AI mentioned here?"
Expected: Mentions specific AI types from the Wikipedia page
```

**On IRS Form page:**
```
You: "What is the deadline for filing this form?"
Expected: Provides specific deadline information from the page
```

**On MDN WebSocket docs:**
```
You: "How do I create a WebSocket connection?"
Expected: Provides code examples or steps from the documentation
```

---

### Test 5: Interruption Handling
**Objective**: Test mid-response interruption

1. Ask: "Tell me a long story about space"
2. Wait for Mindy to start responding (orange pulse)
3. While speaking, interrupt by saying: "Stop, just summarize"
4. ✅ Audio stops immediately
5. ✅ New user transcript appears
6. ✅ AI provides summary instead

---

### Test 6: Mute Functionality
**Objective**: Test mute/unmute controls

1. Click "Mute" button during listening
2. ✅ Button turns red with 🔇 icon
3. ✅ Button text changes to "Unmuted"
4. Speak something
5. ✅ No transcript appears (mic is muted)
6. Click button again to unmute
7. ✅ Returns to normal state
8. Speak again
9. ✅ Transcript appears (working again)

---

### Test 7: End Call & Cleanup
**Objective**: Verify proper resource cleanup

1. During an active conversation, click "End Call"
2. ✅ Modal closes immediately
3. ✅ Audio stops if playing
4. ✅ No console errors
5. Open modal again
6. ✅ Fresh start, no lingering transcripts

---

### Test 8: Multi-Turn Conversation
**Objective**: Test conversation context

```
Turn 1: "What is this page about?"
Turn 2: "Can you explain the first section?"
Turn 3: "What about the second section?"
```

✅ AI remembers previous turns
✅ Provides coherent follow-up answers
✅ References earlier parts of conversation

---

## Error Scenarios

### Test E1: No API Key
1. Clear API key from dashboard
2. Click "Call Mindy"
3. ✅ Shows alert: "Please set up your Gemini API key first"
4. ✅ Modal doesn't open

### Test E2: Microphone Denied
1. Deny microphone permission
2. ✅ Shows error message
3. ✅ Modal closes gracefully
4. ✅ No WebSocket connection attempted

### Test E3: Invalid API Key
1. Set invalid API key in dashboard
2. Click "Call Mindy"
3. ✅ Shows "Failed to start call" error
4. ✅ Check console for WebSocket error

### Test E4: Network Disconnect
1. Start conversation
2. Disable network connection
3. ✅ Connection closes
4. ✅ Modal shows disconnect message or closes
5. ✅ No hanging connections

---

## Performance Tests

### P1: Latency
- **Metric**: Time from user speech end to AI response start
- **Target**: < 500ms
- **Test**: Use stopwatch, measure multiple times
- **Pass Criteria**: 80% of responses under 500ms

### P2: Audio Quality
- **Test**: Listen for glitches, crackling, or distortion
- **Pass Criteria**: Smooth, clear audio throughout

### P3: Transcript Accuracy
- **Test**: Compare transcript to actual speech
- **Pass Criteria**: 90%+ accuracy for clear speech

### P4: Memory Usage
- **Test**: Open DevTools > Performance > Memory
- **Before Call**: Note memory usage
- **During Call**: Monitor for leaks
- **After Close**: Memory should return close to baseline

---

## Browser Console Checks

### Expected Console Messages
```
WebSocket connected
Sending setup message...
Setup complete
Received message: { setupComplete: {} }
```

### Warning Signs (BAD)
```
❌ WebSocket error: ...
❌ Failed to initialize microphone
❌ Uncaught TypeError: ...
❌ Memory leak warning
```

---

## Real-World Scenarios

### Scenario 1: Tax Form Help
**Page**: IRS Form 1040 instructions
**Question**: "I lived abroad for 6 months, am I still a U.S. resident?"
**Expected**: Relevant answer based on residency rules from the page

### Scenario 2: Technical Documentation
**Page**: React Hooks documentation
**Question**: "When should I use useEffect versus useLayoutEffect?"
**Expected**: Explanation with examples from the docs

### Scenario 3: Shopping Decision
**Page**: Product comparison page
**Question**: "Which product has better reviews?"
**Expected**: Comparison based on reviews visible on page

### Scenario 4: Legal Terms
**Page**: Terms of Service page
**Question**: "Can I cancel my subscription anytime?"
**Expected**: Specific answer from ToS section

---

## Debugging Tips

### If microphone doesn't work:
```bash
1. Check chrome://settings/content/microphone
2. Verify site has permission
3. Test microphone in other apps
4. Try different browser
```

### If audio doesn't play:
```bash
1. Check system volume
2. Check browser audio settings
3. Open DevTools > Console for errors
4. Verify speaker output device
```

### If WebSocket fails:
```bash
1. Check API key is correct
2. Verify internet connection
3. Check DevTools > Network > WS tab
4. Look for error messages in Console
```

### If transcripts don't appear:
```bash
1. Check WebSocket messages in DevTools
2. Verify message structure matches API
3. Look for JSON parse errors
4. Check if DOM elements exist
```

---

## Success Criteria

✅ **Must Pass All:**
- Connection established < 3 seconds
- Audio input captured correctly
- Audio output plays clearly
- Transcripts appear for both user and AI
- Context-aware responses
- Mute/unmute works
- Clean disconnect on close

✅ **Performance Targets:**
- Response latency < 500ms
- No audio glitches
- No memory leaks
- Smooth UI animations

---

## Known Limitations

1. **HTTP Sites**: Microphone access requires HTTPS
2. **Safari**: Limited AudioWorklet support
3. **Mobile**: Not optimized for mobile browsers yet
4. **PDF Pages**: Text extraction not yet implemented
5. **Very Long Pages**: Context limited to 10,000 characters

---

## Next Steps After Testing

1. **Report Issues**: Create list of bugs found
2. **Performance Tuning**: Optimize slow areas
3. **UX Improvements**: Note confusing interactions
4. **Feature Requests**: Document desired enhancements

---

**Happy Testing! 🎉**
