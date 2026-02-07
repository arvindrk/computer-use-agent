import { useCallback, useEffect, useRef, useState } from "react";
import { parseSSE } from "@/lib/utils";
import { SSEEvent } from "@/lib/llm/types";

export type Message = {
    role: "user" | "assistant";
    content: string;
};

interface UseChatOptions {
    sandboxId: string;
    onSandboxUpdate?: (vncUrl: string, sandboxId: string) => void;
}

export function useChat({ sandboxId, onSandboxUpdate }: UseChatOptions) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [streamingText, setStreamingText] = useState<string>("")
    const [error, setError] = useState<string | null>(null);

    const messagesRef = useRef<Message[]>([]);
    const streamBufferRef = useRef<string>("");
    const textBufferRef = useRef<string>("");
    const animationFrameRef = useRef<number | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            abortControllerRef.current?.abort();
        };
    }, []);

    const reset = useCallback(() => {
        setStreamingText("");
        setError(null);
        setIsLoading(false);
        setIsStreaming(false);
        textBufferRef.current = "";
        streamBufferRef.current = "";
        animationFrameRef.current = null;
        abortControllerRef.current = null;
    }, []);

    const flushBuffer = useCallback(() => {
        setStreamingText(textBufferRef.current);
        animationFrameRef.current = null;
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        const userMessage: Message = { role: "user", content };
        setMessages((prev) => [...prev, userMessage]);

        abortControllerRef.current = new AbortController();
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/desktop/chat", {
                method: "POST",
                headers: { "Content-Type": "text/event-stream" },
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
                                textBufferRef.current += parsedMessage?.content || "";
                                if (!animationFrameRef.current) {
                                    animationFrameRef.current = requestAnimationFrame(flushBuffer);
                                }
                                break;
                            case SSEEvent.DONE:
                                const assistantMessage: Message = {
                                    role: "assistant",
                                    content: textBufferRef.current,
                                };
                                setMessages((prev) => [...prev, assistantMessage]);
                                break;
                            case SSEEvent.ERROR:
                                setError(parsedMessage.error || "Stream error");
                                if (textBufferRef.current) {
                                    setMessages(prev => [...prev, {
                                        role: "assistant",
                                        content: textBufferRef.current + "\n[Error occurred]"
                                    }]);
                                }
                                break;
                        }
                    }
                }

                if (streamBufferRef.current.trim()) {
                    const parsedMessage = parseSSE(streamBufferRef.current);
                    if (parsedMessage?.type === SSEEvent.TEXT) {
                        textBufferRef.current += parsedMessage.content;
                    }
                }

                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }

                flushBuffer();
            } finally {
                reader.releaseLock();
            }
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") {
                console.log("Streaming aborted by user");
                if (textBufferRef.current) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            content: textBufferRef.current + "\n[Canceled Request -- Displaying Partial Output]",
                        },
                    ]);
                }
            } else {
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                console.log("Error in sending message: ", err);
                setError(errorMessage);
            }
        } finally {
            reset();
        }
    }, [flushBuffer, sandboxId, onSandboxUpdate, reset]);

    const cancelStream = useCallback(() => {
        abortControllerRef.current?.abort();
    }, []);

    return {
        error,
        messages,
        isLoading,
        isStreaming,
        streamingText,
        sendMessage,
        cancelStream,
    };
}
