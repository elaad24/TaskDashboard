import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateNextOccurrence } from './recurrenceService.js';

describe('calculateNextOccurrence', () => {
  it('computes daily recurrence at chosen time', () => {
    const now = new Date(2026, 4, 23, 10, 15, 0);
    const next = calculateNextOccurrence({
      from: now,
      frequency: 'daily',
      intervalDays: null,
      weekdays: [],
      monthDay: null,
      timeOfDay: '09:00',
    });
    assert.equal(next.getDate(), 24);
    assert.equal(next.getHours(), 9);
    assert.equal(next.getMinutes(), 0);
  });

  it('computes weekly recurrence from weekdays list', () => {
    const now = new Date(2026, 4, 23, 10, 15, 0); // Saturday
    const next = calculateNextOccurrence({
      from: now,
      frequency: 'weekly',
      intervalDays: null,
      weekdays: [1, 3, 5], // Mon/Wed/Fri
      monthDay: null,
      timeOfDay: '08:30',
    });
    assert.equal(next.getDay(), 1);
    assert.equal(next.getHours(), 8);
    assert.equal(next.getMinutes(), 30);
  });
});
