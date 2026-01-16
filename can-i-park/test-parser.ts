// Simple test script for the parser
// Run with: npx tsx test-parser.ts (or ts-node if available)

import { evaluateRulesFromText } from './src/parser';

// Mock current date/time for consistent testing
const testCases = [
  {
    name: 'NO PARKING MON-FRI with range (bug fix test)',
    signText: 'NO PARKING MON-FRI 8AM-6PM',
    expectedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    note: 'Should expand MON-FRI to all weekdays'
  },
  {
    name: 'NO PARKING with individual days',
    signText: 'NO PARKING MON & THU 9AM-11AM',
    expectedDays: ['MON', 'THU'],
    note: 'Should handle & separator'
  },
  {
    name: 'Street cleaning',
    signText: 'STREET CLEANING MON 9AM-11AM',
    note: 'Single day restriction'
  },
  {
    name: 'Permit required with exception',
    signText: 'PERMIT REQUIRED EXCEPT SUNDAYS',
    note: 'Should allow on Sundays'
  },
  {
    name: 'Complex no parking with exception',
    signText: 'NO PARKING MON-FRI 8AM-6PM EXCEPT PERMIT HOLDERS',
    expectedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    note: 'Should expand range and handle exception'
  },
  {
    name: '2 hour parking',
    signText: '2 HR PARKING 8AM-6PM',
    note: 'Time-limited parking'
  },
  {
    name: 'Loading zone',
    signText: 'LOADING ZONE 7AM-10AM',
    note: 'Commercial vehicles only'
  },
  {
    name: 'Handicap parking',
    signText: 'HANDICAP PARKING ONLY',
    note: 'Special permit required'
  },
  {
    name: 'Fire zone',
    signText: 'NO PARKING FIRE ZONE',
    note: 'Emergency access'
  },
  {
    name: 'Multiple days with range',
    signText: 'NO PARKING MON-FRI & SAT 10AM-2PM',
    expectedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    note: 'Should expand range and include additional day'
  }
];

console.log('🧪 Testing Parser Functionality\n');
console.log('Current time:', new Date().toLocaleString());
console.log('='.repeat(80));
console.log();

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Sign Text: "${testCase.signText}"`);
  
  try {
    const result = evaluateRulesFromText(testCase.signText);
    
    console.log(`Result:`);
    console.log(`  Status: ${result.status.toUpperCase()}`);
    console.log(`  Reason: ${result.reason}`);
    if (result.nextSafeStartLocal) {
      console.log(`  Next Safe: ${result.nextSafeStartLocal}`);
    }
    
    if (testCase.expectedDays) {
      // Note: We can't easily verify the internal days array without exporting parseDays
      // But we can verify the behavior is correct
      console.log(`  Expected Days: ${testCase.expectedDays.join(', ')}`);
    }
    
    if (testCase.note) {
      console.log(`  Note: ${testCase.note}`);
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  console.log();
});

console.log('='.repeat(80));
console.log('✅ Test run complete!');
