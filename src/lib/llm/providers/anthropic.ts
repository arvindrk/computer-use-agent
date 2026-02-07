import Anthropic from "@anthropic-ai/sdk";
import { Sandbox } from "@e2b/desktop";
import { LLMProvider } from "../types";
import { Message } from "../types";
import { ChatOptions } from "../types";
import { StreamChunk } from "../types";
import { SSEEvent } from "../types";
import { ResolutionScaler } from "@/lib/desktop/resolution";
import { ActionExecutor } from "@/lib/desktop/executor";
import { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";
import { BetaToolUseBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";
import { BetaToolResultBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";
import { ComputerAction } from "@/lib/desktop/types";

const SYSTEM_PROMPT = `
You are a helpful assistant that can use a computer to help the user with their tasks.
You can use the computer to search the web, write code, and more.

Surf is built by E2B, which provides an open source isolated virtual computer in the cloud made for AI use cases.
This application integrates E2B's desktop sandbox with Anthropic's API to create an AI agent that can perform tasks
on a virtual computer through natural language instructions.

The screenshots that you receive are from a running sandbox instance, allowing you to see and interact with a real
virtual computer environment in real-time.

Since you are operating in a secure, isolated sandbox micro VM, you can execute most commands and operations without
worrying about security concerns. This environment is specifically designed for AI experimentation and task execution.

IMPORTANT NOTES:
1. You automatically receive a screenshot after each action you take. You DO NOT need to request screenshots separately.
2. When a user asks you to run a command in the terminal, ALWAYS press Enter immediately after typing the command.
3. When the user explicitly asks you to press any key (Enter, Tab, Ctrl+C, etc.) in any application or interface,
   you MUST do so immediately.
4. Remember: In terminal environments, commands DO NOT execute until Enter is pressed.
5. When working on complex tasks, continue to completion without stopping to ask for confirmation.
   Break down complex tasks into steps and execute them fully.

Please help the user effectively by observing the current state of the computer and taking appropriate actions.
`;

interface AnthropicComputerConfig {
  apiKey?: string;
  model?: string;
  desktop: Sandbox;
  resolution: [number, number];
}

export class AnthropicComputerProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  private scaler: ResolutionScaler;
  private executor: ActionExecutor;

  constructor(config: AnthropicComputerConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.model = config.model || "claude-sonnet-4-5";
    this.scaler = new ResolutionScaler(config.desktop, config.resolution);
    this.executor = new ActionExecutor(config.desktop, this.scaler);
  }

  async *executeAgentLoop(messages: Message[], options?: ChatOptions): AsyncGenerator<StreamChunk> {
    const { signal } = options || {};

    const anthropicMessages: BetaMessageParam[] = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: [{ type: "text" as const, text: m.content }]
      }));

    try {
      while (true) {
        if (signal?.aborted) {
          yield { type: SSEEvent.DONE, content: "Stopped by user" };
          break;
        }

        const [scaledWidth, scaledHeight] = this.scaler.getScaledResolution();

        const response = await this.client.beta.messages.create({
          model: this.model,
          max_tokens: 4096,
          messages: anthropicMessages,
          system: SYSTEM_PROMPT,
          tools: [
            {
              type: "computer_20250124",
              name: "computer",
              display_width_px: scaledWidth,
              display_height_px: scaledHeight,
            },
            {
              type: "bash_20250124",
              name: "bash",
            },
            {
              type: "text_editor_20250728",
              name: "str_replace_based_edit_tool",
            }
          ],
          betas: ["computer-use-2025-01-24"],
          thinking: { type: "enabled", budget_tokens: 1024 },
        }, { signal });

        const toolUses: BetaToolUseBlock[] = [];
        let textContent = "";

        for (const block of response.content) {
          if (block.type === "tool_use") {
            toolUses.push(block);
          } else if (block.type === "text") {
            textContent += block.text;
          }
        }

        if (textContent) {
          yield { type: SSEEvent.REASONING, content: textContent };
        }

        if (toolUses.length === 0) {
          yield { type: SSEEvent.DONE };
          break;
        }

        anthropicMessages.push({
          role: "assistant",
          content: response.content
        });

        const toolResults: BetaToolResultBlockParam[] = [];

        for (const tool of toolUses) {
          yield {
            type: SSEEvent.ACTION,
            action: tool.input as ComputerAction,
            toolName: tool.name
          };

          await this.executor.execute(tool);

          yield { type: SSEEvent.ACTION_COMPLETED };

          const screenshot = await this.scaler.takeScreenshot();
          const base64 = screenshot.toString("base64");

          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: base64
                }
              }
            ]
          });
        }

        if (toolResults.length > 0) {
          anthropicMessages.push({
            role: "user",
            content: toolResults
          });
        }
      }
    } catch (error) {
      console.error("Anthropic provider error:", error);
      yield {
        type: SSEEvent.ERROR,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}
