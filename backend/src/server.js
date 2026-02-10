import { WebSocketServer } from 'ws';
import http from 'http';

const WS_PORT = process.env.WS_PORT || 3001;
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:4444';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '';
const POLL_INTERVAL = process.env.POLL_INTERVAL || 2000;

// State cache
let currentState = {
  tokens: 0,
  agents: 0,
  processes: 0,
  buildings: {
    gateway: 'active',
    jarvis: 'idle',
    cron: 'active',
    'home-assistant': 'connected',
    alpaca: 'connected'
  },
  units: [],
  lastUpdate: Date.now()
};

// Create HTTP server for health checks
const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', lastUpdate: currentState.lastUpdate }));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

// WebSocket server
const wss = new WebSocketServer({ server: httpServer });

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);
  
  // Send current state immediately
  ws.send(JSON.stringify(currentState));
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    clients.delete(ws);
  });
});

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  }
}

// Poll OpenClaw for state updates
async function pollOpenClawState() {
  try {
    // For now, generate mock data that simulates real activity
    // TODO: Replace with actual OpenClaw API calls
    
    const newState = {
      tokens: currentState.tokens + Math.floor(Math.random() * 100),
      agents: 2 + Math.floor(Math.random() * 3),
      processes: Math.floor(Math.random() * 5),
      buildings: {
        gateway: 'active',
        jarvis: Math.random() > 0.7 ? 'active' : 'idle',
        cron: 'active',
        'home-assistant': 'connected',
        alpaca: 'connected'
      },
      lastUpdate: Date.now()
    };
    
    // Check for changes
    const hasChanges = JSON.stringify(newState) !== JSON.stringify(currentState);
    
    if (hasChanges) {
      currentState = newState;
      broadcast(currentState);
    }
    
  } catch (error) {
    console.error('Error polling OpenClaw:', error.message);
    
    // Update gateway status to error
    if (currentState.buildings.gateway !== 'error') {
      currentState.buildings.gateway = 'error';
      broadcast(currentState);
    }
  }
}

// TODO: Implement actual OpenClaw API integration
async function fetchOpenClawSessions() {
  // This would call OpenClaw's session list endpoint
  // const response = await fetch(`${OPENCLAW_URL}/api/sessions`, {
  //   headers: { 'Authorization': `Bearer ${OPENCLAW_TOKEN}` }
  // });
  // return response.json();
  return [];
}

async function fetchOpenClawProcesses() {
  // This would call OpenClaw's process list endpoint
  return [];
}

// Start polling
setInterval(pollOpenClawState, POLL_INTERVAL);

// Initial poll
pollOpenClawState();

httpServer.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`ClawCraft backend listening on port ${WS_PORT}`);
  console.log(`Health check: http://localhost:${WS_PORT}/health`);
  console.log(`WebSocket: ws://localhost:${WS_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  wss.close();
  httpServer.close();
  process.exit(0);
});
