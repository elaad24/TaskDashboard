import { parseBrainDump } from '../../ai/navigator.js';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
import { createPendingCapture } from '../../services/pendingCaptureService.js';
import { getIntegrationSettings } from '../../services/integrationSettingsService.js';
import { matchTrackedTag } from '../../services/trackedTagService.js';
import { getGoogleClients, GOOGLE_PROVIDER } from './oauth.js';
import { markScanned, wasScanned } from './scanStore.js';

const CC_CREATED_TAG = '#cc_created';

export const scanCalendar = async (): Promise<{ processed: number; capturesCreated: number }> => {
  const settings = await getIntegrationSettings();
  const { calendar } = await getGoogleClients();

  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 7);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 7);

  const list = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });

  let processed = 0;
  let capturesCreated = 0;

  for (const event of list.data.items ?? []) {
    const eventId = event.id;
    if (!eventId) continue;

    const description = event.description ?? '';
    if (description.includes(CC_CREATED_TAG)) continue;

    const etag = event.etag ?? null;
    if (await wasScanned(eventId, etag)) continue;

    const summary = event.summary ?? '(untitled event)';
    const text = `${summary}\n${description}`;
    const startRaw = event.start?.dateTime ?? event.start?.date;
    const occurredAt = startRaw ? new Date(startRaw) : null;

    processed += 1;
    let createdForEvent = 0;

    const matchedTag = await matchTrackedTag(text);
    if (matchedTag) {
      await createPendingCapture({
        source: 'calendar',
        sourceRef: eventId,
        trackedTagId: matchedTag.id,
        title: matchedTag.name,
        snippet: summary,
        occurredAt,
        suggestedAreaId: matchedTag.areaId,
        askFields: matchedTag.askFields,
      });
      createdForEvent += 1;
    } else if (description.toLowerCase().includes(settings.emailHashtag.toLowerCase())) {
      try {
        const parsed = await parseBrainDump(text);
        for (const item of parsed.items) {
          await createPendingCapture({
            source: 'calendar',
            sourceRef: `${eventId}:${item.title.slice(0, 40)}`,
            title: item.title,
            snippet: item.summary ?? summary,
            occurredAt,
            askFields: item.costAmount != null ? { cost: true } : {},
          });
          createdForEvent += 1;
        }
      } catch (err) {
        logger.warn({ err, eventId }, 'calendar AI parse failed');
        await createPendingCapture({
          source: 'calendar',
          sourceRef: eventId,
          title: summary,
          snippet: description.slice(0, 500) || summary,
          occurredAt,
          askFields: {},
        });
        createdForEvent += 1;
      }
    } else {
      await markScanned({
        externalId: eventId,
        kind: 'event',
        etag,
        outcome: 'no_match',
        capturesCreated: 0,
      });
      continue;
    }

    capturesCreated += createdForEvent;
    await markScanned({
      externalId: eventId,
      kind: 'event',
      etag,
      outcome: 'processed',
      capturesCreated: createdForEvent,
    });
  }

  await prisma.integrationToken.update({
    where: { provider: GOOGLE_PROVIDER },
    data: { calendarLastSyncAt: new Date() },
  });

  return { processed, capturesCreated };
};
