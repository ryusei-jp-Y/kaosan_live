import type { LipState, Settings } from "./types";

type Payload =
  | { type: "settings"; settings: Settings }
  | { type: "lip"; lip: LipState }
  | { type: "manualLip"; enabled: boolean; lip: LipState };

export const bus = new BroadcastChannel("kaosan-live-state");

export function publishSettings(settings: Settings) {
  bus.postMessage({ type: "settings", settings } satisfies Payload);
}

export function publishLip(lip: LipState) {
  bus.postMessage({ type: "lip", lip } satisfies Payload);
}

export function publishManualLip(enabled: boolean, lip: LipState) {
  bus.postMessage({ type: "manualLip", enabled, lip } satisfies Payload);
}

export function listenBus(handler: (payload: Payload) => void) {
  bus.addEventListener("message", (event: MessageEvent<Payload>) => handler(event.data));
}
