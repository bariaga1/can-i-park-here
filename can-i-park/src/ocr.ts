import type { OcrResult } from './types';

// Stub OCR: replace with ML Kit or platform modules later.
export async function runOcrOnUri(_uri: string): Promise<OcrResult> {
  // Simulate OCR by returning placeholder text
  return {
    text: 'NO PARKING MON & THU 9AM-11AM STREET CLEANING',
    confidence: 0.6,
  };
}

