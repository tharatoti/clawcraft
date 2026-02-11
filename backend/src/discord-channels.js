// Discord Channel Mapping for Persona Chats
// Maps persona IDs to their Discord channel IDs

export const PERSONA_CHANNELS = {
  // Existing Masterminds channels
  'hormozi': '1468445852803535142',      // alex-hormozi
  'robbins': '1468445860529701049',       // tony-robbins
  'kennedy': '1468445853537796281',       // dan-kennedy
  'abraham': '1468445858570834123',       // jay-abraham
  'halbert': '1468445856876466246',       // gary-halbert
  'goggins': '1468447063288320001',       // david-goggins
  'rosenberg': '1468447064672440506',     // marshall-rosenberg
  'lewis': '1468447066727383205',         // cs-lewis
  'musk': '1468447067436224649',          // elon-musk
  'mises': '1468447065733337321',         // ludwig-von-mises
  'adams': '1468453843292655716',         // scott-adams
  
  // New personas
  'naval': '1470965918925324511',         // naval-ravikant
  'franklin': '1470965942652637195',      // benjamin-franklin
  'munger': '1470965962458009744',        // charlie-munger
  'aurelius': '1470965981777231963',      // marcus-aurelius
  'feynman': '1470966001477746765',       // richard-feynman
  'dalio': '1470966022944329943'          // ray-dalio
};

// Special channels
export const CASUAL_CONVERSATIONS_CHANNEL = '1470956181936668885';
export const AI_BOARD_CHANNEL = '1468445861821419694';

// Pending messages queue (for polling by gateway)
export const pendingMessages = [];

// Queue a message for Discord posting
export function queueDiscordMessage(channelId, message, personaName = null) {
  if (!channelId) {
    console.log(`No channel configured for posting`);
    return false;
  }
  
  pendingMessages.push({
    id: Date.now().toString(),
    channelId,
    message,
    personaName,
    timestamp: new Date().toISOString()
  });
  
  console.log(`Queued message for channel ${channelId}`);
  return true;
}

// Get and clear pending messages
export function getPendingMessages() {
  const messages = [...pendingMessages];
  pendingMessages.length = 0;
  return messages;
}
