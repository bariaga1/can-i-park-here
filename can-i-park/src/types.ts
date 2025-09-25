export type VerdictStatus = 'ok' | 'not_ok' | 'uncertain';

export type Verdict = {
  status: VerdictStatus;
  reason: string;
  details?: string;
  nextSafeStartLocal?: string; // human-readable local time, e.g., "11:00 AM today"
};

export type OcrResult = {
  text: string;
  confidence?: number;
};

export type ParsedRule = {
  type: string;
  days?: string[];
  startTime?: string;
  endTime?: string;
  exceptions?: string[];
  permitRequired?: boolean;
  direction?: string;
  rawText: string;
};

