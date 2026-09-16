import { readFileSync } from 'fs';
import { join } from 'path';
import { evaluateRulesFromText } from '../src/parser';

const appJson = JSON.parse(readFileSync(join(__dirname, '../app.json'), 'utf8'));
const API_KEY = appJson?.expo?.extra?.OCRSPACE_API_KEY as string;
const DIR = join(__dirname);

const cases = [
  { file: 'sign-01-no-parking-weekdays.png', expectedText: 'NO PARKING MON-FRI 8AM-6PM', expectedTonight: 'ok' },
  { file: 'sign-02-no-parking-mon-thu.png', expectedText: 'NO PARKING MON & THU 9AM-11AM', expectedTonight: 'ok' },
  { file: 'sign-03-street-cleaning.png', expectedText: 'STREET CLEANING MON 9AM-11AM', expectedTonight: 'ok' },
  { file: 'sign-04-2hr-parking.png', expectedText: '2 HR PARKING 8AM-6PM', expectedTonight: 'ok' },
  { file: 'sign-05-fire-zone.png', expectedText: 'NO PARKING FIRE ZONE', expectedTonight: 'not_ok' },
];

async function ocrImage(filePath: string): Promise<{ text: string; confidence: number }> {
  const bytes = readFileSync(filePath);
  const base64 = bytes.toString('base64');
  const form = new FormData();
  form.append('apikey', API_KEY);
  form.append('language', 'eng');
  form.append('isOverlayRequired', 'false');
  form.append('detectOrientation', 'true');
  form.append('scale', 'true');
  form.append('OCREngine', '2');
  form.append('base64Image', `data:image/png;base64,${base64}`);

  const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: form });
  const json = await res.json();
  const text = (json?.ParsedResults?.[0]?.ParsedText as string | undefined) || '';
  const exitCode = json?.OCRExitCode;
  return { text: text.replace(/\r/g, '').trim(), confidence: exitCode === 1 ? 0.9 : 0.6 };
}

async function main() {
  console.log('Now:', new Date().toString());
  console.log('');
  let failures = 0;

  for (const testCase of cases) {
    const ocr = await ocrImage(join(DIR, testCase.file));
    const verdict = evaluateRulesFromText(ocr.text);
    const ocrLooksRight = ocr.text.toUpperCase().includes(testCase.expectedText.split(' ')[0]);
    const statusOk = verdict.status === testCase.expectedTonight;
    const pass = statusOk;
    if (!pass) failures += 1;

    console.log(`=== ${testCase.file} ${pass ? 'PASS' : 'FAIL'} ===`);
    console.log(`Expected text-ish: ${testCase.expectedText}`);
    console.log(`OCR text: ${JSON.stringify(ocr.text)} (conf ${Math.round(ocr.confidence * 100)}%)`);
    console.log(`OCR contains first keyword: ${ocrLooksRight}`);
    console.log(`Verdict: ${verdict.status} — ${verdict.reason}`);
    if (verdict.nextSafeStartLocal) console.log(`Next safe: ${verdict.nextSafeStartLocal}`);
    console.log(`Expected tonight: ${testCase.expectedTonight}`);
    console.log('');
  }

  console.log(failures === 0 ? 'All simple signs passed for current day/time.' : `${failures} simple sign(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
