import { Router } from 'express';
import { z } from 'zod';
import {
  googleIntegrationStatusSchema,
  integrationSettingsPatchSchema,
  scanResultSchema,
} from '@command-center/shared';
import { env } from '../env.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { scanCalendar } from '../integrations/google/calendarScanner.js';
import { scanGmail } from '../integrations/google/gmailScanner.js';
import {
  createAuthUrl,
  disconnectGoogle,
  exchangeCodeForTokens,
  getGoogleAccountEmail,
  isGoogleConnected,
} from '../integrations/google/oauth.js';
import { countCalendarWritesToday } from '../integrations/google/scanStore.js';
import { prisma } from '../db.js';
import { GOOGLE_PROVIDER } from '../integrations/google/oauth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';
import {
  getIntegrationSettings,
  updateIntegrationSettings,
} from '../services/integrationSettingsService.js';
import { countPendingCaptures } from '../services/pendingCaptureService.js';

export const integrationsRouter = Router();

const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

integrationsRouter.get(
  '/google/auth-url',
  asyncHandler(async (_req, res) => {
    const url = createAuthUrl();
    res.json({ url });
  }),
);

integrationsRouter.get(
  '/google/callback',
  validate(oauthCallbackQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { code, state } = oauthCallbackQuerySchema.parse(req.query);
    try {
      await exchangeCodeForTokens(code, state);
      res.redirect(`${env.CLIENT_ORIGIN}/settings?google=connected`);
    } catch {
      res.redirect(`${env.CLIENT_ORIGIN}/settings?google=error&reason=exchange_failed`);
    }
  }),
);

integrationsRouter.post(
  '/google/disconnect',
  asyncHandler(async (_req, res) => {
    await disconnectGoogle();
    res.json({ ok: true });
  }),
);

integrationsRouter.get(
  '/google/status',
  asyncHandler(async (_req, res) => {
    const [connected, settings, pendingCapturesCount, calendarWritesToday, token] = await Promise.all([
      isGoogleConnected(),
      getIntegrationSettings(),
      countPendingCaptures(),
      countCalendarWritesToday(),
      prisma.integrationToken.findUnique({ where: { provider: GOOGLE_PROVIDER } }),
    ]);
    const email = connected ? await getGoogleAccountEmail() : null;
    const payload = googleIntegrationStatusSchema.parse({
      connected,
      email,
      gmailLastSyncAt: token?.gmailLastSyncAt?.toISOString() ?? null,
      calendarLastSyncAt: token?.calendarLastSyncAt?.toISOString() ?? null,
      pendingCapturesCount,
      emailHashtag: settings.emailHashtag,
      gmailPollMinutes: settings.gmailPollMinutes,
      calendarPollMinutes: settings.calendarPollMinutes,
      calendarDailyWriteCap: settings.calendarDailyWriteCap,
      calendarWritesToday,
    });
    res.json(payload);
  }),
);

integrationsRouter.patch(
  '/google/settings',
  validate(integrationSettingsPatchSchema),
  asyncHandler(async (req, res) => {
    const patch = integrationSettingsPatchSchema.parse(req.body);
    const settings = await updateIntegrationSettings(patch);
    res.json(settings);
  }),
);

integrationsRouter.post(
  '/google/scan',
  asyncHandler(async (_req, res) => {
    if (!(await isGoogleConnected())) {
      throw new HttpError(400, 'GOOGLE_NOT_CONNECTED', 'Connect Google in Settings first');
    }
    const [gmail, calendar] = await Promise.all([scanGmail(), scanCalendar()]);
    const payload = scanResultSchema.parse({
      gmailProcessed: gmail.processed,
      calendarProcessed: calendar.processed,
      capturesCreated: gmail.capturesCreated + calendar.capturesCreated,
    });
    res.json(payload);
  }),
);
