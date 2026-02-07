import { memo } from "react";
import { cn } from "@/lib/utils";
import { Dot } from "lucide-react";
import type { Message as MessageType } from "@/hooks/useChat";

interface MessageProps {
  message: MessageType;
  isStreaming?: boolean;
}

const Message = memo(function Message({ message, isStreaming = false }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full animate-message-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-md border px-3 py-2 text-sm font-mono break-words",
          isUser
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted text-foreground border-border"
        )}
      >
        {message.content}
        {isStreaming && <Dot className="inline h-4 w-4 animate-pulse" />}
      </div>
    </div>
  );
});

export { Message };
