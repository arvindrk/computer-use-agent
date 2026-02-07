import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { StreamChunk } from "./llm/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
    const retryAfter = error && typeof error === 'object' && 'headers' in error
      ? (error.headers as Record<string, string>)?.['retry-after']
      : undefined;

    if (retryAfter) {
      return `Rate limit exceeded. You can retry in ${retryAfter} seconds.`;
    } else {
      return "Rate limit exceeded. Please try again later.";
    }
  } else if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export function parseSSE(data: string): StreamChunk | null {
  try {
    if (!data || data.trim() === "") {
      return null;
    }

    if (data.startsWith("data: ")) {
      const jsonStr = data.substring(6).trim();

      if (!jsonStr) {
        return null;
      }

      return JSON.parse(jsonStr);
    }

    const match = data.match(/data: ({.*})/);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }

    return JSON.parse(data);
  } catch (e) {
    console.error(
      "Error parsing SSE event:",
      e,
      "Data:",
      data.substring(0, 200) + (data.length > 200 ? "..." : "")
    );
    return null;
  }
}
