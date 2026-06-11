import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveSpendEur } from '../services/currencyService.js';
import { daysAgoLocal, startOfWeek, toLocalIsoDay } from '../utils/dates.js';

describe('toLocalIsoDay', () => {
  it('uses local calendar date instead of UTC slice', () => {
    const date = new Date(2026, 5, 11, 1, 30, 0);
    assert.equal(toLocalIsoDay(date), '2026-06-11');
  });
});

describe('startOfWeek', () => {
  it('starts weeks on Monday', () => {
    const wednesday = new Date(2026, 5, 10, 15, 0, 0);
    const weekStart = startOfWeek(wednesday);
    assert.equal(weekStart.getDay(), 1);
    assert.equal(toLocalIsoDay(weekStart), '2026-06-08');
  });
});

describe('daysAgoLocal', () => {
  it('steps back whole local days from today', () => {
    const today = new Date(2026, 5, 11, 12, 0, 0);
    const threeDaysAgo = daysAgoLocal(3, today);
    assert.equal(toLocalIsoDay(threeDaysAgo), '2026-06-08');
  });
});

describe('effectiveSpendEur', () => {
  it('prefers stored EUR conversion', () => {
    assert.equal(effectiveSpendEur(100, 85, 'USD'), 85);
  });

  it('uses raw amount only for EUR logs', () => {
    assert.equal(effectiveSpendEur(42, null, 'EUR'), 42);
  });

  it('returns zero for unconverted foreign currency', () => {
    assert.equal(effectiveSpendEur(100, null, 'USD'), 0);
  });
});
