import pino from 'pino';
import { env, isProd } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
  redact: {
    paths: [
      'req.headers.authorization',
      '*.openaiApiKey',
      '*.OPENAI_API_KEY',
      '*.telegramBotToken',
      '*.botToken',
      '*.TELEGRAM_BOT_TOKEN_BOOT',
      '*.refreshToken',
      '*.accessToken',
      '*.clientSecret',
      '*.GOOGLE_OAUTH_CLIENT_SECRET',
    ],
    censor: '[REDACTED]',
  },
});
