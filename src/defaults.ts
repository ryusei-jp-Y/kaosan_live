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

export function mergeSettings(settings: Settings): Settings {
  const base: Settings = {
    app: { version: "0.1.0" },
    canvas: { width: 1280, height: 720, fps: 60, backgroundColor: "#00ff00" },
    image: { path: "", x: 640, y: 360, scale: 1, rotation: 0 },
    mouth: {
      x: 640,
      y: 430,
      width: 120,
      height: 58,
      strokeColor: "#241a1a",
      strokeWidth: 8,
      patchWidth: 160,
      patchHeight: 88,
      patchColor: "#ffffff",
      sensitivity: 1.15,
      noiseGate: 0.04,
      maxOpen: 1,
      minOpen: 0,
      openSpeed: 0.65,
      closeSpeed: 0.28,
      smoothing: 0.72,
      jitter: 0.08
    },
    eyes: {
      leftX: 585,
      leftY: 330,
      rightX: 695,
      rightY: 330,
      width: 56,
      patchHeight: 42,
      strokeColor: "#241a1a",
      strokeWidth: 7
    },
    blink: {
      enabled: true,
      minInterval: 3,
      maxInterval: 7,
      duration: 0.18,
      doubleBlinkChance: 0.12
    },
    motion: {
      idleBobAmount: 1.5,
      idleBobSpeed: 0.6,
      talkBounceAmount: 2.5,
      talkBounceSpeed: 1.2,
      blinkDipAmount: 1,
      jitterAmount: 0.08
    },
    output: {
      alwaysOnTop: false,
      fullscreen: false,
      debug: false,
      showControlUi: true
    }
  };
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
