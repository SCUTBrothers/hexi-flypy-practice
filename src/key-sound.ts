export type KeyVoice = "off" | "wood" | "switch";
export type KeySound = { voice: KeyVoice; volume: number };
export const soundPreference = "hexi-key-sound-v1";

export function readKeySound(): KeySound {
  try {
    const saved = JSON.parse(localStorage.getItem(soundPreference) ?? "null");
    return {
      voice: saved?.voice === "wood" || saved?.voice === "switch" ? saved.voice : "off",
      volume: [0.25, 0.5, 0.85].includes(saved?.volume) ? saved.volume : 0.5,
    };
  } catch {
    return { voice: "off", volume: 0.5 };
  }
}

let context: AudioContext | undefined;
let noise: AudioBuffer | undefined;

export function playKeySound({ voice, volume }: KeySound, wrong = false) {
  if (voice === "off" || typeof AudioContext === "undefined") return;
  try {
    context ??= new AudioContext({ latencyHint: "interactive" });
    if (context.state === "suspended") void context.resume().catch(() => {});
    if (!noise) {
      noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.045), context.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const now = context.currentTime;
    const decay = wrong ? 0.075 : voice === "wood" ? 0.045 : 0.028;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.24 * volume, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    gain.connect(context.destination);

    const body = context.createOscillator();
    body.type = wrong ? "triangle" : "sine";
    body.frequency.setValueAtTime(wrong ? 145 : voice === "wood" ? 720 : 1250, now);
    body.frequency.exponentialRampToValueAtTime(wrong ? 85 : 180, now + decay);
    body.connect(gain);
    body.start(now);
    body.stop(now + decay);

    const click = context.createBufferSource();
    click.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = wrong ? 420 : voice === "wood" ? 1200 : 3400;
    click.connect(filter).connect(gain);
    click.start(now);
    click.stop(now + decay);
    body.onended = () => {
      body.disconnect();
      click.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  } catch {
    // The OS can suspend or refuse audio while the keyboard remains available.
  }
}
