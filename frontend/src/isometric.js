// ClawCraft 2D Isometric Engine
// Fast canvas-based rendering with sprite assets

// LCARS Colors
const COLORS = {
  orange: '#ff9900',
  purple: '#cc99cc',
  blue: '#9999ff',
  salmon: '#ff9966',
  gold: '#ffcc66',
  green: '#00cc00',
  red: '#cc0000',
  bg: '#0a0a1a',
  grid: '#1a1a3a'
};

// Isometric projection helpers
const ISO = {
  // Tile size (base of isometric diamond)
  tileWidth: 128,
  tileHeight: 64,
  
  // Convert grid coordinates to screen coordinates
  toScreen(gridX, gridY) {
    return {
      x: (gridX - gridY) * (this.tileWidth / 2),
      y: (gridX + gridY) * (this.tileHeight / 2)
    };
  },
  
  // Convert screen coordinates to grid coordinates
  toGrid(screenX, screenY) {
    return {
      x: Math.floor((screenX / (this.tileWidth / 2) + screenY / (this.tileHeight / 2)) / 2),
      y: Math.floor((screenY / (this.tileHeight / 2) - screenX / (this.tileWidth / 2)) / 2)
    };
  }
};

// Asset loader
class AssetLoader {
  constructor() {
    this.images = new Map();
    this.loaded = 0;
    this.total = 0;
  }
  
  async load(assets) {
    this.total = Object.keys(assets).length;
    const promises = [];
    
    for (const [name, path] of Object.entries(assets)) {
      const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.images.set(name, img);
          this.loaded++;
          resolve();
        };
        img.onerror = reject;
        img.src = path;
      });
      promises.push(promise);
    }
    
    await Promise.all(promises);
    return this.images;
  }
  
  get(name) {
    return this.images.get(name);
  }
}

// Building definitions
const BUILDING_DEFS = {
  'command-center': {
    name: 'OPENCLAW GATEWAY',
    sprite: 'hq',
    gridSize: 2,
    offsetY: -80 // Sprite anchor adjustment
  },
  'barracks': {
    name: 'AGENT SPAWNER',
    sprite: 'barracks',
    gridSize: 1,
    offsetY: -40
  },
  'factory': {
    name: 'CRON SCHEDULER',
    sprite: 'manufactory',
    gridSize: 2,
    offsetY: -100
  },
  'powerplant': {
    name: 'TOKEN SUPPLY',
    sprite: 'powerplant',
    gridSize: 1,
    offsetY: -60
  },
  'extraction': {
    name: 'DATA MINER',
    sprite: 'extraction',
    gridSize: 2,
    offsetY: -80
  },
  'lab': {
    name: 'TECH LAB',
    sprite: 'lab',
    gridSize: 1,
    offsetY: -80
  },
  'defense': {
    name: 'SECURITY',
    sprite: 'defense',
    gridSize: 1,
    offsetY: -40
  }
};

// Game world
class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = new AssetLoader();
    
    // Camera
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1,
      targetZoom: 1
    };
    
    // Buildings and units
    this.entities = [];
    this.selectedEntity = null;
    
    // Grid
    this.gridWidth = 20;
    this.gridHeight = 20;
    
    // State from backend
    this.state = {
      tokens: 0,
      agents: 0,
      processes: 0
    };
    
    // Input
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    
    this.setupInput();
  }
  
  async init() {
    // Load all building sprites
    const assetPaths = {
      'hq': '/assets/buildings/orange hq01.png',
      'barracks': '/assets/buildings/orangebarracks01.png',
      'manufactory': '/assets/buildings/manufactory01.png',
      'powerplant': '/assets/buildings/Orange Powerplant01.png',
      'extraction': '/assets/buildings/orange extraction rig01.png',
      'lab': '/assets/buildings/orangelab01_0.png',
      'defense': '/assets/buildings/orange defense turret 01.png',
      'defense-base': '/assets/buildings/orange defense base.png'
    };
    
    await this.assets.load(assetPaths);
    
    // Center camera on grid
    this.camera.x = this.canvas.width / 2;
    this.camera.y = 100;
    
    // Create initial buildings
    this.createBuilding('command-center', 5, 5, { id: 'gateway', status: 'active' });
    this.createBuilding('barracks', 3, 7, { id: 'jarvis', name: 'JARVIS AGENT', status: 'idle' });
    this.createBuilding('factory', 7, 3, { id: 'cron', status: 'active' });
    this.createBuilding('powerplant', 2, 4, { id: 'tokens', status: 'active' });
    this.createBuilding('extraction', 8, 7, { id: 'ha', name: 'HOME ASSISTANT', status: 'connected' });
    this.createBuilding('lab', 4, 2, { id: 'alpaca', name: 'ALPACA TRADING', status: 'connected' });
    
    console.log('ClawCraft 2D initialized');
  }
  
  createBuilding(type, gridX, gridY, data = {}) {
    const def = BUILDING_DEFS[type];
    if (!def) return null;
    
    const entity = {
      type: 'building',
      buildingType: type,
      gridX,
      gridY,
      def,
      data: {
        id: data.id || type,
        name: data.name || def.name,
        status: data.status || 'idle',
        ...data
      }
    };
    
    this.entities.push(entity);
    return entity;
  }
  
  setupInput() {
    // Pan with mouse drag
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.camera.x += dx;
        this.camera.y += dy;
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });
    
    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });
    
    // Zoom with scroll
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      this.camera.targetZoom = Math.max(0.3, Math.min(2, this.camera.targetZoom * zoomDelta));
    });
    
    // Select with click
    this.canvas.addEventListener('click', (e) => {
      if (this.isDragging) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const screenX = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
      const screenY = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;
      
      // Find clicked entity
      let clicked = null;
      for (const entity of this.entities) {
        if (this.isPointInEntity(screenX, screenY, entity)) {
          clicked = entity;
        }
      }
      
      this.selectEntity(clicked);
    });
    
    // Prevent context menu
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  isPointInEntity(screenX, screenY, entity) {
    const pos = ISO.toScreen(entity.gridX, entity.gridY);
    const sprite = this.assets.get(entity.def.sprite);
    if (!sprite) return false;
    
    const width = sprite.width * 0.5;
    const height = sprite.height * 0.5;
    const x = pos.x - width / 2;
    const y = pos.y + entity.def.offsetY;
    
    return screenX >= x && screenX <= x + width &&
           screenY >= y && screenY <= y + height;
  }
  
  selectEntity(entity) {
    this.selectedEntity = entity;
    
    const panel = document.getElementById('selection-panel');
    if (!entity) {
      panel.classList.add('hidden');
      return;
    }
    
    panel.classList.remove('hidden');
    document.getElementById('selected-name').textContent = entity.data.name;
    document.getElementById('selected-status').textContent = entity.data.status.toUpperCase();
    document.getElementById('selected-status').className = `value ${entity.data.status}`;
    
    // Update info based on type
    let info = '';
    switch (entity.buildingType) {
      case 'command-center':
        info = `<p>Main OpenClaw Gateway</p><p>Uptime: 14h 32m</p><p>Sessions: ${this.state.agents}</p>`;
        break;
      case 'barracks':
        info = `<p>Agent spawner</p><p>Active: ${this.state.agents}</p>`;
        break;
      case 'factory':
        info = `<p>Cron scheduler</p><p>Jobs: 3 active</p>`;
        break;
      case 'extraction':
        info = `<p>External integration</p><p>Entities: 147</p>`;
        break;
      default:
        info = `<p>${entity.def.name}</p>`;
    }
    document.getElementById('selected-info').innerHTML = info;
  }
  
  updateState(newState) {
    Object.assign(this.state, newState);
    
    // Update resource display
    document.getElementById('token-count').textContent = this.state.tokens.toLocaleString();
    document.getElementById('agent-count').textContent = this.state.agents;
    document.getElementById('process-count').textContent = this.state.processes;
    
    // Update building statuses
    if (newState.buildings) {
      for (const entity of this.entities) {
        if (newState.buildings[entity.data.id]) {
          entity.data.status = newState.buildings[entity.data.id];
        }
      }
    }
  }
  
  render() {
    const { ctx, canvas, camera } = this;
    
    // Smooth zoom
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.1;
    
    // Clear
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    
    // Draw grid
    this.renderGrid();
    
    // Sort entities by Y position for proper overlap
    const sorted = [...this.entities].sort((a, b) => {
      return (a.gridX + a.gridY) - (b.gridX + b.gridY);
    });
    
    // Draw entities
    for (const entity of sorted) {
      this.renderEntity(entity);
    }
    
    ctx.restore();
    
    // Draw minimap
    this.renderMinimap();
  }
  
  renderGrid() {
    const { ctx } = this;
    
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= this.gridWidth; x++) {
      for (let y = 0; y <= this.gridHeight; y++) {
        const pos = ISO.toScreen(x, y);
        
        // Draw diamond tile outline
        if (x < this.gridWidth && y < this.gridHeight) {
          const p1 = ISO.toScreen(x, y);
          const p2 = ISO.toScreen(x + 1, y);
          const p3 = ISO.toScreen(x + 1, y + 1);
          const p4 = ISO.toScreen(x, y + 1);
          
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
  }
  
  renderEntity(entity) {
    const { ctx } = this;
    const pos = ISO.toScreen(entity.gridX, entity.gridY);
    const sprite = this.assets.get(entity.def.sprite);
    
    if (!sprite) return;
    
    // Scale sprite to fit tile
    const scale = 0.5;
    const width = sprite.width * scale;
    const height = sprite.height * scale;
    
    // Center on tile
    const x = pos.x - width / 2;
    const y = pos.y + entity.def.offsetY;
    
    // Selection highlight
    if (entity === this.selectedEntity) {
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
    }
    
    // Status glow
    if (entity.data.status === 'active') {
      ctx.shadowColor = COLORS.green;
      ctx.shadowBlur = 15;
    } else if (entity.data.status === 'error') {
      ctx.shadowColor = COLORS.red;
      ctx.shadowBlur = 20;
    }
    
    // Draw sprite
    ctx.drawImage(sprite, x, y, width, height);
    
    ctx.shadowBlur = 0;
    
    // Status indicator
    const indicatorX = x + width - 15;
    const indicatorY = y + 10;
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 6, 0, Math.PI * 2);
    ctx.fillStyle = entity.data.status === 'active' ? COLORS.green :
                    entity.data.status === 'connected' ? COLORS.blue :
                    entity.data.status === 'error' ? COLORS.red : COLORS.gold;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Name label
    ctx.fillStyle = COLORS.orange;
    ctx.font = 'bold 11px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(entity.data.name, pos.x, y + height + 15);
  }
  
  renderMinimap() {
    const minimapCanvas = document.getElementById('minimap-canvas');
    const mctx = minimapCanvas.getContext('2d');
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;
    
    // Clear
    mctx.fillStyle = 'rgba(0, 20, 40, 0.9)';
    mctx.fillRect(0, 0, mw, mh);
    
    // Scale to fit grid
    const scale = Math.min(mw / (this.gridWidth * 10), mh / (this.gridHeight * 8));
    
    mctx.save();
    mctx.translate(mw / 2, 20);
    mctx.scale(scale, scale);
    
    // Draw entities as dots
    for (const entity of this.entities) {
      const pos = ISO.toScreen(entity.gridX, entity.gridY);
      mctx.fillStyle = entity.data.status === 'active' ? COLORS.green :
                       entity.data.status === 'connected' ? COLORS.blue : COLORS.gold;
      mctx.beginPath();
      mctx.arc(pos.x / 10, pos.y / 10, 4, 0, Math.PI * 2);
      mctx.fill();
    }
    
    // Camera viewport indicator
    const vpX = -this.camera.x / this.camera.zoom / 10;
    const vpY = -this.camera.y / this.camera.zoom / 10;
    const vpW = this.canvas.width / this.camera.zoom / 10;
    const vpH = this.canvas.height / this.camera.zoom / 10;
    
    mctx.strokeStyle = COLORS.orange;
    mctx.lineWidth = 2;
    mctx.strokeRect(vpX, vpY, vpW, vpH);
    
    mctx.restore();
  }
  
  startLoop() {
    const loop = () => {
      this.render();
      requestAnimationFrame(loop);
    };
    loop();
  }
}

// Export
export { World, COLORS, ISO };
