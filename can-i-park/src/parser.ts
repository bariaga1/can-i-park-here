import type { Verdict } from './types';

const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'] as const;

function to24h(timeStr: string): number {
  // e.g., 9AM -> 9, 11PM -> 23, 9:30AM -> 9.5, 12PM -> 12
  // More flexible: handle spaces, no spaces, optional minutes
  const m = timeStr.trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(AM|PM)$/i);
  if (!m) return NaN;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3].toUpperCase();
  if (mer === 'AM') {
    if (h === 12) h = 0; // 12AM = midnight
    else h = h % 12;
  } else {
    if (h !== 12) h = (h % 12) + 12; // 12PM stays 12
  }
  return h + min / 60;
}

// Parse day ranges like "MON-FRI", "MON THRU FRI", "MON & THU", "MON-FRI & SAT"
function parseDays(daysPart: string): string[] {
  const result = new Set<string>();
  const normalized = daysPart.replace(/&/g, ' & ').trim();
  
  // Split by & to handle combinations
  const parts = normalized.split(/\s+&\s+/);
  
  for (const part of parts) {
    const trimmed = part.trim();
    
    // Try to match ranges like "MON-FRI", "MON THRU FRI", "MON TO FRI"
    const rangeMatch = trimmed.match(/^([A-Z]{3})\s*(?:-|THRU|TO)\s*([A-Z]{3})$/);
    if (rangeMatch) {
      const startDay = rangeMatch[1];
      const endDay = rangeMatch[2];
      const startIdx = DAYS.indexOf(startDay as any);
      const endIdx = DAYS.indexOf(endDay as any);
      
      if (startIdx !== -1 && endIdx !== -1) {
        // Handle ranges that wrap around (like FRI-MON, though uncommon)
        if (startIdx <= endIdx) {
          for (let i = startIdx; i <= endIdx; i++) {
            result.add(DAYS[i]);
          }
        } else {
          // Wraps around (FRI-MON)
          for (let i = startIdx; i < DAYS.length; i++) {
            result.add(DAYS[i]);
          }
          for (let i = 0; i <= endIdx; i++) {
            result.add(DAYS[i]);
          }
        }
      }
    } else {
      // Check if it's a single day abbreviation
      if (DAYS.includes(trimmed as any)) {
        result.add(trimmed);
      } else {
        // Fallback: try to find any day abbreviations in the string
        DAYS.forEach(day => {
          if (new RegExp(`\\b${day}\\b`).test(trimmed)) {
            result.add(day);
          }
        });
      }
    }
  }
  
  return Array.from(result);
}

function nowContext() {
  const d = new Date();
  return {
    day: DAYS[d.getDay()],
    hour: d.getHours() + d.getMinutes() / 60,
    date: d,
  };
}

// Filter out irrelevant text, keeping only parking-related content
function filterParkingRelevantText(text: string): string {
  const upper = text.toUpperCase();
  
  // Parking-related keywords to keep
  const parkingKeywords = [
    'PARKING', 'PARK', 'NO PARKING', 'NO PARK', 'STANDING', 'NO STANDING',
    'STREET CLEANING', 'CLEANING', 'PERMIT', 'RESIDENT', 'LOADING ZONE',
    'LOADING', 'TOW AWAY', 'TOW', 'TOWED', 'FIRE ZONE', 'FIRE HYDRANT', 'FIRE',
    'HANDICAP', 'ACCESSIBLE', 'DISABLED', 'METERED', 'HR', 'HOUR',
    'EXCEPT', 'REQUIRED', 'ONLY', 'ZONE', 'PROHIBITED', 'FORBIDDEN', 'RESIDENT', 'RESIDENT ONLY', 'CAUTION', 'NO STOPPING',
    'PRIVATE', 'UNAUTHORIZED', 'UNAUTHORISED', 'VEHICLES', 'VEHICLE'
  ];
  
  // Day abbreviations pattern
  const dayPattern = DAYS.join('|');
  
  // Time patterns (e.g., 9AM, 11:30PM, 8:00 AM)
  const timePattern = /\d{1,2}(?::\d{2})?\s*(?:AM|PM)/gi;
  
  // Check if text contains any parking keywords
  const hasParkingKeyword = parkingKeywords.some(keyword => upper.includes(keyword));
  
  if (!hasParkingKeyword) {
    // No parking keywords found, return original
    return text;
  }
  
  // Extract relevant sections: look for patterns like "NO PARKING ..." or "STREET CLEANING ..."
  const lines = upper.split(/\n|\r\n|\r/);
  const relevantLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if line contains parking keywords
    const hasKeyword = parkingKeywords.some(keyword => trimmed.includes(keyword));
    
    // Check if line contains days or times (likely part of parking rule)
    const hasDay = new RegExp(`\\b(${dayPattern})\\b`).test(trimmed);
    const hasTime = timePattern.test(trimmed);
    
    if (hasKeyword || hasDay || hasTime) {
      // Keep this line, but filter out non-relevant words
      const words = trimmed.split(/\s+/);
      const filteredWords: string[] = [];
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const prevWord = words[i - 1] || '';
        const nextWord = words[i + 1] || '';
        
        // Keep parking keywords
        const isKeyword = parkingKeywords.some(kw => word.includes(kw) || `${prevWord} ${word}`.includes(kw) || `${word} ${nextWord}`.includes(kw));
        
        // Keep day abbreviations
        const isDay = new RegExp(`^${dayPattern}$`).test(word);
        
        // Keep time patterns
        const isTime = timePattern.test(word) || timePattern.test(`${prevWord} ${word}`) || timePattern.test(`${word} ${nextWord}`);
        
        // Keep numbers (could be hour limits)
        const isNumber = /^\d+$/.test(word);
        const isHourLimit = isNumber && (nextWord.includes('HR') || nextWord.includes('HOUR'));
        
        // Keep connectors
        const isConnector = /^[-–—&,]$/.test(word) || /^(AND|OR|TO|THRU|THROUGH|EXCEPT|ONLY|REQUIRED)$/i.test(word);
        
        if (isKeyword || isDay || isTime || isHourLimit || isConnector) {
          filteredWords.push(word);
        }
      }
      
      if (filteredWords.length > 0) {
        relevantLines.push(filteredWords.join(' '));
      }
    }
  }
  
  // If we found relevant lines, join them; otherwise return original
  if (relevantLines.length > 0) {
    return relevantLines.join(' ');
  }
  
  // Fallback: extract just the parking-related patterns from the whole text
  const allWords = upper.split(/\s+/);
  const relevantWords: string[] = [];
  
  for (let i = 0; i < allWords.length; i++) {
    const word = allWords[i];
    const context = `${allWords[i - 1] || ''} ${word} ${allWords[i + 1] || ''}`.trim();
    
    const isKeyword = parkingKeywords.some(kw => context.includes(kw));
    const isDay = new RegExp(`^${dayPattern}$`).test(word);
    const isTime = timePattern.test(context);
    const isNumber = /^\d+$/.test(word);
    const isHourLimit = isNumber && (allWords[i + 1]?.includes('HR') || allWords[i + 1]?.includes('HOUR'));
    const isConnector = /^[-–—&,]$/.test(word) || /^(AND|OR|TO|THRU|THROUGH|EXCEPT|ONLY|REQUIRED)$/i.test(word);
    
    if (isKeyword || isDay || isTime || isHourLimit || isConnector) {
      relevantWords.push(word);
    }
  }
  
  return relevantWords.length > 0 ? relevantWords.join(' ') : text;
}

export function evaluateRulesFromText(text: string): Verdict {
  // First, filter out irrelevant text
  const filteredText = filterParkingRelevantText(text);
  
  // Better normalization for OCR: handle line breaks, extra spaces, common OCR errors
  let normalized = filteredText.toUpperCase()
    .replace(/\r\n/g, ' ')      // Windows line breaks
    .replace(/\n/g, ' ')        // Unix line breaks
    .replace(/\r/g, ' ')        // Mac line breaks
    .replace(/\s+/g, ' ')       // Multiple spaces to single
    .replace(/[|]/g, 'I')       // Common OCR: | -> I
    .replace(/[0O]/g, (m, i, s) => {
      // Smart replacement: if surrounded by digits, it's probably 0, otherwise O
      const before = s[i - 1];
      const after = s[i + 1];
      if ((/\d/.test(before) || /\d/.test(after)) && !/[A-Z]/.test(before) && !/[A-Z]/.test(after)) {
        return '0';
      }
      return m;
    })
    .trim();
  
  const { day, hour, date } = nowContext();

  // Handle NO PARKING without days (applies always): "NO PARKING 9AM-11AM"
  const noParkingAlwaysMatch = normalized.match(/NO\s*PARKING\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))(?:\s|$)/i);
  if (noParkingAlwaysMatch) {
    const startTimeStr = noParkingAlwaysMatch[1].trim();
    const endTimeStr = noParkingAlwaysMatch[2].trim();
    const start = to24h(startTimeStr);
    const end = to24h(endTimeStr);
    
    if (!isNaN(start) && !isNaN(end)) {
      const within = hour >= start && hour <= end;
      if (within) {
        return { status: 'not_ok', reason: `No parking ${startTimeStr}–${endTimeStr} (always)`, nextSafeStartLocal: humanizeNext(date, end) };
      }
      return { status: 'ok', reason: `Outside restricted hours (${startTimeStr}–${endTimeStr})`, nextSafeStartLocal: startTimeStr };
    }
  }

  // Simple template: NO PARKING <DAYS> <TIME>-<TIME>
  // Example: NO PARKING MON & THU 9AM-11AM STREET CLEANING
  // More flexible: allow optional spacing, dashes, colons in time
  const noParkingMatch = normalized.match(/NO\s*PARKING\s+([A-Z\s,&\-]+?)\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  if (noParkingMatch) {
    const daysPart = noParkingMatch[1].trim();
    const startTimeStr = noParkingMatch[2].trim();
    const endTimeStr = noParkingMatch[3].trim();
    const start = to24h(startTimeStr);
    const end = to24h(endTimeStr);
    
    if (isNaN(start) || isNaN(end)) {
      return { status: 'uncertain', reason: 'Could not parse time format from sign' };
    }
    
    const days = parseDays(daysPart);
    if (days.length === 0) {
      // If we couldn't parse any days, treat it as always applies
      const within = hour >= start && hour <= end;
      if (within) {
        return { status: 'not_ok', reason: `No parking ${startTimeStr}–${endTimeStr}`, nextSafeStartLocal: humanizeNext(date, end) };
      }
      return { status: 'ok', reason: `Outside restricted hours (${startTimeStr}–${endTimeStr})`, nextSafeStartLocal: startTimeStr };
    }
    
    const isToday = days.includes(day);
    const within = hour >= start && hour <= end;
    if (isToday && within) {
      const next = humanizeNext(date, end);
      return { status: 'not_ok', reason: `No parking ${days.join(', ')} ${startTimeStr}–${endTimeStr}`, nextSafeStartLocal: next };
    }
    if (isToday) {
      const next = hour < start ? startTimeStr : 'Now';
      return { status: 'ok', reason: `Outside restricted hours today (${startTimeStr}–${endTimeStr})`, nextSafeStartLocal: next };
    }
    return { status: 'ok', reason: 'No parking applies on other days' };
  }

  // 2 HR PARKING <TIME>-<TIME>
  const twoHr = normalized.match(/(\d+)\s*HR?\s*PARKING.*?(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  if (twoHr) {
    const startTimeStr = twoHr[2].trim();
    const endTimeStr = twoHr[3].trim();
    const start = to24h(startTimeStr);
    const end = to24h(endTimeStr);
    
    if (isNaN(start) || isNaN(end)) {
      return { status: 'uncertain', reason: 'Could not parse time-limited parking time format' };
    }
    
    const within = hour >= start && hour <= end;
    if (within) {
      return { status: 'ok', reason: `Limited to ${twoHr[1]} hour(s) now (${startTimeStr}–${endTimeStr})`, nextSafeStartLocal: endTimeStr };
    }
    return { status: 'ok', reason: 'Outside metered/limited hours' };
  }

  // STREET CLEANING <DAY> <TIME>-<TIME>
  const streetCleaning = normalized.match(/STREET\s*CLEANING\s+([A-Z]{3})(?:[,:]?\s*)?(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  if (streetCleaning) {
    const scDay = streetCleaning[1];
    const startTimeStr = streetCleaning[2].trim();
    const endTimeStr = streetCleaning[3].trim();
    const start = to24h(startTimeStr);
    const end = to24h(endTimeStr);
    
    if (isNaN(start) || isNaN(end)) {
      return { status: 'uncertain', reason: 'Could not parse street cleaning time format' };
    }
    
    const applies = scDay === day;
    const within = hour >= start && hour <= end;
    if (applies && within) {
      return { status: 'not_ok', reason: `Street cleaning ${scDay} ${startTimeStr}–${endTimeStr}`, nextSafeStartLocal: humanizeNext(date, end) };
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
  const complexNoParking = normalized.match(/NO\s*PARKING\s+([A-Z\s,\-&]+?)\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))(?:\s+EXCEPT\s+([A-Z\s]+))?/i);
  if (complexNoParking) {
    const daysPart = complexNoParking[1].trim();
    const startTimeStr = complexNoParking[2].trim();
    const endTimeStr = complexNoParking[3].trim();
    const exception = complexNoParking[4];
    const start = to24h(startTimeStr);
    const end = to24h(endTimeStr);
    
    if (isNaN(start) || isNaN(end)) {
      return { status: 'uncertain', reason: 'Could not parse complex parking restriction time format' };
    }
    
    const days = parseDays(daysPart);
    const isToday = days.includes(day);
    const within = hour >= start && hour <= end;
    
    if (isToday && within) {
      if (exception && exception.includes('PERMIT')) {
        return { status: 'uncertain', reason: `No parking ${startTimeStr}–${endTimeStr} except permit holders - check your permit` };
      }
      return { status: 'not_ok', reason: `No parking ${startTimeStr}–${endTimeStr}`, nextSafeStartLocal: humanizeNext(date, end) };
    }
    return { status: 'ok', reason: 'Outside restricted hours' };
  }

  // LOADING ZONE - often confusing
  const loadingZone = normalized.match(/LOADING\s*ZONE(?:\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)))?/i);
  if (loadingZone) {
    if (loadingZone[1] && loadingZone[2]) {
      const startTimeStr = loadingZone[1].trim();
      const endTimeStr = loadingZone[2].trim();
      const start = to24h(startTimeStr);
      const end = to24h(endTimeStr);
      
      if (!isNaN(start) && !isNaN(end)) {
        const within = hour >= start && hour <= end;
        if (within) {
          return { status: 'not_ok', reason: `Loading zone active ${startTimeStr}–${endTimeStr} - commercial vehicles only` };
        }
      }
    }
    return { status: 'not_ok', reason: 'Loading zone - commercial vehicles only' };
  }

  // TOW AWAY ZONE - scary but important
  const towAway = normalized.match(/TOW AWAY ZONE(?: ([A-Z\s,]+))?/);
  if (towAway) {
    const daysPart = towAway[1];
    if (daysPart) {
      const days = parseDays(daysPart);
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
  const fireZone = normalized.match(/FIRE\s*ZONE|FIRE\s*HYDRANT|NO\s*PARKING.*FIRE/i);
  if (fireZone) {
    return { status: 'not_ok', reason: 'Fire zone/hydrant - DO NOT PARK' };
  }

  // PRIVATE PARKING - unauthorized vehicles will be towed
  const privateParking = normalized.match(/PRIVATE\s*PARKING/i);
  if (privateParking) {
    const hasTow = /TOW|TOWED|TOW\s*AWAY/i.test(normalized);
    const hasUnauthorized = /UNAUTHORIZED|UNAUTHORISED/i.test(normalized);
    if (hasTow || hasUnauthorized) {
      return { status: 'not_ok', reason: 'Private parking - unauthorized vehicles will be towed' };
    }
    return { status: 'not_ok', reason: 'Private parking - authorized vehicles only' };
  }

  // UNAUTHORIZED VEHICLES / TOWED AWAY patterns
  const unauthorizedTow = normalized.match(/UNAUTHORIZED.*TOW|UNAUTHORIZED.*TOWED|UNAUTHORISED.*TOW/i);
  if (unauthorizedTow) {
    return { status: 'not_ok', reason: 'Unauthorized vehicles will be towed - DO NOT PARK' };
  }

  // More flexible patterns - try variations before fallback
  
  // NO STANDING patterns (similar to NO PARKING)
  const noStandingMatch = normalized.match(/NO\s*STANDING\s+(?:([A-Z\s,&\-]+?)\s+)?(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  if (noStandingMatch) {
    const daysPart = noStandingMatch[1]?.trim() || '';
    const startTimeStr = noStandingMatch[2].trim();
    const endTimeStr = noStandingMatch[3].trim();
    const start = to24h(startTimeStr);
    const end = to24h(endTimeStr);
    
    if (!isNaN(start) && !isNaN(end)) {
      if (daysPart) {
        const days = parseDays(daysPart);
        const isToday = days.length > 0 ? days.includes(day) : true;
        const within = hour >= start && hour <= end;
        if (isToday && within) {
          return { status: 'not_ok', reason: `No standing ${startTimeStr}–${endTimeStr}`, nextSafeStartLocal: humanizeNext(date, end) };
        }
        return { status: 'ok', reason: `Outside restricted hours (${startTimeStr}–${endTimeStr})` };
      }
      const within = hour >= start && hour <= end;
      if (within) {
        return { status: 'not_ok', reason: `No standing ${startTimeStr}–${endTimeStr}`, nextSafeStartLocal: humanizeNext(date, end) };
      }
      return { status: 'ok', reason: `Outside restricted hours (${startTimeStr}–${endTimeStr})` };
    }
  }

  // Pattern: <DAYS> <TIME>-<TIME> (without "NO PARKING" prefix)
  const daysTimePattern = normalized.match(/((?:[A-Z]{3}[\s,&-]*)+)\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  if (daysTimePattern && normalized.includes('PARK')) {
    const daysPart = daysTimePattern[1].trim();
    const startTimeStr = daysTimePattern[2].trim();
    const endTimeStr = daysTimePattern[3].trim();
    const start = to24h(startTimeStr);
    const end = to24h(endTimeStr);
    
    if (!isNaN(start) && !isNaN(end)) {
      const days = parseDays(daysPart);
      if (days.length > 0) {
        const isToday = days.includes(day);
        const within = hour >= start && hour <= end;
        if (isToday && within) {
          return { status: 'not_ok', reason: `Parking restriction ${days.join(', ')} ${startTimeStr}–${endTimeStr}`, nextSafeStartLocal: humanizeNext(date, end) };
        }
        return { status: 'ok', reason: `No restriction today (${days.join(', ')} ${startTimeStr}–${endTimeStr})` };
      }
    }
  }

  // Pattern: PARKING PROHIBITED / FORBIDDEN
  const parkingProhibited = normalized.match(/PARKING\s+(?:PROHIBITED|FORBIDDEN|NOT\s*ALLOWED)/i);
  if (parkingProhibited) {
    // Try to find time range nearby
    const timeRange = normalized.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
    if (timeRange) {
      const start = to24h(timeRange[1].trim());
      const end = to24h(timeRange[2].trim());
      if (!isNaN(start) && !isNaN(end)) {
        const within = hour >= start && hour <= end;
        if (within) {
          return { status: 'not_ok', reason: `Parking prohibited ${timeRange[1]}–${timeRange[2]}`, nextSafeStartLocal: humanizeNext(date, end) };
        }
        return { status: 'ok', reason: `Parking prohibited outside hours (${timeRange[1]}–${timeRange[2]})` };
      }
    }
    return { status: 'not_ok', reason: 'Parking prohibited - check sign for time restrictions' };
  }

  // Pattern: METERED PARKING with time restrictions
  const meteredParking = normalized.match(/METERED\s*PARKING.*?(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  if (meteredParking) {
    const startTimeStr = meteredParking[1].trim();
    const endTimeStr = meteredParking[2].trim();
    const start = to24h(startTimeStr);
    const end = to24h(endTimeStr);
    if (!isNaN(start) && !isNaN(end)) {
      const within = hour >= start && hour <= end;
      if (within) {
        return { status: 'ok', reason: `Metered parking active (${startTimeStr}–${endTimeStr}) - payment required`, nextSafeStartLocal: endTimeStr };
      }
      return { status: 'ok', reason: 'Outside metered hours' };
    }
  }

  // Pattern: Time range with day abbreviations nearby (more flexible)
  // Try to find any day + time pattern even if format is non-standard
  const flexibleDayTime = normalized.match(/([A-Z]{3}(?:\s*[-&,]\s*[A-Z]{3})*)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  if (flexibleDayTime && (normalized.includes('PARK') || normalized.includes('NO'))) {
    const daysPart = flexibleDayTime[1].trim();
    const startTimeStr = flexibleDayTime[2].trim();
    const endTimeStr = flexibleDayTime[3].trim();
    const start = to24h(startTimeStr);
    const end = to24h(endTimeStr);
    
    if (!isNaN(start) && !isNaN(end)) {
      const days = parseDays(daysPart);
      if (days.length > 0) {
        const isToday = days.includes(day);
        const within = hour >= start && hour <= end;
        const isNoParking = /NO.*PARK/i.test(normalized);
        
        if (isNoParking || normalized.includes('PROHIBITED') || normalized.includes('FORBIDDEN')) {
          if (isToday && within) {
            return { status: 'not_ok', reason: `No parking ${days.join(', ')} ${startTimeStr}–${endTimeStr}`, nextSafeStartLocal: humanizeNext(date, end) };
          }
          return { status: 'ok', reason: `No restriction today (restriction applies ${days.join(', ')})` };
        } else {
          if (isToday && within) {
            return { status: 'ok', reason: `Parking allowed ${days.join(', ')} ${startTimeStr}–${endTimeStr}`, nextSafeStartLocal: endTimeStr };
          }
        }
      }
    }
  }

  // FALLBACK: Try to extract any time range pattern even if format doesn't match exactly
  // Look for patterns like "9AM-11AM" or "8:00 AM - 6:00 PM" anywhere in text
  const anyTimeRange = normalized.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  if (anyTimeRange) {
    const startTimeStr = anyTimeRange[1].trim();
    const endTimeStr = anyTimeRange[2].trim();
    const start = to24h(startTimeStr);
    const end = to24h(endTimeStr);
    
    if (!isNaN(start) && !isNaN(end)) {
      const within = hour >= start && hour <= end;
      // Check if any day abbreviation appears in the text
      const hasDays = DAYS.some(d => normalized.includes(d));
      
      // Check for parking restriction keywords
      const isNoParking = /(?:NO|NOT)\s*PARK|PARKING\s*(?:PROHIBITED|FORBIDDEN|NOT\s*ALLOWED)|DO\s*NOT\s*PARK/i.test(normalized);
      const isStanding = /NO\s*STANDING/i.test(normalized);
      const isRestriction = isNoParking || isStanding;
      
      if (hasDays) {
        // Try to find which days
        const foundDays: string[] = [];
        DAYS.forEach(d => {
          if (normalized.includes(d)) foundDays.push(d);
        });
        const days = parseDays(foundDays.join(' '));
        const isToday = days.length > 0 ? days.includes(day) : foundDays.includes(day);
        
        if (isRestriction) {
          if (isToday && within) {
            return { status: 'not_ok', reason: `No parking ${foundDays.join(', ')} ${startTimeStr}–${endTimeStr}`, nextSafeStartLocal: humanizeNext(date, end) };
          }
          if (isToday) {
            return { status: 'ok', reason: `No restriction now (restriction applies ${foundDays.join(', ')} ${startTimeStr}–${endTimeStr})` };
          }
          return { status: 'ok', reason: `No restriction today (restriction applies ${foundDays.join(', ')})` };
        } else {
          // If it's not a restriction, it might be allowed parking
          if (isToday && within) {
            return { status: 'ok', reason: `Parking allowed ${foundDays.join(', ')} ${startTimeStr}–${endTimeStr}`, nextSafeStartLocal: endTimeStr };
          }
        }
      } else {
        // No days found, but we have a time range
        // If it's a restriction keyword, assume it applies during the time range
        if (isRestriction) {
          if (within) {
            return { status: 'not_ok', reason: `No parking ${startTimeStr}–${endTimeStr}`, nextSafeStartLocal: humanizeNext(date, end) };
          }
          return { status: 'ok', reason: `Outside restricted hours (${startTimeStr}–${endTimeStr})` };
        }
        // If we have time but no restriction keywords, be cautious but still evaluate
        if (within) {
          return { status: 'not_ok', reason: `Time restriction active (${startTimeStr}–${endTimeStr}) - check sign for details`, nextSafeStartLocal: humanizeNext(date, end) };
        }
        return { status: 'ok', reason: `Outside time window (${startTimeStr}–${endTimeStr})` };
      }
    }
  }

  // FALLBACK: Check if text contains parking-related keywords but format unclear
  const hasParkingKeywords = /(?:NO|NOT)\s*PARK|PARKING\s*(?:PROHIBITED|FORBIDDEN|NOT\s*ALLOWED)|DO\s*NOT\s*PARK/i.test(normalized);
  if (hasParkingKeywords) {
    // Try to find any time information
    const timeMatch = normalized.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/gi);
    if (timeMatch && timeMatch.length >= 1) {
      // If we found at least one time, try to make a decision
      const hasDays = DAYS.some(d => normalized.includes(d));
      if (hasDays) {
        const foundDays: string[] = [];
        DAYS.forEach(d => {
          if (normalized.includes(d)) foundDays.push(d);
        });
        const isToday = foundDays.includes(day);
        if (isToday) {
          return { status: 'not_ok', reason: `Parking restriction active today (${foundDays.join(', ')}) - check sign for time details` };
        }
        return { status: 'ok', reason: `No restriction today (restriction applies ${foundDays.join(', ')})` };
      }
      return { status: 'not_ok', reason: 'Parking restriction active - check sign for time and day details' };
    }
    return { status: 'not_ok', reason: 'Parking restriction indicated - please review sign carefully' };
  }

  return { status: 'uncertain', reason: 'Could not parse rules from sign text. OCR text: "' + normalized.substring(0, 100) + '"' };
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

