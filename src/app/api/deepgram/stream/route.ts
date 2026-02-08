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

  let dgIsOpen = false;
  const audioBuffer: Buffer[] = [];
  const MAX_BUFFER_SIZE = 20;

  const openTimeout = setTimeout(() => {
    if (!dgIsOpen) {
      console.error("Deepgram connection timeout");
      client.close(1008, "Transcription service timeout");
    }
  }, 5000);

  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    dgIsOpen = true;
    clearTimeout(openTimeout);
    console.log("Deepgram connection opened");

    while (audioBuffer.length > 0) {
      const chunk = audioBuffer.shift();
      if (chunk) {
        // @ts-expect-error - Buffer is compatible with Deepgram's SocketDataLike at runtime
        dgConnection.send(chunk);
      }
    }
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

  client.on("message", (data: Buffer) => {
    if (dgIsOpen) {
      // @ts-expect-error - Buffer is compatible with Deepgram's SocketDataLike at runtime
      dgConnection.send(data);
    } else {
      if (audioBuffer.length < MAX_BUFFER_SIZE) {
        audioBuffer.push(data);
      } else {
        console.warn("Audio buffer full, dropping chunk");
      }
    }
  });

  client.on("close", () => {
    console.log("Client disconnected");
    clearTimeout(openTimeout);
    dgConnection.finish();
  });

  client.on("error", (error: Error) => {
    console.error("WebSocket client error:", error);
    clearTimeout(openTimeout);
    dgConnection.finish();
  });
}
