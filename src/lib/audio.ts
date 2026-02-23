// Convert AudioBuffer to WAV format
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const samples = audioBuffer.length;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;

  console.log('[audioBufferToWav] Creating WAV file', {
    numChannels,
    sampleRate,
    samples,
    dataSize,
    bitDepth,
    expectedDuration: samples / sampleRate,
  });

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved data
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Convert recorded media blob to WAV
async function convertToWav(mediaBlob: Blob, targetSampleRate = 16000): Promise<Blob> {
  const arrayBuffer = await mediaBlob.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: targetSampleRate });

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Verify the actual sample rate after decoding
    console.log('[convertToWav] AudioBuffer details', {
      targetSampleRate,
      actualSampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      duration: audioBuffer.duration,
      length: audioBuffer.length,
    });

    // If the browser didn't use our target sample rate, we need to resample
    if (audioBuffer.sampleRate !== targetSampleRate) {
      console.warn('[convertToWav] Sample rate mismatch, resampling...', {
        from: audioBuffer.sampleRate,
        to: targetSampleRate,
      });
      return audioBufferToWav(resampleAudioBuffer(audioBuffer, targetSampleRate));
    }

    // Convert to WAV format
    return audioBufferToWav(audioBuffer);
  } finally {
    await audioContext.close();
  }
}

// Resample AudioBuffer to target sample rate using offline audio context
function resampleAudioBuffer(audioBuffer: AudioBuffer, targetSampleRate: number): AudioBuffer {
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    (audioBuffer.duration * targetSampleRate) | 0,
    targetSampleRate
  );

  const bufferSource = offlineContext.createBufferSource();
  bufferSource.buffer = audioBuffer;
  bufferSource.connect(offlineContext.destination);
  bufferSource.start(0);

  // Render the resampled audio
  const renderedBuffer = offlineContext.startRendering();
  return renderedBuffer as unknown as AudioBuffer; // Type assertion for compatibility
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;

  constructor() {
    // No initialization needed - lazy init in start()
  }

  async start(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: this.getSupportedMimeType(),
    });
    this.chunks = [];
    this.startTime = Date.now();

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    // Use 1-second timeslice to collect data incrementally for long recordings
    this.mediaRecorder.start(1000);
  }

  async stop(): Promise<{ blob: Blob; duration: number }> {
    return new Promise(async (resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const duration = Math.round((Date.now() - this.startTime) / 1000);
        const rawBlob = new Blob(this.chunks, {
          type: this.mediaRecorder!.mimeType,
        });

        // Stop all tracks to release the microphone
        this.mediaRecorder!.stream.getTracks().forEach((t) => t.stop());
        this.mediaRecorder = null;
        this.chunks = [];

        try {
          // Convert to WAV with 16kHz sample rate for Azure Speech Service
          console.log('[AudioRecorder] Converting audio to WAV format...');
          const wavBlob = await convertToWav(rawBlob, 16000);
          console.log('[AudioRecorder] Conversion complete', {
            originalSize: rawBlob.size,
            convertedSize: wavBlob.size,
            mimeType: wavBlob.type,
          });
          resolve({ blob: wavBlob, duration });
        } catch (error) {
          console.error('[AudioRecorder] Error converting to WAV:', error);
          // Fall back to original blob if conversion fails
          resolve({ blob: rawBlob, duration });
        }
      };

      this.mediaRecorder.stop();
    });
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  }
}
