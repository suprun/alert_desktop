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

function writeWav(filePath, data, sampleRate = 44100) {
  const header = createWavHeader(data.length, sampleRate);
  fs.writeFileSync(filePath, Buffer.concat([header, data]));
  console.log(`Згенеровано аудіо: ${path.basename(filePath)} (${(data.length / 1024).toFixed(1)} KB)`);
}

// 1. Класична сирена (двотонова наростаюча модуляція)
function generateSirenSound(filePath) {
  const sampleRate = 44100;
  const duration = 2.4;
  const totalSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(totalSamples * 2);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const cycle = (t % 0.6) / 0.6;
    const freq = 750 + 300 * Math.sin(cycle * Math.PI);
    const pulseEnv = Math.sin(Math.PI * cycle);
    const overallEnv = Math.min(1, Math.min(t * 10, (duration - t) * 10));
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.7 * pulseEnv * overallEnv;
    const intSample = Math.floor(Math.max(-32767, Math.min(32767, sample * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  writeWav(filePath, data, sampleRate);
}

// 2. Електронний пульс (швидкі ритмічні біпери тривоги)
function generatePulseSound(filePath) {
  const sampleRate = 44100;
  const duration = 2.0;
  const totalSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(totalSamples * 2);

  // 6 коротких біпів по 0.16с з паузами
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const cycle = (t % 0.3); // період біпу 300мс
    let sample = 0;
    if (cycle < 0.18) {
      const pulseT = cycle / 0.18;
      const env = Math.sin(Math.PI * pulseT);
      const freq = 920;
      sample = (Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(2 * Math.PI * (freq * 2) * t)) * env * 0.65;
    }
    const intSample = Math.floor(Math.max(-32767, Math.min(32767, sample * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  writeWav(filePath, data, sampleRate);
}

// 3. М'який сигнал тривоги (офісний тривожний передзвін)
function generateAlertChimeSound(filePath) {
  const sampleRate = 44100;
  const duration = 2.2;
  const totalSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(totalSamples * 2);

  const notes = [
    { freq: 587.33, start: 0.0, end: 0.7 }, // D5
    { freq: 440.00, start: 0.5, end: 1.3 }, // A4
    { freq: 587.33, start: 1.1, end: 2.1 }  // D5
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const note of notes) {
      if (t >= note.start && t < note.end) {
        const noteT = t - note.start;
        const noteDur = note.end - note.start;
        const env = Math.exp(-3.5 * (noteT / noteDur)) * Math.sin(Math.PI * Math.min(1, noteT / 0.03));
        sample += (Math.sin(2 * Math.PI * note.freq * noteT) + 0.2 * Math.sin(4 * Math.PI * note.freq * noteT)) * env * 0.45;
      }
    }
    const intSample = Math.floor(Math.max(-32767, Math.min(32767, sample * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  writeWav(filePath, data, sampleRate);
}

// 4. Радарний імпульс (глибокий сигнал загрози)
function generateRadarSound(filePath) {
  const sampleRate = 44100;
  const duration = 2.2;
  const totalSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(totalSamples * 2);

  // 2 глибокі радарні пульси
  const pings = [0.0, 1.0];
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const pingStart of pings) {
      if (t >= pingStart && t < pingStart + 0.9) {
        const pt = t - pingStart;
        const freq = 420 - pt * 80;
        const env = Math.exp(-3.8 * pt) * Math.sin(Math.PI * Math.min(1, pt / 0.02));
        sample += Math.sin(2 * Math.PI * freq * pt) * env * 0.7;
      }
    }
    const intSample = Math.floor(Math.max(-32767, Math.min(32767, sample * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  writeWav(filePath, data, sampleRate);
}

// 5. Гармонійний передзвін відбою (мажорний акорд C5-E5-G5)
function generateChimeSound(filePath) {
  const sampleRate = 44100;
  const duration = 1.8;
  const totalSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(totalSamples * 2);

  const notes = [
    { freq: 523.25, start: 0.0, end: 0.6 },
    { freq: 659.25, start: 0.4, end: 1.1 },
    { freq: 783.99, start: 0.9, end: 1.8 }
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const note of notes) {
      if (t >= note.start && t < note.end) {
        const noteT = t - note.start;
        const noteDur = note.end - note.start;
        const env = Math.exp(-3 * (noteT / noteDur)) * Math.sin(Math.PI * Math.min(1, noteT / 0.02));
        sample += Math.sin(2 * Math.PI * note.freq * noteT) * env * 0.45;
      }
    }
    const intSample = Math.floor(Math.max(-32767, Math.min(32767, sample * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  writeWav(filePath, data, sampleRate);
}

// 6. Подвійний дзвіночок відбою (ding-dong: E5 -> C5)
function generateBellSound(filePath) {
  const sampleRate = 44100;
  const duration = 1.8;
  const totalSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(totalSamples * 2);

  const notes = [
    { freq: 659.25, start: 0.0, end: 0.8 }, // E5
    { freq: 523.25, start: 0.5, end: 1.8 }  // C5
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const note of notes) {
      if (t >= note.start && t < note.end) {
        const noteT = t - note.start;
        const noteDur = note.end - note.start;
        const env = Math.exp(-3.2 * (noteT / noteDur)) * Math.sin(Math.PI * Math.min(1, noteT / 0.015));
        sample += (Math.sin(2 * Math.PI * note.freq * noteT) + 0.15 * Math.sin(4 * Math.PI * note.freq * noteT)) * env * 0.45;
      }
    }
    const intSample = Math.floor(Math.max(-32767, Math.min(32767, sample * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  writeWav(filePath, data, sampleRate);
}

// 7. Висхідна марімба (C5 -> D5 -> G5 -> C6)
function generateMarimbaSound(filePath) {
  const sampleRate = 44100;
  const duration = 1.9;
  const totalSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(totalSamples * 2);

  const notes = [
    { freq: 523.25, start: 0.00, end: 0.50 }, // C5
    { freq: 587.33, start: 0.25, end: 0.75 }, // D5
    { freq: 783.99, start: 0.50, end: 1.10 }, // G5
    { freq: 1046.50, start: 0.80, end: 1.80 } // C6
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const note of notes) {
      if (t >= note.start && t < note.end) {
        const noteT = t - note.start;
        const noteDur = note.end - note.start;
        const env = Math.exp(-5.0 * (noteT / noteDur)) * Math.sin(Math.PI * Math.min(1, noteT / 0.01));
        sample += (Math.sin(2 * Math.PI * note.freq * noteT) + 0.1 * Math.sin(6 * Math.PI * note.freq * noteT)) * env * 0.45;
      }
    }
    const intSample = Math.floor(Math.max(-32767, Math.min(32767, sample * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  writeWav(filePath, data, sampleRate);
}

// 8. Спокійний гонг відбою (глибокий м'який тон)
function generateGongSound(filePath) {
  const sampleRate = 44100;
  const duration = 2.4;
  const totalSamples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(totalSamples * 2);

  const baseFreq = 261.63; // C4

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-2.2 * (t / duration)) * Math.sin(Math.PI * Math.min(1, t / 0.03));
    const sample = (
      Math.sin(2 * Math.PI * baseFreq * t) * 0.5 +
      Math.sin(2 * Math.PI * (baseFreq * 2.01) * t) * 0.25 +
      Math.sin(2 * Math.PI * (baseFreq * 3.02) * t) * 0.15 +
      Math.sin(2 * Math.PI * (baseFreq * 4.76) * t) * 0.1
    ) * env * 0.6;
    const intSample = Math.floor(Math.max(-32767, Math.min(32767, sample * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  writeWav(filePath, data, sampleRate);
}

const audioDir = path.join(__dirname, '..', 'assets', 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

console.log('Генерація звукових пресетів...');

// Пресети тривоги
generateSirenSound(path.join(audioDir, 'alert-siren.wav'));
generatePulseSound(path.join(audioDir, 'alert-pulse.wav'));
generateAlertChimeSound(path.join(audioDir, 'alert-chime.wav'));
generateRadarSound(path.join(audioDir, 'alert-radar.wav'));

// Копія/дефолт тривоги
generateSirenSound(path.join(audioDir, 'alert.wav'));

// Пресети відбою
generateChimeSound(path.join(audioDir, 'all-clear-chime.wav'));
generateBellSound(path.join(audioDir, 'all-clear-bell.wav'));
generateMarimbaSound(path.join(audioDir, 'all-clear-marimba.wav'));
generateGongSound(path.join(audioDir, 'all-clear-gong.wav'));

// Копія/дефолт відбою
generateChimeSound(path.join(audioDir, 'all-clear.wav'));

console.log('Усі аудіофайли успішно згенеровано!');
