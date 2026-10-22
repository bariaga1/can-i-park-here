import type { Verdict, VerdictStatus } from './types';

/** Strong rule headers that typically start a new plaque on a stacked sign. */
const CLAUSE_START =
  /^(NO\s+PARKING|NO\s+STANDING|STREET\s+CLEANING|(\d+\s+)?(HOUR|HR)\s+(COMMERCIAL\s+)?METERED|METERED\s+PARKING|LOADING\s+ZONE|TOW\s+AWAY|PERMIT\s+REQUIRED|RESIDENT|HANDICAP|FIRE|PRIVATE|\d+\s*HR?\s*PARKING)/i;

/**
 * Split OCR text into independent clauses (stacked plaques). Lines without a
 * header continue the previous plaque.
 */
export function splitIntoClauses(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed.split(/\r\n|\n|\r/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [trimmed];

  const clauses: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (CLAUSE_START.test(line) && current.length > 0) {
      clauses.push(current.join(' '));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) clauses.push(current.join(' '));

  return clauses.length > 0 ? clauses : [trimmed];
}

const STATUS_RANK: Record<VerdictStatus, number> = {
  not_ok: 3,
  uncertain: 2,
  ok: 1,
};

function stricter(a: VerdictStatus, b: VerdictStatus): VerdictStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

/** Merge per-clause verdicts: strictest status wins; reason from the winning restriction. */
export function mergeVerdicts(verdicts: Verdict[]): Verdict {
  if (verdicts.length === 0) {
    return { status: 'uncertain', reason: 'Could not parse rules from sign text' };
  }
  if (verdicts.length === 1) return verdicts[0];

  let status: VerdictStatus = 'ok';
  for (const v of verdicts) {
    status = stricter(status, v.status);
  }

  const candidates = verdicts.filter((v) => v.status === status);
  const pick =
    (status === 'ok'
      ? [...candidates].reverse().find((v) => /metered parking active/i.test(v.reason)) ??
        candidates[candidates.length - 1]
      : undefined) ??
    candidates.find((v) => v.status === 'not_ok') ??
    candidates.find((v) => v.status === 'uncertain') ??
    candidates[0];

  const others = verdicts.filter((v) => v !== pick && v.status !== 'ok');
  const details =
    others.length > 0
      ? others.map((v) => v.reason).join('; ')
      : undefined;

  return {
    status,
    reason: pick.reason,
    nextSafeStartLocal: pick.nextSafeStartLocal,
    details,
  };
}
