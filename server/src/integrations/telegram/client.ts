export type TelegramInlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    date?: number;
    text?: string;
    from?: { username?: string };
    chat: { id: number };
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { username?: string };
    message?: { message_id: number; chat: { id: number } };
  };
};

const callApi = async <T>(botToken: string, method: string, body?: object): Promise<T> => {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as { ok: boolean; result?: T; description?: string };
  if (!response.ok || !payload.ok || payload.result === undefined) {
    throw new Error(payload.description ?? `Telegram API error: ${response.status}`);
  }
  return payload.result;
};

export const telegramClient = (botToken: string) => ({
  getMe: () => callApi<{ id: number; username?: string }>(botToken, 'getMe'),
  sendMessage: (args: {
    chatId: string;
    text: string;
    parseMode?: 'Markdown';
    inlineKeyboard?: Array<Array<TelegramInlineKeyboardButton>>;
  }) =>
    callApi(botToken, 'sendMessage', {
      chat_id: args.chatId,
      text: args.text,
      parse_mode: args.parseMode,
      reply_markup: args.inlineKeyboard ? { inline_keyboard: args.inlineKeyboard } : undefined,
      disable_web_page_preview: true,
    }),
  getUpdates: (args: { offset?: number; timeout?: number }) =>
    callApi<Array<TelegramUpdate>>(botToken, 'getUpdates', {
      offset: args.offset,
      timeout: args.timeout ?? 30,
    }),
  answerCallbackQuery: (args: { callbackQueryId: string; text?: string }) =>
    callApi<boolean>(botToken, 'answerCallbackQuery', {
      callback_query_id: args.callbackQueryId,
      text: args.text,
      show_alert: false,
    }),
});
