import { keccak256, toUtf8Bytes } from "ethers";
import type { Imp } from "./types";
import { same } from "./math";
// Eight original 8x7 pixel frogs. Keys: b body, l belly, d dark spot,
// w eye white, p pupil, m mouth, r tongue, k blush, "." empty.
const FROGS = [
  [".ww..ww.", "wpwbbwpw", "bbbbbbbb", "bmmmmmmb", ".bllllb.", "bbbllbbb", "bb....bb"], // classic
  [".ww..ww.", "wmwbbwmw", "bbbbbbbb", "bbmmmmbb", ".bllllb.", "bbbllbbb", "b.b..b.b"], // sleepy
  [".ww..ww.", "wpwbbwpw", "bdbbbbdb", "bmmmmmmb", ".bllllb.", "bdbllbdb", "bb....bb"], // spotted
  [".ww..ww.", "wpwbbwpw", "bbbbbbbb", "mbbbbbbm", ".mmmmmm.", "bbbllbbb", "bb....bb"], // grin
  [".ww..ww.", "wpwbbwpw", "bbbbbbbb", "bmmrrmmb", ".bbrrbb.", "bbbllbbb", "bb....bb"], // tongue out
  ["www..www", "wpwbbwpw", "bbbbbbbb", "bbmmmmbb", ".bllllb.", "bbbllbbb", "bb....bb"], // wide-eyed
  [".ww..ww.", "wpwbbwpw", "bbbbbbbb", "bmmmmmmb", ".bllllb.", ".b.ll.b.", "b......b"], // jumping
  [".ww..ww.", "wpwbbwpw", "bbbbbbbb", "kbmmmmbk", ".bllllb.", "bbbllbbb", "bb....bb"], // blushing
];
const FROG_W = 8,
  FROG_H = 7;
const COLORS = [
  "#34d399",
  "#a3e635",
  "#fbbf24",
  "#a78bfa",
  "#60a5fa",
  "#fb923c",
  "#f472b6",
  "#22d3ee",
];
function mix(hex: string, to: string, t: number) {
  const a = parseInt(hex.slice(1), 16),
    b = parseInt(to.slice(1), 16);
  const ch = (v: number, s: number) => (v >> s) & 255;
  const c = (s: number) =>
    Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t)
      .toString(16)
      .padStart(2, "0");
  return "#" + c(16) + c(8) + c(0);
}
function palette(color: string, alive: boolean): Record<string, string> {
  if (!alive)
    return { b: "#52525b", l: "#71717a", d: "#3f3f46", w: "#a1a1aa", p: "#a1a1aa", m: "#27272a", r: "#52525b", k: "#52525b" };
  return {
    b: color,
    l: mix(color, "#ffffff", 0.45),
    d: mix(color, "#000000", 0.35),
    w: "#fafafa",
    p: "#09090b",
    m: "#09090b",
    r: "#f87171",
    k: "#f472b6",
  };
}
export function identity(address: string) {
  const hash = keccak256(toUtf8Bytes(address.toLowerCase()));
  return {
    shape: parseInt(hash.slice(2, 4), 16) % FROGS.length,
    color: COLORS[parseInt(hash.slice(4, 6), 16) % COLORS.length],
  };
}
export function impSVG(address: string, size = 48, alive = true) {
  const { shape, color } = identity(address);
  const pal = palette(color, alive);
  const rects = FROGS[shape]
    .map((row, y) =>
      [...row]
        .map((v, x) =>
          v === "." ? "" : `<rect x="${x + 1}" y="${y + 1}" width="1" height="1" fill="${pal[v]}"/>`,
        )
        .join(""),
    )
    .join("");
  return `<svg viewBox="0 0 10 9" width="${size}" height="${size}" aria-hidden="true" shape-rendering="crispEdges">${rects}</svg>`;
}
export const bellSVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2h4v3h3v3h2v9h2v3H3v-3h2V8h2V5h3zM9 21h6v2H9z"/></svg>';
export const dieSVG =
  '<svg viewBox="0 0 100 110" aria-hidden="true"><path d="M50 4 94 48 50 106 6 48Z" fill="#27272a" stroke="#fbbf24" stroke-width="2"/><path d="M50 4 29 64 6 48m44-44 21 60 23-16M29 64h42L50 106Z" fill="none" stroke="#fbbf24" stroke-width="1.5"/></svg>';
export class Board {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imps: Imp[] = [];
  mine = "";
  positions = new Map<number, number>();
  frame = 0;
  private timer = 0;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = 640;
    this.canvas.height = 1280;
    this.ctx = canvas.getContext("2d")!;
    this.draw();
  }
  destroy() {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.timer);
  }
  update(imps: Imp[], mine: string, animate = true) {
    this.mine = mine;
    const previous = this.positions;
    this.imps = imps;
    const targets = new Map(imps.map((i) => [i.seat, i.height]));
    const changed = imps.filter(
      (i) => previous.has(i.seat) && previous.get(i.seat) !== i.height,
    );
    if (
      !animate ||
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !changed.length
    ) {
      this.positions = targets;
      this.draw();
      return;
    }
    cancelAnimationFrame(this.frame);
    clearTimeout(this.timer);
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      for (const imp of imps) {
        const old = previous.get(imp.seat) ?? imp.height;
        const distance = imp.height - old;
        const steps = Math.min(Math.abs(distance), Math.floor(elapsed / 160));
        const hop = Math.sin(((elapsed % 160) / 160) * Math.PI) * 0.5;
        this.positions.set(
          imp.seat,
          steps >= Math.abs(distance)
            ? imp.height
            : old + Math.sign(distance) * (steps + hop),
        );
      }
      this.draw();
      if (
        elapsed <
        Math.max(
          ...changed.map((i) =>
            Math.abs(i.height - (previous.get(i.seat) ?? i.height)),
          ),
        ) *
          160 +
          160
      )
        this.frame = requestAnimationFrame(tick);
      else {
        this.positions = targets;
        this.draw();
      }
    };
    // The die settles first. Floor-by-floor movement follows the on-chain result.
    const starts = new Map(previous);
    this.positions = new Map(starts);
    this.timer = window.setTimeout(() => {
      this.frame = requestAnimationFrame(tick);
    }, 900);
  }
  draw() {
    const c = this.ctx;
    c.clearRect(0, 0, 640, 1280);
    c.imageSmoothingEnabled = false;
    const cx = 320,
      top = 92,
      step = 10.8;
    const floorY = (h: number) => top + (50 - h) * step;
    c.fillStyle = "#a1a1aa";
    c.font = '24px "Geist Mono", monospace';
    c.textAlign = "left";
    for (let h = 50; h >= -50; h--) {
      const y = floorY(h);
      const half = 18 + (1 - Math.abs(h) / 50) * 248;
      const left = cx - half;
      c.fillStyle = h === 0 ? "#3f3f46" : h % 10 === 0 ? "#27272a" : "#18181b";
      c.fillRect(left, y, half * 2, 7);
      c.fillStyle = h > 0 ? "#34d399" : h < 0 ? "#f87171" : "#a1a1aa";
      c.globalAlpha = h % 10 === 0 ? 0.7 : 0.2;
      c.fillRect(left, y, half * 2, 1);
      c.globalAlpha = 1;
      c.fillStyle = "#09090b";
      for (let x = left + 16; x < cx + half; x += 18)
        c.fillRect(x, y + 1, 1, 6);
      if (h % 10 === 0) {
        c.fillStyle = "#a1a1aa";
        c.fillText(h > 0 ? "+" + h : String(h), 32, y + 6);
        c.textAlign = "right";
        c.fillText(h === 50 ? "Summit" : h === -50 ? "Abyss" : "", 608, y + 6);
        c.textAlign = "left";
      }
    }
    const bell = (x: number, y: number) => {
      c.fillStyle = "#fbbf24";
      c.fillRect(x - 3, y, 6, 4);
      c.fillRect(x - 8, y + 4, 16, 4);
      c.fillRect(x - 11, y + 8, 22, 15);
      c.fillRect(x - 15, y + 23, 30, 4);
      c.fillRect(x - 3, y + 29, 6, 4);
    };
    bell(cx, 35);
    bell(cx, 1206);
    const atFloor = new Map<number, Imp[]>();
    for (const i of this.imps) {
      const key = Math.round(this.positions.get(i.seat) ?? i.height);
      atFloor.set(key, [...(atFloor.get(key) || []), i]);
    }
    for (const imp of this.imps) {
      const h = this.positions.get(imp.seat) ?? imp.height;
      const group = atFloor.get(Math.round(h)) || [imp];
      const idx = group.indexOf(imp);
      const width = 36 + (1 - Math.abs(h) / 50) * 496;
      const scale = group.length > 24 ? 1 : group.length > 8 ? 2 : 3.5;
      const cell = scale * (FROG_W + 1);
      const columns = Math.max(1, Math.floor(width / cell));
      const row = Math.floor(idx / columns),
        col = idx % columns;
      const count = Math.min(columns, group.length - row * columns);
      const x = cx - (count * cell) / 2 + col * cell;
      const y = floorY(h) - scale * FROG_H - row * scale * (FROG_H + 1);
      const { shape, color } = identity(imp.owner);
      const pal = palette(color, imp.alive);
      c.globalAlpha = imp.alive ? 1 : 0.55;
      if (same(imp.owner, this.mine)) {
        c.strokeStyle = "#fafafa";
        c.lineWidth = 2;
        c.strokeRect(x - 3, y - 3, scale * FROG_W + 6, scale * FROG_H + 6);
      }
      FROGS[shape].forEach((r, sy) =>
        [...r].forEach((v, sx) => {
          if (v === ".") return;
          c.fillStyle = pal[v];
          c.fillRect(x + sx * scale, y + sy * scale, scale, scale);
        }),
      );
      c.globalAlpha = 1;
    }
  }
}
