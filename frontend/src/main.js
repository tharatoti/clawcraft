// ClawCraft v2 - 2D Isometric Command Interface
import { World, THEMES } from './isometric.js';
import { initChat } from './chat.js';

// Initialize canvas
const canvas = document.getElementById('world');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Create world
const world = new World(canvas);

// Theme selector
function createThemeSelector() {
  const container = document.createElement('div');
  container.id = 'theme-selector';
  container.innerHTML = `
    <label>THEME:</label>
    <select id="theme-select">
      ${Object.entries(THEMES).map(([id, theme]) => 
        `<option value="${id}">${theme.name}</option>`
      ).join('')}
    </select>
  `;
  document.getElementById('lcars-overlay').appendChild(container);
  
  document.getElementById('theme-select').addEventListener('change', async (e) => {
    await world.setTheme(e.target.value);
  });
}

// Fetch initial persona positions from server before starting
async function fetchInitialPositions() {
  try {
    const res = await fetch('/api/personas/positions');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Could not fetch persona positions, using defaults');
  }
  return null;
}

// Initialize
async function init() {
  // Get server-side persona positions first
  const positions = await fetchInitialPositions();
  
  await world.init(positions);
  world.startLoop();
  createThemeSelector();
  connectWebSocket();
  updateTime();
  initChat(); // Initialize persona chat system
  
  console.log('ClawCraft v2 ready');
  console.log('Controls: Drag to pan, scroll to zoom, click to select');
  console.log('Click on a persona to chat with them!');
  console.log('Themes: Switch between Orange Sci-Fi, C&C, and StarCraft');
}

// WebSocket connection with real OpenClaw state
let ws = null;
let reconnectAttempts = 0;
const statusEl = document.getElementById('connection-status');

function connectWebSocket() {
  const wsUrl = `ws://${window.location.hostname}:3001`;
  
  try {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      statusEl.textContent = '● CONNECTED';
      statusEl.className = 'status-item connected';
      reconnectAttempts = 0;
      
      // Set WS on world for position syncing
      world.setWebSocket(ws);
      
      // Request full state
      ws.send(JSON.stringify({ type: 'subscribe', channels: ['state', 'sessions', 'processes'] }));
    };
    
    ws.onclose = () => {
      statusEl.textContent = '● OFFLINE';
      statusEl.className = 'status-item';
      
      // Exponential backoff reconnect
      const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
      reconnectAttempts++;
      setTimeout(connectWebSocket, delay);
    };
    
    ws.onerror = () => {
      statusEl.textContent = '● ERROR';
      statusEl.className = 'status-item error';
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };
  } catch (e) {
    console.error('WS connection failed:', e);
    setTimeout(connectWebSocket, 3000);
  }
}

function handleMessage(data) {
  switch (data.type) {
    case 'state':
      world.updateState(data.payload);
      break;
    case 'personaPositions':
      // Sync persona positions from server (for non-primary clients)
      world.syncPersonaPositions(data.payload);
      break;
    case 'forcePositions':
      // Admin command - force all clients to use these positions
      console.log('🔄 Received force position update from server');
      world.forcePersonaPositions(data.payload);
      break;
    case 'session_update':
      updateSessionBuilding(data.payload);
      break;
    case 'process_update':
      updateProcessUnits(data.payload);
      break;
    case 'activity':
      addActivityLog(data.payload);
      break;
    default:
      // Legacy format - direct state update
      world.updateState(data);
  }
}

function updateSessionBuilding(session) {
  // Update session-related buildings based on activity
  const building = world.buildings.get(session.id);
  if (building) {
    building.data.status = session.active ? 'active' : 'idle';
  }
}

function updateProcessUnits(process) {
  // Could spawn/despawn SCV units for processes
  console.log('Process update:', process);
}

function addActivityLog(activity) {
  const logEl = document.getElementById('selected-log');
  if (logEl && world.selectedEntity) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="time">${time}</span>${activity.message}`;
    logEl.insertBefore(entry, logEl.firstChild);
    
    // Keep only last 20 entries
    while (logEl.children.length > 20) {
      logEl.removeChild(logEl.lastChild);
    }
  }
}

// Time display
function updateTime() {
  const now = new Date();
  document.getElementById('time-display').textContent = 
    now.toLocaleTimeString('en-US', { hour12: false });
  setTimeout(updateTime, 1000);
}

// Close panel helper
window.closePanel = function() {
  document.getElementById('selection-panel').classList.add('hidden');
  world.selectedEntity = null;
};

// Handle resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case '1':
      world.setTheme('orange-scifi');
      document.getElementById('theme-select').value = 'orange-scifi';
      break;
    case '2':
      world.setTheme('cnc');
      document.getElementById('theme-select').value = 'cnc';
      break;
    case '3':
      world.setTheme('starcraft');
      document.getElementById('theme-select').value = 'starcraft';
      break;
    case 'Escape':
      closePanel();
      break;
  }
});

// Start
init();
