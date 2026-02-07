import { memo } from "react";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, Brain } from "lucide-react";
import type { Message as MessageType } from "@/hooks/useChat";

interface MessageProps {
  message: MessageType;
}

const Message = memo(function Message({ message }: MessageProps) {
  const isUser = message.role === "user";
  const isAction = message.role === "action";

  if (isAction) {
    return (
      <div className="flex w-full justify-center animate-message-in">
        <div className="flex items-center gap-2 rounded-md border border-border bg-accent/50 px-3 py-1.5 text-xs font-mono text-muted-foreground">
          {message.status === "pending" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          )}
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full animate-message-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[85%] rounded-md border px-3 text-sm font-mono break-words whitespace-pre-wrap",
          message.isReasoning ? "pt-8 pb-2" : "py-2",
          isUser
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted text-foreground border-border"
        )}
      >
        {message.isReasoning && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-accent/50 px-2 py-0.5 text-xs text-muted-foreground">
            <Brain className="h-3 w-3" />
            <span>Reasoning</span>
          </div>
        )}
        {message.content}
      </div>
    </div>
  );
});

export { Message };
