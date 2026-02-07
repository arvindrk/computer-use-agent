import { LLMProvider, ProviderConfig } from "./types";
import { AnthropicProvider } from "./providers/anthropic";

export function createLLMProvider(
  provider: string,
  config: ProviderConfig
): LLMProvider {
  switch (provider) {
    case "anthropic":
      return new AnthropicProvider(config);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
