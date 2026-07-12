import { defaultLipState } from "./defaults";
import type { LipState, Settings } from "./types";

type AudioListener = (state: LipState) => void;

export class LipSyncAudio {
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private stream?: MediaStream;
  private data?: Uint8Array<ArrayBuffer>;
  private freq?: Uint8Array<ArrayBuffer>;
  private raf = 0;
  private running = false;
  private lastOpen = 0;
  private lastRms = 0;
  private state: LipState = { ...defaultLipState };

  constructor(
    private getSettings: () => Settings,
    private listener: AudioListener
  ) {}

  async listInputs() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "audioinput");
  }

  async start(deviceId?: string) {
    await this.stop();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    this.context = new AudioContext();
    const source = this.context.createMediaStreamSource(this.stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.58;
    source.connect(this.analyser);
    this.data = new Uint8Array(this.analyser.fftSize);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    if (this.context.state === "suspended") await this.context.resume();
    this.running = true;
    this.tick();
  }

  async stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    if (this.context && this.context.state !== "closed") await this.context.close();
    this.context = undefined;
    this.lastOpen = 0;
    this.lastRms = 0;
    this.state = { ...defaultLipState };
    this.listener({ ...defaultLipState });
  }

  private tick = () => {
    if (!this.running || !this.analyser || !this.data || !this.freq) return;
    this.analyser.getByteTimeDomainData(this.data);
    this.analyser.getByteFrequencyData(this.freq);
    this.state = this.analyze(this.data, this.freq);
    this.listener(this.state);
    this.raf = requestAnimationFrame(this.tick);
  };

  private analyze(wave: Uint8Array<ArrayBuffer>, freq: Uint8Array<ArrayBuffer>): LipState {
    const settings = this.getSettings();
    let sum = 0;
    let peak = 0;
    for (const value of wave) {
      const sample = (value - 128) / 128;
      sum += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }
    const rms = Math.sqrt(sum / wave.length);
    const gate = settings.mouth.noiseGate;
    const gated = Math.max(0, rms - gate);
    const normalized = Math.min(1, gated * settings.mouth.sensitivity * 8.5);
    const attack = rms > this.lastRms ? settings.mouth.openSpeed : settings.mouth.closeSpeed;
    const smoothedRms = this.lastRms + (rms - this.lastRms) * Math.max(0.05, attack);
    this.lastRms = smoothedRms;

    const low = bandEnergy(freq, 0, 9);
    const mid = bandEnergy(freq, 10, 38);
    const high = bandEnergy(freq, 39, 120);
    const total = Math.max(1, low + mid + high);
    const lowRatio = low / total;
    const midRatio = mid / total;
    const highRatio = high / total;
    const onset = Math.max(0, rms - this.state.rms) * 8;
    const targetOpen = Math.min(settings.mouth.maxOpen, normalized + onset * 0.25);
    const openSpeed = targetOpen > this.lastOpen ? settings.mouth.openSpeed : settings.mouth.closeSpeed;
    this.lastOpen += (targetOpen - this.lastOpen) * openSpeed;

    const silent = rms < gate;
    const mouthOpen = silent ? Math.max(settings.mouth.minOpen, this.lastOpen * 0.65) : this.lastOpen;
    return {
      rms,
      peak,
      mouthOpen,
      mouthWide: clamp(0.42 + highRatio * 0.95 + midRatio * 0.22 - lowRatio * 0.2, 0.18, 1),
      mouthRound: clamp(0.08 + lowRatio * 1.1 - highRatio * 0.35, 0, 1),
      smile: clamp(0.04 + midRatio * 0.12, 0, 0.25),
      talkIntensity: clamp(normalized, 0, 1),
      silent
    };
  }
}

function bandEnergy(freq: Uint8Array<ArrayBuffer>, start: number, end: number) {
  let sum = 0;
  const last = Math.min(freq.length - 1, end);
  for (let i = start; i <= last; i += 1) sum += freq[i] / 255;
  return sum / Math.max(1, last - start + 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
