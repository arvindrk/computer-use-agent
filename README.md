# Chat-Controlled Remote Desktop Sandbox

Application for voice and chat-based control of a remote Linux virtual machine, streaming the desktop environment to your browser using [E2B Desktop Sandbox](https://e2b.dev/docs/template/examples/desktop).

## Features

- 🖥️ Stream a full Linux desktop (Xfce) in your browser
- 💬 **Chat-based remote desktop control** using Claude
- 🔄 Persistent sandbox sessions with reconnection support
- 🎯 Interactive desktop with mouse and keyboard control
- 📋 Clipboard support (read/write)
- 🤖 LLM-powered command execution and desktop automation

## Coming soon

- 🎤 Voice-controlled VM interactions

## How it works

1. User sends natural language commands via chat
2. Claude interprets the command and generates desktop actions
3. Actions are executed in the E2B sandbox (keyboard/mouse/screenshots)
4. Desktop stream updates in real-time via iframe
5. Results are reported back in chat

## Prerequisites

- Node.js 20+
- E2B API key ([get one here](https://e2b.dev))
- Anthropic API key ([get one here](https://console.anthropic.com))

## Setup

1. **Clone and install dependencies**

```bash
npm install
# or
pnpm install
```

2. **Configure environment variables**

Create `.env.local` from `env.example`:

```bash
cp env.example .env.local
```

Add your API keys:

```
E2B_API_KEY=your_e2b_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

3. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start chatting to control the desktop.

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │ ◄─────► │   Next.js   │ ◄─────► │ E2B Desktop │
│  ChatPanel  │         │  API Route  │         │   Sandbox   │
│   +iframe   │         │  +Claude AI │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
```

## Learn More

- [E2B Desktop Documentation](https://github.com/e2b-dev/desktop)
- [Next.js Documentation](https://nextjs.org/docs)
- [Anthropic Claude](https://www.anthropic.com/claude)
- [E2B Platform](https://e2b.dev)
