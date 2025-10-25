// This script runs in the page context (not content script context)
// It has full access to getUserMedia and can communicate with content script via postMessage

(function() {
  'use strict';

  console.log('🎤 Gemini Live page script loaded');

  let audioContext = null;
  let mediaStream = null;
  let audioWorklet = null;

  // Listen for messages from content script
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    if (!event.data.type || !event.data.type.startsWith('MINDY_')) return;

    const { type, payload } = event.data;

    switch (type) {
      case 'MINDY_INIT_MIC':
        await initializeMicrophone();
        break;
      case 'MINDY_MUTE':
        muteMicrophone();
        break;
      case 'MINDY_UNMUTE':
        unmuteMicrophone();
        break;
      case 'MINDY_CLEANUP':
        cleanup();
        break;
    }
  });

  async function initializeMicrophone() {
    try {
      console.log('🎤 Requesting microphone access...');
      
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('✅ Microphone access granted');

      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      const source = audioContext.createMediaStreamSource(mediaStream);
      
      // Create AudioWorklet for processing
      const workletCode = `
        class MicrophoneProcessor extends AudioWorkletProcessor {
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
        registerProcessor('microphone-processor', MicrophoneProcessor);
      `;

      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      await audioContext.audioWorklet.addModule(workletUrl);
      audioWorklet = new AudioWorkletNode(audioContext, 'microphone-processor');
      
      // Handle audio data
      audioWorklet.port.onmessage = (event) => {
        const audioData = event.data.audioData;
        
        // Convert to base64 and send to content script
        const bytes = new Uint8Array(audioData.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);

        // Send to content script
        window.postMessage({
          type: 'MINDY_AUDIO_DATA',
          payload: { audioData: base64Audio }
        }, '*');
      };

      source.connect(audioWorklet);
      audioWorklet.connect(audioContext.destination);

      // Notify success
      window.postMessage({
        type: 'MINDY_MIC_SUCCESS',
        payload: {}
      }, '*');

    } catch (error) {
      console.error('❌ Microphone error:', error);
      window.postMessage({
        type: 'MINDY_MIC_ERROR',
        payload: { 
          error: error.name,
          message: error.message 
        }
      }, '*');
    }
  }

  function muteMicrophone() {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
  }

  function unmuteMicrophone() {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
  }

  function cleanup() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    if (audioWorklet) {
      audioWorklet.disconnect();
      audioWorklet = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
  }

})();
