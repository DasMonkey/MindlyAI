// Gemini Live API Connection Manager
// Handles WebSocket connection to Gemini Live API

class GeminiLiveConnection {
  constructor(apiKey, pageContext) {
    this.apiKey = apiKey;
    this.pageContext = pageContext;
    this.ws = null;
    this.isConnected = false;
    this.audioProcessor = null;
    this.model = 'gemini-2.5-flash-native-audio-preview-09-2025';
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        // WebSocket endpoint for Gemini Live API
        const endpoint = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
        
        this.ws = new WebSocket(endpoint);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.sendSetupMessage();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.isConnected = false;
          if (this.onDisconnect) {
            this.onDisconnect();
          }
        };

        // Resolve after setup complete
        this.onSetupComplete = resolve;
      } catch (error) {
        reject(error);
      }
    });
  }

  sendSetupMessage() {
    const setupMessage = {
      setup: {
        model: `models/${this.model}`,
        generation_config: {
          response_modalities: ['AUDIO'],
          temperature: 0.7
        },
        system_instruction: {
          parts: [{
            text: `You are Mindy, a helpful AI assistant. The user is viewing a webpage and needs help understanding it. Here's the page content:\n\n${this.pageContext}\n\nAnswer questions about this page clearly and concisely. Be friendly and helpful.`
          }]
        },
        input_audio_transcription: {},
        output_audio_transcription: {}
      }
    };

    console.log('Sending setup message...');
    this.ws.send(JSON.stringify(setupMessage));
  }

  handleMessage(message) {
    console.log('Received message:', message);

    // Setup complete
    if (message.setupComplete) {
      console.log('Setup complete');
      this.isConnected = true;
      if (this.onSetupComplete) {
        this.onSetupComplete();
      }
      if (this.onStatusChange) {
        this.onStatusChange('listening');
      }
      return;
    }

    // Server content (audio, transcripts, etc.)
    if (message.serverContent) {
      const { serverContent } = message;

      // Handle audio output
      if (serverContent.modelTurn && serverContent.modelTurn.parts) {
        for (const part of serverContent.modelTurn.parts) {
          if (part.inlineData && part.inlineData.mimeType === 'audio/pcm') {
            if (this.onAudioReceived) {
              this.onAudioReceived(part.inlineData.data);
            }
            if (this.onStatusChange) {
              this.onStatusChange('speaking');
            }
          }
        }
      }

      // Handle input transcription (user speech)
      if (serverContent.inputTranscription) {
        if (this.onInputTranscript) {
          this.onInputTranscript(serverContent.inputTranscription.text);
        }
      }

      // Handle output transcription (AI speech)
      if (serverContent.outputTranscription) {
        if (this.onOutputTranscript) {
          this.onOutputTranscript(serverContent.outputTranscription.text);
        }
      }

      // Handle turn complete
      if (serverContent.turnComplete) {
        if (this.onStatusChange) {
          this.onStatusChange('listening');
        }
      }

      // Handle interruption
      if (serverContent.interrupted) {
        console.log('Generation interrupted by user');
        if (this.onInterrupted) {
          this.onInterrupted();
        }
      }
    }

    // Usage metadata
    if (message.usageMetadata) {
      console.log('Usage:', message.usageMetadata);
    }
  }

  sendAudioChunk(audioData) {
    if (!this.isConnected || !this.ws) {
      console.warn('Not connected, cannot send audio');
      return;
    }

    // Convert Int16Array to base64
    const bytes = new Uint8Array(audioData.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);

    const message = {
      realtimeInput: {
        audio: {
          data: base64Audio,
          mimeType: 'audio/pcm;rate=16000'
        }
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  sendAudioChunkBase64(base64Audio) {
    if (!this.isConnected || !this.ws) {
      console.warn('Not connected, cannot send audio');
      return;
    }

    const message = {
      realtimeInput: {
        audio: {
          data: base64Audio,
          mimeType: 'audio/pcm;rate=16000'
        }
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  sendAudioStreamEnd() {
    if (!this.isConnected || !this.ws) return;

    const message = {
      realtimeInput: {
        audioStreamEnd: true
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

// Modal controller
class MindyModal {
  constructor() {
    this.connection = null;
    this.audioProcessor = null;
    this.modal = null;
    this.isOpen = false;
  }

  async open() {
    if (this.isOpen) return;

    // Get API key from storage
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      alert('Please set up your Gemini API key first by opening the dashboard.');
      return;
    }

    // Check if HTTPS (required for microphone)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      alert('Call Mindy requires HTTPS. Please visit an HTTPS website to use this feature.');
      return;
    }

    // Extract page context
    const pageContext = this.extractPageContext();

    // Create modal
    this.createModal();
    this.isOpen = true;

    // Update status
    this.updateStatus('Requesting microphone access...');

    try {
      // Initialize microphone via iframe bridge
      await this.initializeMicrophoneViaBridge();

      this.updateStatus('Connecting to Mindy...');

      // Initialize connection
      this.connection = new GeminiLiveConnection(apiKey, pageContext);
      
      // Set up callbacks
      this.connection.onStatusChange = (status) => this.updateStatus(status);
      this.connection.onAudioReceived = (audioData) => this.handleAudioReceived(audioData);
      this.connection.onInputTranscript = (text) => this.addTranscript('user', text);
      this.connection.onOutputTranscript = (text) => this.addTranscript('ai', text);
      this.connection.onInterrupted = () => this.audioProcessor.stopAudio();
      this.connection.onDisconnect = () => this.close();

      // Connect audio processor to connection
      this.audioProcessor.onAudioData = (audioData) => {
        this.connection.sendAudioChunk(audioData);
      };

      // Connect to Gemini
      await this.connection.connect();
      
      this.updateStatus('listening');
      this.clearInfo();

    } catch (error) {
      console.error('Failed to initialize:', error);
      
      // Better error messages
      let errorMsg = 'Failed to start call: ';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = 'Microphone access denied. Please:\n\n1. Click the 🔒 icon in the address bar\n2. Allow microphone access for this site\n3. Reload the page and try again';
      } else if (error.name === 'NotFoundError') {
        errorMsg = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMsg = 'Microphone is already in use by another application.';
      } else {
        errorMsg += error.message;
      }
      
      alert(errorMsg);
      this.close();
    }
  }

  createModal() {
    // Remove existing modal if any
    const existing = document.getElementById('mindy-modal-overlay');
    if (existing) {
      existing.remove();
    }

    // Create modal HTML
    const overlay = document.createElement('div');
    overlay.id = 'mindy-modal-overlay';
    overlay.innerHTML = `
      <div id="mindy-modal">
        <div class="mindy-header">
          <h2>🎤 Call Mindy</h2>
          <button id="mindy-close" class="mindy-close-btn">&times;</button>
        </div>
        
        <div class="mindy-status">
          <div class="mindy-status-icon">
            <div class="mindy-pulse"></div>
          </div>
          <p id="mindy-status-text">Connecting...</p>
        </div>
        
        <div class="mindy-transcript">
          <div id="mindy-transcript-content">
            <p class="mindy-info">Ask me anything about this page...</p>
          </div>
        </div>
        
        <div class="mindy-controls">
          <button id="mindy-mute" class="mindy-control-btn" title="Mute/Unmute">
            <span class="mindy-btn-icon">🎤</span>
            <span class="mindy-btn-text">Mute</span>
          </button>
          <button id="mindy-end-call" class="mindy-control-btn mindy-end-btn">
            <span class="mindy-btn-icon">📞</span>
            <span class="mindy-btn-text">End Call</span>
          </button>
        </div>
        
        <div class="mindy-footer">
          <small>Powered by Gemini 2.5 Native Audio</small>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.modal = overlay;

    // Add event listeners
    document.getElementById('mindy-close').addEventListener('click', () => this.close());
    document.getElementById('mindy-end-call').addEventListener('click', () => this.close());
    document.getElementById('mindy-mute').addEventListener('click', () => this.toggleMute());

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });
  }

  updateStatus(status) {
    const statusText = document.getElementById('mindy-status-text');
    const statusDiv = document.querySelector('.mindy-status');
    
    if (!statusText || !statusDiv) return;

    // Remove existing status classes
    statusDiv.classList.remove('listening', 'speaking');

    switch (status) {
      case 'listening':
        statusText.textContent = 'Listening...';
        statusDiv.classList.add('listening');
        break;
      case 'speaking':
        statusText.textContent = 'Mindy is speaking...';
        statusDiv.classList.add('speaking');
        break;
      default:
        statusText.textContent = status;
    }
  }

  clearInfo() {
    const info = document.querySelector('.mindy-info');
    if (info) {
      info.remove();
    }
  }

  cleanTranscriptText(text) {
    console.log('Original transcript:', text);
    
    // Remove filler words (must be standalone or with punctuation)
    const fillerWords = /\b(um|uh|uhh|ahh|ehh|er|hmm|like|you know)\b[,\s]*/gi;
    
    // Fix broken words: "whe n" -> "when", "ini tial" -> "initial", "fir st" -> "first"
    // This handles both single letters and partial words with spaces
    let cleaned = text;
    
    // Join broken word parts (handles "whe n", "ini tial", etc.)
    // Look for sequences of 1-5 letters followed by space and more letters
    for (let i = 0; i < 5; i++) {
      cleaned = cleaned.replace(/\b([a-z]{1,5})\s+([a-z]{1,5})\b/gi, (match, p1, p2) => {
        // Only join if combined length is reasonable (2-10 chars for a word)
        const combined = p1 + p2;
        if (combined.length <= 10) {
          return combined;
        }
        return match;
      });
    }
    
    const result = cleaned
      .replace(fillerWords, '')           // Remove filler words
      .replace(/\s+/g, ' ')               // Collapse multiple spaces
      .replace(/\s+([.,!?])/g, '$1')      // Fix spacing before punctuation
      .replace(/\s*,\s*/g, ', ')          // Normalize comma spacing
      .trim()                             // Remove leading/trailing spaces
      .replace(/^[a-z]/, (c) => c.toUpperCase()); // Capitalize first letter
    
    console.log('Cleaned transcript:', result);
    return result;
  }

  addTranscript(role, text) {
    this.clearInfo();
    
    const container = document.getElementById('mindy-transcript-content');
    if (!container) return;

    // Clean the transcript text
    const cleanText = this.cleanTranscriptText(text);

    const message = document.createElement('div');
    message.className = `mindy-message ${role}`;
    message.innerHTML = `
      <div class="mindy-message-label">${role === 'user' ? 'You' : 'Mindy'}</div>
      <p class="mindy-message-text">${cleanText}</p>
    `;

    container.appendChild(message);
    
    // Auto scroll to bottom
    const transcript = document.querySelector('.mindy-transcript');
    if (transcript) {
      transcript.scrollTop = transcript.scrollHeight;
    }
  }

  handleAudioReceived(audioData) {
    if (this.audioProcessor) {
      this.audioProcessor.playAudio(audioData);
    }
  }

  toggleMute() {
    const muteBtn = document.getElementById('mindy-mute');
    const btnText = muteBtn.querySelector('.mindy-btn-text');
    const btnIcon = muteBtn.querySelector('.mindy-btn-icon');
    const isMuted = muteBtn.classList.contains('muted');

    if (isMuted) {
      this.sendUnmuteCommand();
      muteBtn.classList.remove('muted');
      btnText.textContent = 'Mute';
      btnIcon.textContent = '🎤';
    } else {
      this.sendMuteCommand();
      muteBtn.classList.add('muted');
      btnText.textContent = 'Unmuted';
      btnIcon.textContent = '🔇';
    }
  }

  close() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    // Clean up microphone via page script
    this.sendCleanupCommand();

    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }

    this.isOpen = false;
  }

  extractPageContext() {
    // Get page title
    const title = document.title;
    
    // Get main content (limit to 10000 chars)
    let content = document.body.innerText.substring(0, 10000);
    
    // Try to get meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    const description = metaDesc ? metaDesc.content : '';

    return `Page Title: ${title}\n\n${description ? `Description: ${description}\n\n` : ''}Content:\n${content}`;
  }

  async getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['geminiApiKey'], (result) => {
        resolve(result.geminiApiKey || null);
      });
    });
  }

  createAudioBridge() {
    // Create hidden iframe for audio capture
    if (document.getElementById('mindy-audio-bridge')) return;

    const iframe = document.createElement('iframe');
    iframe.id = 'mindy-audio-bridge';
    iframe.src = chrome.runtime.getURL('audio-bridge.html');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    this.audioBridge = iframe;
    console.log('🎉 Audio bridge created');
  }

  async initializeMicrophoneViaBridge() {
    // First create the bridge
    this.createAudioBridge();

    return new Promise((resolve, reject) => {
      let bridgeReady = false;

      const messageHandler = (event) => {
        if (!event.data || !event.data.type) return;

        switch (event.data.type) {
          case 'BRIDGE_READY':
            console.log('✅ Bridge ready');
            bridgeReady = true;
            // Request microphone after bridge is ready
            if (this.audioBridge && this.audioBridge.contentWindow) {
              this.audioBridge.contentWindow.postMessage({ type: 'INIT_MIC' }, '*');
            }
            break;

          case 'MIC_SUCCESS':
            console.log('✅ Microphone initialized');
            window.removeEventListener('message', messageHandler);
            
            // Set up audio data listener
            window.addEventListener('message', (e) => {
              if (e.data.type === 'AUDIO_DATA') {
                if (this.connection && this.connection.isConnected) {
                  this.connection.sendAudioChunkBase64(e.data.payload.audioData);
                }
              }
            });
            
            resolve();
            break;

          case 'MIC_ERROR':
            console.error('❌ Microphone error:', event.data.payload);
            window.removeEventListener('message', messageHandler);
            const error = new Error(event.data.payload.message);
            error.name = event.data.payload.error;
            reject(error);
            break;
        }
      };

      window.addEventListener('message', messageHandler);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!bridgeReady) {
          window.removeEventListener('message', messageHandler);
          reject(new Error('Audio bridge initialization timed out'));
        }
      }, 10000);
    });
  }

  sendMuteCommand() {
    if (this.audioBridge && this.audioBridge.contentWindow) {
      this.audioBridge.contentWindow.postMessage({ type: 'MUTE' }, '*');
    }
  }

  sendUnmuteCommand() {
    if (this.audioBridge && this.audioBridge.contentWindow) {
      this.audioBridge.contentWindow.postMessage({ type: 'UNMUTE' }, '*');
    }
  }

  sendCleanupCommand() {
    if (this.audioBridge && this.audioBridge.contentWindow) {
      this.audioBridge.contentWindow.postMessage({ type: 'CLEANUP' }, '*');
    }
    // Remove iframe
    if (this.audioBridge) {
      this.audioBridge.remove();
      this.audioBridge = null;
    }
  }
}

// Initialize and export
if (typeof window !== 'undefined') {
  window.GeminiLiveConnection = GeminiLiveConnection;
  window.MindyModal = MindyModal;
}

// Add callMindy function to content script
async function callMindy() {
  const modal = new MindyModal();
  await modal.open();
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.callMindy = callMindy;
}
