import type { IntegrationSettingsPatch } from '@command-center/shared';
import { getAppSettings, updateAppSettings } from './appSettingsService.js';

export type IntegrationSettings = {
  emailHashtag: string;
  gmailPollMinutes: number;
  calendarPollMinutes: number;
  calendarDailyWriteCap: number;
};

const defaults: IntegrationSettings = {
  emailHashtag: '#for_the_bot',
  gmailPollMinutes: 5,
  calendarPollMinutes: 30,
  calendarDailyWriteCap: 20,
};

export const getIntegrationSettings = async (): Promise<IntegrationSettings> => {
  await getAppSettings();
  const { prisma } = await import('../db.js');
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          'integrations.emailHashtag',
          'integrations.gmailPollMinutes',
          'integrations.calendarPollMinutes',
          'integrations.calendarDailyWriteCap',
        ],
      },
    },
  });
  const store = rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  const parse = <T>(key: string, fallback: T): T => {
    try {
      return JSON.parse(store[key] ?? '') as T;
    } catch {
      return fallback;
    }
  };

  return {
    emailHashtag: parse('integrations.emailHashtag', defaults.emailHashtag),
    gmailPollMinutes: parse('integrations.gmailPollMinutes', defaults.gmailPollMinutes),
    calendarPollMinutes: parse('integrations.calendarPollMinutes', defaults.calendarPollMinutes),
    calendarDailyWriteCap: parse('integrations.calendarDailyWriteCap', defaults.calendarDailyWriteCap),
  };
};

export const updateIntegrationSettings = async (
  patch: IntegrationSettingsPatch,
): Promise<IntegrationSettings> => {
  const values: Record<string, string | number> = {};
  if (patch.emailHashtag !== undefined) values['integrations.emailHashtag'] = patch.emailHashtag;
  if (patch.gmailPollMinutes !== undefined) values['integrations.gmailPollMinutes'] = patch.gmailPollMinutes;
  if (patch.calendarPollMinutes !== undefined) {
    values['integrations.calendarPollMinutes'] = patch.calendarPollMinutes;
  }
  if (patch.calendarDailyWriteCap !== undefined) {
    values['integrations.calendarDailyWriteCap'] = patch.calendarDailyWriteCap;
  }
  await updateAppSettings(values);
  return getIntegrationSettings();
};
