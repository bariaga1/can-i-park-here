import type { OcrResult } from './types';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// Cloud OCR using OCR.space (simple free tier). Requires OCRSPACE_API_KEY in app.json extra or env.
export async function runOcrOnUri(uri: string): Promise<OcrResult> {
  try {
    const apiKey = (Constants.expoConfig?.extra as any)?.OCRSPACE_API_KEY || process.env.OCRSPACE_API_KEY;
    if (!apiKey) {
      return { text: '', confidence: 0, };
    }

    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
    const form = new FormData();
    form.append('apikey', apiKey as any);
    form.append('language', 'eng');
    form.append('isOverlayRequired', 'false');
    form.append('detectOrientation', 'true');
    form.append('scale', 'true');
    form.append('OCREngine', '2');
    form.append('base64Image', `data:image/jpeg;base64,${base64}`);

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: form as any,
    });
    const json = await res.json();
    const parsed = json?.ParsedResults?.[0]?.ParsedText as string | undefined;
    const exitCode = json?.OCRExitCode;
    if (!parsed) {
      return { text: '', confidence: 0 };
    }
    return { text: parsed, confidence: exitCode === 1 ? 0.9 : 0.6 };
  } catch (e) {
    return { text: '', confidence: 0 };
  }
}

