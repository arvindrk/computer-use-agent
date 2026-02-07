import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, Message, ChatOptions, StreamChunk, ProviderConfig, SSEEvent } from "../types";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY });
    this.defaultModel = config.model || "claude-haiku-4-5-20251001";
    this.defaultMaxTokens = config.defaultMaxTokens || 8096;
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk> {
    const { maxTokens, signal } = options || {};

    const stream = await this.client.messages.stream({
      model: this.defaultModel,
      max_tokens: maxTokens || this.defaultMaxTokens,
      messages: messages as Anthropic.MessageParam[],
    }, { signal });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield {
          type: SSEEvent.TEXT,
          content: chunk.delta.text
        };
      }
    }

    yield { type: SSEEvent.DONE };
  }
}
