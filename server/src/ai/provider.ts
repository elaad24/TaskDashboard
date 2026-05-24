export type StructuredCallArgs<T> = {
  system: string;
  user: string;
  jsonSchema: { name: string; strict: boolean; schema: Record<string, unknown> };
  parser: (raw: unknown) => T;
  label: string;
};

export type ProviderPingResult = {
  ok: boolean;
  model: string;
  latencyMs: number;
  error?: string;
};

export interface AiProvider {
  name: 'openai' | 'ollama';
  chatJson<T>(args: StructuredCallArgs<T>): Promise<T>;
  ping(): Promise<ProviderPingResult>;
}
