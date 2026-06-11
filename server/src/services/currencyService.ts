const rateCache = new Map<string, { rate: number; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

const normalizeCurrency = (currency: string): string => currency.trim().toUpperCase();

const toIsoDate = (dateInput: string): string => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
};

const pruneRateCache = (): void => {
  const now = Date.now();
  for (const [key, entry] of rateCache) {
    if (entry.expiresAt <= now) rateCache.delete(key);
  }
  if (rateCache.size <= MAX_CACHE_ENTRIES) return;
  const overflow = rateCache.size - MAX_CACHE_ENTRIES;
  const keys = Array.from(rateCache.keys()).slice(0, overflow);
  for (const key of keys) rateCache.delete(key);
};

const fetchEurRate = async (currency: string, isoDate: string): Promise<number> => {
  const cacheKey = `${currency}:${isoDate}`;
  const cached = rateCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.rate;

  const url = `https://api.frankfurter.app/${isoDate}?from=${encodeURIComponent(currency)}&to=EUR`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Currency rate lookup failed for ${currency} on ${isoDate}`);
  }

  const body = (await response.json()) as { rates?: { EUR?: number } };
  const rate = body.rates?.EUR;
  if (rate === undefined || !Number.isFinite(rate)) {
    throw new Error(`No EUR rate returned for ${currency} on ${isoDate}`);
  }

  rateCache.set(cacheKey, { rate, expiresAt: Date.now() + CACHE_TTL_MS });
  pruneRateCache();
  return rate;
};

/**
 * Convert an amount to EUR using the historical rate for the event date.
 * Returns null when the source currency is already EUR (caller stores original in costAmount).
 */
export const convertToEur = async (
  amount: number,
  currency: string,
  date: string,
): Promise<number | null> => {
  const normalized = normalizeCurrency(currency);
  if (normalized === 'EUR') return null;

  const isoDate = toIsoDate(date);
  const rate = await fetchEurRate(normalized, isoDate);
  return Math.round(amount * rate * 100) / 100;
};

/** Effective spend in EUR for aggregation. Unconverted foreign amounts contribute 0. */
export const effectiveSpendEur = (
  costAmount: number | null | undefined,
  costAmountEur: number | null | undefined,
  costCurrency: string | null | undefined,
): number => {
  if (costAmount == null) return 0;
  if (costAmountEur != null) return costAmountEur;
  const currency = normalizeCurrency(costCurrency ?? 'EUR');
  if (currency === 'EUR') return costAmount;
  return 0;
};
