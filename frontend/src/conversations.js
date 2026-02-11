// Persona Conversation System
// Handles random encounters and conversations between personas

import { getPersona, PERSONAS } from './personas.js';

// Discord channel for casual conversations
const CASUAL_CHANNEL_ID = '1470956181936668885';

// Active conversations
const activeConversations = new Map();

// Conversation cooldown per persona pair (ms)
const CONVERSATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes

// Last conversation time per pair
const lastConversationTime = new Map();

// Speech bubbles to render
export const speechBubbles = new Map();

// Check if two personas are close enough to bump
export function checkProximity(unit1, unit2, threshold = 2) {
  const dx = unit1.gridX - unit2.gridX;
  const dy = unit1.gridY - unit2.gridY;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}

// Get a unique key for a persona pair
function getPairKey(id1, id2) {
  return [id1, id2].sort().join('-');
}

// Check if a conversation can happen
function canConverse(id1, id2) {
  const key = getPairKey(id1, id2);
  const lastTime = lastConversationTime.get(key) || 0;
  return Date.now() - lastTime > CONVERSATION_COOLDOWN;
}

// Start a conversation between two personas
export async function startConversation(unit1, unit2, onComplete) {
  if (!canConverse(unit1.id, unit2.id)) return;
  if (activeConversations.has(unit1.id) || activeConversations.has(unit2.id)) return;
  
  // Mark as conversing
  activeConversations.set(unit1.id, unit2.id);
  activeConversations.set(unit2.id, unit1.id);
  
  const pairKey = getPairKey(unit1.id, unit2.id);
  lastConversationTime.set(pairKey, Date.now());
  
  // Stop both personas from walking
  unit1.status = 'talking';
  unit2.status = 'talking';
  
  const persona1 = getPersona(unit1.id);
  const persona2 = getPersona(unit2.id);
  
  console.log(`Conversation starting: ${persona1.name} and ${persona2.name}`);
  
  try {
    // Generate conversation
    const conversation = await generateConversation(persona1, persona2);
    
    // Display speech bubbles sequentially
    for (const turn of conversation) {
      const speaker = turn.speaker === persona1.id ? unit1 : unit2;
      
      // Show speech bubble
      speechBubbles.set(speaker.id, {
        text: turn.text,
        color: speaker.color,
        expires: Date.now() + 4000
      });
      
      // Wait for bubble duration
      await new Promise(r => setTimeout(r, 4000));
      speechBubbles.delete(speaker.id);
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Post to Discord
    await postToDiscord(persona1, persona2, conversation);
    
  } catch (e) {
    console.error('Conversation error:', e);
  }
  
  // Resume walking
  unit1.status = 'idle';
  unit2.status = 'idle';
  activeConversations.delete(unit1.id);
  activeConversations.delete(unit2.id);
  
  if (onComplete) onComplete();
}

// Generate AI conversation between personas
async function generateConversation(persona1, persona2) {
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
        persona2Role: persona2.role
      })
    });
    
    if (response.ok) {
      return await response.json();
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

// Post conversation transcript to Discord
async function postToDiscord(persona1, persona2, conversation) {
  const transcript = conversation.map(turn => {
    const speaker = turn.speaker === persona1.id ? persona1.name : persona2.name;
    return `**${speaker}:** ${turn.text}`;
  }).join('\n\n');
  
  const message = `🗣️ **${persona1.name}** and **${persona2.name}** crossed paths...\n\n${transcript}`;
  
  try {
    await fetch('/api/discord/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: CASUAL_CHANNEL_ID,
        message
      })
    });
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

// Clean up expired speech bubbles
export function cleanupBubbles() {
  const now = Date.now();
  for (const [id, bubble] of speechBubbles) {
    if (now > bubble.expires) {
      speechBubbles.delete(id);
    }
  }
}
