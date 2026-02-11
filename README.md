<div align="center">

# AI Boss Brainz

**Executive AI Consultants for Strategic Business Growth**

[![Next.js](https://img.shields.io/badge/Next.js-15.6+-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](LICENSE)

[Live Demo](https://bossbrainz.aleccimedia.com) | [Documentation](#documentation) | [Report Issue](https://github.com/Qualiasolutions/ai-bossy-brainz/issues)

---

Built by **[Qualia Solutions](https://qualiasolutions.net)** - AI-Powered Voice Agents & Automation

</div>

## Overview

AI Boss Brainz is an executive personality-driven AI consulting platform built for Alecci Media. Unlike generic chatbots, it provides access to two distinct AI executives - **Alexandria (CMO)** and **Kim (CSO)** - each with specialized expertise, unique personalities, and strategic frameworks tailored to marketing and sales consulting.

The platform leverages advanced AI models through OpenRouter, features real-time streaming responses, voice synthesis via ElevenLabs, and persistent conversation memory across sessions.

## Key Features

| Feature | Description |
|---------|-------------|
| **Dual Executive Personas** | Alexandria (CMO) for marketing strategy, Kim (CSO) for sales optimization, or both in Collaborative mode |
| **Focus Modes** | Specialized contexts: Business Analysis, Pricing, Key Messaging, Customer Journey, Social Media, Launch Strategy |
| **Strategy Canvas** | Interactive SWOT, Business Model Canvas, Customer Journey, and Brainstorm boards |
| **Voice Integration** | Text-to-speech responses with ElevenLabs, speech-to-text input via Web Speech API |
| **Knowledge Base** | Executive-specific knowledge loaded from PDF, DOCX, and XLSX files |
| **Conversation Memory** | Cross-chat summaries and context persistence for personalized consulting |
| **Message Reactions** | Mark insights as Actionable, Save for Later, Needs Clarification, or Brilliant |
| **PDF Export** | Export conversations with executive branding |
| **Analytics Dashboard** | Track usage, topics, and executive preferences |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15.6+ (App Router, React 19, TypeScript) |
| **AI/LLM** | Vercel AI SDK 5.x + OpenRouter (Google Gemini 3 Flash) |
| **Database** | Supabase PostgreSQL with Row Level Security |
| **Auth** | Supabase Auth (SSR pattern) |
| **Storage** | Vercel Blob |
| **Voice** | ElevenLabs TTS |
| **Styling** | Tailwind CSS 4 + shadcn/ui + Radix UI |
| **Monitoring** | Sentry + Vercel Analytics |
| **Testing** | Playwright (E2E + API routes) |
| **Linting** | Ultracite (Biome-based) |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm package manager
- Supabase project
- OpenRouter API key

### Installation

```bash
# Clone the repository
git clone https://github.com/Qualiasolutions/ai-bossy-brainz.git
cd ai-bossy-brainz

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
```

### Environment Variables

Configure `.env.local` with your credentials:

```env
# Required
AUTH_SECRET=                      # Generate: openssl rand -base64 32
OPENROUTER_API_KEY=               # https://openrouter.ai/keys
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service role key
BLOB_READ_WRITE_TOKEN=            # Vercel Blob token

# Optional
REDIS_URL=                        # For rate limiting (falls back to DB)
TAVILY_API_KEY=                   # Enhanced web search
ELEVENLABS_API_KEY=               # Text-to-speech
SENTRY_DSN=                       # Error tracking
```

### Database Setup

Apply migrations in order via Supabase SQL Editor:

```bash
supabase/migrations/01_create_tables.sql
supabase/migrations/02_enable_rls.sql
```

### Development

```bash
pnpm dev        # Start dev server with Turbopack
pnpm build      # Production build
pnpm lint       # Run linter
pnpm test       # Run Playwright tests
```

Visit [localhost:3000](http://localhost:3000) to start consulting.

## Project Structure

```
app/
├── (auth)/                 # Authentication (login, register)
├── (chat)/                 # Main application
│   ├── api/                # API route handlers
│   │   ├── chat/           # AI streaming endpoint
│   │   ├── voice/          # ElevenLabs TTS
│   │   ├── reactions/      # Message reactions
│   │   └── canvas/         # Strategy canvas persistence
│   └── analytics/          # Usage dashboard
├── (marketing)/            # Landing pages

lib/
├── ai/
│   ├── providers.ts        # OpenRouter configuration
│   ├── prompts.ts          # System prompt builder
│   ├── knowledge-base.ts   # File parsing (PDF, DOCX, XLSX)
│   └── tools/              # AI tool implementations
├── bot-personalities.ts    # Executive personas + focus modes
├── db/queries.ts           # Supabase query functions
└── security/               # Rate limiting (Redis + DB fallback)

components/
├── chat.tsx                # Main chat interface
├── executive-switch.tsx    # Persona selector
├── strategy-canvas/        # Interactive strategy boards
└── ui/                     # shadcn/ui primitives
```

## Usage Limits

| Tier | Daily Messages |
|------|----------------|
| Guest | 50 |
| Regular | 500 |
| Premium | 2,000 |

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Qualiasolutions/ai-bossy-brainz)

### Manual Deployment

```bash
pnpm build
vercel deploy --prod
```

## Documentation

- [CLAUDE.md](CLAUDE.md) - Development guidelines and architecture
- [ROADMAP.md](ROADMAP.md) - Feature roadmap
- [PROGRESS.md](PROGRESS.md) - Implementation status
- [supabase/README.md](supabase/README.md) - Database schema documentation

## Contributing

This is a proprietary project built for Alecci Media. For inquiries about custom AI consulting platforms, contact [Qualia Solutions](https://qualiasolutions.net).

## License

Proprietary - All Rights Reserved. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with precision by [Qualia Solutions](https://qualiasolutions.net)**

AI-Powered Voice Agents | Automation | Modern Web Apps

[Website](https://qualiasolutions.net) | [GitHub](https://github.com/Qualiasolutions)

</div>
