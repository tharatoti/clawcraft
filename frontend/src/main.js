// ClawCraft - 2D Isometric Command Interface
import { World, COLORS } from './isometric.js';

// Initialize canvas
const canvas = document.getElementById('world');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Create world
const world = new World(canvas);

// Initialize
async function init() {
  await world.init();
  world.startLoop();
  connectWebSocket();
  updateTime();
  
  console.log('ClawCraft ready');
  console.log('Controls: Drag to pan, scroll to zoom, click to select');
}

// WebSocket connection
let ws = null;
const statusEl = document.getElementById('connection-status');

function connectWebSocket() {
  const wsUrl = `ws://${window.location.hostname}:3001`;
  
  try {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      statusEl.textContent = '● CONNECTED';
      statusEl.className = 'status-item connected';
    };
    
    ws.onclose = () => {
      statusEl.textContent = '● OFFLINE';
      statusEl.className = 'status-item';
      setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = () => {
      statusEl.textContent = '● ERROR';
      statusEl.className = 'status-item error';
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        world.updateState(data);
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };
  } catch (e) {
    console.error('WS connection failed:', e);
    setTimeout(connectWebSocket, 3000);
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

// Start
init();
