
declare const lamejs: any;

export const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const encodeBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// FIX: Add and export `createWavBlob` function to fix missing export error.
export const createWavBlob = (pcmChunks: Uint8Array[]): Blob => {
  const totalLength = pcmChunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combinedPcm = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of pcmChunks) {
    combinedPcm.set(chunk, offset);
    offset += chunk.length;
  }
  
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataSize = combinedPcm.length;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // chunk size
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk 1 size
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // byte rate
  view.setUint16(32, numChannels * (bitsPerSample / 8), true); // block align
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM data
  new Uint8Array(buffer).set(combinedPcm, 44);

  return new Blob([view], { type: 'audio/wav' });
};

export const encodePcmToMp3Blob = (pcmData: Uint8Array): Blob => {
    if (typeof lamejs === 'undefined') {
        throw new Error("MP3 encoding library not loaded.");
    }
    const pcmSamples = new Int16Array(pcmData.buffer);

    const sampleRate = 24000;
    const numChannels = 1;
    const mp3Encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128);
    const mp3Data = [];
    
    const sampleBlockSize = 1152;
    for (let i = 0; i < pcmSamples.length; i += sampleBlockSize) {
        const sampleChunk = pcmSamples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const end = mp3Encoder.flush();
    if (end.length > 0) {
        mp3Data.push(end);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const content = base64String.split(',')[1];
      if (content) {
        resolve(content);
      } else {
        reject(new Error("Failed to convert blob to base64 string."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
};
