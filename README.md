# ClawCraft 🎮

Real-time visualization dashboard for OpenClaw agent systems, inspired by StarCraft with LCARS theming.

## Overview

ClawCraft provides a 3D command interface for monitoring and (eventually) controlling OpenClaw sub-agents, processes, and integrations. Think StarCraft meets Star Trek.

### Features

- **3D World View** - Rotate, pan, zoom around your agent ecosystem
- **Real-time Updates** - WebSocket-powered live state synchronization
- **StarCraft-inspired Units** - Agents as buildings/units with status indicators
- **LCARS Dashboard** - Star Trek-themed UI panels for detailed views
- **Ally Bases** - External integrations (Home Assistant, APIs) as allied factions

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│   Frontend      │◄──────────────────►│    Backend       │
│   (three.js)    │                    │    (Node.js)     │
└─────────────────┘                    └────────┬─────────┘
                                                │
                                                │ HTTP/WS
                                                ▼
                                       ┌──────────────────┐
                                       │    OpenClaw      │
                                       │    Gateway       │
                                       └──────────────────┘
```

## Component Mapping

| OpenClaw Component | ClawCraft Unit | Type |
|-------------------|----------------|------|
| Gateway (main) | Command Center | Building |
| Sub-agents | Barracks → Marines | Building + Units |
| Cron scheduler | Factory | Building |
| Exec processes | SCVs | Units |
| Message channels | Comm Tower | Building |
| Token budget | Supply Depot | Building |
| Home Assistant | Allied Nexus | Allied Base |
| External APIs | Tech Labs | Add-ons |

## Quick Start

```bash
# Clone
git clone https://github.com/tharatoti/clawcraft.git
cd clawcraft

# Run with Docker Compose
docker-compose up -d

# Access at http://localhost:3000
```

## Development

```bash
# Frontend (Vite dev server)
cd frontend && npm install && npm run dev

# Backend (Node.js)
cd backend && npm install && npm run dev
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_URL` | `http://localhost:4444` | OpenClaw Gateway URL |
| `OPENCLAW_TOKEN` | - | Gateway authentication token |
| `WS_PORT` | `3001` | WebSocket server port |
| `HTTP_PORT` | `3000` | Frontend server port |

## License

MIT
