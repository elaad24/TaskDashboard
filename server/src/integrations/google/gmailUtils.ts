const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
};

const stripHtml = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

type GmailPart = {
  mimeType?: string | null;
  body?: { data?: string | null; size?: number | null } | null;
  parts?: Array<GmailPart> | null;
};

const collectParts = (part: GmailPart | undefined | null, out: Array<string>): void => {
  if (!part) return;
  const data = part.body?.data;
  if (data && part.mimeType) {
    const decoded = decodeBase64Url(data);
    if (part.mimeType === 'text/plain') out.push(decoded);
    else if (part.mimeType === 'text/html') out.push(stripHtml(decoded));
  }
  for (const child of part.parts ?? []) collectParts(child, out);
};

export const extractEmailBody = (payload: GmailPart | undefined | null): string => {
  const chunks: Array<string> = [];
  collectParts(payload, chunks);
  const text = chunks.join('\n').trim();
  return text || '(empty body)';
};

export const extractEmailSubject = (
  headers: Array<{ name?: string | null; value?: string | null }> | undefined | null,
): string => {
  const subject = headers?.find((h) => h.name?.toLowerCase() === 'subject')?.value;
  return subject?.trim() || '(no subject)';
};
