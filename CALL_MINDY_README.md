# 🎤 Call Mindy - Voice AI Assistant

## Overview
**Call Mindy** is a real-time voice AI feature powered by Google's **Gemini 2.5 Flash Native Audio** model. It allows users to have natural voice conversations with AI about any webpage they're viewing.

## ✨ Features
- **Real-time Voice Conversation**: Talk to AI using your microphone and hear responses
- **Context-Aware**: AI understands the current page content automatically
- **Native Audio**: High-quality voice synthesis (24kHz)
- **Live Transcription**: See real-time text transcription of both user and AI speech
- **Interrupt Support**: Can interrupt AI mid-response to ask follow-up questions
- **Beautiful UI**: Purple gradient modal with status indicators

## 🎯 Use Cases
1. **Tax Forms**: "Help me fill out question 1 about tax residency..."
2. **Legal Documents**: "What does this clause mean in simple terms?"
3. **Technical Documentation**: "Can you explain this API endpoint?"
4. **Research Papers**: "Summarize the key findings..."
5. **Shopping**: "Compare these product features..."

## 🏗️ Architecture

### Files Created
```
Chrome-ext-GoogleAI/
├── gemini-live-modal.html          # Modal UI structure
├── gemini-live-modal.css           # Modal styling (gradient theme)
├── gemini-live-connection.js       # WebSocket manager & modal controller
└── audio-processor.js              # Audio capture & playback
```

### Technology Stack
- **Gemini Live API**: `gemini-2.5-flash-native-audio-preview-09-2025`
- **WebSocket**: Real-time bidirectional communication
- **Web Audio API**: Microphone capture and audio playback
- **AudioWorklet**: Real-time audio processing

### Audio Specifications
- **Input**: 16-bit PCM, 16kHz, mono (from microphone)
- **Output**: 16-bit PCM, 24kHz, mono (from Gemini)
- **Encoding**: Base64 for WebSocket transmission
- **Format**: Little-endian

## 🔧 How It Works

### 1. User Clicks "Call Mindy"
```javascript
// Triggered from floating popup button
callMindy() -> MindyModal.open()
```

### 2. Initialize Connection
```
1. Request microphone permission
2. Extract page context (title + 10,000 chars of content)
3. Open modal UI with "Connecting..." status
4. Initialize AudioProcessor for mic capture
5. Connect WebSocket to Gemini Live API
```

### 3. Setup Message
```json
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio-preview-09-2025",
    "generation_config": {
      "response_modalities": ["AUDIO"],
      "temperature": 0.7
    },
    "system_instruction": {
      "parts": [{
        "text": "You are Mindy... [page context included]"
      }]
    },
    "input_audio_transcription": {},
    "output_audio_transcription": {}
  }
}
```

### 4. Audio Pipeline

**Microphone → Gemini**
```
Microphone (getUserMedia)
  ↓
AudioContext (16kHz)
  ↓
AudioWorklet (Float32 → Int16)
  ↓
Base64 Encode
  ↓
WebSocket.send({ realtimeInput: { audio: {...} } })
  ↓
Gemini Live API
```

**Gemini → Speaker**
```
Gemini Live API
  ↓
WebSocket.onmessage
  ↓
Base64 Decode → Int16Array
  ↓
Int16 → Float32 conversion
  ↓
AudioBuffer (24kHz)
  ↓
BufferSource → AudioContext.destination
  ↓
Speaker
```

### 5. Transcription Display
```
serverContent.inputTranscription  → "You" transcript bubble
serverContent.outputTranscription → "Mindy" transcript bubble
```

## 🎨 UI Components

### Modal Structure
```
┌─────────────────────────────────────┐
│ 🎤 Call Mindy                    ✕  │ Header (draggable)
├─────────────────────────────────────┤
│         ⚪ (pulsing)                │ Status Indicator
│       Listening...                  │ (green = listening, orange = speaking)
├─────────────────────────────────────┤
│  You: About question 1...           │ Transcript Area
│  Mindy: Question 1 asks about...    │ (auto-scroll)
├─────────────────────────────────────┤
│  [🎤 Mute]  [📞 End Call]          │ Controls
├─────────────────────────────────────┤
│  Powered by Gemini 2.5 Native Audio │ Footer
└─────────────────────────────────────┘
```

### Visual States
- **Connecting**: White pulsing circle
- **Listening**: Green glowing circle + "Listening..."
- **Speaking**: Orange glowing circle + "Mindy is speaking..."
- **Muted**: Red button with 🔇 icon

## 🔑 Key Features

### 1. Automatic Voice Activity Detection (VAD)
- Automatically detects when user starts/stops speaking
- No need to press buttons to talk
- Configurable sensitivity (using API defaults)

### 2. Context Management
- Sends page context as `system_instruction` (persistent)
- Supports up to ~1M tokens
- Extracts title, meta description, and first 10,000 chars

### 3. Interrupt Handling
```javascript
if (serverContent.interrupted) {
  audioProcessor.stopAudio(); // Stop AI speech immediately
}
```

### 4. Audio Quality
- Echo cancellation enabled
- Noise suppression enabled
- Auto gain control enabled
- 16kHz capture for optimal quality/bandwidth balance

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Click "Call Mindy" button
- [ ] Microphone permission granted
- [ ] Modal opens and connects
- [ ] Status changes to "Listening..."
- [ ] Speak a question
- [ ] User transcript appears
- [ ] AI responds with voice
- [ ] AI transcript appears
- [ ] Can mute/unmute
- [ ] Can end call

### Edge Cases
- [ ] Deny microphone permission → Error message
- [ ] No API key → Alert to set up key
- [ ] Close modal mid-conversation → Cleanup properly
- [ ] Interrupt AI mid-response → Audio stops
- [ ] Mute during speech → Audio not sent
- [ ] Network disconnect → Handle gracefully

### Performance
- [ ] Low latency (<500ms response time)
- [ ] No audio glitches or crackling
- [ ] Smooth visual state transitions
- [ ] Memory cleanup on close

## 🐛 Troubleshooting

### "Microphone access denied"
- Browser blocked microphone access
- Check site permissions in browser settings
- Try HTTPS (required for getUserMedia)

### "Failed to connect"
- Check API key is valid
- Verify internet connection
- Check browser console for WebSocket errors

### "No audio output"
- Check system audio settings
- Verify speaker/headphone connection
- Check browser audio permissions

### "Choppy audio"
- Slow internet connection
- High CPU usage on device
- Try closing other tabs/apps

## 🚀 Future Enhancements

### Planned Features
1. **PDF Support**: Extract text from PDFs for context
2. **Multi-language**: Support conversations in different languages
3. **Function Calling**: Let AI perform actions (save notes, search, etc.)
4. **Session History**: Save and resume conversations
5. **Voice Selection**: Choose different AI voices
6. **Proactive Audio**: AI can ask clarifying questions

### API Features to Explore
- `proactive_audio`: AI ignores irrelevant audio
- `enable_affective_dialog`: AI adapts tone to user emotion
- Tool use: Function calling for actions
- Session resumption: Continue conversations later

## 📊 API Usage

### Costs (Approximate)
- **Input**: ~$0.01 per 1,000 audio seconds
- **Output**: ~$0.01 per 1,000 audio seconds
- **Context**: Included in system instruction (free up to limits)

### Rate Limits
- Check Google AI Studio for current limits
- Typically: 60 requests per minute
- Audio streaming counts as one session

## 🔐 Security Notes

- API key stored in Chrome's local storage (encrypted by browser)
- WebSocket connection uses TLS (wss://)
- No audio data stored locally or remotely
- Page context sent only for current session
- Microphone access requires explicit user permission

## 📱 Browser Compatibility

### Supported Browsers
- ✅ **Chrome**: Full support (v88+)
- ✅ **Edge**: Full support (Chromium-based)
- ⚠️ **Firefox**: Partial (AudioWorklet support varies)
- ❌ **Safari**: Limited (WebSocket/AudioWorklet issues)

### Requirements
- HTTPS connection (for microphone access)
- Modern browser with WebSocket support
- AudioWorklet API support
- getUserMedia API support

## 📚 Resources

- [Gemini Live API Docs](https://ai.google.dev/api/live)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)

---

**Built with ❤️ using Gemini 2.5 Flash Native Audio (09-2025)**
