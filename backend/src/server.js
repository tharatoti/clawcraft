import { WebSocketServer } from 'ws';
import http from 'http';

const WS_PORT = process.env.WS_PORT || 3001;
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:4444';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '2000');

// State cache
let currentState = {
  tokens: 0,
  agents: 0,
  processes: 0,
  sessions: [],
  cronJobs: [],
  buildings: {
    gateway: 'active',
    jarvis: 'idle',
    'agent-spawner': 'active',
    cron: 'active',
    tokens: 'active',
    budget: 'active',
    'home-assistant': 'connected',
    alpaca: 'connected',
    'knowledge-bridge': 'active',
    'avatar-dashboard': 'active',
    wiki: 'active',
    boardroom: 'active',
    'boardroom-2': 'active'
  },
  activePipelines: [],
  lastUpdate: Date.now()
};

// Persona system prompts
const PERSONA_PROMPTS = {
  hormozi: "You are Alex Hormozi. Respond as him - direct, value-focused, obsessed with offers and scaling. Keep responses concise and actionable.",
  goggins: "You are David Goggins. Respond as him - intense, motivational, no excuses. Use his catchphrases like 'STAY HARD' naturally. Push people beyond comfort zones.",
  naval: "You are Naval Ravikant. Respond as him - philosophical, focused on leverage, wealth, and happiness. Speak in clear, profound observations.",
  musk: "You are Elon Musk. Respond as him - first principles thinking, ambitious, sometimes awkward pauses. Reference physics, engineering, making humanity multiplanetary.",
  robbins: "You are Tony Robbins. Respond as him - energetic, focused on state and strategy, asking powerful questions.",
  kennedy: "You are Dan Kennedy. Respond as him - contrarian direct marketer, no-BS, focused on results and ROI.",
  abraham: "You are Jay Abraham. Respond as him - strategic, focused on leverage and optimization, business growth expert.",
  halbert: "You are Gary Halbert. Respond as him - legendary copywriter, storyteller, direct and sometimes crude humor.",
  rosenberg: "You are Marshall Rosenberg. Respond as him - compassionate, focused on feelings and needs, nonviolent communication.",
  franklin: "You are Benjamin Franklin. Respond as him - wise, witty, practical, focused on virtue and self-improvement.",
  lewis: "You are C.S. Lewis. Respond as him - thoughtful, philosophical, drawing on faith and reason, clear prose.",
  mises: "You are Ludwig von Mises. Respond as him - Austrian economist, focused on free markets, human action, and praxeology.",
  adams: "You are Scott Adams. Respond as him - systems thinker, persuasion expert, Dilbert creator, contrarian takes."
};

// HTTP server for health checks and chat API
const httpServer = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      lastUpdate: currentState.lastUpdate,
      sessions: currentState.sessions.length,
      processes: currentState.processes
    }));
    return;
  }
  
  // Chat API - use OpenRouter for persona responses
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { personaId, message } = JSON.parse(body);
        const systemPrompt = PERSONA_PROMPTS[personaId] || 'You are a helpful assistant.';
        
        // Use OpenRouter free tier
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error('OPENROUTER_API_KEY not configured');
        }
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://clawcraft.local',
            'X-Title': 'ClawCraft'
          },
          body: JSON.stringify({
            model: 'google/gemma-3-12b-it:free',
            messages: [
              { role: 'user', content: `${systemPrompt}\n\nUser: ${message}\n\nRespond briefly in character (2-4 sentences):` }
            ],
            max_tokens: 150,
            temperature: 0.8
          }),
          signal: AbortSignal.timeout(30000)
        });
        
        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content?.trim() || 'No response';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ text, personaId }));
        } else {
          const err = await response.text();
          throw new Error(`OpenRouter error: ${err}`);
        }
      } catch (e) {
        console.error('Chat error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
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
  
  // Send current state
  ws.send(JSON.stringify({ type: 'state', payload: currentState }));
  
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      handleClientMessage(ws, data);
    } catch (e) {
      console.error('Invalid message:', e);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    clients.delete(ws);
  });
});

function handleClientMessage(ws, data) {
  switch (data.type) {
    case 'subscribe':
      // Could track per-client subscriptions
      console.log('Client subscribed to:', data.channels);
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
  }
}

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

// Fetch real OpenClaw state
async function fetchOpenClawState() {
  try {
    // Try to get sessions list
    const sessionsRes = await fetch(`${OPENCLAW_URL}/api/sessions`, {
      headers: OPENCLAW_TOKEN ? { 'Authorization': `Bearer ${OPENCLAW_TOKEN}` } : {},
      signal: AbortSignal.timeout(5000)
    });
    
    if (sessionsRes.ok) {
      const sessions = await sessionsRes.json();
      return { sessions, connected: true };
    }
  } catch (e) {
    // OpenClaw API might not be available
  }
  
  return { sessions: [], connected: false };
}

// Poll and update state
async function pollOpenClawState() {
  try {
    const openclawData = await fetchOpenClawState();
    
    // Merge real data with simulated data
    const activeSessions = openclawData.sessions.filter(s => s.active);
    
    const newState = {
      tokens: currentState.tokens + Math.floor(Math.random() * 50),
      agents: activeSessions.length || Math.floor(Math.random() * 3) + 1,
      processes: Math.floor(Math.random() * 5),
      sessions: openclawData.sessions,
      cronJobs: currentState.cronJobs,
      buildings: {
        gateway: openclawData.connected ? 'active' : 'error',
        jarvis: activeSessions.some(s => s.label?.includes('jarvis')) ? 'active' : 'idle',
        'agent-spawner': 'active',
        cron: 'active',
        tokens: 'active',
        budget: 'active',
        'home-assistant': 'connected',
        alpaca: 'connected',
        'knowledge-bridge': 'active',
        'avatar-dashboard': 'active',
        wiki: 'active',
        boardroom: 'active',
        'boardroom-2': 'active'
      },
      activePipelines: generateActivePipelines(),
      lastUpdate: Date.now()
    };
    
    // Broadcast if changed
    if (JSON.stringify(newState) !== JSON.stringify(currentState)) {
      currentState = newState;
      broadcast({ type: 'state', payload: currentState });
    }
    
  } catch (error) {
    console.error('Error polling state:', error.message);
    
    if (currentState.buildings.gateway !== 'error') {
      currentState.buildings.gateway = 'error';
      broadcast({ type: 'state', payload: currentState });
    }
  }
}

function generateActivePipelines() {
  // Simulate pipeline activity
  const allPipelines = [
    'gateway-jarvis',
    'gateway-agent-spawner',
    'gateway-cron',
    'gateway-tokens',
    'gateway-budget',
    'jarvis-home-assistant',
    'gateway-alpaca',
    'gateway-knowledge-bridge',
    'gateway-avatar-dashboard',
    'gateway-wiki',
    'gateway-boardroom',
    'boardroom-boardroom-2'
  ];
  
  // Randomly activate some pipelines
  return allPipelines.filter(() => Math.random() > 0.5);
}

// Activity simulation
function simulateActivity() {
  const activities = [
    'Heartbeat received',
    'Session state saved',
    'Token count updated',
    'Pipeline data flow',
    'Cache refreshed'
  ];
  
  const activity = {
    type: 'activity',
    payload: {
      message: activities[Math.floor(Math.random() * activities.length)],
      timestamp: Date.now()
    }
  };
  
  broadcast(activity);
}

// Start polling
setInterval(pollOpenClawState, POLL_INTERVAL);
setInterval(simulateActivity, 5000);

// Initial poll
pollOpenClawState();

httpServer.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`ClawCraft backend v2 listening on port ${WS_PORT}`);
  console.log(`OpenClaw URL: ${OPENCLAW_URL}`);
  console.log(`Health: http://localhost:${WS_PORT}/health`);
  console.log(`WebSocket: ws://localhost:${WS_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  wss.close();
  httpServer.close();
  process.exit(0);
});
