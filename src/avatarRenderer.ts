import { defaultLipState } from "./defaults";
import { filePathToUrl } from "./media";
import type { BlinkState, LipState, Settings } from "./types";

type RendererOptions = {
  canvas: HTMLCanvasElement;
  settings: Settings;
  preview?: boolean;
};

const presets = {
  closed: { open: 0.02, wide: 0.48, round: 0.04, smile: 0.08 },
  neutral: { open: 0.12, wide: 0.5, round: 0.08, smile: 0.06 },
  a: { open: 0.95, wide: 0.56, round: 0.22, smile: 0.04 },
  i: { open: 0.26, wide: 0.9, round: 0.02, smile: 0.1 },
  u: { open: 0.34, wide: 0.28, round: 0.8, smile: 0 },
  e: { open: 0.5, wide: 0.82, round: 0.05, smile: 0.08 },
  o: { open: 0.62, wide: 0.34, round: 0.95, smile: 0.02 },
  smile: { open: 0.18, wide: 0.72, round: 0.04, smile: 0.32 }
};

export class AvatarRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private settings: Settings;
  private preview: boolean;
  private image = new Image();
  private imageLoaded = false;
  private imageError = false;
  private lip: LipState = { ...defaultLipState };
  private current = { open: 0.02, wide: 0.5, round: 0.08, smile: 0.05 };
  private target = { ...this.current };
  private blinkValue = 0;
  private blinkState: BlinkState = "open";
  private nextBlinkAt = 0;
  private blinkStartedAt = 0;
  private queuedDoubleBlink = false;
  private lastFrame = 0;
  private fps = 0;
  private raf = 0;
  private running = false;
  private resizeObserver?: ResizeObserver;

  constructor(options: RendererOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is unavailable.");
    this.ctx = ctx;
    this.settings = options.settings;
    this.preview = Boolean(options.preview);
    this.resizeCanvas();
    this.loadImage();
    this.scheduleBlink(performance.now() / 1000);
    if (this.preview && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    this.loop(this.lastFrame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
  }

  updateSettings(settings: Settings) {
    const oldPath = this.settings.image.path;
    this.settings = settings;
    this.resizeCanvas();
    if (oldPath !== settings.image.path) this.loadImage();
  }

  updateLip(lip: LipState) {
    this.lip = lip;
  }

  private resizeCanvas() {
    const width = this.preview ? this.canvas.clientWidth : this.settings.canvas.width;
    const height = this.preview
      ? width * (this.settings.canvas.height / this.settings.canvas.width)
      : this.settings.canvas.height;
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(width * ratio));
    this.canvas.height = Math.max(1, Math.floor(height * ratio));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private loadImage() {
    this.imageLoaded = false;
    this.imageError = false;
    if (!this.settings.image.path) return;
    this.image = new Image();
    this.image.onload = () => {
      this.imageLoaded = true;
    };
    this.image.onerror = () => {
      this.imageError = true;
    };
    this.image.src = filePathToUrl(this.settings.image.path);
  }

  private loop = (nowMs: number) => {
    if (!this.running) return;
    const fpsLimit = this.preview ? 30 : this.settings.canvas.fps;
    const minDelta = 1000 / fpsLimit;
    if (nowMs - this.lastFrame >= minDelta - 1) {
      const dt = Math.min(0.06, (nowMs - this.lastFrame) / 1000);
      this.lastFrame = nowMs;
      this.fps = this.fps * 0.9 + (1 / Math.max(dt, 0.001)) * 0.1;
      this.update(dt, nowMs / 1000);
      this.draw(nowMs / 1000);
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number, now: number) {
    this.updateTargetMouth();
    const speed = this.target.open > this.current.open ? this.settings.mouth.openSpeed : this.settings.mouth.closeSpeed;
    const smoothing = Math.min(0.94, Math.max(0.05, this.settings.mouth.smoothing));
    const blend = Math.min(1, speed * 10 * dt * (1 - smoothing + 0.3));
    this.current.open += (this.target.open - this.current.open) * blend;
    this.current.wide += (this.target.wide - this.current.wide) * blend;
    this.current.round += (this.target.round - this.current.round) * blend;
    this.current.smile += (this.target.smile - this.current.smile) * blend;
    this.updateBlink(dt, now);
  }

  private updateTargetMouth() {
    const open = clamp(this.lip.mouthOpen, this.settings.mouth.minOpen, this.settings.mouth.maxOpen);
    const round = clamp(this.lip.mouthRound, 0, 1);
    const wide = clamp(this.lip.mouthWide, 0, 1);
    const smile = clamp(this.lip.smile, 0, 1);
    const p = open < 0.08 ? presets.closed : round > 0.68 ? presets.o : wide > 0.72 ? presets.i : open > 0.68 ? presets.a : presets.neutral;
    this.target = {
      open: mix(p.open, open, 0.7),
      wide: mix(p.wide, wide, 0.55),
      round: mix(p.round, round, 0.6),
      smile: mix(p.smile, smile, 0.5)
    };
  }

  private updateBlink(dt: number, now: number) {
    if (!this.settings.blink.enabled) {
      this.blinkValue = 0;
      this.blinkState = "open";
      return;
    }
    if (now >= this.nextBlinkAt && this.blinkStartedAt === 0) {
      this.blinkStartedAt = now;
      this.queuedDoubleBlink = Math.random() < this.settings.blink.doubleBlinkChance;
    }
    if (this.blinkStartedAt > 0) {
      const progress = (now - this.blinkStartedAt) / Math.max(0.08, this.settings.blink.duration);
      this.blinkValue = Math.sin(Math.min(1, progress) * Math.PI);
      this.blinkState = this.blinkValue > 0.78 ? "closed" : this.blinkValue > 0.24 ? "half" : "open";
      if (progress >= 1) {
        this.blinkStartedAt = 0;
        this.blinkValue = 0;
        this.blinkState = "open";
        if (this.queuedDoubleBlink) {
          this.queuedDoubleBlink = false;
          this.nextBlinkAt = now + 0.18 + Math.random() * 0.16;
        } else {
          this.scheduleBlink(now, this.lip.talkIntensity);
        }
      }
    } else {
      this.blinkValue = Math.max(0, this.blinkValue - dt * 12);
    }
  }

  private scheduleBlink(now: number, talkIntensity = 0) {
    const min = this.settings.blink.minInterval;
    const max = Math.max(min + 0.1, this.settings.blink.maxInterval);
    const talkDelay = talkIntensity > 0.25 ? 1.1 : 0;
    const quietBonus = this.lip.silent ? -0.35 : 0;
    this.nextBlinkAt = now + min + Math.random() * (max - min) + talkDelay + quietBonus;
  }

  private draw(now: number) {
    const width = this.preview ? this.canvas.clientWidth : this.settings.canvas.width;
    const height = this.preview ? this.canvas.clientHeight : this.settings.canvas.height;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = this.settings.canvas.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const scaleX = width / this.settings.canvas.width;
    const scaleY = height / this.settings.canvas.height;
    ctx.save();
    ctx.scale(scaleX, scaleY);
    const motionY = this.motionY(now);
    ctx.translate(0, motionY);
    this.drawImage();
    this.drawBlink();
    this.drawMouth(now);
    ctx.restore();

    if (this.settings.output.debug) this.drawDebug(width, height);
  }

  private motionY(now: number) {
    const idle = Math.sin(now * Math.PI * 2 * this.settings.motion.idleBobSpeed) * this.settings.motion.idleBobAmount;
    const talk = Math.sin(now * Math.PI * 2 * this.settings.motion.talkBounceSpeed) * this.settings.motion.talkBounceAmount * this.lip.talkIntensity;
    const blinkDip = this.blinkValue * this.settings.motion.blinkDipAmount;
    return idle + talk + blinkDip;
  }

  private drawImage() {
    const s = this.settings.image;
    const ctx = this.ctx;
    if (!this.imageLoaded) {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(0, 0, this.settings.canvas.width, this.settings.canvas.height);
      ctx.fillStyle = "#1f2937";
      ctx.font = "22px system-ui, sans-serif";
      ctx.textAlign = "center";
      const message = this.imageError ? "画像を読み込めませんでした" : "Control Windowで線画イラストを選択してください";
      ctx.fillText(message, this.settings.canvas.width / 2, this.settings.canvas.height / 2);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate((s.rotation * Math.PI) / 180);
    ctx.scale(s.scale, s.scale);
    ctx.drawImage(this.image, -this.image.width / 2, -this.image.height / 2);
    ctx.restore();
  }

  private drawMouth(now: number) {
    const m = this.settings.mouth;
    const ctx = this.ctx;
    const jitterScale = this.settings.motion.jitterAmount + m.jitter;
    const jitter = (seed: number) => Math.sin(now * 19.3 + seed) * jitterScale;
    const width = m.width * mix(0.72, 1.25, this.current.wide) * (1 - this.current.round * 0.28);
    const height = m.height * clamp(this.current.open, 0.02, 1.2) * mix(1, 1.16, this.current.round);
    const cornerLift = -m.height * this.current.smile * 0.38;
    const leftX = m.x - width / 2;
    const rightX = m.x + width / 2;
    const topY = m.y - height / 2;
    const bottomY = m.y + height / 2;
    const cp = width * mix(0.26, 0.42, this.current.round);

    ctx.save();
    ctx.fillStyle = m.patchColor;
    roundedRect(ctx, m.x - m.patchWidth / 2, m.y - m.patchHeight / 2, m.patchWidth, m.patchHeight, m.patchRadius);
    ctx.fill();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = m.strokeColor;
    ctx.lineWidth = m.strokeWidth;
    ctx.beginPath();
    if (this.current.open < 0.1) {
      const endY = m.y - m.height * 0.27;
      const smileY = m.y + m.height * 0.58;
      ctx.moveTo(leftX + jitter(1), endY + jitter(2));
      ctx.bezierCurveTo(
        leftX + cp + jitter(3),
        smileY + jitter(4),
        rightX - cp + jitter(5),
        smileY + jitter(6),
        rightX + jitter(7),
        endY + jitter(8)
      );
    } else {
      ctx.moveTo(leftX + jitter(1), m.y + cornerLift + jitter(2));
      ctx.bezierCurveTo(
        leftX + cp + jitter(3),
        topY + jitter(4),
        rightX - cp + jitter(5),
        topY + jitter(6),
        rightX + jitter(7),
        m.y + cornerLift + jitter(8)
      );
      ctx.bezierCurveTo(
        rightX - cp + jitter(9),
        bottomY + jitter(10),
        leftX + cp + jitter(11),
        bottomY + jitter(12),
        leftX + jitter(13),
        m.y + cornerLift + jitter(14)
      );
    }
    ctx.stroke();

    if (this.current.open > 0.18) {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = m.strokeColor;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y + height * 0.1, width * 0.25, height * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBlink() {
    if (this.blinkValue <= 0.12) return;
    const e = this.settings.eyes;
    const ctx = this.ctx;
    const alpha = clamp((this.blinkValue - 0.12) / 0.55, 0, 1);
    for (const eye of [
      { x: e.leftX, y: e.leftY },
      { x: e.rightX, y: e.rightY }
    ]) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.settings.mouth.patchColor;
      roundedRect(ctx, eye.x - e.width / 2, eye.y - e.patchHeight / 2, e.width, e.patchHeight, e.patchRadius);
      ctx.fill();
      ctx.strokeStyle = e.strokeColor;
      ctx.lineWidth = e.strokeWidth;
      ctx.lineCap = "round";
      ctx.beginPath();
      const y = eye.y - e.patchHeight * 0.24 + this.blinkValue;
      ctx.moveTo(eye.x - e.width * 0.48, y);
      ctx.quadraticCurveTo(eye.x, y + e.patchHeight * 0.025, eye.x + e.width * 0.48, y);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawDebug(width: number, height: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
    ctx.fillRect(12, 12, 245, 154);
    ctx.fillStyle = "#e5f2ff";
    ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
    const lines = [
      `FPS ${this.fps.toFixed(1)}`,
      `RMS ${this.lip.rms.toFixed(3)}  Peak ${this.lip.peak.toFixed(3)}`,
      `mouthOpen ${this.current.open.toFixed(3)}`,
      `wide ${this.current.wide.toFixed(3)} round ${this.current.round.toFixed(3)}`,
      `blink ${this.blinkState}`,
      `talk ${this.lip.talkIntensity.toFixed(3)}`,
      `${Math.round(width)}x${Math.round(height)}`
    ];
    lines.forEach((line, i) => ctx.fillText(line, 24, 38 + i * 18));
    ctx.restore();
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
