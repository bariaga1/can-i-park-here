import { mergeVerdicts, splitIntoClauses } from './clauses';

describe('splitIntoClauses', () => {
  it('keeps single-line signs as one clause', () => {
    expect(splitIntoClauses('NO PARKING MON-FRI 8AM-6PM')).toEqual([
      'NO PARKING MON-FRI 8AM-6PM',
    ]);
  });

  it('groups OCR line breaks without a new header into one clause', () => {
    expect(splitIntoClauses('NO PARKING\n MON-FRI   8AM - 6PM')).toEqual([
      'NO PARKING MON-FRI   8AM - 6PM',
    ]);
  });

  it('splits stacked plaques on new headers', () => {
    const text = [
      'NO STANDING MON-FRI 7AM-10AM',
      '3 HOUR COMMERCIAL METERED PARKING MON-FRI 10AM-2PM OTHERS NO STANDING',
      '1 HOUR METERED PARKING SAT 9AM-7PM',
    ].join('\n');
    expect(splitIntoClauses(text)).toHaveLength(3);
  });
});

describe('mergeVerdicts', () => {
  it('uses the strictest status', () => {
    const merged = mergeVerdicts([
      { status: 'ok', reason: 'allowed' },
      { status: 'not_ok', reason: 'blocked' },
    ]);
    expect(merged.status).toBe('not_ok');
    expect(merged.reason).toBe('blocked');
  });
});
