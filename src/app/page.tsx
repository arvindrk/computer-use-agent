"use client";
import { useEffect, useState } from "react";

export default function Home() {
	const [streamUrl, setStreamUrl] = useState(null);
	const [activeSandboxId, setActiveSandboxId] = useState("");

	useEffect(() => {
		const streamSandBox = async () => {
			const response = await fetch('/api/desktop/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sandboxId: activeSandboxId })
			});
			const { vncUrl, sandboxId } = await response.json();
			console.log(vncUrl, sandboxId);
			setStreamUrl(vncUrl);
			setActiveSandboxId(sandboxId);
		}

		streamSandBox();

	}, [activeSandboxId]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
			<main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
				{streamUrl && (<iframe
					src={streamUrl}
					className="w-full h-100"
					allow="clipboard-read; clipboard-write"
				/>)}
			</main>
		</div>
	);
}
