import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { StreamChunk } from "./llm/types"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function extractErrorMessage(error: unknown): string {
	if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
		return "Rate limit exceeded. Please try again later.";
	}
	
	if (error instanceof Error) {
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

export function formatAction(action: unknown, toolName?: string): string {
	if (!action || typeof action !== 'object') return "Action";

	const actionObj = action as Record<string, unknown>;

	if (toolName === "bash") {
		return `bash: ${actionObj.command || "restart"}`;
	}

	if (toolName === "str_replace_editor") {
		return `editor: ${actionObj.command} ${actionObj.path || ""}`;
	}

	const actionType = actionObj.action as string;

	switch (actionType) {
		case "left_click": {
			const coord = actionObj.coordinate as [number, number];
			return `Click [${coord[0]}, ${coord[1]}]`;
		}
		case "right_click": {
			const coord = actionObj.coordinate as [number, number];
			return `Right-click [${coord[0]}, ${coord[1]}]`;
		}
		case "double_click": {
			const coord = actionObj.coordinate as [number, number];
			return `Double-click [${coord[0]}, ${coord[1]}]`;
		}
		case "type":
			return `Type: "${actionObj.text}"`;
		case "key":
			return `Press: ${actionObj.text}`;
		case "scroll":
			return `Scroll ${actionObj.scroll_direction}`;
		case "mouse_move": {
			const coord = actionObj.coordinate as [number, number];
			return `Move mouse to [${coord[0]}, ${coord[1]}]`;
		}
		case "screenshot":
			return "Screenshot";
		case "wait":
			return `Wait ${actionObj.duration}s`;
		default:
			return actionType || "Action";
	}
}
