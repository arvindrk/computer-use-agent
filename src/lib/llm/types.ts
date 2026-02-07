export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  stream?: boolean;
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
}

export enum SSEEvent {
  INIT = 'init',
  TEXT = 'text',
  ERROR = 'error',
  DONE = 'done',
}

export interface StreamChunk {
  type: SSEEvent;
  sandboxId?: string;
  vncUrl?: string;
  content?: string;
  error?: string;
}

export interface LLMProvider {
  chat(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk>;
}

export interface ProviderConfig {
  apiKey?: string;
  model?: string;
  defaultMaxTokens?: number;
}
