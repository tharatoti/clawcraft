import { WebSocketServer } from 'ws';
import http from 'http';
import { PERSONA_CHANNELS, CASUAL_CONVERSATIONS_CHANNEL, queueDiscordMessage, getPendingMessages } from './discord-channels.js';

const WS_PORT = process.env.WS_PORT || 3001;
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:4444';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '2000');

// Conversation memory - stores past conversations between persona pairs
const conversationMemory = new Map();

// Persona positions - tracked server-side for persistence across client refreshes
const personaPositions = new Map();

// Initialize persona positions (scattered WIDELY across the map)
function initializePersonaPositions() {
  const personas = [
    'hormozi', 'robbins', 'kennedy', 'abraham', 'halbert',
    'goggins', 'rosenberg', 'naval', 'franklin', 'lewis',
    'musk', 'mises', 'adams', 'munger', 'aurelius', 'feynman', 'dalio'
  ];
  
  // Passable area bounds (must match frontend)
  const minX = 8, maxX = 47;
  const minY = 8, maxY = 47;
  
  // Spawn scattered across the entire passable area
  personas.forEach((id, i) => {
    // Use golden angle for even distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const angle = i * goldenAngle;
    const radius = 12 + (i / personas.length) * 8;
    
    // Center of passable area
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    let x = centerX + Math.cos(angle) * radius;
    let y = centerY + Math.sin(angle) * radius;
    
    // Add randomness
    x += (Math.random() - 0.5) * 10;
    y += (Math.random() - 0.5) * 10;
    
    // Clamp to bounds
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));
    
    personaPositions.set(id, {
      gridX: x,
      gridY: y,
      targetX: null,
      targetY: null,
      status: 'idle',
      lastUpdate: Date.now()
    });
    
    console.log(`  ${id}: (${x.toFixed(1)}, ${y.toFixed(1)})`);
  });
  
  console.log(`Initialized ${personaPositions.size} persona positions`);
}

// Update persona position from client
function updatePersonaPosition(id, x, y, targetX, targetY, status) {
  const pos = personaPositions.get(id);
  if (pos) {
    pos.gridX = x;
    pos.gridY = y;
    pos.targetX = targetX;
    pos.targetY = targetY;
    pos.status = status;
    pos.lastUpdate = Date.now();
  }
}

// Get all persona positions
function getPersonaPositions() {
  const positions = {};
  for (const [id, pos] of personaPositions) {
    positions[id] = { ...pos };
  }
  return positions;
}

initializePersonaPositions();

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
  adams: "You are Scott Adams. Respond as him - systems thinker, persuasion expert, Dilbert creator, contrarian takes.",
  munger: "You are Charlie Munger. Respond as him - curmudgeonly wit, mental models, 'invert always invert', references to stupidity and incentives.",
  aurelius: "You are Marcus Aurelius. Respond as him - Stoic philosopher, speak in contemplative second-person, reference the dichotomy of control, impermanence, and virtue.",
  feynman: "You are Richard Feynman. Respond as him - playful curiosity, Brooklyn accent feel, 'See the thing is...', explain complex things simply, love of discovery.",
  dalio: "You are Ray Dalio. Respond as him - systematic thinker, 'pain plus reflection equals progress', radical transparency, principles-based, calm and measured."
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
  
  // Conversation API - generate dialogue between two personas
  if (req.url === '/api/conversation' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { persona1Id, persona2Id, persona1Name, persona2Name, persona1Role, persona2Role, memoryContext } = JSON.parse(body);
        
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error('OPENROUTER_API_KEY not configured');
        }
        
        const memoryPrompt = memoryContext ? `\n${memoryContext}` : '';
        
        const prompt = `You are generating a brief, natural conversation between two famous thinkers who cross paths.

${persona1Name} (${persona1Role}): ${PERSONA_PROMPTS[persona1Id] || 'A thoughtful advisor.'}

${persona2Name} (${persona2Role}): ${PERSONA_PROMPTS[persona2Id] || 'A thoughtful advisor.'}${memoryPrompt}

Generate a short 4-turn conversation where they greet each other, share one insight each, and part ways. Each turn should be 1-2 sentences. They should stay in character. ${memoryContext ? 'Reference or build on their previous conversation.' : ''}

Format as JSON array:
[
  {"speaker": "${persona1Id}", "text": "..."},
  {"speaker": "${persona2Id}", "text": "..."},
  {"speaker": "${persona1Id}", "text": "..."},
  {"speaker": "${persona2Id}", "text": "..."}
]

Only output the JSON array, nothing else.`;

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
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 400,
            temperature: 0.9
          }),
          signal: AbortSignal.timeout(45000)
        });
        
        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim() || '[]';
          
          // Parse the JSON conversation
          let conversation;
          try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            conversation = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
          } catch (e) {
            console.error('Failed to parse conversation JSON:', content);
            conversation = [];
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(conversation));
        } else {
          throw new Error('OpenRouter conversation error');
        }
      } catch (e) {
        console.error('Conversation error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
    });
    return;
  }
  
  // Discord posting API - Queue messages for gateway to post
  if (req.url === '/api/discord/post' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { channelId, message, personaId } = JSON.parse(body);
        
        // Use persona channel if personaId provided
        const targetChannel = personaId ? PERSONA_CHANNELS[personaId] : channelId;
        
        queueDiscordMessage(targetChannel || CASUAL_CONVERSATIONS_CHANNEL, message, personaId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, queued: true }));
      } catch (e) {
        console.error('Discord post error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  // Get pending Discord messages (for gateway polling)
  if (req.url === '/api/discord/pending' && req.method === 'GET') {
    const messages = getPendingMessages();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(messages));
    return;
  }
  
  // Log user chat session to Discord
  if (req.url === '/api/chat/log' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { personaId, personaName, messages } = JSON.parse(body);
        
        if (!messages || messages.length === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, skipped: true }));
          return;
        }
        
        // Format chat log
        const transcript = messages.map(m => {
          const sender = m.role === 'user' ? '**You**' : `**${personaName}**`;
          return `${sender}: ${m.content}`;
        }).join('\n\n');
        
        const header = `💬 **Chat Session with ${personaName}** (${new Date().toLocaleString()})\n\n`;
        const fullMessage = header + transcript;
        
        // Queue for persona's channel
        const channelId = PERSONA_CHANNELS[personaId];
        if (channelId) {
          queueDiscordMessage(channelId, fullMessage, personaId);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error('Chat log error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  // Conversation memory - store and retrieve past conversations
  if (req.url === '/api/memory/conversations' && req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pairKey = url.searchParams.get('pair');
    
    const history = conversationMemory.get(pairKey) || [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(history));
    return;
  }
  
  if (req.url === '/api/memory/conversations' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { pairKey, conversation, participants } = JSON.parse(body);
        
        const history = conversationMemory.get(pairKey) || [];
        history.push({
          timestamp: Date.now(),
          participants,
          conversation: conversation.slice(0, 4) // Keep only first 4 turns for summary
        });
        
        // Keep only last 5 conversations
        while (history.length > 5) history.shift();
        
        conversationMemory.set(pairKey, history);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  // Get persona positions (for initial sync)
  if (req.url === '/api/personas/positions' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getPersonaPositions()));
    return;
  }
  
  // Reset all stuck personas to idle
  if (req.url === '/api/personas/reset' && req.method === 'POST') {
    let count = 0;
    for (const [id, pos] of personaPositions) {
      if (pos.status === 'talking' || pos.status === 'chatting') {
        pos.status = 'idle';
        count++;
      }
    }
    console.log(`Reset ${count} stuck personas to idle`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reset: count }));
    return;
  }
  
  // Scatter all personas to random positions AND broadcast to all clients
  if (req.url === '/api/personas/scatter' && req.method === 'POST') {
    const minX = 8, maxX = 47, minY = 8, maxY = 47;
    for (const [id, pos] of personaPositions) {
      pos.gridX = minX + Math.random() * (maxX - minX);
      pos.gridY = minY + Math.random() * (maxY - minY);
      pos.targetX = null;
      pos.targetY = null;
      pos.status = 'idle';
    }
    console.log('Scattered all personas - broadcasting to clients');
    
    // Broadcast new positions to ALL connected clients
    broadcast({ type: 'forcePositions', payload: getPersonaPositions() });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ scattered: personaPositions.size }));
    return;
  }
  
  // Update persona position (batch updates from clients)
  if (req.url === '/api/personas/positions' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const updates = JSON.parse(body);
        
        // Apply position updates
        for (const [id, pos] of Object.entries(updates)) {
          updatePersonaPosition(id, pos.gridX, pos.gridY, pos.targetX, pos.targetY, pos.status);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
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
  
  // Send persona positions
  ws.send(JSON.stringify({ type: 'personaPositions', payload: getPersonaPositions() }));
  
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
    case 'personaUpdate':
      // Update server-side position from client
      const { id, gridX, gridY, targetX, targetY, status } = data.payload;
      updatePersonaPosition(id, gridX, gridY, targetX, targetY, status);
      break;
    case 'personaBatchUpdate':
      // Batch update from primary client
      for (const [id, pos] of Object.entries(data.payload)) {
        updatePersonaPosition(id, pos.gridX, pos.gridY, pos.targetX, pos.targetY, pos.status);
      }
      // Broadcast to other clients
      broadcastExcept(ws, { type: 'personaPositions', payload: getPersonaPositions() });
      break;
  }
}

function broadcastExcept(excludeWs, data) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client !== excludeWs && client.readyState === 1) {
      client.send(message);
    }
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
