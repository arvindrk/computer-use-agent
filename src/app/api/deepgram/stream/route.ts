import { createClient, LiveTranscriptionEvents, type LiveTranscriptionEvent } from "@deepgram/sdk";
import type { WebSocket } from "ws";

export const runtime = "nodejs";

export function GET() {
  return new Response("WebSocket endpoint", {
    status: 426,
    statusText: "Upgrade Required",
    headers: {
      "Upgrade": "websocket",
    },
  });
}

export function UPGRADE(client: WebSocket) {
  if (!process.env.DEEPGRAM_API_KEY) {
    client.close(1008, "Deepgram API key not configured");
    return;
  }

  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  const dgConnection = deepgram.listen.live({
    model: "nova-2",
    language: "en-US",
    smart_format: true,
  });

  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log("Deepgram connection opened");
  });

  dgConnection.on(LiveTranscriptionEvents.Transcript, (data: LiveTranscriptionEvent) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });

  dgConnection.on(LiveTranscriptionEvents.Error, (error: Error) => {
    console.error("Deepgram error:", error);
    if (client.readyState === 1) {
      client.send(JSON.stringify({ error: error.message }));
    }
  });

  dgConnection.on(LiveTranscriptionEvents.Close, () => {
    console.log("Deepgram connection closed");
    client.close();
  });

  client.on("message", (data: any) => {
    if (dgConnection) {
      dgConnection.send(data);
    }
  });

  client.on("close", () => {
    console.log("Client disconnected");
    dgConnection.finish();
  });

  client.on("error", (error: Error) => {
    console.error("WebSocket client error:", error);
    dgConnection.finish();
  });
}
