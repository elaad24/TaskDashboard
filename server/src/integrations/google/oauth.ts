import { google } from 'googleapis';
import { randomBytes } from 'node:crypto';
import { env } from '../../env.js';
import { prisma } from '../../db.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { logger } from '../../logger.js';

export const GOOGLE_PROVIDER = 'google';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

const oauthStates = new Map<string, number>();

const isGoogleConfigured = (): boolean =>
  Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);

export const assertGoogleConfigured = (): void => {
  if (!isGoogleConfigured()) {
    throw new HttpError(
      503,
      'GOOGLE_NOT_CONFIGURED',
      'Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in server/.env',
    );
  }
};

export const createOAuthClient = () => {
  assertGoogleConfigured();
  return new google.auth.OAuth2(
    env.GOOGLE_OAUTH_CLIENT_ID,
    env.GOOGLE_OAUTH_CLIENT_SECRET,
    env.GOOGLE_OAUTH_REDIRECT_URI,
  );
};

export const createAuthUrl = (): string => {
  const client = createOAuthClient();
  const state = randomBytes(16).toString('hex');
  oauthStates.set(state, Date.now() + 10 * 60_000);
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    state,
  });
};

const consumeState = (state: string): void => {
  const expiresAt = oauthStates.get(state);
  oauthStates.delete(state);
  if (!expiresAt || expiresAt < Date.now()) {
    throw new HttpError(400, 'INVALID_OAUTH_STATE', 'OAuth state expired or invalid');
  }
};

export const exchangeCodeForTokens = async (code: string, state: string) => {
  consumeState(state);
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new HttpError(400, 'NO_REFRESH_TOKEN', 'No refresh token returned. Revoke app access and retry.');
  }
  await prisma.integrationToken.upsert({
    where: { provider: GOOGLE_PROVIDER },
    create: {
      provider: GOOGLE_PROVIDER,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes: JSON.stringify(GOOGLE_SCOPES),
    },
    update: {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes: JSON.stringify(GOOGLE_SCOPES),
    },
  });
};

export const disconnectGoogle = async (): Promise<void> => {
  await prisma.integrationToken.deleteMany({ where: { provider: GOOGLE_PROVIDER } });
};

export const getAuthorizedClient = async () => {
  const row = await prisma.integrationToken.findUnique({ where: { provider: GOOGLE_PROVIDER } });
  if (!row) {
    throw new HttpError(401, 'GOOGLE_NOT_CONNECTED', 'Connect Google in Settings first');
  }
  const client = createOAuthClient();
  client.setCredentials({
    refresh_token: row.refreshToken,
    access_token: row.accessToken ?? undefined,
    expiry_date: row.expiresAt?.getTime(),
  });

  client.on('tokens', (tokens) => {
    void prisma.integrationToken
      .update({
        where: { provider: GOOGLE_PROVIDER },
        data: {
          accessToken: tokens.access_token ?? row.accessToken,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : row.expiresAt,
          refreshToken: tokens.refresh_token ?? row.refreshToken,
        },
      })
      .catch((err) => logger.warn({ err }, 'failed to persist refreshed google tokens'));
  });

  return client;
};

export const getGoogleAccountEmail = async (): Promise<string | null> => {
  try {
    const auth = await getAuthorizedClient();
    const oauth2 = google.oauth2({ version: 'v2', auth });
    const profile = await oauth2.userinfo.get();
    return profile.data.email ?? null;
  } catch {
    return null;
  }
};

export const isGoogleConnected = async (): Promise<boolean> => {
  const row = await prisma.integrationToken.findUnique({ where: { provider: GOOGLE_PROVIDER } });
  return Boolean(row);
};

export const getGoogleClients = async () => {
  const auth = await getAuthorizedClient();
  return {
    auth,
    gmail: google.gmail({ version: 'v1', auth }),
    calendar: google.calendar({ version: 'v3', auth }),
  };
};
