// ClawCraft 2D Isometric Engine v2
// Expanded with pipelines, services, animated units, and theme support

// Theme definitions
const THEMES = {
  'orange-scifi': {
    name: 'Orange Sci-Fi',
    colors: {
      orange: '#ff9900',
      purple: '#cc99cc',
      blue: '#9999ff',
      salmon: '#ff9966',
      gold: '#ffcc66',
      green: '#00cc00',
      red: '#cc0000',
      bg: '#0a0a1a',
      grid: '#1a1a3a',
      pipeline: '#ff990066',
      pipelineActive: '#00cc0088'
    },
    buildings: {
      'command-center': { sprite: 'hq', offsetY: -80 },
      'barracks': { sprite: 'barracks', offsetY: -40 },
      'factory': { sprite: 'manufactory', offsetY: -100 },
      'powerplant': { sprite: 'powerplant', offsetY: -60 },
      'extraction': { sprite: 'extraction', offsetY: -80 },
      'lab': { sprite: 'lab', offsetY: -80 },
      'defense': { sprite: 'defense', offsetY: -40 }
    },
    assetPath: '/assets/buildings/'
  },
  'cnc': {
    name: 'Command & Conquer',
    colors: {
      orange: '#d4a017',
      purple: '#8b4513',
      blue: '#4169e1',
      salmon: '#cd853f',
      gold: '#ffd700',
      green: '#228b22',
      red: '#dc143c',
      bg: '#1a1a0a',
      grid: '#2a2a1a',
      pipeline: '#d4a01766',
      pipelineActive: '#228b2288'
    },
    buildings: {
      'command-center': { sprite: 'cnc-construction-yard', offsetY: -30 },
      'barracks': { sprite: 'cnc-barracks', offsetY: -60 },
      'factory': { sprite: 'cnc-war-factory', offsetY: -30 },
      'powerplant': { sprite: 'cnc-power-plant', offsetY: -20 },
      'extraction': { sprite: 'cnc-refinery', offsetY: -30 },
      'lab': { sprite: 'cnc-power-plant', offsetY: -20 },
      'defense': { sprite: 'cnc-barracks', offsetY: -60 }
    },
    assetPath: '/assets/cnc/'
  },
  'starcraft': {
    name: 'StarCraft Terran',
    colors: {
      orange: '#ff6600',
      purple: '#6633cc',
      blue: '#3399ff',
      salmon: '#ff6666',
      gold: '#ffcc00',
      green: '#33cc33',
      red: '#ff3333',
      bg: '#0a0a15',
      grid: '#1a1a2a',
      pipeline: '#3399ff44',
      pipelineActive: '#33cc3388'
    },
    buildings: {
      'command-center': { sprite: 'sc-command-center', offsetY: -60 },
      'barracks': { sprite: 'sc-barracks', offsetY: -200 },
      'factory': { sprite: 'sc-factory', offsetY: -40 },
      'powerplant': { sprite: 'sc-supply-depot', offsetY: -30 },
      'extraction': { sprite: 'sc-refinery', offsetY: -60 },
      'lab': { sprite: 'sc-science-facility', offsetY: -100 },
      'defense': { sprite: 'sc-bunker', offsetY: -30 }
    },
    assetPath: '/assets/starcraft/'
  }
};

// Isometric projection
const ISO = {
  tileWidth: 128,
  tileHeight: 64,
  
  toScreen(gridX, gridY) {
    return {
      x: (gridX - gridY) * (this.tileWidth / 2),
      y: (gridX + gridY) * (this.tileHeight / 2)
    };
  },
  
  toGrid(screenX, screenY) {
    return {
      x: Math.floor((screenX / (this.tileWidth / 2) + screenY / (this.tileHeight / 2)) / 2),
      y: Math.floor((screenY / (this.tileHeight / 2) - screenX / (this.tileWidth / 2)) / 2)
    };
  }
};

// Asset loader with theme support
class AssetLoader {
  constructor() {
    this.images = new Map();
    this.loadedThemes = new Set();
  }
  
  async loadTheme(themeName) {
    if (this.loadedThemes.has(themeName)) return;
    
    const theme = THEMES[themeName];
    if (!theme) return;
    
    const assets = {};
    for (const [type, config] of Object.entries(theme.buildings)) {
      assets[config.sprite] = `${theme.assetPath}${config.sprite}.png`;
    }
    
    // Special case for orange-scifi (different naming)
    if (themeName === 'orange-scifi') {
      assets['hq'] = '/assets/buildings/orange hq01.png';
      assets['barracks'] = '/assets/buildings/orangebarracks01.png';
      assets['manufactory'] = '/assets/buildings/manufactory01.png';
      assets['powerplant'] = '/assets/buildings/Orange Powerplant01.png';
      assets['extraction'] = '/assets/buildings/orange extraction rig01.png';
      assets['lab'] = '/assets/buildings/orangelab01_0.png';
      assets['defense'] = '/assets/buildings/orange defense turret 01.png';
    }
    
    // C&C theme - use extracted single-frame buildings
    if (themeName === 'cnc') {
      assets['cnc-construction-yard'] = '/assets/cnc/buildings/construction-yard.png';
      assets['cnc-barracks'] = '/assets/cnc/buildings/barracks.png';
      assets['cnc-war-factory'] = '/assets/cnc/buildings/war-factory.png';
      assets['cnc-power-plant'] = '/assets/cnc/buildings/power-plant.png';
      assets['cnc-refinery'] = '/assets/cnc/buildings/refinery.png';
    }
    
    // StarCraft theme - use extracted single-frame buildings
    if (themeName === 'starcraft') {
      assets['sc-command-center'] = '/assets/starcraft/buildings/command-center.png';
      assets['sc-barracks'] = '/assets/starcraft/buildings/barracks.png';
      assets['sc-factory'] = '/assets/starcraft/buildings/factory.png';
      assets['sc-supply-depot'] = '/assets/starcraft/buildings/supply-depot.png';
      assets['sc-refinery'] = '/assets/starcraft/buildings/refinery.png';
      assets['sc-science-facility'] = '/assets/starcraft/buildings/science-facility.png';
      assets['sc-bunker'] = '/assets/starcraft/buildings/bunker.png';
    }
    
    await this.load(assets);
    this.loadedThemes.add(themeName);
  }
  
  async load(assets) {
    const promises = [];
    
    for (const [name, path] of Object.entries(assets)) {
      if (this.images.has(name)) continue;
      
      const promise = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.images.set(name, img);
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load: ${path}`);
          resolve();
        };
        img.src = path;
      });
      promises.push(promise);
    }
    
    await Promise.all(promises);
  }
  
  get(name) {
    return this.images.get(name);
  }
}

// Building definitions (shared across themes)
const BUILDING_DEFS = {
  'command-center': { name: 'OPENCLAW GATEWAY', gridSize: 2, category: 'core' },
  'barracks': { name: 'AGENT SPAWNER', gridSize: 1, category: 'agents' },
  'factory': { name: 'CRON SCHEDULER', gridSize: 2, category: 'automation' },
  'powerplant': { name: 'TOKEN SUPPLY', gridSize: 1, category: 'resources' },
  'extraction': { name: 'DATA SOURCE', gridSize: 2, category: 'integration' },
  'lab': { name: 'SERVICE', gridSize: 1, category: 'service' },
  'defense': { name: 'SECURITY', gridSize: 1, category: 'security' }
};

// Animated unit (for personas)
class AnimatedUnit {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.gridX = config.gridX;
    this.gridY = config.gridY;
    this.targetX = config.gridX;
    this.targetY = config.gridY;
    this.color = config.color || '#ff9900';
    this.status = 'idle'; // idle, walking, working
    this.frame = 0;
    this.frameTime = 0;
    this.speed = 0.02;
    this.data = config.data || {};
  }
  
  update(dt) {
    this.frameTime += dt;
    if (this.frameTime > 200) {
      this.frame = (this.frame + 1) % 4;
      this.frameTime = 0;
    }
    
    // Move toward target
    const dx = this.targetX - this.gridX;
    const dy = this.targetY - this.gridY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0.1) {
      this.status = 'walking';
      this.gridX += (dx / dist) * this.speed;
      this.gridY += (dy / dist) * this.speed;
    } else {
      this.status = 'idle';
    }
  }
  
  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  }
  
  wander(centerX, centerY, radius) {
    if (this.status === 'idle' && Math.random() < 0.01) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      this.setTarget(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r);
    }
  }
}

// Pipeline connection
class Pipeline {
  constructor(from, to, type = 'data') {
    this.from = from; // entity id
    this.to = to;     // entity id
    this.type = type; // data, control, resource
    this.active = false;
    this.flowOffset = 0;
  }
}

// Game world
class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = new AssetLoader();
    
    // Theme
    this.currentTheme = 'orange-scifi';
    this.theme = THEMES[this.currentTheme];
    
    // Camera
    this.camera = {
      x: 0,
      y: 0,
      zoom: 0.7,
      targetZoom: 0.7
    };
    
    // Entities
    this.buildings = new Map();
    this.units = new Map();
    this.pipelines = [];
    this.selectedEntity = null;
    
    // Grid (larger for more space)
    this.gridWidth = 40;
    this.gridHeight = 40;
    
    // State
    this.state = {
      tokens: 0,
      agents: 0,
      processes: 0,
      sessions: [],
      cronJobs: []
    };
    
    // Animation
    this.lastTime = 0;
    
    // Input
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    
    this.setupInput();
  }
  
  async init() {
    await this.assets.loadTheme(this.currentTheme);
    
    // Center camera
    this.camera.x = this.canvas.width / 2;
    this.camera.y = -200;
    
    // Create base layout with more spacing
    this.createBaseLayout();
    
    // Create pipelines
    this.createPipelines();
    
    // Create mastermind personas
    this.createMastermindPersonas();
    
    console.log('ClawCraft v2 initialized');
  }
  
  createBaseLayout() {
    // Core - Command Center (Gateway)
    this.createBuilding('command-center', 15, 15, {
      id: 'gateway',
      name: 'OPENCLAW GATEWAY',
      status: 'active'
    });
    
    // Agents section (left side)
    this.createBuilding('barracks', 8, 12, {
      id: 'jarvis',
      name: 'JARVIS AGENT',
      status: 'idle'
    });
    
    this.createBuilding('barracks', 6, 16, {
      id: 'agent-spawner',
      name: 'AGENT SPAWNER',
      status: 'active'
    });
    
    // Automation section (right side)
    this.createBuilding('factory', 22, 12, {
      id: 'cron',
      name: 'CRON SCHEDULER',
      status: 'active'
    });
    
    // Resources (top)
    this.createBuilding('powerplant', 12, 8, {
      id: 'tokens',
      name: 'TOKEN SUPPLY',
      status: 'active'
    });
    
    this.createBuilding('powerplant', 18, 8, {
      id: 'budget',
      name: 'BUDGET TRACKER',
      status: 'active'
    });
    
    // External integrations (bottom corners)
    this.createBuilding('extraction', 5, 22, {
      id: 'home-assistant',
      name: 'HOME ASSISTANT',
      status: 'connected'
    });
    
    this.createBuilding('extraction', 25, 22, {
      id: 'alpaca',
      name: 'ALPACA TRADING',
      status: 'connected'
    });
    
    // Services (scattered)
    this.createBuilding('lab', 10, 20, {
      id: 'knowledge-bridge',
      name: 'KNOWLEDGE BRIDGE',
      status: 'active'
    });
    
    this.createBuilding('lab', 20, 20, {
      id: 'avatar-dashboard',
      name: 'AVATAR DASHBOARD',
      status: 'active'
    });
    
    this.createBuilding('lab', 15, 25, {
      id: 'wiki',
      name: 'WIKI (DOCSIFY)',
      status: 'active'
    });
    
    // Mastermind boardroom (special area at bottom)
    this.createBuilding('defense', 12, 30, {
      id: 'boardroom',
      name: 'MASTERMIND BOARDROOM',
      status: 'active'
    });
    
    this.createBuilding('defense', 18, 30, {
      id: 'boardroom-2',
      name: 'AI BOARD OF DIRECTORS',
      status: 'active'
    });
  }
  
  createPipelines() {
    // Gateway connections
    this.pipelines.push(new Pipeline('gateway', 'jarvis', 'control'));
    this.pipelines.push(new Pipeline('gateway', 'agent-spawner', 'control'));
    this.pipelines.push(new Pipeline('gateway', 'cron', 'control'));
    this.pipelines.push(new Pipeline('gateway', 'tokens', 'resource'));
    this.pipelines.push(new Pipeline('gateway', 'budget', 'resource'));
    
    // Integration connections
    this.pipelines.push(new Pipeline('jarvis', 'home-assistant', 'data'));
    this.pipelines.push(new Pipeline('gateway', 'alpaca', 'data'));
    
    // Service connections
    this.pipelines.push(new Pipeline('gateway', 'knowledge-bridge', 'data'));
    this.pipelines.push(new Pipeline('gateway', 'avatar-dashboard', 'data'));
    this.pipelines.push(new Pipeline('gateway', 'wiki', 'data'));
    
    // Boardroom connections
    this.pipelines.push(new Pipeline('gateway', 'boardroom', 'control'));
    this.pipelines.push(new Pipeline('boardroom', 'boardroom-2', 'data'));
  }
  
  createMastermindPersonas() {
    // All 13 Mastermind personas
    const personas = [
      // Marketing Masters
      { id: 'hormozi', name: 'Alex Hormozi', color: '#ff6600', role: 'Business & Offers' },
      { id: 'robbins', name: 'Tony Robbins', color: '#ff9900', role: 'Peak Performance' },
      { id: 'kennedy', name: 'Dan Kennedy', color: '#cc6600', role: 'Direct Response' },
      { id: 'abraham', name: 'Jay Abraham', color: '#996633', role: 'Strategy & Growth' },
      { id: 'halbert', name: 'Gary Halbert', color: '#cc9933', role: 'Copywriting' },
      // Mindset & Philosophy
      { id: 'goggins', name: 'David Goggins', color: '#cc0000', role: 'Mental Toughness' },
      { id: 'rosenberg', name: 'Marshall Rosenberg', color: '#cc99ff', role: 'NVC' },
      { id: 'naval', name: 'Naval Ravikant', color: '#3399ff', role: 'Wealth & Wisdom' },
      { id: 'franklin', name: 'Ben Franklin', color: '#ffcc00', role: 'Founding Wisdom' },
      { id: 'lewis', name: 'C.S. Lewis', color: '#9966cc', role: 'Faith & Reason' },
      // Modern Visionaries
      { id: 'musk', name: 'Elon Musk', color: '#00cc66', role: 'Innovation' },
      { id: 'mises', name: 'Ludwig von Mises', color: '#6699cc', role: 'Economics' },
      { id: 'adams', name: 'Scott Adams', color: '#ff6699', role: 'Systems' }
    ];
    
    // Place personas in two arcs around the boardroom area
    const centerX = 15;
    const centerY = 32;
    
    personas.forEach((p, i) => {
      // Two rows of personas
      const row = i < 7 ? 0 : 1;
      const indexInRow = row === 0 ? i : i - 7;
      const countInRow = row === 0 ? 7 : 6;
      
      const angle = (indexInRow / countInRow) * Math.PI - Math.PI / 2;
      const radius = 4 + row * 2;
      
      const unit = new AnimatedUnit({
        id: p.id,
        name: p.name,
        gridX: centerX + Math.cos(angle) * radius,
        gridY: centerY + Math.sin(angle) * radius * 0.5, // Flatten for isometric
        color: p.color,
        data: { type: 'persona', role: p.role, clickable: true }
      });
      this.units.set(p.id, unit);
    });
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
    
    this.buildings.set(data.id || type, entity);
    return entity;
  }
  
  async setTheme(themeName) {
    if (!THEMES[themeName]) return;
    
    this.currentTheme = themeName;
    this.theme = THEMES[themeName];
    await this.assets.loadTheme(themeName);
    
    // Update UI
    this.updateThemeUI();
  }
  
  updateThemeUI() {
    document.documentElement.style.setProperty('--theme-orange', this.theme.colors.orange);
    document.documentElement.style.setProperty('--theme-purple', this.theme.colors.purple);
    document.documentElement.style.setProperty('--theme-blue', this.theme.colors.blue);
  }
  
  setupInput() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.camera.x += e.clientX - this.lastMouse.x;
        this.camera.y += e.clientY - this.lastMouse.y;
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });
    
    this.canvas.addEventListener('mouseup', () => this.isDragging = false);
    this.canvas.addEventListener('mouseleave', () => this.isDragging = false);
    
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      
      // Get mouse position relative to canvas
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate world position under cursor before zoom
      const worldXBefore = (mouseX - this.camera.x) / this.camera.zoom;
      const worldYBefore = (mouseY - this.camera.y) / this.camera.zoom;
      
      // Apply zoom
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(2, this.camera.zoom * zoomDelta));
      
      // Calculate new camera position to keep world point under cursor
      const newCameraX = mouseX - worldXBefore * newZoom;
      const newCameraY = mouseY - worldYBefore * newZoom;
      
      // Apply changes
      this.camera.zoom = newZoom;
      this.camera.targetZoom = newZoom;
      this.camera.x = newCameraX;
      this.camera.y = newCameraY;
    });
    
    this.canvas.addEventListener('click', (e) => {
      if (this.isDragging) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const screenX = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
      const screenY = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;
      
      let clicked = null;
      
      // Check buildings
      for (const entity of this.buildings.values()) {
        if (this.isPointInEntity(screenX, screenY, entity)) {
          clicked = entity;
        }
      }
      
      // Check units (personas)
      for (const unit of this.units.values()) {
        const pos = ISO.toScreen(unit.gridX, unit.gridY);
        const dist = Math.sqrt((screenX - pos.x) ** 2 + (screenY - pos.y) ** 2);
        if (dist < 30) {
          clicked = { type: 'unit', data: unit };
          
          // If persona is clickable, open chat
          if (unit.data.clickable && window.openPersonaChat) {
            window.openPersonaChat(unit.id);
          }
        }
      }
      
      this.selectEntity(clicked);
    });
    
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  isPointInEntity(screenX, screenY, entity) {
    const pos = ISO.toScreen(entity.gridX, entity.gridY);
    const themeBuilding = this.theme.buildings[entity.buildingType];
    const sprite = this.assets.get(themeBuilding?.sprite);
    if (!sprite) return false;
    
    const scale = 0.5;
    const width = sprite.width * scale;
    const height = sprite.height * scale;
    const x = pos.x - width / 2;
    const y = pos.y + (themeBuilding?.offsetY || -50);
    
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
    
    if (entity.type === 'unit') {
      const unit = entity.data;
      document.getElementById('selected-name').textContent = unit.name;
      document.getElementById('selected-status').textContent = unit.status.toUpperCase();
      document.getElementById('selected-info').innerHTML = `
        <p>Mastermind Persona</p>
        <p>Role: ${unit.data.role || 'Advisor'}</p>
      `;
    } else {
      document.getElementById('selected-name').textContent = entity.data.name;
      document.getElementById('selected-status').textContent = entity.data.status.toUpperCase();
      document.getElementById('selected-status').className = `value ${entity.data.status}`;
      
      let info = this.getBuildingInfo(entity);
      document.getElementById('selected-info').innerHTML = info;
    }
  }
  
  getBuildingInfo(entity) {
    switch (entity.data.id) {
      case 'gateway':
        return `<p>Main OpenClaw Gateway</p><p>Sessions: ${this.state.sessions?.length || 0}</p><p>Uptime: Active</p>`;
      case 'jarvis':
        return `<p>Home Assistant Agent</p><p>Queries: Ready</p>`;
      case 'cron':
        return `<p>Scheduled Jobs: ${this.state.cronJobs?.length || 0}</p>`;
      case 'home-assistant':
        return `<p>Smart Home Hub</p><p>Entities: 147</p>`;
      case 'alpaca':
        return `<p>Paper Trading API</p><p>Positions: Active</p>`;
      case 'knowledge-bridge':
        return `<p>ChromaDB + Crawl4AI</p><p>Documents indexed</p>`;
      case 'avatar-dashboard':
        return `<p>LCARS Display</p><p>http://localhost:8420</p>`;
      case 'wiki':
        return `<p>Docsify Wiki</p><p>http://10.19.99.99:8090</p>`;
      case 'boardroom':
      case 'boardroom-2':
        return `<p>AI Board of Directors</p><p>13 Personas Active</p>`;
      default:
        return `<p>${entity.def.name}</p>`;
    }
  }
  
  updateState(newState) {
    Object.assign(this.state, newState);
    
    document.getElementById('token-count').textContent = (this.state.tokens || 0).toLocaleString();
    document.getElementById('agent-count').textContent = this.state.agents || 0;
    document.getElementById('process-count').textContent = this.state.processes || 0;
    
    // Update building statuses
    if (newState.buildings) {
      for (const [id, status] of Object.entries(newState.buildings)) {
        const building = this.buildings.get(id);
        if (building) {
          building.data.status = status;
        }
      }
    }
    
    // Update pipeline activity
    if (newState.activePipelines) {
      for (const pipeline of this.pipelines) {
        pipeline.active = newState.activePipelines.includes(`${pipeline.from}-${pipeline.to}`);
      }
    }
  }
  
  update(dt) {
    // Update animated units
    for (const unit of this.units.values()) {
      unit.update(dt);
      // Make personas wander around boardroom
      unit.wander(15, 30, 4);
    }
    
    // Animate pipeline flow
    for (const pipeline of this.pipelines) {
      pipeline.flowOffset = (pipeline.flowOffset + dt * 0.001) % 1;
    }
  }
  
  render(timestamp) {
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    this.update(dt);
    
    const { ctx, canvas, camera } = this;
    const colors = this.theme.colors;
    
    // Smooth zoom
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.1;
    
    // Clear
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    
    // Draw grid and terrain
    this.renderGrid();
    
    // Draw paths between buildings
    this.renderPaths();
    
    // Draw pipelines (under buildings)
    this.renderPipelines();
    
    // Draw atmospheric particles
    this.renderParticles();
    
    // Draw buildings sorted by position
    const sortedBuildings = [...this.buildings.values()].sort((a, b) => 
      (a.gridX + a.gridY) - (b.gridX + b.gridY)
    );
    
    for (const entity of sortedBuildings) {
      this.renderBuilding(entity);
    }
    
    // Draw units
    for (const unit of this.units.values()) {
      this.renderUnit(unit);
    }
    
    ctx.restore();
    
    // Edge fog overlay
    this.renderFog();
    
    this.renderMinimap();
  }
  
  renderFog() {
    const { ctx, canvas } = this;
    
    // Edge fog gradient
    const edgeSize = 120;
    
    // Top fog
    const topGrad = ctx.createLinearGradient(0, 0, 0, edgeSize);
    topGrad.addColorStop(0, 'rgba(10, 10, 26, 0.7)');
    topGrad.addColorStop(1, 'rgba(10, 10, 26, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, canvas.width, edgeSize);
    
    // Bottom fog
    const bottomGrad = ctx.createLinearGradient(0, canvas.height - edgeSize, 0, canvas.height);
    bottomGrad.addColorStop(0, 'rgba(10, 10, 26, 0)');
    bottomGrad.addColorStop(1, 'rgba(10, 10, 26, 0.7)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, canvas.height - edgeSize, canvas.width, edgeSize);
    
    // Left fog
    const leftGrad = ctx.createLinearGradient(0, 0, edgeSize, 0);
    leftGrad.addColorStop(0, 'rgba(10, 10, 26, 0.7)');
    leftGrad.addColorStop(1, 'rgba(10, 10, 26, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, edgeSize, canvas.height);
    
    // Right fog  
    const rightGrad = ctx.createLinearGradient(canvas.width - edgeSize, 0, canvas.width, 0);
    rightGrad.addColorStop(0, 'rgba(10, 10, 26, 0)');
    rightGrad.addColorStop(1, 'rgba(10, 10, 26, 0.7)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(canvas.width - edgeSize, 0, edgeSize, canvas.height);
  }
  
  renderGrid() {
    const { ctx } = this;
    const colors = this.theme.colors;
    
    // Draw terrain base tiles with variation
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        const p1 = ISO.toScreen(x, y);
        const p2 = ISO.toScreen(x + 1, y);
        const p3 = ISO.toScreen(x + 1, y + 1);
        const p4 = ISO.toScreen(x, y + 1);
        
        // Terrain type based on noise
        const noise = this.getTerrainNoise(x, y);
        
        // Base tile fill with gradient
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        
        // Terrain color variation
        if (noise > 0.7) {
          // Tech platform (near buildings)
          ctx.fillStyle = 'rgba(30, 30, 50, 0.8)';
        } else if (noise > 0.4) {
          // Normal ground
          ctx.fillStyle = 'rgba(20, 20, 35, 0.6)';
        } else {
          // Darker terrain
          ctx.fillStyle = 'rgba(15, 15, 25, 0.5)';
        }
        ctx.fill();
        
        // Grid lines
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Add terrain decorations
        this.renderTerrainDecoration(x, y, noise);
      }
    }
  }
  
  getTerrainNoise(x, y) {
    // Simple seeded pseudo-random based on position
    const seed = (x * 1337 + y * 7919) % 1000;
    return (Math.sin(seed) + 1) / 2;
  }
  
  renderTerrainDecoration(x, y, noise) {
    const { ctx } = this;
    const colors = this.theme.colors;
    const pos = ISO.toScreen(x + 0.5, y + 0.5);
    
    // Check if there's a building here
    for (const building of this.buildings.values()) {
      const dx = Math.abs(building.gridX - x);
      const dy = Math.abs(building.gridY - y);
      if (dx < 2 && dy < 2) return; // Don't decorate near buildings
    }
    
    // Random decorations
    const decorSeed = (x * 31 + y * 17) % 100;
    
    if (decorSeed < 5) {
      // Small crystal/mineral deposit
      this.drawCrystal(pos.x, pos.y, colors.blue);
    } else if (decorSeed < 10) {
      // Tech debris
      this.drawDebris(pos.x, pos.y, colors.purple);
    } else if (decorSeed < 15) {
      // Data node (glowing dot)
      this.drawDataNode(pos.x, pos.y, colors.green);
    } else if (decorSeed < 18) {
      // Small rock
      this.drawRock(pos.x, pos.y);
    }
  }
  
  drawCrystal(x, y, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    
    // Small crystal cluster
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x, y + 3);
    ctx.lineTo(x - 4, y);
    ctx.closePath();
    ctx.fill();
    
    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.globalAlpha = 1;
  }
  
  drawDebris(x, y, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.4;
    
    // Scattered tech debris
    ctx.fillRect(x - 5, y - 2, 4, 3);
    ctx.fillRect(x + 2, y, 3, 2);
    ctx.fillRect(x - 2, y + 3, 5, 2);
    
    ctx.globalAlpha = 1;
  }
  
  drawDataNode(x, y, color) {
    const { ctx } = this;
    const pulse = Math.sin(Date.now() * 0.003 + x + y) * 0.3 + 0.7;
    
    ctx.fillStyle = color;
    ctx.globalAlpha = pulse;
    
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Outer glow
    ctx.globalAlpha = pulse * 0.3;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1;
  }
  
  drawRock(x, y) {
    const { ctx } = this;
    ctx.fillStyle = '#2a2a3a';
    
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x - 2, y - 4);
    ctx.lineTo(x + 3, y - 3);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x + 2, y + 2);
    ctx.lineTo(x - 3, y + 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#1a1a2a';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  renderPaths() {
    const { ctx } = this;
    const colors = this.theme.colors;
    
    // Draw walking paths between connected buildings
    const pathPairs = [
      ['gateway', 'jarvis'],
      ['gateway', 'cron'],
      ['gateway', 'tokens'],
      ['gateway', 'knowledge-bridge'],
      ['gateway', 'avatar-dashboard'],
      ['gateway', 'wiki'],
      ['jarvis', 'home-assistant'],
      ['wiki', 'boardroom']
    ];
    
    ctx.strokeStyle = 'rgba(60, 60, 80, 0.6)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.setLineDash([20, 10]);
    
    for (const [fromId, toId] of pathPairs) {
      const from = this.buildings.get(fromId);
      const to = this.buildings.get(toId);
      if (!from || !to) continue;
      
      const p1 = ISO.toScreen(from.gridX, from.gridY);
      const p2 = ISO.toScreen(to.gridX, to.gridY);
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
  }
  
  renderParticles() {
    const { ctx } = this;
    const colors = this.theme.colors;
    const time = Date.now() * 0.001;
    
    // Floating particles / dust motes
    for (let i = 0; i < 50; i++) {
      const seed = i * 137;
      const x = (Math.sin(seed + time * 0.3) * 0.5 + 0.5) * this.gridWidth;
      const y = (Math.cos(seed * 1.3 + time * 0.2) * 0.5 + 0.5) * this.gridHeight;
      const pos = ISO.toScreen(x, y);
      
      const alpha = Math.sin(time + seed) * 0.3 + 0.4;
      const size = 1 + Math.sin(seed * 0.5) * 0.5;
      
      ctx.fillStyle = i % 3 === 0 ? colors.blue : 
                      i % 3 === 1 ? colors.purple : colors.green;
      ctx.globalAlpha = alpha * 0.3;
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 20, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    
    // Energy pulses along pipelines
    for (const pipeline of this.pipelines) {
      if (!pipeline.active) continue;
      
      const from = this.buildings.get(pipeline.from);
      const to = this.buildings.get(pipeline.to);
      if (!from || !to) continue;
      
      const p1 = ISO.toScreen(from.gridX, from.gridY);
      const p2 = ISO.toScreen(to.gridX, to.gridY);
      
      // Energy burst at random point
      const t = (time * 0.5 + pipeline.flowOffset * 10) % 1;
      const px = p1.x + (p2.x - p1.x) * t;
      const py = p1.y + (p2.y - p1.y) * t;
      
      ctx.fillStyle = colors.green;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(px, py, 4 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Outer glow
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
  }
  
  drawBuildingPlatform(gridX, gridY, size, colors) {
    const { ctx } = this;
    
    // Platform base
    const p1 = ISO.toScreen(gridX - 0.3, gridY - 0.3);
    const p2 = ISO.toScreen(gridX + size + 0.3, gridY - 0.3);
    const p3 = ISO.toScreen(gridX + size + 0.3, gridY + size + 0.3);
    const p4 = ISO.toScreen(gridX - 0.3, gridY + size + 0.3);
    
    // Platform shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y + 5);
    ctx.lineTo(p2.x, p2.y + 5);
    ctx.lineTo(p3.x, p3.y + 5);
    ctx.lineTo(p4.x, p4.y + 5);
    ctx.closePath();
    ctx.fill();
    
    // Platform top
    const gradient = ctx.createLinearGradient(p1.x, p1.y, p3.x, p3.y);
    gradient.addColorStop(0, 'rgba(50, 50, 70, 0.9)');
    gradient.addColorStop(0.5, 'rgba(40, 40, 60, 0.9)');
    gradient.addColorStop(1, 'rgba(30, 30, 50, 0.9)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fill();
    
    // Platform edge highlight
    ctx.strokeStyle = colors.purple;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(p4.x, p4.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    // Inner glow
    ctx.strokeStyle = colors.blue;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  
  renderPipelines() {
    const { ctx } = this;
    const colors = this.theme.colors;
    
    for (const pipeline of this.pipelines) {
      const fromBuilding = this.buildings.get(pipeline.from);
      const toBuilding = this.buildings.get(pipeline.to);
      
      if (!fromBuilding || !toBuilding) continue;
      
      const from = ISO.toScreen(fromBuilding.gridX, fromBuilding.gridY);
      const to = ISO.toScreen(toBuilding.gridX, toBuilding.gridY);
      
      // Pipeline background
      ctx.strokeStyle = pipeline.active ? colors.pipelineActive : colors.pipeline;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      
      // Animated flow dots
      if (pipeline.active) {
        const numDots = 5;
        for (let i = 0; i < numDots; i++) {
          const t = (pipeline.flowOffset + i / numDots) % 1;
          const x = from.x + (to.x - from.x) * t;
          const y = from.y + (to.y - from.y) * t;
          
          ctx.fillStyle = colors.green;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  renderBuilding(entity) {
    const { ctx } = this;
    const colors = this.theme.colors;
    const pos = ISO.toScreen(entity.gridX, entity.gridY);
    const now = Date.now();
    
    const themeBuilding = this.theme.buildings[entity.buildingType];
    const sprite = this.assets.get(themeBuilding?.sprite);
    
    const scale = 0.5;
    const offsetY = themeBuilding?.offsetY || -50;
    
    // Draw platform/foundation under building
    this.drawBuildingPlatform(entity.gridX, entity.gridY, entity.def.gridSize || 1, colors);
    
    if (sprite) {
      const width = sprite.width * scale;
      const height = sprite.height * scale;
      const x = pos.x - width / 2;
      const y = pos.y + offsetY;
      
      // Selection highlight
      if (entity === this.selectedEntity) {
        ctx.strokeStyle = colors.orange;
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
      }
      
      // Animated activity pulse
      const isActive = entity.data.status === 'active' || entity.data.status === 'connected';
      const entitySeed = (entity.id || entity.data.id || 'default').charCodeAt(0);
      const pulsePhase = Math.sin(now * 0.003 + entitySeed) * 0.5 + 0.5;
      
      // Status glow with pulse
      if (isActive) {
        ctx.shadowColor = colors.green;
        ctx.shadowBlur = 10 + pulsePhase * 10;
      } else if (entity.data.status === 'error') {
        ctx.shadowColor = colors.red;
        ctx.shadowBlur = 15 + Math.sin(now * 0.01) * 10;
      }
      
      ctx.drawImage(sprite, x, y, width, height);
      ctx.shadowBlur = 0;
      
      // Animated blinking lights
      this.drawBuildingLights(x, y, width, height, entity, now);
      
      // Smoke/particle effects for active buildings
      if (isActive) {
        this.drawBuildingParticles(pos.x, y, entity, now);
      }
      
      // Status indicator with pulse
      const indicatorRadius = isActive ? 5 + pulsePhase * 2 : 6;
      ctx.beginPath();
      ctx.arc(x + width - 15, y + 10, indicatorRadius, 0, Math.PI * 2);
      ctx.fillStyle = entity.data.status === 'active' ? colors.green :
                      entity.data.status === 'connected' ? colors.blue :
                      entity.data.status === 'error' ? colors.red : colors.gold;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Name label
      ctx.fillStyle = colors.orange;
      ctx.font = 'bold 11px "Helvetica Neue", Arial';
      ctx.textAlign = 'center';
      ctx.fillText(entity.data.name, pos.x, y + height + 15);
    } else {
      // Fallback - draw placeholder
      ctx.fillStyle = colors.purple;
      ctx.fillRect(pos.x - 30, pos.y - 30, 60, 60);
      ctx.fillStyle = colors.orange;
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(entity.data.name, pos.x, pos.y + 45);
    }
  }
  
  drawBuildingLights(x, y, width, height, entity, now) {
    const { ctx } = this;
    const colors = this.theme.colors;
    
    // Create deterministic light positions based on entity id
    const entityId = entity.id || entity.data.id || 'default';
    const seed = entityId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const lightCount = 2 + (seed % 3);
    
    for (let i = 0; i < lightCount; i++) {
      // Deterministic position within building bounds
      const lx = x + 10 + ((seed * (i + 1) * 7) % (width - 20));
      const ly = y + 5 + ((seed * (i + 1) * 13) % (height * 0.4));
      
      // Different blink rates per light
      const blinkRate = 0.002 + (i * 0.0005);
      const phase = (now * blinkRate + seed * i) % (Math.PI * 2);
      const brightness = Math.sin(phase) > 0.3 ? 1 : 0.3;
      
      // Light color based on status
      let lightColor;
      if (entity.data.status === 'active') {
        lightColor = brightness > 0.5 ? colors.green : '#003300';
      } else if (entity.data.status === 'error') {
        lightColor = brightness > 0.5 ? colors.red : '#330000';
      } else {
        lightColor = brightness > 0.5 ? colors.gold : '#333300';
      }
      
      // Draw light with glow
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fillStyle = lightColor;
      if (brightness > 0.5) {
        ctx.shadowColor = lightColor;
        ctx.shadowBlur = 8;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  
  drawBuildingParticles(centerX, topY, entity, now) {
    const { ctx } = this;
    const colors = this.theme.colors;
    
    // Initialize particle system for this building if needed
    if (!entity.particles) {
      entity.particles = [];
      entity.lastParticle = 0;
    }
    
    // Spawn new particles periodically
    if (now - entity.lastParticle > 500) {
      entity.particles.push({
        x: centerX + (Math.random() - 0.5) * 30,
        y: topY + 10,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.5 - Math.random() * 0.5,
        life: 1,
        size: 2 + Math.random() * 3
      });
      entity.lastParticle = now;
      
      // Limit particles
      if (entity.particles.length > 8) {
        entity.particles.shift();
      }
    }
    
    // Update and draw particles
    for (let i = entity.particles.length - 1; i >= 0; i--) {
      const p = entity.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.015;
      
      if (p.life <= 0) {
        entity.particles.splice(i, 1);
        continue;
      }
      
      // Draw smoke/steam particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150, 150, 150, ${p.life * 0.4})`;
      ctx.fill();
    }
  }
  
  renderUnit(unit) {
    const { ctx } = this;
    const colors = this.theme.colors;
    const pos = ISO.toScreen(unit.gridX, unit.gridY);
    
    // Simple animated character
    const bobY = Math.sin(Date.now() * 0.005 + unit.id.charCodeAt(0)) * 3;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 5, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    ctx.fillStyle = unit.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - 15 + bobY, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Head
    ctx.fillStyle = '#ffcc99';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - 30 + bobY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Walking animation legs
    if (unit.status === 'walking') {
      const legOffset = Math.sin(Date.now() * 0.02) * 5;
      ctx.strokeStyle = unit.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pos.x - 5, pos.y - 5 + bobY);
      ctx.lineTo(pos.x - 5 + legOffset, pos.y + 5);
      ctx.moveTo(pos.x + 5, pos.y - 5 + bobY);
      ctx.lineTo(pos.x + 5 - legOffset, pos.y + 5);
      ctx.stroke();
    }
    
    // Name tag
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(pos.x - 35, pos.y - 50 + bobY, 70, 14);
    ctx.fillStyle = unit.color;
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(unit.name, pos.x, pos.y - 40 + bobY);
  }
  
  renderMinimap() {
    const minimapCanvas = document.getElementById('minimap-canvas');
    if (!minimapCanvas) return;
    
    const mctx = minimapCanvas.getContext('2d');
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;
    const colors = this.theme.colors;
    
    mctx.fillStyle = 'rgba(0, 20, 40, 0.9)';
    mctx.fillRect(0, 0, mw, mh);
    
    const scale = Math.min(mw / (this.gridWidth * 8), mh / (this.gridHeight * 6));
    
    mctx.save();
    mctx.translate(mw / 2, 20);
    mctx.scale(scale, scale);
    
    // Draw buildings
    for (const entity of this.buildings.values()) {
      const pos = ISO.toScreen(entity.gridX, entity.gridY);
      mctx.fillStyle = entity.data.status === 'active' ? colors.green :
                       entity.data.status === 'connected' ? colors.blue : colors.gold;
      mctx.beginPath();
      mctx.arc(pos.x / 8, pos.y / 8, 5, 0, Math.PI * 2);
      mctx.fill();
    }
    
    // Draw units
    for (const unit of this.units.values()) {
      const pos = ISO.toScreen(unit.gridX, unit.gridY);
      mctx.fillStyle = unit.color;
      mctx.beginPath();
      mctx.arc(pos.x / 8, pos.y / 8, 3, 0, Math.PI * 2);
      mctx.fill();
    }
    
    // Viewport
    mctx.strokeStyle = colors.orange;
    mctx.lineWidth = 2;
    const vpX = -this.camera.x / this.camera.zoom / 8;
    const vpY = -this.camera.y / this.camera.zoom / 8;
    const vpW = this.canvas.width / this.camera.zoom / 8;
    const vpH = this.canvas.height / this.camera.zoom / 8;
    mctx.strokeRect(vpX, vpY, vpW, vpH);
    
    mctx.restore();
  }
  
  startLoop() {
    const loop = (timestamp) => {
      this.render(timestamp);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

export { World, THEMES, ISO };
