import { evaluateRulesFromText } from './parser';

// The parser reads the current time, so each test freezes the clock first.
// Week of Oct 11, 2026: Sun 11, Mon 12, Tue 13, Wed 14, Thu 15, Fri 16, Sat 17.
function at(day: number, hour: number, minute = 0) {
  jest.setSystemTime(new Date(2026, 9, day, hour, minute));
}

const SUN = 11;
const MON = 12;
const TUE = 13;
const SAT = 17;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('no parking with days and a time window', () => {
  const sign = 'NO PARKING MON-FRI 8AM-6PM';

  it('blocks parking on a weekday inside the window', () => {
    at(TUE, 9);
    const verdict = evaluateRulesFromText(sign);
    expect(verdict.status).toBe('not_ok');
    expect(verdict.nextSafeStartLocal).toBe('6:00 PM today');
  });

  it('allows parking on a weekday after the window ends', () => {
    at(TUE, 20);
    expect(evaluateRulesFromText(sign).status).toBe('ok');
  });

  it('allows parking on a day the sign does not list', () => {
    at(SUN, 10);
    expect(evaluateRulesFromText(sign).status).toBe('ok');
  });

  it('handles individual days joined with &', () => {
    at(MON, 10);
    expect(evaluateRulesFromText('NO PARKING MON & THU 9AM-11AM').status).toBe('not_ok');
    at(TUE, 10);
    expect(evaluateRulesFromText('NO PARKING MON & THU 9AM-11AM').status).toBe('ok');
  });

  it('handles a day range plus an extra day', () => {
    at(SAT, 11);
    expect(evaluateRulesFromText('NO PARKING MON-FRI & SAT 10AM-2PM').status).toBe('not_ok');
  });
});

describe('overnight windows that cross midnight', () => {
  const sign = 'NO PARKING 10PM-6AM';

  it('blocks parking before midnight and says the window ends tomorrow', () => {
    at(TUE, 23);
    const verdict = evaluateRulesFromText(sign);
    expect(verdict.status).toBe('not_ok');
    expect(verdict.nextSafeStartLocal).toBe('6:00 AM tomorrow');
  });

  it('blocks parking after midnight and says the window ends today', () => {
    at(TUE, 3);
    const verdict = evaluateRulesFromText(sign);
    expect(verdict.status).toBe('not_ok');
    expect(verdict.nextSafeStartLocal).toBe('6:00 AM today');
  });

  it('allows parking during the day', () => {
    at(TUE, 12);
    expect(evaluateRulesFromText(sign).status).toBe('ok');
  });
});

describe('street cleaning', () => {
  const sign = 'STREET CLEANING MON 9AM-11AM';

  it('blocks parking during cleaning', () => {
    at(MON, 10);
    expect(evaluateRulesFromText(sign).status).toBe('not_ok');
  });

  it('allows parking on other days', () => {
    at(TUE, 10);
    expect(evaluateRulesFromText(sign).status).toBe('ok');
  });
});

describe('permit zones', () => {
  it('allows parking on the excepted day', () => {
    at(SUN, 12);
    expect(evaluateRulesFromText('PERMIT REQUIRED EXCEPT SUNDAYS').status).toBe('ok');
  });

  it('requires a permit on other days', () => {
    at(MON, 12);
    expect(evaluateRulesFromText('PERMIT REQUIRED EXCEPT SUNDAYS').status).toBe('not_ok');
  });

  // Known bug: the generic NO PARKING <DAYS> <TIME> pattern matches first and ignores
  // the EXCEPT clause. Switch this back to `it` once the parser is fixed.
  it.failing('is uncertain inside the window when permit holders are excepted', () => {
    at(TUE, 9);
    const verdict = evaluateRulesFromText('NO PARKING MON-FRI 8AM-6PM EXCEPT PERMIT HOLDERS');
    expect(verdict.status).toBe('uncertain');
  });
});

describe('signs with no time window', () => {
  it.each([
    ['NO PARKING FIRE ZONE'],
    ['HANDICAP PARKING ONLY'],
  ])('always blocks parking for "%s"', (sign) => {
    at(TUE, 12);
    expect(evaluateRulesFromText(sign).status).toBe('not_ok');
  });
});

describe('time-limited and loading zones', () => {
  it('allows parking at a 2-hour sign during its hours', () => {
    at(TUE, 9);
    expect(evaluateRulesFromText('2 HR PARKING 8AM-6PM').status).toBe('ok');
  });

  it('blocks parking in a loading zone during its hours', () => {
    at(TUE, 8);
    expect(evaluateRulesFromText('LOADING ZONE 7AM-10AM').status).toBe('not_ok');
  });
});
