// Audio Processor for Gemini Live API
// Handles microphone capture and audio playback

class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.audioWorklet = null;
    this.isMuted = false;
    this.audioQueue = [];
    this.isPlaying = false;
  }

  async initializeMicrophone() {
    try {
      // Request microphone permission
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Initialize AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create processor for audio chunks
      await this.audioContext.audioWorklet.addModule(
        URL.createObjectURL(new Blob([this.getWorkletCode()], { type: 'application/javascript' }))
      );
      
      this.audioWorklet = new AudioWorkletNode(this.audioContext, 'audio-processor');
      
      // Handle audio data
      this.audioWorklet.port.onmessage = (event) => {
        if (!this.isMuted && this.onAudioData) {
          this.onAudioData(event.data.audioData);
        }
      };

      source.connect(this.audioWorklet);
      this.audioWorklet.connect(this.audioContext.destination);

      return true;
    } catch (error) {
      console.error('Failed to initialize microphone:', error);
      throw error;
    }
  }

  getWorkletCode() {
    return `
      class AudioProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.bufferSize = 4096;
          this.buffer = [];
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          if (input.length > 0) {
            const samples = input[0];
            
            // Convert Float32 to Int16
            for (let i = 0; i < samples.length; i++) {
              const s = Math.max(-1, Math.min(1, samples[i]));
              this.buffer.push(s < 0 ? s * 0x8000 : s * 0x7FFF);
            }

            // Send chunks of audio data
            if (this.buffer.length >= this.bufferSize) {
              const chunk = new Int16Array(this.buffer.splice(0, this.bufferSize));
              this.port.postMessage({ audioData: chunk });
            }
          }
          return true;
        }
      }
      registerProcessor('audio-processor', AudioProcessor);
    `;
  }

  mute() {
    this.isMuted = true;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
  }

  unmute() {
    this.isMuted = false;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
  }

  async playAudio(pcmData) {
    // pcmData is base64 encoded 16-bit PCM at 24kHz from Gemini
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Decode base64 to array buffer
      const binaryString = atob(pcmData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert to Int16Array (16-bit PCM)
      const int16Array = new Int16Array(bytes.buffer);
      
      // Convert Int16 to Float32
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // Create audio buffer (24kHz from Gemini)
      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      // Play the audio
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();

      this.isPlaying = true;
      source.onended = () => {
        this.isPlaying = false;
      };
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }

  stopAudio() {
    if (this.audioContext) {
      // Stop all currently playing sources
      this.audioContext.close().then(() => {
        this.audioContext = null;
        this.isPlaying = false;
      });
    }
  }

  cleanup() {
    this.stopAudio();
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioWorklet) {
      this.audioWorklet.disconnect();
      this.audioWorklet = null;
    }
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.AudioProcessor = AudioProcessor;
}
