"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/Message";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Send, Mic, Square } from "lucide-react";
import type { Message as MessageType } from "@/hooks/useChat";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useKeyboardRecording } from "@/hooks/useKeyboardRecording";

interface ChatPanelProps {
  messages: MessageType[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  onSendMessage: (content: string) => Promise<void>;
  onCancelStream: () => void;
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
  isStreaming,
  error,
  onSendMessage,
  onCancelStream,
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

  useKeyboardRecording({
    onStart: startRecording,
    onStop: async () => {
      const finalTranscript = await stopRecording();
      if (finalTranscript) {
        await onSendMessage(finalTranscript);
      }
    },
    isRecording,
    disabled: isLoading || isStreaming,
  });

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
    if (!input.trim() || isLoading || isStreaming) return;

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
      <div className={`flex min-h-[52px] items-center ${isRecording ? 'justify-between' : 'justify-end'} border-b border-border p-3`}>
        {isRecording && (
          <div className="flex items-center gap-2 text-sm font-medium text-red-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
            </span>
            Recording
          </div>
        )}
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
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Start speaking/chatting to kick off a Lunix VM
                </p>
              </div>

              <div className="flex items-center gap-4 px-3 py-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col text-left gap-1">
                  <p className="font-medium text-sm">Quick Recording</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Hold <kbd className="px-2 py-0.5 bg-muted border rounded text-[10px] font-mono">Space</kbd> to record
                  </p>
                </div>
              </div>
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
                disabled={isLoading || isStreaming}
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
        <TooltipProvider>
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={isRecording ? transcript : input}
              onChange={(e) => !isRecording && setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening…" : "Type a message…"}
              aria-label="Chat message"
              disabled={isLoading || isRecording || isStreaming}
              className="min-h-[36px] max-h-[144px] resize-none font-sans"
              rows={1}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isRecording ? "default" : "ghost"}
                  size="icon"
                  onClick={toggleVoiceMode}
                  disabled={isLoading || isStreaming}
                  className={isRecording ? "bg-red-500 hover:bg-red-600 text-white h-[36px] w-[36px] shrink-0" : "h-[36px] w-[36px] shrink-0"}
                  aria-label={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isRecording ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRecording ? "Stop recording" : "Start recording (or hold Space)"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={isStreaming ? onCancelStream : handleSend}
                  disabled={isStreaming ? false : (!input.trim() || isLoading)}
                  size="icon"
                  className={isStreaming ? "bg-red-500 hover:bg-red-600 text-white h-[36px] w-[36px] shrink-0" : "h-[36px] w-[36px] shrink-0"}
                  aria-label={isStreaming ? "Stop agent execution" : "Send message"}
                >
                  {isStreaming ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isStreaming ? "Stop agent execution" : "Send message (⏎)"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </aside>
  );
}
