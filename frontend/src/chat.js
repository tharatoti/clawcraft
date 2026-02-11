// Persona Chat System
// Text and audio interaction with Mastermind personas

import { getPersona } from './personas.js';

export class PersonaChat {
  constructor() {
    this.activePersona = null;
    this.isAudioMode = false;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.chatHistory = new Map(); // persona id -> messages
    
    this.createChatPanel();
    this.setupAudio();
  }
  
  createChatPanel() {
    const panel = document.createElement('div');
    panel.id = 'persona-chat';
    panel.className = 'lcars-panel hidden';
    panel.innerHTML = `
      <div class="chat-header">
        <div class="persona-avatar" id="chat-avatar"></div>
        <div class="persona-info">
          <div class="persona-name" id="chat-persona-name">PERSONA</div>
          <div class="persona-role" id="chat-persona-role">Role</div>
        </div>
        <div class="chat-controls">
          <button class="mode-toggle" id="mode-toggle" title="Toggle Text/Audio">
            <span class="mode-text">💬</span>
            <span class="mode-audio hidden">🎤</span>
          </button>
          <button class="chat-close" onclick="window.closeChat()">×</button>
        </div>
      </div>
      
      <div class="chat-messages" id="chat-messages">
        <!-- Messages will be inserted here -->
      </div>
      
      <div class="chat-input-area">
        <div class="text-input-wrapper" id="text-input-wrapper">
          <input type="text" id="chat-input" placeholder="Type a message..." />
          <button id="send-btn" onclick="window.sendChatMessage()">Send</button>
        </div>
        
        <div class="audio-input-wrapper hidden" id="audio-input-wrapper">
          <button id="hello-btn" class="hello-btn" onclick="window.playPersonaHello()">
            👋 Say Hello
          </button>
          <button id="ptt-btn" class="ptt-btn">
            🎤 Push to Talk
          </button>
          <div class="recording-indicator hidden" id="recording-indicator">
            <span class="pulse"></span> Recording...
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Setup event listeners
    document.getElementById('mode-toggle').addEventListener('click', () => this.toggleMode());
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') window.sendChatMessage();
    });
    
    // Push-to-talk
    const pttBtn = document.getElementById('ptt-btn');
    pttBtn.addEventListener('mousedown', () => this.startRecording());
    pttBtn.addEventListener('mouseup', () => this.stopRecording());
    pttBtn.addEventListener('mouseleave', () => this.stopRecording());
    
    // Touch support
    pttBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.startRecording(); });
    pttBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.stopRecording(); });
  }
  
  async setupAudio() {
    try {
      // Request microphone permission
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.warn('Microphone not available:', e);
    }
  }
  
  openChat(personaId) {
    const persona = getPersona(personaId);
    if (!persona) return;
    
    this.activePersona = persona;
    
    // Update UI
    document.getElementById('chat-avatar').style.backgroundColor = persona.color;
    document.getElementById('chat-persona-name').textContent = persona.name;
    document.getElementById('chat-persona-role').textContent = persona.role;
    
    // Load chat history
    const messages = this.chatHistory.get(personaId) || [];
    this.renderMessages(messages);
    
    // Show panel
    document.getElementById('persona-chat').classList.remove('hidden');
  }
  
  async closeChat() {
    document.getElementById('persona-chat').classList.add('hidden');
    
    // Log the chat session to Discord
    if (this.activePersona) {
      const messages = this.chatHistory.get(this.activePersona.id) || [];
      if (messages.length > 0) {
        try {
          await fetch('/api/chat/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              personaId: this.activePersona.id,
              personaName: this.activePersona.name,
              messages: messages.map(m => ({
                role: m.role,
                content: m.content
              }))
            })
          });
          console.log(`Chat session logged for ${this.activePersona.name}`);
        } catch (e) {
          console.error('Failed to log chat session:', e);
        }
      }
    }
    
    // Resume the avatar that was chatting
    if (window.currentChattingUnit) {
      window.currentChattingUnit.status = 'idle';
      window.currentChattingUnit = null;
    }
    
    this.activePersona = null;
  }
  
  toggleMode() {
    this.isAudioMode = !this.isAudioMode;
    
    const textMode = document.querySelector('.mode-text');
    const audioMode = document.querySelector('.mode-audio');
    const textInput = document.getElementById('text-input-wrapper');
    const audioInput = document.getElementById('audio-input-wrapper');
    
    if (this.isAudioMode) {
      textMode.classList.add('hidden');
      audioMode.classList.remove('hidden');
      textInput.classList.add('hidden');
      audioInput.classList.remove('hidden');
    } else {
      textMode.classList.remove('hidden');
      audioMode.classList.add('hidden');
      textInput.classList.remove('hidden');
      audioInput.classList.add('hidden');
    }
  }
  
  addMessage(role, content, audioUrl = null) {
    if (!this.activePersona) return;
    
    const messages = this.chatHistory.get(this.activePersona.id) || [];
    messages.push({ role, content, audioUrl, timestamp: Date.now() });
    this.chatHistory.set(this.activePersona.id, messages);
    
    this.renderMessages(messages);
  }
  
  renderMessages(messages) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = messages.map(msg => `
      <div class="chat-message ${msg.role}">
        <div class="message-content">${msg.content}</div>
        ${msg.audioUrl ? `
          <audio controls src="${msg.audioUrl}" class="message-audio"></audio>
        ` : ''}
        <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
      </div>
    `).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }
  
  async sendMessage(text) {
    if (!this.activePersona || !text.trim()) return;
    
    // Add user message
    this.addMessage('user', text);
    
    // Send to backend for AI response
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: this.activePersona.id,
          message: text,
          audioMode: this.isAudioMode
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        this.addMessage('assistant', data.text, data.audioUrl);
        
        // Auto-play audio if in audio mode
        if (this.isAudioMode && data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audio.play();
        }
      } else {
        // Fallback: simulate response
        this.simulateResponse(text);
      }
    } catch (e) {
      // Fallback: simulate response
      this.simulateResponse(text);
    }
    
    // Clear input
    document.getElementById('chat-input').value = '';
  }
  
  simulateResponse(userMessage) {
    // Simple fallback responses based on persona
    const persona = this.activePersona;
    let response = '';
    
    switch (persona.id) {
      case 'hormozi':
        response = "Here's the thing about that - you need to make your offer so valuable that people feel stupid saying no. What's the transformation you're promising?";
        break;
      case 'goggins':
        response = "STAY HARD! That's exactly the kind of thinking that separates the 1% from everyone else. Now what are you gonna do about it?";
        break;
      case 'naval':
        response = "Interesting question. Remember, specific knowledge is found by pursuing your genuine curiosity and passion rather than whatever is hot right now.";
        break;
      case 'musk':
        response = "Well... the, uh, first principles approach would be to break that down into the fundamental truths and reason up from there.";
        break;
      default:
        response = `That's an interesting point. From my perspective on ${persona.role.toLowerCase()}, I'd say you're on the right track.`;
    }
    
    setTimeout(() => {
      this.addMessage('assistant', response);
    }, 500 + Math.random() * 1000);
  }
  
  async playHello() {
    if (!this.activePersona) return;
    
    this.addMessage('assistant', this.activePersona.greeting);
    
    // Try to play TTS
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: this.activePersona.greeting,
          voiceId: this.activePersona.voiceId
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        audio.play();
      }
    } catch (e) {
      console.warn('TTS not available');
    }
  }
  
  async startRecording() {
    if (!this.audioStream || this.isRecording) return;
    
    this.isRecording = true;
    this.audioChunks = [];
    
    document.getElementById('recording-indicator').classList.remove('hidden');
    document.getElementById('ptt-btn').classList.add('recording');
    
    this.mediaRecorder = new MediaRecorder(this.audioStream);
    this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);
    this.mediaRecorder.onstop = () => this.processRecording();
    this.mediaRecorder.start();
  }
  
  stopRecording() {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    document.getElementById('recording-indicator').classList.add('hidden');
    document.getElementById('ptt-btn').classList.remove('recording');
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }
  
  async processRecording() {
    const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
    
    // Send to backend for transcription + response
    try {
      const formData = new FormData();
      formData.append('audio', blob);
      formData.append('personaId', this.activePersona.id);
      
      const response = await fetch('/api/voice-chat', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        this.addMessage('user', data.transcription);
        this.addMessage('assistant', data.response, data.audioUrl);
        
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audio.play();
        }
      }
    } catch (e) {
      // Fallback
      this.addMessage('user', '[Voice message]');
      this.simulateResponse('voice input');
    }
  }
}

// Global instance
let chatInstance = null;

export function initChat() {
  chatInstance = new PersonaChat();
  
  // Expose to window for onclick handlers
  window.closeChat = () => chatInstance.closeChat();
  window.sendChatMessage = () => {
    const input = document.getElementById('chat-input');
    chatInstance.sendMessage(input.value);
  };
  window.playPersonaHello = () => chatInstance.playHello();
  window.openPersonaChat = (id) => chatInstance.openChat(id);
  
  // Join ongoing conversation
  window.joinConversationUI = (participants) => {
    // Show a modal to let user join the conversation
    let modal = document.getElementById('join-conversation-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'join-conversation-modal';
      modal.className = 'join-conversation-modal';
      document.body.appendChild(modal);
    }
    
    const names = participants.map(p => `<span style="color:${p.color}">${p.name}</span>`).join(' & ');
    
    modal.innerHTML = `
      <div class="join-modal-content">
        <h3>🗣️ Ongoing Conversation</h3>
        <p>${names} are talking.</p>
        <p>Would you like to join?</p>
        <div class="join-modal-buttons">
          <button onclick="window.joinActiveConversation('${participants.map(p=>p.id).join(',')}')">Join Conversation</button>
          <button onclick="this.parentElement.parentElement.parentElement.classList.add('hidden')">Just Watch</button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  };
  
  // Actually join the conversation
  window.joinActiveConversation = async (participantIds) => {
    const ids = participantIds.split(',');
    document.getElementById('join-conversation-modal')?.classList.add('hidden');
    
    // Open a group chat with all participants
    // For now, open chat with the first persona
    if (ids.length > 0 && chatInstance) {
      chatInstance.openChat(ids[0]);
      chatInstance.addMessage('system', `You joined a conversation with ${ids.length} personas. Say something!`);
    }
  };
  
  return chatInstance;
}
