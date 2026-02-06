# Voice & Chat-Controlled Remote Desktop Sandbox

Application for voice and chat-based control of a remote Linux virtual machine, streaming the desktop environment to your browser using [E2B Desktop Sandbox](https://e2b.dev/docs/template/examples/desktop).

## Features

- 🖥️ Stream a full Linux desktop (Xfce) in your browser
- 🔄 Persistent sandbox sessions with reconnection support
- 🎯 Interactive desktop with mouse and keyboard control
- 📋 Clipboard support (read/write)

## Coming soon

- 🎤 Voice-controlled VM interactions
- 💬 Chat-based remote desktop control

## Prerequisites

- Node.js 20+
- E2B API key ([get one here](https://e2b.dev))

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

Add your E2B API key:

```
E2B_API_KEY=your_api_key_here
```

3. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the streaming desktop.

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │ ◄─────► │   Next.js   │ ◄─────► │ E2B Desktop │
│   (iframe)  │         │  API Route  │         │   Sandbox   │
└─────────────┘         └─────────────┘         └─────────────┘
```

## Learn More

- [E2B Desktop Documentation](https://github.com/e2b-dev/desktop)
- [Next.js Documentation](https://nextjs.org/docs)
- [E2B Platform](https://e2b.dev)
