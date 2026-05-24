import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isInQuietHours } from './notificationDispatcher.js';

describe('isInQuietHours', () => {
  it('handles same-day quiet window', () => {
    const now = new Date(2026, 4, 23, 13, 0, 0);
    assert.equal(isInQuietHours('12:00', '14:00', now), true);
    assert.equal(isInQuietHours('14:00', '16:00', now), false);
  });

  it('handles overnight quiet window', () => {
    const late = new Date(2026, 4, 23, 23, 30, 0);
    const morning = new Date(2026, 4, 24, 6, 30, 0);
    const noon = new Date(2026, 4, 24, 12, 0, 0);
    assert.equal(isInQuietHours('23:00', '07:00', late), true);
    assert.equal(isInQuietHours('23:00', '07:00', morning), true);
    assert.equal(isInQuietHours('23:00', '07:00', noon), false);
  });
});
