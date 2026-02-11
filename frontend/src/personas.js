// Mastermind Personas Configuration
// Voice IDs from ElevenLabs (cloned voices)

export const PERSONAS = [
  // Marketing Masters
  {
    id: 'hormozi',
    name: 'Alex Hormozi',
    color: '#ff6600',
    role: 'Business & Offers',
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Placeholder - update with real ID
    greeting: "What's up! Let's talk about how to make your offer so good people feel stupid saying no."
  },
  {
    id: 'robbins',
    name: 'Tony Robbins',
    color: '#ff9900',
    role: 'Peak Performance',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    greeting: "Hey! Remember - it's not about resources, it's about resourcefulness!"
  },
  {
    id: 'kennedy',
    name: 'Dan Kennedy',
    color: '#cc6600',
    role: 'Direct Response',
    voiceId: 'VR6AewLTigWG4xSOukaG',
    greeting: "Listen, most marketing is garbage. Let me show you what actually works."
  },
  {
    id: 'abraham',
    name: 'Jay Abraham',
    color: '#996633',
    role: 'Strategy & Growth',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    greeting: "The biggest breakthroughs come from preeminence. Let me explain..."
  },
  {
    id: 'halbert',
    name: 'Gary Halbert',
    color: '#cc9933',
    role: 'Copywriting Legend',
    voiceId: 'ErXwobaYiN019PkySvjV',
    greeting: "Grab a cup of coffee. I'm gonna teach you how to write words that sell."
  },
  
  // Mindset & Philosophy
  {
    id: 'goggins',
    name: 'David Goggins',
    color: '#cc0000',
    role: 'Mental Toughness',
    voiceId: 'VR6AewLTigWG4xSOukaG',
    greeting: "Stay hard! Your mind is trying to protect you, but you gotta callous it."
  },
  {
    id: 'rosenberg',
    name: 'Marshall Rosenberg',
    color: '#cc99ff',
    role: 'Nonviolent Communication',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    greeting: "When we focus on feelings and needs, connection becomes natural."
  },
  {
    id: 'naval',
    name: 'Naval Ravikant',
    color: '#3399ff',
    role: 'Wealth & Wisdom',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    greeting: "Seek wealth, not money or status. Wealth is assets that earn while you sleep."
  },
  {
    id: 'franklin',
    name: 'Ben Franklin',
    color: '#ffcc00',
    role: 'Founding Wisdom',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    greeting: "An investment in knowledge pays the best interest, my friend."
  },
  {
    id: 'lewis',
    name: 'C.S. Lewis',
    color: '#9966cc',
    role: 'Faith & Reason',
    voiceId: 'VR6AewLTigWG4xSOukaG',
    greeting: "You can't go back and change the beginning, but you can start where you are."
  },
  
  // Modern Visionaries
  {
    id: 'musk',
    name: 'Elon Musk',
    color: '#00cc66',
    role: 'Innovation & Scale',
    voiceId: 'ErXwobaYiN019PkySvjV', // Stock voice (TOS blocked cloning)
    greeting: "The thing about... um... first principles is you have to reason from the ground up."
  },
  {
    id: 'mises',
    name: 'Ludwig von Mises',
    color: '#6699cc',
    role: 'Economics',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    greeting: "Human action is purposeful behavior. Let us examine the economics of your situation."
  },
  {
    id: 'adams',
    name: 'Scott Adams',
    color: '#ff6699',
    role: 'Systems & Persuasion',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    greeting: "Goals are for losers. Systems are for winners. Let me show you why."
  },
  
  // New Additions
  {
    id: 'munger',
    name: 'Charlie Munger',
    color: '#8b4513',
    role: 'Mental Models',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    greeting: "Invert, always invert. Tell me what would guarantee failure, and we'll avoid that."
  },
  {
    id: 'aurelius',
    name: 'Marcus Aurelius',
    color: '#4a4a4a',
    role: 'Stoic Philosophy',
    voiceId: 'VR6AewLTigWG4xSOukaG',
    greeting: "You have power over your mind—not outside events. Realize this, and you will find strength."
  },
  {
    id: 'feynman',
    name: 'Richard Feynman',
    color: '#00aaff',
    role: 'First Principles',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    greeting: "See, the thing is... if you can't explain it simply, you don't understand it well enough!"
  },
  {
    id: 'dalio',
    name: 'Ray Dalio',
    color: '#336699',
    role: 'Principles & Systems',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    greeting: "Pain plus reflection equals progress. Let's diagnose what's really happening here."
  }
];

// Get persona by ID
export function getPersona(id) {
  return PERSONAS.find(p => p.id === id);
}

// Get all persona IDs
export function getPersonaIds() {
  return PERSONAS.map(p => p.id);
}
