import { prisma } from '../../db.js';
import { GOOGLE_PROVIDER } from './oauth.js';

export const wasScanned = async (externalId: string, etag?: string | null): Promise<boolean> => {
  const row = await prisma.integrationScan.findUnique({
    where: { provider_externalId: { provider: GOOGLE_PROVIDER, externalId } },
  });
  if (!row) return false;
  if (etag && row.etag && row.etag !== etag) return false;
  return true;
};

export const markScanned = async (input: {
  externalId: string;
  kind: 'email' | 'event' | 'event_write';
  etag?: string | null;
  outcome?: string;
  capturesCreated?: number;
}): Promise<void> => {
  await prisma.integrationScan.upsert({
    where: { provider_externalId: { provider: GOOGLE_PROVIDER, externalId: input.externalId } },
    create: {
      provider: GOOGLE_PROVIDER,
      externalId: input.externalId,
      etag: input.etag ?? null,
      kind: input.kind,
      outcome: input.outcome ?? null,
      capturesCreated: input.capturesCreated ?? 0,
    },
    update: {
      etag: input.etag ?? null,
      kind: input.kind,
      processedAt: new Date(),
      outcome: input.outcome ?? null,
      capturesCreated: input.capturesCreated ?? 0,
    },
  });
};

export const countCalendarWritesToday = async (): Promise<number> => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.integrationScan.count({
    where: {
      provider: GOOGLE_PROVIDER,
      kind: 'event_write',
      processedAt: { gte: start },
    },
  });
};
