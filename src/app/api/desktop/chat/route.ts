import { Sandbox } from "@e2b/desktop";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const abortController = new AbortController();
  const { signal } = abortController;

  request.signal.addEventListener("abort", () => {
    abortController.abort();
  });

  const {
    sandboxId,
  } = await request.json();

  const e2bKey = process.env.E2B_API_KEY;

  if (!e2bKey) {
    return new Response("E2B API key not found", { status: 500 });
  }

  let activeSandboxId = sandboxId;
  let vncUrl: string | undefined;
  let desktop;

  try {
    if (!activeSandboxId) {
      const newSandbox = await Sandbox.create({
        resolution: [1024, 768],
        dpi: 96,
        timeoutMs: 300_000,
      });
      activeSandboxId = newSandbox.sandboxId;
      desktop = newSandbox;
    } else {
      desktop = await Sandbox.connect(activeSandboxId);
    }

    if (!desktop) {
      return new Response("Failed to connect to sandbox", { status: 500 });
    }

    await desktop.stream.start();
    vncUrl = desktop.stream.getUrl();

    return NextResponse.json(
      {
        vncUrl: vncUrl,
        sandboxID: activeSandboxId
      },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
