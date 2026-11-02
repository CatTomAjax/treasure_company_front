/** Shared model transport contracts; credentials and model calls remain on the backend. */
export type ModelTarget = {
  provider: 'deepseek' | 'openai';
  destination: string;
  model: string;
  connectionId: string;
  connectionVersion: string;
};
export type ModelSettings = ModelTarget & { key: string };
