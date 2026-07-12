import "./styles/control.css";
import { AvatarRenderer } from "./avatarRenderer";
import { publishLip, publishManualLip, publishSettings } from "./bus";
import { defaultLipState, mergeSettings } from "./defaults";
import { LipSyncAudio } from "./audio";
import type { LipState, Settings } from "./types";

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (!rootElement) throw new Error("App root not found.");
const app = rootElement;

let settings: Settings;
let renderer: AvatarRenderer | undefined;
let manualLip = false;
let selectedDeviceId = "";
let latestLip: LipState = { ...defaultLipState };

const audio = new LipSyncAudio(
  () => settings,
  (lip) => {
    latestLip = lip;
    if (!manualLip) publishLip(lip);
    renderMeters(lip);
  }
);

async function main() {
  settings = mergeSettings(await window.kaosan.loadSettings());
  app.innerHTML = template();
  mountPreviewRenderer();
  wireUi();
  await refreshDevices();
  publishSettings(settings);
  publishLip(defaultLipState);
}

function mountPreviewRenderer() {
  renderer?.stop();
  const canvas = document.querySelector<HTMLCanvasElement>("#preview-canvas");
  if (!canvas) throw new Error("Preview canvas not found.");
  renderer = new AvatarRenderer({ canvas, settings, preview: true });
  renderer.start();
  renderer.updateLip(manualLip ? currentManualLip() : latestLip);
}

function template() {
  return `
    <main class="shell">
      <section class="preview-panel">
        <div class="preview-topbar">
          <div>
            <h1>Kaosan Live</h1>
            <p>Line-art avatar control</p>
          </div>
          <div class="meter">
            <span>RMS</span>
            <div><i id="rms-bar"></i></div>
          </div>
        </div>
        <canvas id="preview-canvas"></canvas>
        <div class="status" id="status">Ready</div>
      </section>
      <section class="controls">
        ${section("Image", `
          <button id="choose-image">画像選択</button>
          <label>画像パス<input data-path="image.path" value="${escapeAttr(settings.image.path)}" readonly /></label>
          ${range("表示X", "image.x", 0, settings.canvas.width, 1)}
          ${range("表示Y", "image.y", 0, settings.canvas.height, 1)}
          ${range("拡大率", "image.scale", 0.1, 3, 0.01)}
          ${range("回転", "image.rotation", -15, 15, 0.1)}
        `)}
        ${section("Mouth", `
          <div class="grid-2">
            ${range("口X", "mouth.x", 0, settings.canvas.width, 1)}
            ${range("口Y", "mouth.y", 0, settings.canvas.height, 1)}
          </div>
          <div class="grid-2">
            ${range("口幅", "mouth.width", 20, 420, 1)}
            ${range("口高さ", "mouth.height", 8, 220, 1)}
          </div>
          <div class="grid-2">
            ${range("消し幅", "mouth.patchWidth", 20, 520, 1)}
            ${range("消し高さ", "mouth.patchHeight", 10, 260, 1)}
          </div>
          <div class="grid-2">
            ${color("線色", "mouth.strokeColor")}
            ${color("消し色", "mouth.patchColor")}
          </div>
          ${range("線の太さ", "mouth.strokeWidth", 1, 28, 1)}
        `)}
        ${section("Lip Sync", `
          <label>マイク<select id="device-select"></select></label>
          <div class="button-row">
            <button id="mic-on">マイクON</button>
            <button id="mic-off">マイクOFF</button>
          </div>
          ${range("感度", "mouth.sensitivity", 0.2, 3, 0.01)}
          ${range("ノイズゲート", "mouth.noiseGate", 0, 0.18, 0.005)}
          ${range("最大開き", "mouth.maxOpen", 0.1, 1.4, 0.01)}
          ${range("開く速度", "mouth.openSpeed", 0.05, 1, 0.01)}
          ${range("閉じ速度", "mouth.closeSpeed", 0.03, 1, 0.01)}
          ${range("なめらかさ", "mouth.smoothing", 0, 0.94, 0.01)}
          <label class="check"><input id="manual-lip" type="checkbox" /> 手動プレビュー</label>
          ${range("手動Open", "manual.open", 0, 1, 0.01, 0)}
          ${range("手動Wide", "manual.wide", 0, 1, 0.01, 0.5)}
          ${range("手動Round", "manual.round", 0, 1, 0.01, 0.1)}
        `)}
        ${section("Blink", `
          ${checkbox("瞬き有効", "blink.enabled")}
          ${range("最小間隔", "blink.minInterval", 1, 10, 0.1)}
          ${range("最大間隔", "blink.maxInterval", 2, 14, 0.1)}
          ${range("二連続確率", "blink.doubleBlinkChance", 0, 0.6, 0.01)}
          ${range("瞬き速度", "blink.duration", 0.08, 0.5, 0.01)}
          <div class="grid-2">
            ${range("左目X", "eyes.leftX", 0, settings.canvas.width, 1)}
            ${range("右目X", "eyes.rightX", 0, settings.canvas.width, 1)}
          </div>
          ${range("左目Y", "eyes.leftY", 0, settings.canvas.height, 1)}
          ${range("右目Y", "eyes.rightY", 0, settings.canvas.height, 1)}
          ${range("閉じ目幅", "eyes.width", 12, 180, 1)}
          ${range("閉じ目太さ", "eyes.strokeWidth", 1, 24, 1)}
        `)}
        ${section("Motion", `
          ${range("待機揺れ量", "motion.idleBobAmount", 0, 8, 0.1)}
          ${range("待機揺れ速度", "motion.idleBobSpeed", 0.1, 2.5, 0.05)}
          ${range("話し中バウンス", "motion.talkBounceAmount", 0, 10, 0.1)}
          ${range("バウンス速度", "motion.talkBounceSpeed", 0.1, 4, 0.05)}
          ${range("瞬き沈み", "motion.blinkDipAmount", 0, 5, 0.1)}
          ${range("手描き揺らぎ", "motion.jitterAmount", 0, 1.2, 0.01)}
        `)}
        ${section("Output", `
          <label>解像度<select id="resolution">
            <option value="1280x720">1280x720</option>
            <option value="1920x1080">1920x1080</option>
          </select></label>
          <label>FPS<select data-path="canvas.fps">
            <option value="30">30</option>
            <option value="60">60</option>
          </select></label>
          ${color("背景色", "canvas.backgroundColor")}
          ${checkbox("常に最前面", "output.alwaysOnTop")}
          ${checkbox("フルスクリーン", "output.fullscreen")}
          ${checkbox("デバッグ表示", "output.debug")}
          <div class="button-row">
            <button id="open-avatar">Avatar Window起動</button>
          </div>
          <div class="button-row">
            <button id="save">設定保存</button>
            <button id="save-as">別名保存</button>
            <button id="load">設定読み込み</button>
          </div>
        `)}
        ${section("OBS", `
          <ol>
            <li>Avatar Windowを起動</li>
            <li>OBSのウィンドウキャプチャで選択</li>
            <li>OBS Virtual Cameraを開始</li>
            <li>ZoomでOBS Virtual Cameraを選択</li>
          </ol>
        `)}
      </section>
    </main>
  `;
}

function wireUi() {
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-path]").forEach((input) => {
    const path = input.dataset.path!;
    if (path.startsWith("manual.")) return;
    if (input instanceof HTMLSelectElement) input.value = String(getValue(path));
    input.addEventListener("input", () => {
      setValue(path, coerceValue(input));
      changed();
    });
  });

  document.querySelector("#resolution")?.addEventListener("change", (event) => {
    const [width, height] = (event.target as HTMLSelectElement).value.split("x").map(Number);
    settings.canvas.width = width;
    settings.canvas.height = height;
    changed();
  });
  const resolution = document.querySelector<HTMLSelectElement>("#resolution");
  if (resolution) resolution.value = `${settings.canvas.width}x${settings.canvas.height}`;

  document.querySelector("#choose-image")?.addEventListener("click", async () => {
    const file = await window.kaosan.openImage();
    if (!file) return;
    settings.image.path = file;
    const pathInput = document.querySelector<HTMLInputElement>('[data-path="image.path"]');
    if (pathInput) pathInput.value = file;
    changed("画像を読み込みました");
  });
  document.querySelector("#open-avatar")?.addEventListener("click", async () => {
    await window.kaosan.openAvatarWindow(settings);
    publishSettings(settings);
    setStatus("Avatar Windowを起動しました");
  });
  document.querySelector("#save")?.addEventListener("click", async () => {
    const result = await window.kaosan.saveSettings(settings);
    setStatus(`設定を保存しました: ${result.path}`);
  });
  document.querySelector("#save-as")?.addEventListener("click", async () => {
    const file = await window.kaosan.saveSettingsAs(settings);
    if (file) setStatus(`設定を書き出しました: ${file}`);
  });
  document.querySelector("#load")?.addEventListener("click", async () => {
    const loaded = await window.kaosan.openSettingsFile();
    if (!loaded) return;
    settings = mergeSettings(loaded);
    publishSettings(settings);
    app.innerHTML = template();
    mountPreviewRenderer();
    wireUi();
    await refreshDevices();
    setStatus("設定を読み込みました");
  });
  document.querySelector("#mic-on")?.addEventListener("click", async () => {
    try {
      await audio.start(selectedDeviceId);
      await refreshDevices();
      setStatus("マイク入力を開始しました");
    } catch (error) {
      setStatus(`マイク入力を開始できません: ${error instanceof Error ? error.message : "権限またはデバイスを確認してください"}`);
    }
  });
  document.querySelector("#mic-off")?.addEventListener("click", async () => {
    await audio.stop();
    setStatus("マイク入力を停止しました");
  });
  document.querySelector("#manual-lip")?.addEventListener("change", (event) => {
    manualLip = (event.target as HTMLInputElement).checked;
    if (manualLip) {
      publishManualState();
    } else {
      renderer?.updateLip(latestLip);
      publishLip(latestLip);
      publishManualLip(false, latestLip);
    }
  });
  document.querySelectorAll<HTMLInputElement>('[data-path^="manual."]').forEach((input) => {
    input.addEventListener("input", publishManualState);
  });
}

async function refreshDevices() {
  const select = document.querySelector<HTMLSelectElement>("#device-select");
  if (!select) return;
  try {
    const devices = await audio.listInputs();
    select.innerHTML =
      `<option value="">Default microphone</option>` +
      devices
        .map((device, index) => `<option value="${escapeAttr(device.deviceId)}">${escapeHtml(device.label || `Microphone ${index + 1}`)}</option>`)
        .join("");
    if (selectedDeviceId) select.value = selectedDeviceId;
    selectedDeviceId = select.value;
    select.addEventListener("change", () => {
      selectedDeviceId = select.value;
    });
  } catch {
    select.innerHTML = `<option value="">マイク権限が必要です</option>`;
  }
}

function changed(message = "設定を反映しました") {
  renderer?.updateSettings(settings);
  publishSettings(settings);
  void window.kaosan.saveSettings(settings);
  setStatus(message);
}

function publishManualState() {
  const lip = currentManualLip();
  publishManualLip(manualLip, lip);
  if (manualLip) renderer?.updateLip(lip);
}

function currentManualLip(): LipState {
  const mouthOpen = Number((document.querySelector('[data-path="manual.open"]') as HTMLInputElement)?.value || 0);
  return {
    ...defaultLipState,
    mouthOpen,
    mouthWide: Number((document.querySelector('[data-path="manual.wide"]') as HTMLInputElement)?.value || 0.5),
    mouthRound: Number((document.querySelector('[data-path="manual.round"]') as HTMLInputElement)?.value || 0.1),
    talkIntensity: mouthOpen,
    silent: mouthOpen < settings.mouth.noiseGate
  };
}

function renderMeters(lip: LipState) {
  const bar = document.querySelector<HTMLElement>("#rms-bar");
  if (bar) bar.style.width = `${Math.min(100, lip.rms * 700)}%`;
  if (!manualLip) renderer?.updateLip(lip);
}

function section(title: string, body: string) {
  return `<details open><summary>${title}</summary><div class="section-body">${body}</div></details>`;
}

function range(label: string, path: string, min: number, max: number, step: number, fallback?: number) {
  const value = path.startsWith("manual.") ? fallback ?? 0 : getValue(path);
  return `
    <label class="range">
      <span>${label}<b data-value-for="${path}">${value}</b></span>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-path="${path}" />
    </label>
  `;
}

function color(label: string, path: string) {
  return `<label>${label}<input type="color" value="${getValue(path)}" data-path="${path}" /></label>`;
}

function checkbox(label: string, path: string) {
  return `<label class="check"><input type="checkbox" ${getValue(path) ? "checked" : ""} data-path="${path}" /> ${label}</label>`;
}

function getValue(path: string): string | number | boolean {
  return path.split(".").reduce<unknown>((object, key) => (object as Record<string, unknown>)[key], settings) as string | number | boolean;
}

function setValue(path: string, value: string | number | boolean) {
  const parts = path.split(".");
  let target = settings as unknown as Record<string, unknown>;
  for (const part of parts.slice(0, -1)) target = target[part] as Record<string, unknown>;
  target[parts.at(-1)!] = value;
  const output = document.querySelector(`[data-value-for="${path}"]`);
  if (output) output.textContent = String(value);
}

function coerceValue(input: HTMLInputElement | HTMLSelectElement) {
  if (input instanceof HTMLInputElement && input.type === "checkbox") return input.checked;
  if (input instanceof HTMLInputElement && input.type === "range") return Number(input.value);
  if (input instanceof HTMLInputElement && input.type === "color") return input.value;
  if (input.dataset.path === "canvas.fps") return Number(input.value);
  return input.value;
}

function setStatus(message: string) {
  const status = document.querySelector("#status");
  if (status) status.textContent = `${new Date().toLocaleTimeString()}  ${message}`;
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!);
}

main();
