// Persona Conversation System
// Handles random encounters and conversations between personas

import { getPersona, PERSONAS } from './personas.js';

// Discord webhook URL
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1470962754138669076/alSW64HRCrRESRJEL7fOPTPMflrY7f1khihUg2bAUBjOi-bIrsZiIFWMCs7hkfMhVQfA';

// Active conversations - maps persona id to conversation group
const activeConversations = new Map();

// Current conversation participants and messages
let currentConversationGroup = [];
let currentConversationMessages = []; // Store messages for join feature

// Conversation state
let conversationInProgress = false; // True while generating/displaying
let conversationHasStarted = false; // True once first message shown

// Conversation cooldown per persona pair (ms)
const CONVERSATION_COOLDOWN = 2 * 60 * 1000; // 2 minutes

// Maximum time waiting for API before using fallback
const API_TIMEOUT = 8 * 1000; // 8 seconds

// Maximum time for awkward silence before giving up
const AWKWARD_SILENCE_TIMEOUT = 10 * 1000; // 10 seconds with no dialog = move on

// Maximum time a conversation can last
const MAX_CONVERSATION_TIME = 60 * 1000; // 60 seconds total

// Chance to actually stop for a conversation (not every bump)
const CONVERSATION_CHANCE = 0.4; // 40% chance to engage

// Last conversation time per pair
const lastConversationTime = new Map();

// Conversation start time for timeout
let conversationStartTime = 0;

// Speech bubbles to render
export const speechBubbles = new Map();

// Bubble hover state
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

// Clear hover with delay
export function clearHoveredBubble() {
  hoverTimeout = setTimeout(() => {
    hoveredBubbleId = null;
  }, 1000);
}

// Check if two personas are close enough
export function checkProximity(unit1, unit2, threshold = 1) {
  const dx = unit1.gridX - unit2.gridX;
  const dy = unit1.gridY - unit2.gridY;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}

// Get unique key for persona group
function getGroupKey(ids) {
  return [...ids].sort().join('-');
}

// Check if conversation can happen
function canConverse(ids) {
  const key = getGroupKey(ids);
  const lastTime = lastConversationTime.get(key) || 0;
  return Date.now() - lastTime > CONVERSATION_COOLDOWN;
}

// Get current conversation messages (for join feature)
export function getCurrentConversationMessages() {
  return [...currentConversationMessages];
}

// Get current conversation participants
export function getCurrentConversationGroup() {
  return [...currentConversationGroup];
}

// Force end any stuck conversation
export function forceEndConversation() {
  console.log('⚠️ Force ending stuck conversation');
  endConversationCleanup();
}

// End conversation early (awkward silence, API fail, etc)
function endConversationEarly(reason) {
  console.log(`🚶 Ending conversation early: ${reason}`);
  
  // Show brief message in log
  addToConversationLog('system', reason, '#666', 'System');
  
  // Brief pause then cleanup
  setTimeout(() => {
    endConversationCleanup();
  }, 1500);
}

// Shared cleanup logic
function endConversationCleanup() {
  for (const unit of currentConversationGroup) {
    unit.status = 'idle';
    activeConversations.delete(unit.id);
    speechBubbles.delete(unit.id);
  }
  currentConversationGroup = [];
  currentConversationMessages = [];
  conversationInProgress = false;
  conversationHasStarted = false;
  conversationStartTime = 0;
  hideConversationLog();
}

// Check and cleanup stuck conversations (call from game loop)
export function checkStuckConversations() {
  if (currentConversationGroup.length > 0 && conversationStartTime > 0) {
    if (Date.now() - conversationStartTime > MAX_CONVERSATION_TIME) {
      console.warn('Conversation timed out, forcing end');
      forceEndConversation();
    }
  }
}

// Allow a persona to join ongoing conversation (flexible - anyone can join active conversations)
export function joinConversation(unit, talkingUnits) {
  // Must have an active conversation with actual dialog
  if (!conversationHasStarted) {
    return; // Silent fail - conversation hasn't started yet
  }
  
  // Already in?
  if (currentConversationGroup.find(u => u.id === unit.id)) return;
  
  // Random chance to join vs just walk by
  if (Math.random() > 0.6) {
    console.log(`${unit.name} walks past without joining`);
    return;
  }
  
  console.log(`${unit.name} joins the conversation!`);
  unit.status = 'talking';
  currentConversationGroup.push(unit);
  
  // Show joining bubble
  speechBubbles.set(unit.id, {
    text: `*joins*`,
    color: unit.color,
    expires: Date.now() + 2000
  });
  
  // Add to conversation log
  addToConversationLog(unit.id, '*joins the conversation*', unit.color, unit.name);
}

// Start conversation between two personas
export async function startConversation(unit1, unit2, uiCallback) {
  // Only one conversation at a time
  if (conversationInProgress) {
    return;
  }
  
  if (!canConverse([unit1.id, unit2.id])) return;
  if (activeConversations.has(unit1.id) || activeConversations.has(unit2.id)) return;
  
  // Random chance to actually engage (not every bump triggers convo)
  if (Math.random() > CONVERSATION_CHANCE) {
    console.log(`${unit1.name} and ${unit2.name} pass each other without stopping`);
    return;
  }
  
  // Lock conversation
  conversationInProgress = true;
  conversationHasStarted = false;
  
  // Initialize
  currentConversationGroup = [unit1, unit2];
  currentConversationMessages = [];
  conversationStartTime = Date.now();
  
  // Mark as conversing
  activeConversations.set(unit1.id, true);
  activeConversations.set(unit2.id, true);
  
  const groupKey = getGroupKey([unit1.id, unit2.id]);
  lastConversationTime.set(groupKey, Date.now());
  
  // Stop walking
  unit1.status = 'talking';
  unit2.status = 'talking';
  
  const persona1 = getPersona(unit1.id);
  const persona2 = getPersona(unit2.id);
  
  console.log(`🗣️ Conversation starting: ${persona1.name} and ${persona2.name}`);
  
  // Show conversation log UI
  showConversationLog([persona1, persona2]);
  
  // Set awkward silence timeout - if no dialog in X seconds, abort
  const awkwardTimeout = setTimeout(() => {
    if (!conversationHasStarted && conversationInProgress) {
      console.log('⏰ Awkward silence - no dialog generated, moving on');
      endConversationEarly('*awkward silence*');
    }
  }, AWKWARD_SILENCE_TIMEOUT);
  
  try {
    // Generate conversation (with timeout for awkward silence)
    const conversation = await generateConversation(persona1, persona2);
    
    // Clear the awkward silence timeout since we got a response
    clearTimeout(awkwardTimeout);
    
    if (!conversation || conversation.length === 0) {
      throw new Error('Empty conversation generated');
    }
    
    // Show UI overlay if callback
    if (uiCallback) {
      uiCallback([persona1, persona2], conversation);
    }
    
    console.log(`📝 Generated ${conversation.length} turns, displaying...`);
    
    // Display messages sequentially
    for (let i = 0; i < conversation.length; i++) {
      const turn = conversation[i];
      
      // Safety check - abort if conversation was force-ended
      if (currentConversationGroup.length === 0 || !conversationInProgress) break;
      
      const speakerUnit = currentConversationGroup.find(u => u.id === turn.speaker) || unit1;
      const speakerPersona = getPersona(speakerUnit.id);
      
      // Mark conversation as started after first message
      if (i === 0) {
        conversationHasStarted = true;
        console.log('✅ Conversation has started, joining now allowed');
      }
      
      // Store message
      currentConversationMessages.push({
        speaker: speakerUnit.id,
        name: speakerPersona?.name || speakerUnit.name,
        text: turn.text,
        color: speakerUnit.color,
        time: Date.now()
      });
      
      // Add to conversation log
      addToConversationLog(speakerUnit.id, turn.text, speakerUnit.color, speakerPersona?.name || speakerUnit.name);
      
      // Read time based on length
      const readTime = Math.max(2000, Math.min(5000, turn.text.length * 45));
      
      // Show speech bubble
      speechBubbles.set(speakerUnit.id, {
        text: turn.text,
        color: speakerUnit.color,
        expires: Date.now() + readTime,
        speakerId: speakerUnit.id
      });
      
      // Wait
      await new Promise(r => setTimeout(r, readTime));
      
      if (hoveredBubbleId !== speakerUnit.id) {
        speechBubbles.delete(speakerUnit.id);
      }
      await new Promise(r => setTimeout(r, 250));
    }
    
    // Post to Discord
    const allPersonas = currentConversationGroup.map(u => getPersona(u.id));
    await postToDiscord(allPersonas, conversation);
    
  } catch (e) {
    console.error('Conversation error:', e);
    clearTimeout(awkwardTimeout);
  }
  
  // End conversation - resume walking
  console.log('🏁 Conversation ended, freeing participants');
  for (const unit of currentConversationGroup) {
    unit.status = 'idle';
    activeConversations.delete(unit.id);
    speechBubbles.delete(unit.id);
  }
  
  currentConversationGroup = [];
  conversationStartTime = 0;
  conversationInProgress = false;
  conversationHasStarted = false;
  
  // Keep log visible for a bit, then fade
  setTimeout(() => {
    if (currentConversationGroup.length === 0) {
      hideConversationLog();
    }
  }, 5000);
}

// Generate AI conversation (with memory) - fast timeout, reliable fallback
async function generateConversation(persona1, persona2) {
  const pairKey = getGroupKey([persona1.id, persona2.id]);
  
  console.log(`🤖 Generating conversation: ${persona1.name} + ${persona2.name}`);
  
  // Get conversation memory for continuity
  let memoryContext = '';
  try {
    const memRes = await fetch(`/api/memory/conversations?pair=${pairKey}`);
    if (memRes.ok) {
      const history = await memRes.json();
      if (history.length > 0) {
        const lastConvo = history[history.length - 1];
        memoryContext = lastConvo.conversation.map(c => {
          const name = c.speaker === persona1.id ? persona1.name : persona2.name;
          return `${name}: "${c.text}"`;
        }).join('\n');
        console.log('📚 Found previous conversation to build on');
      }
    }
  } catch (e) {
    // Memory lookup failed, continue without it
  }
  
  try {
    console.log('📡 Calling /api/conversation...');
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.log('⏰ API timeout - using fallback');
      controller.abort();
    }, API_TIMEOUT);
    
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
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      const conversation = await response.json();
      if (conversation && conversation.length > 0) {
        console.log(`✅ Got ${conversation.length} turns from API`);
        
        // Store this conversation for future memory (async, don't wait)
        fetch('/api/memory/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pairKey,
            participants: [persona1.id, persona2.id],
            conversation
          })
        }).catch(() => {});
        
        return conversation;
      }
      console.warn('API returned empty response, using fallback');
    } else {
      console.warn(`API error ${response.status}, using fallback`);
    }
  } catch (e) {
    console.warn('API failed, using fallback:', e.message);
  }
  
  // Fallback conversations - immediate, no API needed
  console.log('⚡ Using local fallback conversation');
  return getFallbackConversation(persona1, persona2);
}

// Persona-specific insights for fallback conversations
const PERSONA_INSIGHTS = {
  hormozi: ["The bottleneck is always the owner", "Make offers so good people feel stupid saying no", "Volume negates luck"],
  robbins: ["State change precedes behavior change", "The quality of your life is the quality of your relationships", "Where focus goes, energy flows"],
  kennedy: ["If you can't measure it, don't do it", "The best marketing is direct response", "Results beat creativity every time"],
  abraham: ["Strategy of preeminence changes everything", "Find the hidden assets", "Optimize before you scale"],
  halbert: ["A starving crowd beats clever copy", "Sell them what they want, give them what they need", "The list is everything"],
  goggins: ["Stay hard", "You're not even close to your limits", "Suffering is the currency of growth"],
  rosenberg: ["Every criticism is a tragic expression of unmet needs", "Connection before correction", "Empathy is a choice"],
  naval: ["Specific knowledge can't be taught", "Seek wealth, not money", "Desire is suffering"],
  franklin: ["An investment in knowledge pays the best interest", "Well done is better than well said", "Energy and persistence conquer all"],
  lewis: ["You don't have a soul, you are a soul", "Hardship often prepares ordinary people for extraordinary destiny", "Integrity is doing right when no one is watching"],
  musk: ["The first step is establishing that something is possible", "Failure is an option here", "Work like hell"],
  mises: ["Human action is purposeful behavior", "The market is a democracy", "Economics is about human choices"],
  adams: ["Systems beat goals", "Talent stacking creates unique value", "Persuasion is about what you leave out"],
  munger: ["Invert, always invert", "Avoid stupidity rather than seeking brilliance", "The big money is in the waiting"],
  aurelius: ["You have power over your mind, not outside events", "The obstacle is the way", "Waste no time arguing what a good man should be"],
  feynman: ["The first principle is not fooling yourself", "I'd rather have questions I can't answer than answers I can't question", "Nature has imagination"],
  dalio: ["Pain plus reflection equals progress", "Radical transparency works", "Principles are ways of dealing with reality"]
};

// Pre-written fallback conversations - now persona-aware
function getFallbackConversation(persona1, persona2) {
  console.log('⚡ Using fallback conversation');
  
  const insights1 = PERSONA_INSIGHTS[persona1.id] || ["Working on something interesting"];
  const insights2 = PERSONA_INSIGHTS[persona2.id] || ["Thinking about the fundamentals"];
  
  const insight1 = insights1[Math.floor(Math.random() * insights1.length)];
  const insight2 = insights2[Math.floor(Math.random() * insights2.length)];
  
  // Pick random conversation style with persona-specific content
  const styles = [
    // Sharing insights
    [
      { speaker: persona1.id, text: `${persona2.name}! I've been mulling over something.` },
      { speaker: persona2.id, text: `I'm all ears. What's on your mind?` },
      { speaker: persona1.id, text: `"${insight1}" - it keeps coming back to that.` },
      { speaker: persona2.id, text: `Interesting. For me it's been "${insight2}". Maybe they're connected.` },
      { speaker: persona1.id, text: `Everything's connected if you look hard enough. Let's dig into this.` }
    ],
    // Challenge discussion
    [
      { speaker: persona2.id, text: `${persona1.name}, you look deep in thought.` },
      { speaker: persona1.id, text: `Trying to solve a problem. "${insight1}" - but the application is tricky.` },
      { speaker: persona2.id, text: `What if you approached it differently? "${insight2}"` },
      { speaker: persona1.id, text: `Hmm. That reframes things. Thank you.` }
    ],
    // Quick wisdom exchange
    [
      { speaker: persona1.id, text: `Quick thought for you: "${insight1}"` },
      { speaker: persona2.id, text: `Bold. Here's one back: "${insight2}"` },
      { speaker: persona1.id, text: `Now we're talking. Same time tomorrow?` },
      { speaker: persona2.id, text: `You know where to find me.` }
    ],
    // Mentorship moment
    [
      { speaker: persona2.id, text: `${persona1.name}, what's the most important lesson you've learned lately?` },
      { speaker: persona1.id, text: `That "${insight1}". Took me too long to really understand it.` },
      { speaker: persona2.id, text: `The best lessons always do. I've been sitting with "${insight2}" myself.` },
      { speaker: persona1.id, text: `We should write these down. Compare notes in a week?` },
      { speaker: persona2.id, text: `Deal.` }
    ]
  ];
  
  return styles[Math.floor(Math.random() * styles.length)];
}

// Post to Discord
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
  } catch (e) {
    console.error('Failed to post to Discord:', e);
  }
}

// ========== Conversation Log UI ==========

// Show conversation log in corner
function showConversationLog(personas) {
  let log = document.getElementById('conversation-log');
  if (!log) {
    log = document.createElement('div');
    log.id = 'conversation-log';
    log.className = 'conversation-log';
    document.body.appendChild(log);
  }
  
  const names = personas.map(p => `<span style="color:${p.color || '#fff'}">${p.name}</span>`).join(' & ');
  
  log.innerHTML = `
    <div class="conv-log-header">
      <span>💬 ${names}</span>
      <button class="conv-log-close" onclick="window.closeConversationLog()">×</button>
    </div>
    <div class="conv-log-messages" id="conv-log-messages"></div>
  `;
  
  log.classList.remove('hidden');
  log.classList.add('visible');
}

// Add message to log
function addToConversationLog(speakerId, text, color, name) {
  const container = document.getElementById('conv-log-messages');
  if (!container) return;
  
  const msg = document.createElement('div');
  msg.className = 'conv-log-msg';
  msg.innerHTML = `<span class="conv-log-name" style="color:${color}">${name}:</span> ${text}`;
  container.appendChild(msg);
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
  
  // Animate in
  msg.style.opacity = '0';
  msg.style.transform = 'translateX(-10px)';
  requestAnimationFrame(() => {
    msg.style.transition = 'all 0.3s ease';
    msg.style.opacity = '1';
    msg.style.transform = 'translateX(0)';
  });
}

// Hide conversation log
function hideConversationLog() {
  const log = document.getElementById('conversation-log');
  if (log) {
    log.classList.remove('visible');
    log.classList.add('hidden');
  }
}

// Global close function
window.closeConversationLog = function() {
  hideConversationLog();
};

// ========== Join Conversation UI ==========

// Show join dialog with conversation history
window.showJoinConversationDialog = function(participants) {
  const messages = getCurrentConversationMessages();
  
  let dialog = document.getElementById('join-conversation-dialog');
  if (!dialog) {
    dialog = document.createElement('div');
    dialog.id = 'join-conversation-dialog';
    dialog.className = 'join-conversation-dialog';
    document.body.appendChild(dialog);
  }
  
  const names = participants.map(p => 
    `<span style="color:${p.color || '#ff9900'}">${p.name}</span>`
  ).join(' & ');
  
  // Show last few messages
  const recentMessages = messages.slice(-6);
  const historyHtml = recentMessages.length > 0 
    ? recentMessages.map(m => 
        `<div class="join-msg"><span style="color:${m.color}">${m.name}:</span> ${m.text}</div>`
      ).join('')
    : '<div class="join-msg">*The conversation just started...*</div>';
  
  dialog.innerHTML = `
    <div class="join-dialog-content">
      <div class="join-dialog-header">
        <span>🗣️ Ongoing Conversation</span>
        <button class="join-dialog-close" onclick="window.closeJoinDialog()">×</button>
      </div>
      <div class="join-dialog-participants">${names} are talking.</div>
      <div class="join-dialog-history">
        <div class="join-history-label">Recent:</div>
        ${historyHtml}
      </div>
      <div class="join-dialog-actions">
        <button class="join-btn primary" onclick="window.doJoinConversation()">Join Conversation</button>
        <button class="join-btn" onclick="window.closeJoinDialog()">Just Watch</button>
      </div>
    </div>
  `;
  
  dialog.classList.remove('hidden');
  dialog.classList.add('visible');
};

window.closeJoinDialog = function() {
  const dialog = document.getElementById('join-conversation-dialog');
  if (dialog) {
    dialog.classList.remove('visible');
    dialog.classList.add('hidden');
  }
};

window.doJoinConversation = function() {
  window.closeJoinDialog();
  // The actual join is handled by chat.js openPersonaChat
  if (window.onJoinConversation) {
    window.onJoinConversation();
  }
};

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
  
  // Background
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

// Cleanup expired bubbles
export function cleanupBubbles() {
  const now = Date.now();
  for (const [id, bubble] of speechBubbles) {
    if (hoveredBubbleId === id) continue;
    if (now > bubble.expires) {
      speechBubbles.delete(id);
    }
  }
  
  // Also check for stuck conversations
  checkStuckConversations();
}
