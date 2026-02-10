import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// LCARS Colors
const COLORS = {
  orange: 0xff9900,
  purple: 0xcc99cc,
  blue: 0x9999ff,
  salmon: 0xff9966,
  gold: 0xffcc66,
  green: 0x00cc00,
  red: 0xcc0000,
  terranBlue: 0x0066cc,
  mineralCyan: 0x00ccff,
  vespeneGreen: 0x00ff66,
  ground: 0x1a1a2e,
  gridLine: 0x2a2a4e
};

// Scene setup
const canvas = document.getElementById('world');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

// Camera - isometric-ish default angle
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(30, 25, 30);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI / 2.2; // Limit vertical rotation

// Lighting
const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1);
mainLight.position.set(20, 30, 10);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 100;
mainLight.shadow.camera.left = -30;
mainLight.shadow.camera.right = 30;
mainLight.shadow.camera.top = 30;
mainLight.shadow.camera.bottom = -30;
scene.add(mainLight);

// Add some colored accent lights
const purpleLight = new THREE.PointLight(COLORS.purple, 0.5, 50);
purpleLight.position.set(-15, 10, -15);
scene.add(purpleLight);

const blueLight = new THREE.PointLight(COLORS.blue, 0.5, 50);
blueLight.position.set(15, 10, 15);
scene.add(blueLight);

// Ground plane with grid
const groundGeometry = new THREE.PlaneGeometry(80, 80);
const groundMaterial = new THREE.MeshStandardMaterial({ 
  color: COLORS.ground,
  roughness: 0.8,
  metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Grid helper
const gridHelper = new THREE.GridHelper(80, 40, COLORS.gridLine, COLORS.gridLine);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// ============================================
// BUILDING MODELS (StarCraft-inspired low-poly)
// ============================================

// Building registry
const buildings = new Map();
const units = new Map();

// Create a basic Command Center (main base)
function createCommandCenter(position = { x: 0, y: 0, z: 0 }) {
  const group = new THREE.Group();
  
  // Main structure - octagonal base
  const baseGeometry = new THREE.CylinderGeometry(4, 4.5, 2, 8);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.terranBlue,
    roughness: 0.4,
    metalness: 0.6
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = 1;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  
  // Upper structure
  const upperGeometry = new THREE.CylinderGeometry(3, 4, 1.5, 8);
  const upperMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.purple,
    roughness: 0.3,
    metalness: 0.7
  });
  const upper = new THREE.Mesh(upperGeometry, upperMaterial);
  upper.position.y = 2.75;
  upper.castShadow = true;
  group.add(upper);
  
  // Control tower
  const towerGeometry = new THREE.CylinderGeometry(1, 1.5, 3, 6);
  const towerMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.salmon,
    roughness: 0.4,
    metalness: 0.5
  });
  const tower = new THREE.Mesh(towerGeometry, towerMaterial);
  tower.position.y = 5;
  tower.castShadow = true;
  group.add(tower);
  
  // Antenna
  const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
  const antennaMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.orange,
    emissive: COLORS.orange,
    emissiveIntensity: 0.5
  });
  const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
  antenna.position.y = 7.5;
  group.add(antenna);
  
  // Status light (pulsing)
  const lightGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.green,
    emissive: COLORS.green,
    emissiveIntensity: 1
  });
  const statusLight = new THREE.Mesh(lightGeometry, lightMaterial);
  statusLight.position.y = 8.5;
  statusLight.userData.pulse = true;
  group.add(statusLight);
  
  group.position.set(position.x, position.y, position.z);
  group.userData = {
    type: 'command-center',
    name: 'OPENCLAW GATEWAY',
    status: 'active',
    statusLight: statusLight
  };
  
  return group;
}

// Create a Barracks (agent spawner)
function createBarracks(position = { x: 0, y: 0, z: 0 }, name = 'BARRACKS') {
  const group = new THREE.Group();
  
  // Main building
  const mainGeometry = new THREE.BoxGeometry(4, 2.5, 5);
  const mainMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.terranBlue,
    roughness: 0.5,
    metalness: 0.5
  });
  const main = new THREE.Mesh(mainGeometry, mainMaterial);
  main.position.y = 1.25;
  main.castShadow = true;
  main.receiveShadow = true;
  group.add(main);
  
  // Roof accent
  const roofGeometry = new THREE.BoxGeometry(4.2, 0.3, 5.2);
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.purple,
    roughness: 0.3,
    metalness: 0.7
  });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = 2.65;
  roof.castShadow = true;
  group.add(roof);
  
  // Door (LCARS style rounded rectangle)
  const doorGeometry = new THREE.BoxGeometry(1.5, 2, 0.1);
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.orange,
    emissive: COLORS.orange,
    emissiveIntensity: 0.3
  });
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(0, 1, 2.5);
  group.add(door);
  
  // Status indicator
  const statusGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.1);
  const statusMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.gold,
    emissive: COLORS.gold,
    emissiveIntensity: 0.8
  });
  const statusIndicator = new THREE.Mesh(statusGeometry, statusMaterial);
  statusIndicator.position.set(1.5, 2.2, 2.5);
  statusIndicator.userData.pulse = true;
  group.add(statusIndicator);
  
  group.position.set(position.x, position.y, position.z);
  group.userData = {
    type: 'barracks',
    name: name,
    status: 'idle',
    statusLight: statusIndicator
  };
  
  return group;
}

// Create a Factory (cron/automation)
function createFactory(position = { x: 0, y: 0, z: 0 }) {
  const group = new THREE.Group();
  
  // Main structure
  const mainGeometry = new THREE.BoxGeometry(6, 3, 4);
  const mainMaterial = new THREE.MeshStandardMaterial({
    color: 0x444466,
    roughness: 0.6,
    metalness: 0.4
  });
  const main = new THREE.Mesh(mainGeometry, mainMaterial);
  main.position.y = 1.5;
  main.castShadow = true;
  main.receiveShadow = true;
  group.add(main);
  
  // Smokestack
  const stackGeometry = new THREE.CylinderGeometry(0.4, 0.5, 2, 8);
  const stackMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.salmon,
    roughness: 0.5,
    metalness: 0.5
  });
  const stack = new THREE.Mesh(stackGeometry, stackMaterial);
  stack.position.set(2, 4, 0);
  stack.castShadow = true;
  group.add(stack);
  
  // Conveyor door
  const conveyorGeometry = new THREE.BoxGeometry(2, 1.5, 0.1);
  const conveyorMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.blue,
    emissive: COLORS.blue,
    emissiveIntensity: 0.3
  });
  const conveyor = new THREE.Mesh(conveyorGeometry, conveyorMaterial);
  conveyor.position.set(0, 0.75, 2);
  group.add(conveyor);
  
  // LCARS trim
  const trimGeometry = new THREE.BoxGeometry(6.2, 0.3, 0.2);
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.purple,
    roughness: 0.3,
    metalness: 0.7
  });
  const trim = new THREE.Mesh(trimGeometry, trimMaterial);
  trim.position.set(0, 3.15, 2);
  group.add(trim);
  
  group.position.set(position.x, position.y, position.z);
  group.userData = {
    type: 'factory',
    name: 'CRON SCHEDULER',
    status: 'active'
  };
  
  return group;
}

// Create an SCV (worker unit)
function createSCV(position = { x: 0, y: 0, z: 0 }, id = 'scv-1') {
  const group = new THREE.Group();
  
  // Body
  const bodyGeometry = new THREE.BoxGeometry(0.8, 1, 0.6);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.gold,
    roughness: 0.4,
    metalness: 0.6
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);
  
  // Head/cockpit
  const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
  const headMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.mineralCyan,
    emissive: COLORS.mineralCyan,
    emissiveIntensity: 0.5
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.2;
  group.add(head);
  
  // Arms (mining tools)
  const armGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
  const armMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666,
    metalness: 0.8
  });
  
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.5, 0.6, 0);
  leftArm.rotation.z = 0.3;
  group.add(leftArm);
  
  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.5, 0.6, 0);
  rightArm.rotation.z = -0.3;
  group.add(rightArm);
  
  group.position.set(position.x, position.y, position.z);
  group.userData = {
    type: 'scv',
    name: id,
    status: 'idle'
  };
  
  return group;
}

// Create Allied Base (e.g., Home Assistant)
function createAlliedBase(position = { x: 0, y: 0, z: 0 }, name = 'ALLY') {
  const group = new THREE.Group();
  
  // Protoss-style pylon base
  const baseGeometry = new THREE.ConeGeometry(3, 1, 6);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x3366cc,
    roughness: 0.3,
    metalness: 0.7
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = 0.5;
  base.rotation.y = Math.PI / 6;
  base.castShadow = true;
  group.add(base);
  
  // Crystal core
  const coreGeometry = new THREE.OctahedronGeometry(1.5, 0);
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.mineralCyan,
    emissive: COLORS.mineralCyan,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.8
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.position.y = 3;
  core.userData.rotate = true;
  group.add(core);
  
  // Energy ring
  const ringGeometry = new THREE.TorusGeometry(2, 0.1, 8, 32);
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.vespeneGreen,
    emissive: COLORS.vespeneGreen,
    emissiveIntensity: 0.5
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.y = 2;
  ring.rotation.x = Math.PI / 2;
  ring.userData.rotate = true;
  group.add(ring);
  
  group.position.set(position.x, position.y, position.z);
  group.userData = {
    type: 'allied-base',
    name: name,
    status: 'connected'
  };
  
  return group;
}

// ============================================
// INITIAL SCENE SETUP
// ============================================

// Command Center (main OpenClaw gateway)
const commandCenter = createCommandCenter({ x: 0, y: 0, z: 0 });
scene.add(commandCenter);
buildings.set('gateway', commandCenter);

// Barracks (agent spawner - Jarvis)
const barracks1 = createBarracks({ x: -10, y: 0, z: 5 }, 'JARVIS AGENT');
scene.add(barracks1);
buildings.set('jarvis', barracks1);

// Factory (cron scheduler)
const factory = createFactory({ x: 10, y: 0, z: 5 });
scene.add(factory);
buildings.set('cron', factory);

// Allied base (Home Assistant)
const homeAssistant = createAlliedBase({ x: -15, y: 0, z: -15 }, 'HOME ASSISTANT');
scene.add(homeAssistant);
buildings.set('home-assistant', homeAssistant);

// Allied base (Alpaca Trading)
const alpaca = createAlliedBase({ x: 15, y: 0, z: -15 }, 'ALPACA TRADING');
scene.add(alpaca);
buildings.set('alpaca', alpaca);

// Some SCVs (background processes)
const scv1 = createSCV({ x: 3, y: 0, z: 8 }, 'exec-001');
scene.add(scv1);
units.set('exec-001', scv1);

const scv2 = createSCV({ x: 5, y: 0, z: 6 }, 'exec-002');
scene.add(scv2);
units.set('exec-002', scv2);

// ============================================
// RAYCASTING (Selection)
// ============================================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  // Get all selectable objects
  const selectables = [...buildings.values(), ...units.values()];
  const intersects = raycaster.intersectObjects(selectables, true);
  
  if (intersects.length > 0) {
    // Find the root group
    let obj = intersects[0].object;
    while (obj.parent && !obj.userData.type) {
      obj = obj.parent;
    }
    
    if (obj.userData.type) {
      selectObject(obj);
    }
  } else {
    closePanel();
  }
}

function selectObject(obj) {
  selectedObject = obj;
  
  const panel = document.getElementById('selection-panel');
  const nameEl = document.getElementById('selected-name');
  const statusEl = document.getElementById('selected-status');
  const infoEl = document.getElementById('selected-info');
  const logEl = document.getElementById('selected-log');
  
  panel.classList.remove('hidden');
  nameEl.textContent = obj.userData.name || 'UNKNOWN';
  statusEl.textContent = obj.userData.status?.toUpperCase() || 'UNKNOWN';
  statusEl.className = `value ${obj.userData.status}`;
  
  // Type-specific info
  let info = '';
  switch (obj.userData.type) {
    case 'command-center':
      info = `<p>Main OpenClaw Gateway process</p><p>Uptime: 14h 32m</p>`;
      break;
    case 'barracks':
      info = `<p>Agent spawner</p><p>Agents spawned: 12</p>`;
      break;
    case 'factory':
      info = `<p>Cron job scheduler</p><p>Active jobs: 3</p>`;
      break;
    case 'allied-base':
      info = `<p>External integration</p><p>Connection: Stable</p>`;
      break;
    case 'scv':
      info = `<p>Background process</p><p>PID: ${Math.floor(Math.random() * 10000)}</p>`;
      break;
  }
  infoEl.innerHTML = info;
  
  // Mock log entries
  logEl.innerHTML = `
    <div class="log-entry"><span class="time">14:32:01</span>Status check completed</div>
    <div class="log-entry"><span class="time">14:31:45</span>Heartbeat received</div>
    <div class="log-entry"><span class="time">14:30:00</span>Initialized</div>
  `;
}

window.closePanel = function() {
  document.getElementById('selection-panel').classList.add('hidden');
  selectedObject = null;
};

canvas.addEventListener('click', onMouseClick);

// ============================================
// ANIMATION LOOP
// ============================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const elapsed = clock.getElapsedTime();
  
  // Update controls
  controls.update();
  
  // Pulse animations
  scene.traverse((obj) => {
    if (obj.userData.pulse) {
      const scale = 1 + Math.sin(elapsed * 3) * 0.2;
      obj.scale.setScalar(scale);
    }
    if (obj.userData.rotate) {
      obj.rotation.y += 0.01;
    }
  });
  
  // Update time display
  const now = new Date();
  document.getElementById('time-display').textContent = 
    now.toLocaleTimeString('en-US', { hour12: false });
  
  renderer.render(scene, camera);
}

// ============================================
// WEBSOCKET CONNECTION
// ============================================

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
      statusEl.textContent = '● DISCONNECTED';
      statusEl.className = 'status-item error';
      // Reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = () => {
      statusEl.textContent = '● ERROR';
      statusEl.className = 'status-item error';
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleStateUpdate(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
  } catch (e) {
    console.error('WebSocket connection failed:', e);
    setTimeout(connectWebSocket, 3000);
  }
}

function handleStateUpdate(data) {
  // Update resource counters
  if (data.tokens !== undefined) {
    document.getElementById('token-count').textContent = data.tokens.toLocaleString();
  }
  if (data.agents !== undefined) {
    document.getElementById('agent-count').textContent = data.agents;
  }
  if (data.processes !== undefined) {
    document.getElementById('process-count').textContent = data.processes;
  }
  
  // Update building statuses
  if (data.buildings) {
    for (const [id, status] of Object.entries(data.buildings)) {
      const building = buildings.get(id);
      if (building) {
        building.userData.status = status;
        // Update status light color
        if (building.userData.statusLight) {
          const color = status === 'active' ? COLORS.green : 
                        status === 'error' ? COLORS.red : COLORS.gold;
          building.userData.statusLight.material.color.setHex(color);
          building.userData.statusLight.material.emissive.setHex(color);
        }
      }
    }
  }
}

// ============================================
// RESIZE HANDLER
// ============================================

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================
// INIT
// ============================================

animate();
connectWebSocket();

console.log('ClawCraft initialized');
console.log('Controls: Left-click drag to rotate, right-click drag to pan, scroll to zoom');
