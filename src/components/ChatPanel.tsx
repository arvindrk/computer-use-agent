"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/Message";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Send, Mic } from "lucide-react";
import type { Message as MessageType } from "@/hooks/useChat";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";

interface ChatPanelProps {
  messages: MessageType[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (content: string) => Promise<void>;
}

interface SuggestionChip {
  icon: string;
  query: string;
}

const SUGGESTIONS: SuggestionChip[] = [
  {
    icon: "🔍",
    query: "Research Wispr Flow founders and create a summary"
  },
  {
    icon: "🛒",
    query: "Find highly-rated dog toys on Amazon under $30"
  },
  {
    icon: "🏈",
    query: "Who's performing at the Super Bowl halftime show in 2026?"
  }
];

export function ChatPanel({
  messages,
  isLoading,
  error,
  onSendMessage,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isRecording,
    transcript,
    error: voiceError,
    startRecording,
    stopRecording,
  } = useVoiceRecording();

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

  const toggleVoiceMode = async () => {
    if (isRecording) {
      const finalTranscript = await stopRecording();
      if (finalTranscript) {
        await onSendMessage(finalTranscript);
      }
    } else {
      await startRecording();
    }
  };

  const handleChipClick = async (query: string) => {
    await onSendMessage(query);
  };

  return (
    <aside className="flex h-[50vh] w-full flex-col border-t border-border bg-background md:h-screen md:w-[30%] md:border-l md:border-t-0">
      <div className="flex items-center justify-end border-b border-border p-3">
        <ThemeToggle />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className="flex flex-col gap-3"
          style={{ contentVisibility: 'auto' }}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Start speaking/chatting to kick off a Lunix VM
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <Message key={index} message={message} />
              ))}
            </>
          )}
          {(error || voiceError) && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error || voiceError}
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {messages.length === 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((chip) => (
              <button
                key={chip.query}
                onClick={() => handleChipClick(chip.query)}
                disabled={isLoading}
                className="flex items-start rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-left hover:bg-muted hover:scale-[1.02] transition-all whitespace-normal"
              >
                <span className="mr-3 text-lg flex-shrink-0">{chip.icon}</span>
                <span className="leading-relaxed">{chip.query}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={isRecording ? transcript : input}
            onChange={(e) => !isRecording && setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening…" : "Type a message…"}
            aria-label="Chat message"
            disabled={isLoading || isRecording}
            className="min-h-[36px] max-h-[144px] resize-none font-sans"
            rows={1}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVoiceMode}
            disabled={isLoading}
            className={isRecording ? "text-red-500 h-[36px] w-[36px] shrink-0" : "h-[36px] w-[36px] shrink-0"}
            aria-label={isRecording ? "Stop recording" : "Start voice input"}
          >
            <Mic className={isRecording ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
          </Button>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[36px] w-[36px] shrink-0"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
