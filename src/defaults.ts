import type { LipState, Settings } from "./types";

export const defaultLipState: LipState = {
  rms: 0,
  peak: 0,
  mouthOpen: 0,
  mouthWide: 0.45,
  mouthRound: 0.15,
  smile: 0.08,
  talkIntensity: 0,
  silent: true
};

export const myModelDefaults: Settings = {
  app: { version: "0.1.0" },
  canvas: { width: 1280, height: 720, fps: 60, backgroundColor: "#ffffff" },
  image: {
    path: "",
    x: 640,
    y: 360,
    scale: 1,
    rotation: 0
  },
  mouth: {
    x: 625,
    y: 530,
    width: 145,
    height: 70,
    strokeColor: "#e82030",
    strokeWidth: 12,
    patchWidth: 172,
    patchHeight: 94,
    patchRadius: 24,
    patchColor: "#ffffff",
    sensitivity: 1.28,
    noiseGate: 0.035,
    maxOpen: 0.88,
    minOpen: 0,
    openSpeed: 0.72,
    closeSpeed: 0.36,
    smoothing: 0.78,
    jitter: 0.03
  },
  eyes: {
    leftX: 486,
    leftY: 305,
    rightX: 735,
    rightY: 294,
    width: 66,
    patchHeight: 72,
    patchRadius: 18,
    strokeColor: "#e82030",
    strokeWidth: 12
  },
  blink: {
    enabled: true,
    minInterval: 4.2,
    maxInterval: 8.5,
    duration: 0.16,
    doubleBlinkChance: 0.08
  },
  motion: {
    idleBobAmount: 0.8,
    idleBobSpeed: 0.48,
    talkBounceAmount: 1.4,
    talkBounceSpeed: 1.2,
    blinkDipAmount: 0.8,
    jitterAmount: 0.03
  },
  output: {
    alwaysOnTop: false,
    fullscreen: false,
    debug: false,
    showControlUi: true
  }
};

export function mergeSettings(settings: Partial<Settings>): Settings {
  const base = myModelDefaults;
  return {
    ...base,
    ...settings,
    app: { ...base.app, ...settings.app },
    canvas: { ...base.canvas, ...settings.canvas },
    image: { ...base.image, ...settings.image },
    mouth: { ...base.mouth, ...settings.mouth },
    eyes: { ...base.eyes, ...settings.eyes },
    blink: { ...base.blink, ...settings.blink },
    motion: { ...base.motion, ...settings.motion },
    output: { ...base.output, ...settings.output }
  };
}
