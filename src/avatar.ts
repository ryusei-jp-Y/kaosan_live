import "./styles/avatar.css";
import { listenBus } from "./bus";
import { defaultLipState, mergeSettings } from "./defaults";
import { AvatarRenderer } from "./avatarRenderer";

async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>("#avatar-canvas");
  if (!canvas) throw new Error("Avatar canvas not found.");
  let settings = mergeSettings(await window.kaosan.loadSettings());
  let latestLip = { ...defaultLipState };
  let manualLipEnabled = false;
  const renderer = new AvatarRenderer({ canvas, settings });
  renderer.start();

  window.kaosan.onSettingsUpdated((next) => {
    settings = mergeSettings(next);
    renderer.updateSettings(settings);
  });

  listenBus((payload) => {
    if (payload.type === "settings") {
      settings = mergeSettings(payload.settings);
      renderer.updateSettings(settings);
    }
    if (payload.type === "lip") {
      latestLip = payload.lip;
      if (!manualLipEnabled) renderer.updateLip(latestLip);
    }
    if (payload.type === "manualLip") {
      manualLipEnabled = payload.enabled;
      renderer.updateLip(manualLipEnabled ? payload.lip : latestLip);
    }
  });

  window.addEventListener("resize", () => renderer.updateSettings(settings));
}

main();
