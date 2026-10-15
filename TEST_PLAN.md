# Parking Rule Parser Test Plan

This plan describes the behavior the parser should verify. The tests will use a frozen local clock and will not call the OCR service.

## Assumptions

- A posted restriction ending at a specific time is no longer active at that exact time. For example, with `NO PARKING 9AM-6PM`, parking is safe at 6:00 PM.
- The driver does not have any permit required by a sign and does not qualify for vehicle-specific parking (such as commercial loading). Those restrictions therefore produce `not_ok`.
- If the sign text is too incomplete or unclear to evaluate reliably, the result should be `uncertain` rather than a guess.

## Test groups

### 1. Time windows and boundaries

- Weekday restriction while active, before it starts, at its start, immediately before it ends, exactly at its end, and after it ends.
- Overnight restriction before midnight, after midnight, at its start, and exactly at its end.
- 12 AM and 12 PM conversion.
- Times with minutes, such as `9:30AM-11:15AM`.
- `nextSafeStartLocal` while a restriction is active, including a window that ends the next day.

### 2. Days and schedules

- Weekday ranges and individual days joined by `&` or commas.
- Supported range spellings: hyphen, `THRU`, and `TO`.
- A listed day versus an unlisted day.
- A range that wraps across the end of the week, such as `FRI-MON`.
- Day-specific overnight restrictions, checking both the evening the rule starts and the following morning.

### 3. Rule types and driver assumptions

- Street cleaning during its posted window and outside it.
- Permit required every day and a day explicitly excepted.
- Permit-holder exception on a no-parking rule: with no permit, expect `not_ok` while the restriction is active; outside the restriction, evaluate the posted schedule normally.
- Two-hour parking during and outside its posted hours. The verdict means parking is allowed subject to the posted time limit.
- Loading-zone restriction, assuming the driver is not in a qualifying commercial vehicle.
- Tow-away, fire-zone/hydrant, accessible/handicap, resident-only, private-lot, and unauthorized-vehicle tow signs. Assume the driver is not authorized or qualified, so expect `not_ok`.

### 4. OCR text and uncertain input

- Line breaks, repeated whitespace, and common dash characters in otherwise legible rules.
- Common OCR character substitutions where supported by the parser.
- Empty input, unrelated text, missing time endpoints, malformed times, and unrecognized day text.
- Expect `uncertain` when the rule cannot be reliably determined.

### 5. Multiple clauses and stacked plaques

Use the real three-plaque fixture documented in the README and its transcription. Check representative times when each plaque applies, including Tuesday morning, Tuesday afternoon, and Saturday during the metered window.

- Evaluate all clauses in the text rather than stopping at the first matching time window.
- If any clause forbids the driver from parking at the current time, the overall verdict should be `not_ok`.
- When a clause allows parking only for a permit or qualifying vehicle, apply the driver assumptions above.
- Include a case where two clauses overlap to establish that the more restrictive rule controls.

These cases are expected to expose a known parser limitation until multi-clause evaluation is implemented.

## Implementation order

1. Time boundaries, including exactly-at-end behavior and next-safe-time output.
2. Day parsing and overnight schedules.
3. Permit and vehicle assumptions across rule types.
4. OCR normalization and uncertain-input handling.
5. Stacked and multi-clause signs, using the real fixture.
