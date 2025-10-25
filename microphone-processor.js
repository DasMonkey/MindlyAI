// AudioWorklet processor for capturing microphone audio
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
      
      for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        this.buffer.push(s < 0 ? s * 0x8000 : s * 0x7FFF);
      }

      if (this.buffer.length >= this.bufferSize) {
        const chunk = new Int16Array(this.buffer.splice(0, this.bufferSize));
        this.port.postMessage({ audioData: chunk });
      }
    }
    return true;
  }
}

registerProcessor('microphone-processor', MicrophoneProcessor);
