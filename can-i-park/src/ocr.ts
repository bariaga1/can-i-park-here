import type { OcrResult } from './types';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// Cloud OCR using OCR.space (simple free tier). Requires OCRSPACE_API_KEY in app.json extra or env.
export async function runOcrOnUri(uri: string): Promise<OcrResult> {
  try {
    const apiKey = (Constants.expoConfig?.extra as any)?.OCRSPACE_API_KEY || process.env.OCRSPACE_API_KEY;
    if (!apiKey) {
      console.warn('OCR: No API key found');
      return { text: '', confidence: 0, };
    }

    console.log('OCR: Starting OCR processing for image...');
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
    const form = new FormData();
    form.append('apikey', apiKey as any);
    form.append('language', 'eng');
    form.append('isOverlayRequired', 'false');
    form.append('detectOrientation', 'true');
    form.append('scale', 'true');
    form.append('OCREngine', '2');
    form.append('base64Image', `data:image/jpeg;base64,${base64}`);

    console.log('OCR: Sending request to OCR.space API...');
    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: form as any,
    });
    
    const json = await res.json();
    console.log('OCR API Response Status:', res.status);
    console.log('OCR API Response:', JSON.stringify(json, null, 2));
    
    const parsed = json?.ParsedResults?.[0]?.ParsedText as string | undefined;
    const exitCode = json?.OCRExitCode;
    
    if (!parsed) {
      console.warn('OCR: No parsed text found. Full response:', json);
      return { text: '', confidence: 0 };
    }
    
    console.log('OCR: Successfully extracted text:', parsed);
    console.log('OCR: Exit code:', exitCode);
    return { text: parsed, confidence: exitCode === 1 ? 0.9 : 0.6 };
  } catch (e) {
    console.error('OCR Error:', e);
    if (e instanceof Error) {
      console.error('OCR Error message:', e.message);
      console.error('OCR Error stack:', e.stack);
    }
    return { text: '', confidence: 0 };
  }
}

