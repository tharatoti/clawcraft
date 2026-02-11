// Persona Conversation System
// Handles random encounters and conversations between personas

import { getPersona, PERSONAS } from './personas.js';

// Discord webhook URL
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1470962754138669076/alSW64HRCrRESRJEL7fOPTPMflrY7f1khihUg2bAUBjOi-bIrsZiIFWMCs7hkfMhVQfA';

// Active conversations - maps persona id to conversation group
const activeConversations = new Map();

// Current conversation participants
let currentConversationGroup = [];

// Conversation cooldown per persona pair (ms)
const CONVERSATION_COOLDOWN = 3 * 60 * 1000; // 3 minutes

// Last conversation time per pair
const lastConversationTime = new Map();

// Speech bubbles to render
export const speechBubbles = new Map();

// Bubble hover state - keeps bubbles visible when mouse is over
export let hoveredBubbleId = null;
let hoverTimeout = null;

// Set which bubble is being hovered
export function setHoveredBubble(id) {
  hoveredBubbleId = id;
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
}

// Clear hover with 1-second delay
export function clearHoveredBubble() {
  hoverTimeout = setTimeout(() => {
    hoveredBubbleId = null;
  }, 1000);
}

// UI callback for showing conversation
let onConversationUI = null;

// Check if two personas are close enough to bump
export function checkProximity(unit1, unit2, threshold = 1) {
  const dx = unit1.gridX - unit2.gridX;
  const dy = unit1.gridY - unit2.gridY;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}

// Get a unique key for a persona group
function getGroupKey(ids) {
  return [...ids].sort().join('-');
}

// Check if a conversation can happen
function canConverse(ids) {
  const key = getGroupKey(ids);
  const lastTime = lastConversationTime.get(key) || 0;
  return Date.now() - lastTime > CONVERSATION_COOLDOWN;
}

// Allow a third persona to join an ongoing conversation
export function joinConversation(unit, talkingUnits) {
  if (currentConversationGroup.length >= 4) return; // Max 4 participants
  if (currentConversationGroup.find(u => u.id === unit.id)) return; // Already in
  
  // Check cooldown with all current participants
  const allIds = [...currentConversationGroup.map(u => u.id), unit.id];
  if (!canConverse(allIds)) return;
  
  console.log(`${unit.name} joins the conversation!`);
  unit.status = 'talking';
  currentConversationGroup.push(unit);
  
  // Show a joining message
  const persona = getPersona(unit.id);
  speechBubbles.set(unit.id, {
    text: `*joins the conversation*`,
    color: unit.color,
    expires: Date.now() + 2000
  });
}

// Start a conversation between two personas
export async function startConversation(unit1, unit2, uiCallback) {
  if (!canConverse([unit1.id, unit2.id])) return;
  if (activeConversations.has(unit1.id) || activeConversations.has(unit2.id)) return;
  
  // Initialize conversation group
  currentConversationGroup = [unit1, unit2];
  
  // Mark as conversing
  activeConversations.set(unit1.id, true);
  activeConversations.set(unit2.id, true);
  
  const groupKey = getGroupKey([unit1.id, unit2.id]);
  lastConversationTime.set(groupKey, Date.now());
  
  // Stop both personas from walking
  unit1.status = 'talking';
  unit2.status = 'talking';
  
  const persona1 = getPersona(unit1.id);
  const persona2 = getPersona(unit2.id);
  
  console.log(`Conversation starting: ${persona1.name} and ${persona2.name}`);
  
  try {
    // Generate conversation
    const conversation = await generateConversation(persona1, persona2);
    
    // Show UI overlay if callback provided
    if (uiCallback) {
      uiCallback([persona1, persona2], conversation);
    }
    
    // Display speech bubbles sequentially - longer duration for readability
    for (const turn of conversation) {
      const speakerUnit = currentConversationGroup.find(u => u.id === turn.speaker) || unit1;
      
      // Calculate read time based on text length (avg 200 words/min = ~15 chars/sec)
      const readTime = Math.max(4000, turn.text.length * 70);
      
      // Show speech bubble
      speechBubbles.set(speakerUnit.id, {
        text: turn.text,
        color: speakerUnit.color,
        expires: Date.now() + readTime,
        speakerId: speakerUnit.id
      });
      
      // Wait for bubble duration
      await new Promise(r => setTimeout(r, readTime));
      
      // Only delete if not being hovered
      if (hoveredBubbleId !== speakerUnit.id) {
        speechBubbles.delete(speakerUnit.id);
      }
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Post to Discord
    const allPersonas = currentConversationGroup.map(u => getPersona(u.id));
    await postToDiscord(allPersonas, conversation);
    
  } catch (e) {
    console.error('Conversation error:', e);
  }
  
  // Resume walking for all participants
  for (const unit of currentConversationGroup) {
    unit.status = 'idle';
    activeConversations.delete(unit.id);
  }
  
  currentConversationGroup = [];
}

// Generate AI conversation between personas (with memory)
async function generateConversation(persona1, persona2) {
  const pairKey = getGroupKey([persona1.id, persona2.id]);
  
  // Get past conversation history
  let memoryContext = '';
  try {
    const memRes = await fetch(`/api/memory/conversations?pair=${pairKey}`);
    if (memRes.ok) {
      const history = await memRes.json();
      if (history.length > 0) {
        const lastConvo = history[history.length - 1];
        const summary = lastConvo.conversation.map(c => {
          const name = c.speaker === persona1.id ? persona1.name : persona2.name;
          return `${name}: "${c.text}"`;
        }).join('\n');
        memoryContext = `\n\nThey spoke recently about:\n${summary}\n\nContinue from where they left off or reference their previous conversation.`;
      }
    }
  } catch (e) {
    console.log('No memory available');
  }
  
  try {
    const response = await fetch('/api/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona1Id: persona1.id,
        persona2Id: persona2.id,
        persona1Name: persona1.name,
        persona2Name: persona2.name,
        persona1Role: persona1.role,
        persona2Role: persona2.role,
        memoryContext
      })
    });
    
    if (response.ok) {
      const conversation = await response.json();
      
      // Store this conversation in memory
      try {
        await fetch('/api/memory/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pairKey,
            participants: [persona1.id, persona2.id],
            conversation
          })
        });
      } catch (e) {
        console.log('Failed to store memory');
      }
      
      return conversation;
    }
  } catch (e) {
    console.error('Failed to generate conversation:', e);
  }
  
  // Fallback: simple generic exchange
  return [
    { speaker: persona1.id, text: `Hello ${persona2.name}! Interesting running into you here.` },
    { speaker: persona2.id, text: `Indeed, ${persona1.name}. Always good to exchange ideas.` },
    { speaker: persona1.id, text: `Perhaps we should discuss our approaches sometime.` },
    { speaker: persona2.id, text: `I'd like that. Until next time.` }
  ];
}

// Post conversation transcript to Discord via webhook
async function postToDiscord(personas, conversation) {
  const personaMap = new Map(personas.map(p => [p.id, p]));
  
  const transcript = conversation.map(turn => {
    const speaker = personaMap.get(turn.speaker);
    return `**${speaker?.name || turn.speaker}:** ${turn.text}`;
  }).join('\n\n');
  
  const names = personas.map(p => p.name).join(' & ');
  const message = `🗣️ **${names}** crossed paths...\n\n${transcript}`;
  
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        username: 'ClawCraft',
        avatar_url: 'https://raw.githubusercontent.com/tharatoti/clawcraft/main/frontend/public/favicon.png'
      })
    });
    console.log('Posted conversation to Discord');
  } catch (e) {
    console.error('Failed to post to Discord:', e);
  }
}

// Render speech bubble
export function renderSpeechBubble(ctx, x, y, text, color) {
  const maxWidth = 200;
  const padding = 10;
  const fontSize = 12;
  
  ctx.font = `${fontSize}px Arial`;
  
  // Word wrap
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth - padding * 2) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  const lineHeight = fontSize + 4;
  const bubbleHeight = lines.length * lineHeight + padding * 2;
  const bubbleWidth = Math.min(maxWidth, Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2);
  
  const bubbleX = x - bubbleWidth / 2;
  const bubbleY = y - bubbleHeight - 20;
  
  // Bubble background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  
  // Rounded rect
  const radius = 8;
  ctx.beginPath();
  ctx.moveTo(bubbleX + radius, bubbleY);
  ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
  ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
  ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
  ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
  ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
  ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
  ctx.lineTo(bubbleX, bubbleY + radius);
  ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Pointer
  ctx.beginPath();
  ctx.moveTo(x - 8, bubbleY + bubbleHeight);
  ctx.lineTo(x, bubbleY + bubbleHeight + 10);
  ctx.lineTo(x + 8, bubbleY + bubbleHeight);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 8, bubbleY + bubbleHeight);
  ctx.lineTo(x, bubbleY + bubbleHeight + 10);
  ctx.lineTo(x + 8, bubbleY + bubbleHeight);
  ctx.strokeStyle = color;
  ctx.stroke();
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  lines.forEach((line, i) => {
    ctx.fillText(line, x, bubbleY + padding + (i + 1) * lineHeight - 4);
  });
}

// Clean up expired speech bubbles (respects hover state)
export function cleanupBubbles() {
  const now = Date.now();
  for (const [id, bubble] of speechBubbles) {
    // Don't delete if being hovered
    if (hoveredBubbleId === id) continue;
    
    if (now > bubble.expires) {
      speechBubbles.delete(id);
    }
  }
}
