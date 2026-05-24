import { parseBrainDump } from '../../ai/navigator.js';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
import { createPendingCapture } from '../../services/pendingCaptureService.js';
import { getIntegrationSettings } from '../../services/integrationSettingsService.js';
import { matchTrackedTag } from '../../services/trackedTagService.js';
import { extractEmailBody, extractEmailSubject } from './gmailUtils.js';
import { getGoogleClients, GOOGLE_PROVIDER } from './oauth.js';
import { markScanned, wasScanned } from './scanStore.js';

export const scanGmail = async (): Promise<{ processed: number; capturesCreated: number }> => {
  const settings = await getIntegrationSettings();
  const { gmail } = await getGoogleClients();
  const hashtag = settings.emailHashtag.replace(/"/g, '\\"');
  const list = await gmail.users.messages.list({
    userId: 'me',
    q: `is:unread "${hashtag}" newer_than:14d`,
    maxResults: 20,
  });

  let processed = 0;
  let capturesCreated = 0;

  for (const item of list.data.messages ?? []) {
    const messageId = item.id;
    if (!messageId) continue;
    if (await wasScanned(messageId)) continue;

    const full = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
    const body = extractEmailBody(full.data.payload ?? undefined);
    const subject = extractEmailSubject(full.data.payload?.headers ?? undefined);
    const text = `${subject}\n${body}`;

    if (!text.toLowerCase().includes(settings.emailHashtag.toLowerCase())) {
      await markScanned({ externalId: messageId, kind: 'email', outcome: 'missing_hashtag' });
      continue;
    }

    processed += 1;
    let createdForMessage = 0;

    const matchedTag = await matchTrackedTag(text);
    if (matchedTag) {
      await createPendingCapture({
        source: 'email',
        sourceRef: messageId,
        trackedTagId: matchedTag.id,
        title: matchedTag.name,
        snippet: body.slice(0, 500),
        suggestedAreaId: matchedTag.areaId,
        askFields: matchedTag.askFields,
      });
      createdForMessage += 1;
    } else {
      try {
        const parsed = await parseBrainDump(text);
        for (const item of parsed.items) {
          await createPendingCapture({
            source: 'email',
            sourceRef: `${messageId}:${item.title.slice(0, 40)}`,
            title: item.title,
            snippet: item.summary ?? body.slice(0, 300),
            askFields: item.followUpQuestion
              ? { counterparty: true }
              : item.costAmount != null
                ? { cost: true }
                : {},
          });
          createdForMessage += 1;
        }
      } catch (err) {
        logger.warn({ err, messageId }, 'gmail AI parse failed');
        await createPendingCapture({
          source: 'email',
          sourceRef: messageId,
          title: subject,
          snippet: body.slice(0, 500),
          askFields: {},
        });
        createdForMessage += 1;
      }
    }

    capturesCreated += createdForMessage;
    await markScanned({
      externalId: messageId,
      kind: 'email',
      outcome: 'processed',
      capturesCreated: createdForMessage,
    });
  }

  await prisma.integrationToken.update({
    where: { provider: GOOGLE_PROVIDER },
    data: { gmailLastSyncAt: new Date() },
  });

  return { processed, capturesCreated };
};
