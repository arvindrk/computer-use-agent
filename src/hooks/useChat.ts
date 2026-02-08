import { useCallback, useEffect, useRef, useState } from "react";
import { formatAction, parseSSE } from "@/lib/utils";
import { SSEEvent } from "@/lib/llm/types";

export type Message = {
    role: "user" | "assistant" | "action";
    content: string;
    action?: unknown;
    toolName?: string;
    status?: "pending" | "completed";
    isReasoning?: boolean;
};

interface UseChatOptions {
    sandboxId: string;
    onSandboxUpdate?: (vncUrl: string, sandboxId: string) => void;
}

export function useChat({ sandboxId, onSandboxUpdate }: UseChatOptions) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const messagesRef = useRef<Message[]>([]);
    const streamBufferRef = useRef<string>("");
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    const reset = useCallback(() => {
        setError(null);
        setIsLoading(false);
        setIsStreaming(false);
        streamBufferRef.current = "";
        abortControllerRef.current = null;
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        const userMessage: Message = { role: "user", content };
        setMessages((prev) => [...prev, userMessage]);

        abortControllerRef.current = new AbortController();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/desktop/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sandboxId,
                    messages: [...messagesRef.current, userMessage],
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error("Failed to send message");
            }

            const reader = await response.body?.getReader();

            if (!reader) {
                throw new Error("Reader not available");
            }

            setIsStreaming(true);
            setIsLoading(false);

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    streamBufferRef.current += new TextDecoder().decode(value, { stream: true });

                    const messages = streamBufferRef.current.split('\n\n');

                    streamBufferRef.current = messages.pop() || "";

                    for (const message of messages) {
                        if (!message.trim()) continue;

                        const parsedMessage = parseSSE(message);

                        switch (parsedMessage?.type) {
                            case SSEEvent.INIT:
                                const { vncUrl, sandboxId } = parsedMessage;
                                if (onSandboxUpdate && vncUrl && sandboxId) {
                                    onSandboxUpdate(vncUrl, sandboxId);
                                }
                                break;
                            case SSEEvent.TEXT:
                                if (parsedMessage?.content && typeof parsedMessage.content === "string") {
                                    setMessages((prev) => [...prev, {
                                        role: "assistant",
                                        content: parsedMessage.content as string,
                                    }]);
                                }
                                break;
                            case SSEEvent.REASONING:
                                if (parsedMessage?.content && typeof parsedMessage.content === "string") {
                                    setMessages((prev) => [...prev, {
                                        role: "assistant",
                                        content: parsedMessage.content as string,
                                        isReasoning: true,
                                    }]);
                                }
                                break;
                            case SSEEvent.ACTION:
                                setMessages((prev) => [...prev, {
                                    role: "action",
                                    content: formatAction(parsedMessage.action, parsedMessage.toolName),
                                    action: parsedMessage.action,
                                    toolName: parsedMessage.toolName,
                                    status: "pending"
                                }]);
                                break;
                            case SSEEvent.ACTION_COMPLETED:
                                setMessages((prev) => {
                                    const lastActionIndex = [...prev].reverse()
                                        .findIndex(m => m.role === "action" && m.status === "pending");
                                    if (lastActionIndex === -1) return prev;

                                    const actualIndex = prev.length - 1 - lastActionIndex;
                                    return prev.map((msg, i) =>
                                        i === actualIndex ? { ...msg, status: "completed" as const } : msg
                                    );
                                });
                                break;
                            case SSEEvent.DONE:
                                break;
                            case SSEEvent.ERROR:
                                setError(parsedMessage.error || "Stream error");
                                setMessages(prev => [...prev, {
                                    role: "assistant",
                                    content: "[Error occurred]"
                                }]);
                                break;
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") {
                console.log("Streaming aborted by user");
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "assistant",
                        content: "[Canceled Request]",
                    },
                ]);
            } else {
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                console.log("Error in sending message: ", err);
                setError(errorMessage);
            }
        } finally {
            reset();
        }
    }, [sandboxId, onSandboxUpdate, reset]);

    const cancelStream = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current?.abort();
        }
    }, []);

    return {
        error,
        messages,
        isLoading,
        isStreaming,
        sendMessage,
        cancelStream,
    };
}
