"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/Message";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Send } from "lucide-react";
import type { Message as MessageType } from "@/hooks/useChat";

interface ChatPanelProps {
  messages: MessageType[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingText: string;
  error: string | null;
  onSendMessage: (content: string) => Promise<void>;
}

export function ChatPanel({
  messages,
  isLoading,
  isStreaming,
  streamingText,
  error,
  onSendMessage,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      scrollRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const content = input.trim();
    setInput("");
    await onSendMessage(content);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside className="flex h-[50vh] w-full flex-col border-t border-border bg-background md:h-screen md:w-[30%] md:border-l md:border-t-0">
      <div className="flex items-center justify-end border-b border-border p-3">
        <ThemeToggle />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className="flex flex-col gap-3"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Start chatting to control the desktop…
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <Message key={index} message={message} />
              ))}
              {isStreaming && streamingText && (
                <Message
                  message={{ role: "assistant", content: streamingText }}
                  isStreaming
                />
              )}
            </>
          )}
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            aria-label="Chat message"
            disabled={isLoading}
            className="min-h-[36px] max-h-[144px] resize-none font-sans"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[36px] w-[36px] shrink-0 font-mono"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
