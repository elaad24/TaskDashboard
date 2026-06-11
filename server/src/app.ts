import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { env, isProd } from './env.js';
import { logger } from './logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { areasRouter, tracksRouter } from './routes/areas.js';
import { goalsRouter } from './routes/goals.js';
import { tasksRouter } from './routes/tasks.js';
import { problemsRouter } from './routes/problems.js';
import { logsRouter } from './routes/logs.js';
import { studyTopicsRouter } from './routes/studyTopics.js';
import { resourcesRouter } from './routes/resources.js';
import { dashboardRouter } from './routes/dashboard.js';
import { aiRouter } from './routes/ai.js';
import { searchRouter } from './routes/search.js';
import { settingsRouter } from './routes/settings.js';
import { getAppSettings } from './services/appSettingsService.js';
import { getAiHealth } from './ai/health.js';
import { overviewRouter } from './routes/overview.js';
import { remindersRouter } from './routes/reminders.js';
import { ingestRouter } from './routes/ingest.js';
import { integrationsRouter } from './routes/integrations.js';
import { trackedTagsRouter } from './routes/trackedTags.js';
import { pendingCapturesRouter } from './routes/pendingCaptures.js';
import { calendarRouter } from './routes/calendar.js';
import { sidebarFeedRouter } from './routes/sidebarFeed.js';
import { urgencyRouter } from './routes/urgency.js';
import { streakRouter } from './routes/streak.js';
import { backupRouter } from './routes/backup.js';
import { focusRouter } from './routes/focus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const buildApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.use('/api', globalLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.get('/api/settings/status', (_req, res, next) => {
    void getAppSettings()
      .then((settings) => {
        const aiHealth = getAiHealth();
        const model =
          aiHealth.effective === 'ollama' ? settings.ai.ollamaModel : settings.ai.openaiModel;
        res.json({
          openai: {
            configured:
              aiHealth.preferred === 'openai'
                ? Boolean(env.OPENAI_API_KEY)
                : Boolean(settings.ai.ollamaBaseUrl),
            model,
          },
          ai: { provider: settings.ai.provider },
          aiHealth: {
            preferred: aiHealth.preferred,
            effective: aiHealth.effective,
            degraded: aiHealth.degraded,
            reason: aiHealth.reason,
          },
          env: env.NODE_ENV,
        });
      })
      .catch(next);
  });

  app.use('/api/areas', areasRouter);
  app.use('/api/tracks', tracksRouter);
  app.use('/api/goals', goalsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/problems', problemsRouter);
  app.use('/api/logs', logsRouter);
  app.use('/api/study-topics', studyTopicsRouter);
  app.use('/api/resources', resourcesRouter);
  app.use('/api/reminders', remindersRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/overview', overviewRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/ingest', ingestRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/tracked-tags', trackedTagsRouter);
  app.use('/api/pending-captures', pendingCapturesRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/sidebar-feed', sidebarFeedRouter);
  app.use('/api/urgency', urgencyRouter);
  app.use('/api/streak', streakRouter);
  app.use('/api/backup', backupRouter);
  app.use('/api/focus', focusRouter);

  // Serve the built client in production from the same Express process.
  if (isProd) {
    const clientDist = path.resolve(__dirname, '../../client/dist');
    if (existsSync(clientDist)) {
      app.use(express.static(clientDist));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    } else {
      logger.warn(`Client build not found at ${clientDist}; static serving disabled.`);
    }
  }

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
};
