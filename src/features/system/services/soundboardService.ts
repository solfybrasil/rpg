// Sintetizador procedural Web Audio API para a Mesa de Sons (Soundboard)

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeLoopNodes: { osc?: OscillatorNode; gain?: GainNode; lfo?: OscillatorNode }[] = [];
let activeLoopKey: string | null = null;
let loopVolume = 0.5;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = loopVolume;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export interface SoundAtmosphereDef {
  id: string;
  name: string;
  category: 'ambiente' | 'sfx';
  icon: string;
  description: string;
}

export const ATMOSPHERES: SoundAtmosphereDef[] = [
  { id: 'tavern', name: 'Lareira & Taverna', category: 'ambiente', icon: '🔥', description: 'Calor de brasas e aconchego de estalagem' },
  { id: 'chapel', name: 'Santuário & Sino', category: 'ambiente', icon: '🔔', description: 'Ressonância sacra de abóbada e pedra antiga' },
  { id: 'plague', name: 'Sussurros da Peste', category: 'ambiente', icon: '☣️', description: 'Dissonâncias, dor do voto quebrado e aflição' },
  { id: 'catacombs', name: 'Catacumbas Fúnebres', category: 'ambiente', icon: '💀', description: 'Vento gélido subterrâneo e eco de túmulos' },
  { id: 'rain', name: 'Chuva & Tempestade', category: 'ambiente', icon: '🌧️', description: 'Chuva densa e trovões distantes nos ermos' },
  { id: 'war', name: 'Campo de Batalha', category: 'ambiente', icon: '⚔️', description: 'Clamor de guerra, fúria e tensão metálica' },
];

export const SFX_ITEMS: SoundAtmosphereDef[] = [
  { id: 'dice', name: 'Rolagem de Dados', category: 'sfx', icon: '🎲', description: 'Ruído de dados de marfim rolando sobre carvalho' },
  { id: 'sword', name: 'Lâmina & Aço', category: 'sfx', icon: '🗡️', description: 'Desembainhar afiado de espada de ferro' },
  { id: 'shield', name: 'Impacto & Escudo', category: 'sfx', icon: '🛡️', description: 'Golpe seco bloqueado em madeira reforçada' },
  { id: 'plague_stab', name: 'Agonia da Peste', category: 'sfx', icon: '🩸', description: 'Estalo de carne e dor da corrupção' },
  { id: 'spell', name: 'Ressonância Rúnica', category: 'sfx', icon: '✨', description: 'Ondulação arcana de poder primordial' },
  { id: 'death', name: 'Sino dos Mortos', category: 'sfx', icon: '🕯️', description: 'Pedalada fúnebre para um jurado caído' },
];

export function stopAtmosphere() {
  activeLoopNodes.forEach(({ osc, gain, lfo }) => {
    try { osc?.stop(); } catch {}
    try { lfo?.stop(); } catch {}
    try { osc?.disconnect(); } catch {}
    try { gain?.disconnect(); } catch {}
    try { lfo?.disconnect(); } catch {}
  });
  activeLoopNodes = [];
  activeLoopKey = null;
}

export function getActiveAtmosphere(): string | null {
  return activeLoopKey;
}

export function setSoundboardVolume(vol: number) {
  loopVolume = Math.max(0, Math.min(1, vol));
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(loopVolume, audioCtx.currentTime);
  }
}

export function getSoundboardVolume(): number {
  return loopVolume;
}

export function playAtmosphere(id: string) {
  if (activeLoopKey === id) {
    stopAtmosphere();
    return;
  }
  stopAtmosphere();

  const ctx = getContext();
  if (!ctx || !masterGain) return;

  activeLoopKey = id;
  const now = ctx.currentTime;

  if (id === 'tavern') {
    // Brasas crepitantes: oscilador senoidal grave modulado
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(65, now);
    gain1.gain.setValueAtTime(0.04, now);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.3, now);
    lfoGain.gain.setValueAtTime(0.02, now);
    lfo.connect(lfoGain);
    lfoGain.connect(gain1.gain);

    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start();
    lfo.start();
    activeLoopNodes.push({ osc: osc1, gain: gain1, lfo });
  } else if (id === 'chapel') {
    // Ressonância sacra (C3 + G3)
    [130.81, 196.00].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.035, now);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      activeLoopNodes.push({ osc, gain });
    });
  } else if (id === 'plague') {
    // Frequências dissonantes (44Hz e 46.5Hz)
    [44, 46.5].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.025, now);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      activeLoopNodes.push({ osc, gain });
    });
  } else if (id === 'catacombs') {
    // Sub-grave cavernoso
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(36, now);
    gain.gain.setValueAtTime(0.06, now);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    activeLoopNodes.push({ osc, gain });
  } else if (id === 'rain') {
    // Chuva contínua (triângulo rápido modulado)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, now);
    gain.gain.setValueAtTime(0.03, now);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(2.5, now);
    lfoGain.gain.setValueAtTime(0.015, now);
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    lfo.start();
    activeLoopNodes.push({ osc, gain, lfo });
  } else if (id === 'war') {
    // Drones marciais e tensão
    [55, 82.4].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.02, now);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      activeLoopNodes.push({ osc, gain });
    });
  }
}

export function playSFX(id: string) {
  const ctx = getContext();
  if (!ctx || !masterGain) return;
  const now = ctx.currentTime;

  if (id === 'dice') {
    // Ruído percussivo de dados rolando
    const numClicks = 4;
    for (let i = 0; i < numClicks; i++) {
      const t = now + i * 0.07 + Math.random() * 0.03;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + Math.random() * 160, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  } else if (id === 'sword') {
    // Desembainhar metálico agudo
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(3600, now + 0.15);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (id === 'shield') {
    // Golpe seco e abafado
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.18);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  } else if (id === 'plague_stab') {
    // Dissonância descrescente de agonia
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.4);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.45);
  } else if (id === 'spell') {
    // Arpejo cintilante
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const t = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } else if (id === 'death') {
    // Sino sepulcral profundo (110Hz e 220Hz com decaimento longo)
    [110, 220].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.2);
    });
  }
}

export const playProceduralSfx = playSFX;
