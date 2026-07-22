export type Settings = {
  app: { version: string };
  canvas: { width: number; height: number; fps: number; backgroundColor: string };
  image: { path: string; x: number; y: number; scale: number; rotation: number };
  mouth: {
    x: number;
    y: number;
    width: number;
    height: number;
    strokeColor: string;
    strokeWidth: number;
    patchWidth: number;
    patchHeight: number;
    patchRadius: number;
    patchColor: string;
    sensitivity: number;
    noiseGate: number;
    maxOpen: number;
    minOpen: number;
    openSpeed: number;
    closeSpeed: number;
    smoothing: number;
    jitter: number;
  };
  eyes: {
    leftX: number;
    leftY: number;
    rightX: number;
    rightY: number;
    width: number;
    patchHeight: number;
    patchRadius: number;
    strokeColor: string;
    strokeWidth: number;
  };
  blink: {
    enabled: boolean;
    minInterval: number;
    maxInterval: number;
    duration: number;
    doubleBlinkChance: number;
  };
  motion: {
    idleBobAmount: number;
    idleBobSpeed: number;
    talkBounceAmount: number;
    talkBounceSpeed: number;
    blinkDipAmount: number;
    jitterAmount: number;
  };
  output: {
    alwaysOnTop: boolean;
    fullscreen: boolean;
    debug: boolean;
    showControlUi: boolean;
  };
};

export type LipState = {
  rms: number;
  peak: number;
  mouthOpen: number;
  mouthWide: number;
  mouthRound: number;
  smile: number;
  talkIntensity: number;
  silent: boolean;
};

export type BlinkState = "open" | "half" | "closed";

declare global {
  interface Window {
    kaosan: {
      loadSettings: () => Promise<Settings>;
      saveSettings: (settings: Settings) => Promise<{ ok: boolean; path: string }>;
      openImage: () => Promise<string>;
      openSettingsFile: () => Promise<Settings | null>;
      saveSettingsAs: (settings: Settings) => Promise<string>;
      openAvatarWindow: (settings: Settings) => Promise<boolean>;
      onSettingsUpdated: (callback: (settings: Settings) => void) => void;
    };
  }
}
