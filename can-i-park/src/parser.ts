import type { Verdict } from './types';

const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'] as const;

function to24h(timeStr: string): number {
  // e.g., 9AM -> 9, 11PM -> 23
  const m = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return NaN;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3].toUpperCase();
  if (mer === 'AM') {
    h = h % 12;
  } else {
    h = (h % 12) + 12;
  }
  return h + min / 60;
}

function nowContext() {
  const d = new Date();
  return {
    day: DAYS[d.getDay()],
    hour: d.getHours() + d.getMinutes() / 60,
    date: d,
  };
}

export function evaluateRulesFromText(text: string): Verdict {
  const normalized = text.toUpperCase().replace(/\s+/g, ' ').trim();
  const { day, hour, date } = nowContext();

  // Simple template: NO PARKING <DAYS> <TIME>-<TIME>
  // Example: NO PARKING MON & THU 9AM-11AM STREET CLEANING
  const noParkingMatch = normalized.match(/NO PARKING ([A-Z ,&-]+) (\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/);
  if (noParkingMatch) {
    const daysPart = noParkingMatch[1];
    const start = to24h(noParkingMatch[2]);
    const end = to24h(noParkingMatch[3]);
    const days = DAYS.filter(dy => new RegExp(`\\b${dy}\\b`).test(daysPart.replace(/&/g, ' ')));
    const isToday = days.includes(day);
    const within = hour >= start && hour <= end;
    if (isToday && within) {
      const next = humanizeNext(date, end);
      return { status: 'not_ok', reason: `No parking ${days.join(', ')} ${noParkingMatch[2]}–${noParkingMatch[3]}`, nextSafeStartLocal: next };
    }
    if (isToday) {
      const next = hour < start ? noParkingMatch[2] : 'Now';
      return { status: 'ok', reason: `Outside restricted hours today (${noParkingMatch[2]}–${noParkingMatch[3]})`, nextSafeStartLocal: next };
    }
    return { status: 'ok', reason: 'No parking applies on other days' };
  }

  // 2 HR PARKING <TIME>-<TIME>
  const twoHr = normalized.match(/(\d)\s*HR PARKING .*?(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/);
  if (twoHr) {
    const start = to24h(twoHr[2]);
    const end = to24h(twoHr[3]);
    const within = hour >= start && hour <= end;
    if (within) {
      return { status: 'ok', reason: `Limited to ${twoHr[1]} hour(s) now (${twoHr[2]}–${twoHr[3]})`, nextSafeStartLocal: twoHr[3] };
    }
    return { status: 'ok', reason: 'Outside metered/limited hours' };
  }

  // STREET CLEANING <DAY> <TIME>-<TIME>
  const streetCleaning = normalized.match(/STREET CLEANING ([A-Z]{3})(?:,| )? (\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/);
  if (streetCleaning) {
    const scDay = streetCleaning[1];
    const start = to24h(streetCleaning[2]);
    const end = to24h(streetCleaning[3]);
    const applies = scDay === day;
    const within = hour >= start && hour <= end;
    if (applies && within) {
      return { status: 'not_ok', reason: `Street cleaning ${scDay} ${streetCleaning[2]}–${streetCleaning[3]}`, nextSafeStartLocal: humanizeNext(date, end) };
    }
    return { status: 'ok', reason: 'No cleaning right now' };
  }

  // PERMIT ZONES - confusing because they often have exceptions
  // "PERMIT REQUIRED EXCEPT SUNDAYS" or "RESIDENT PERMIT ONLY"
  const permitRequired = normalized.match(/PERMIT REQUIRED(?: EXCEPT ([A-Z\s,]+))?/);
  if (permitRequired) {
    const exceptions = permitRequired[1];
    if (exceptions && exceptions.includes(day)) {
      return { status: 'ok', reason: `Permit required but today (${day}) is excepted` };
    }
    return { status: 'not_ok', reason: 'Permit required - check if you have valid permit' };
  }

  // RESIDENT PERMIT ONLY
  const residentOnly = normalized.match(/RESIDENT PERMIT ONLY/);
  if (residentOnly) {
    return { status: 'not_ok', reason: 'Resident permit only - check if you qualify' };
  }

  // COMPLEX: Multiple rules on same sign
  // "NO PARKING MON-FRI 8AM-6PM EXCEPT PERMIT HOLDERS"
  const complexNoParking = normalized.match(/NO PARKING ([A-Z\s,-]+) (\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))(?: EXCEPT ([A-Z\s]+))?/);
  if (complexNoParking) {
    const daysPart = complexNoParking[1];
    const start = to24h(complexNoParking[2]);
    const end = to24h(complexNoParking[3]);
    const exception = complexNoParking[4];
    const days = DAYS.filter(dy => new RegExp(`\\b${dy}\\b`).test(daysPart.replace(/&/g, ' ')));
    const isToday = days.includes(day);
    const within = hour >= start && hour <= end;
    
    if (isToday && within) {
      if (exception && exception.includes('PERMIT')) {
        return { status: 'uncertain', reason: `No parking ${complexNoParking[2]}–${complexNoParking[3]} except permit holders - check your permit` };
      }
      return { status: 'not_ok', reason: `No parking ${complexNoParking[2]}–${complexNoParking[3]}`, nextSafeStartLocal: humanizeNext(date, end) };
    }
    return { status: 'ok', reason: 'Outside restricted hours' };
  }

  // LOADING ZONE - often confusing
  const loadingZone = normalized.match(/LOADING ZONE(?: (\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)))?/);
  if (loadingZone) {
    if (loadingZone[1] && loadingZone[2]) {
      const start = to24h(loadingZone[1]);
      const end = to24h(loadingZone[2]);
      const within = hour >= start && hour <= end;
      if (within) {
        return { status: 'not_ok', reason: `Loading zone active ${loadingZone[1]}–${loadingZone[2]} - commercial vehicles only` };
      }
    }
    return { status: 'not_ok', reason: 'Loading zone - commercial vehicles only' };
  }

  // TOW AWAY ZONE - scary but important
  const towAway = normalized.match(/TOW AWAY ZONE(?: ([A-Z\s,]+))?/);
  if (towAway) {
    const daysPart = towAway[1];
    if (daysPart) {
      const days = DAYS.filter(dy => new RegExp(`\\b${dy}\\b`).test(daysPart.replace(/&/g, ' ')));
      if (days.includes(day)) {
        return { status: 'not_ok', reason: `Tow away zone active today (${day}) - DO NOT PARK` };
      }
    }
    return { status: 'not_ok', reason: 'Tow away zone - DO NOT PARK' };
  }

  // HANDICAP/ACCESSIBLE PARKING
  const handicap = normalized.match(/HANDICAP|ACCESSIBLE|DISABLED/);
  if (handicap) {
    return { status: 'not_ok', reason: 'Handicap/accessible parking only - valid permit required' };
  }

  // FIRE ZONE/HYDRANT
  const fireZone = normalized.match(/FIRE ZONE|FIRE HYDRANT|NO PARKING.*FIRE/);
  if (fireZone) {
    return { status: 'not_ok', reason: 'Fire zone/hydrant - DO NOT PARK' };
  }

  return { status: 'uncertain', reason: 'Could not parse rules from sign text' };
}

function humanizeNext(now: Date, nextHourFloat: number): string {
  const h = Math.floor(nextHourFloat);
  const m = Math.round((nextHourFloat - h) * 60);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  const sameDay = d.getDate() === now.getDate();
  return `${formatTime(d)} ${sameDay ? 'today' : 'tomorrow'}`;
}

function formatTime(d: Date): string {
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mm = minutes.toString().padStart(2, '0');
  return `${hours}:${mm} ${ampm}`;
}

