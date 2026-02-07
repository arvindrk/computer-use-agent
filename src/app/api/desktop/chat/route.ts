import { Sandbox } from "@e2b/desktop";
import { NextRequest, NextResponse } from "next/server";
import { createLLMProvider } from "@/lib/llm/factory";
import { SSEEvent, StreamChunk } from "@/lib/llm/types";
import { CreateResponseStream } from "@/lib/llm";

export async function POST(request: NextRequest) {
  const { signal } = request;
  const { sandboxId, messages, provider = 'anthropic', model } = await request.json();
  let desktop: Sandbox | undefined;

  signal.addEventListener("abort", async () => {
    if (desktop) {
      await desktop.kill().catch((err: Error) => 
        console.error("Failed to kill sandbox on abort:", err)
      );
    }
  });


  const e2bKey = process.env.E2B_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!e2bKey) {
    return NextResponse.json(
      { error: "E2B API key not configured" },
      { status: 500 }
    );
  }

  if (provider === 'anthropic' && !anthropicKey) {
    return NextResponse.json(
      { error: "Anthropic API key not configured" },
      { status: 500 }
    );
  }

  let activeSandboxId = sandboxId;
  let vncUrl: string | undefined;

  try {
    if (!activeSandboxId) {
      const newSandbox = await Sandbox.create({
        resolution: [1024, 768],
        dpi: 96,
        timeoutMs: 300_000,
      });
      activeSandboxId = newSandbox.sandboxId;
      desktop = newSandbox;
      await desktop.stream.start();
      vncUrl = desktop.stream.getUrl();
    } else {
      desktop = await Sandbox.connect(activeSandboxId);
    }

    if (!desktop) {
      return NextResponse.json(
        { error: "Failed to connect to sandbox" },
        { status: 500 }
      );
    }

    const llmProvider = createLLMProvider(provider, { model });
    const llmStream = llmProvider.chat(messages, { signal });

    if (!sandboxId && activeSandboxId && vncUrl) {
      async function* stream(): AsyncGenerator<StreamChunk> {
        yield {
          type: SSEEvent.INIT,
          sandboxId: activeSandboxId,
          vncUrl
        }
        yield* llmStream;
      }

      return CreateResponseStream(stream())
    } else {
      return CreateResponseStream(llmStream);
    }
  } catch (error) {
    console.error("Desktop chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
