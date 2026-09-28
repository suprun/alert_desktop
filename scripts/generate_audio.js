const fs = require('fs');
const path = require('path');

function createWavHeader(dataLength, sampleRate = 44100, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

function generateAlertSound(filePath) {
  const sampleRate = 44100;
  const duration = 2.4; // seconds
  const totalSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(totalSamples * 2);

  // Two-tone rising/falling siren sound (800Hz - 1100Hz pulses)
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // frequency modulates between 750 Hz and 1050 Hz every 0.6 seconds
    const cycle = (t % 0.6) / 0.6;
    const freq = 750 + 300 * Math.sin(cycle * Math.PI);
    
    // Smooth envelope at start and end of pulses
    const pulseEnv = Math.sin(Math.PI * cycle);
    const overallEnv = Math.min(1, Math.min(t * 10, (duration - t) * 10));
    
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.7 * pulseEnv * overallEnv;
    const intSample = Math.floor(Math.max(-32767, Math.min(32767, sample * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  const header = createWavHeader(data.length, sampleRate);
  fs.writeFileSync(filePath, Buffer.concat([header, data]));
  console.log(`Alert sound generated at: ${filePath}`);
}

function generateAllClearSound(filePath) {
  const sampleRate = 44100;
  const duration = 1.6; // seconds
  const totalSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(totalSamples * 2);

  // Gentle harmonious chime: 523.25 Hz (C5) -> 659.25 Hz (E5) -> 783.99 Hz (G5)
  const notes = [
    { freq: 523.25, start: 0.0, end: 0.5 },
    { freq: 659.25, start: 0.4, end: 1.0 },
    { freq: 783.99, start: 0.9, end: 1.6 }
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const note of notes) {
      if (t >= note.start && t < note.end) {
        const noteT = t - note.start;
        const noteDuration = note.end - note.start;
        // Exponential decay envelope
        const envelope = Math.exp(-3 * (noteT / noteDuration)) * Math.sin(Math.PI * (noteT / 0.02));
        sample += Math.sin(2 * Math.PI * note.freq * noteT) * envelope * 0.4;
      }
    }

    const intSample = Math.floor(Math.max(-32767, Math.min(32767, sample * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  const header = createWavHeader(data.length, sampleRate);
  fs.writeFileSync(filePath, Buffer.concat([header, data]));
  console.log(`All-clear sound generated at: ${filePath}`);
}

const audioDir = path.join(__dirname, '..', 'assets', 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

generateAlertSound(path.join(audioDir, 'alert.wav'));
generateAllClearSound(path.join(audioDir, 'all-clear.wav'));
