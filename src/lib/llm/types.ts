import { ComputerAction, BashCommand, TextEditorCommand } from '@/lib/desktop/types';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  signal?: AbortSignal;
}

export enum SSEEvent {
  INIT = 'init',
  TEXT = 'text',
  ERROR = 'error',
  DONE = 'done',
  ACTION = 'action',
  ACTION_COMPLETED = 'action_completed',
  REASONING = 'reasoning',
}

export interface StreamChunk {
  type: SSEEvent;
  sandboxId?: string;
  vncUrl?: string;
  content?: string;
  error?: string;
  action?: ComputerAction | BashCommand | TextEditorCommand;
  toolName?: string;
}

export interface LLMProvider {
  executeAgentLoop(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk>;
}
