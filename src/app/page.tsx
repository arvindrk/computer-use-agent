"use client";
import { useState, useCallback } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatPanel } from "@/components/ChatPanel";

export default function Home() {
  const [sandboxId, setSandboxId] = useState("");
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  const handleSandboxUpdate = useCallback((vncUrl: string, newSandboxId: string) => {
    setStreamUrl(vncUrl);
    setSandboxId(newSandboxId);
  }, []);

  const { messages, isLoading, isStreaming, streamingText, error: chatError, sendMessage } = useChat({
    sandboxId,
    onSandboxUpdate: handleSandboxUpdate,
  });

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background font-sans md:flex-row">
      <main className="flex h-[50vh] w-full flex-col items-center justify-center bg-secondary md:h-full md:w-[70%]">
        {!streamUrl ? (
          <div className="flex items-center justify-center text-muted-foreground">
            Send a message to initialize the sandbox
          </div>
        ) : (
          <iframe
            src={streamUrl}
            className="h-full w-full border-0"
            allow="clipboard-read; clipboard-write"
            title="Desktop sandbox"
          />
        )}
      </main>

      <ChatPanel
        messages={messages}
        isLoading={isLoading}
        isStreaming={isStreaming}
        streamingText={streamingText}
        error={chatError}
        onSendMessage={sendMessage}
      />
    </div>
  );
}
