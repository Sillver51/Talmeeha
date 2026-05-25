import type { PlayerView } from "@/lib/types";
import { shareCardSummary } from "./summary";

const SIZE = 1080;
const COLORS: Record<string, string> = {
  red: "#FF4D8D",
  blue: "#34A8FF",
  neutral: "#B4A05A",
  assassin: "#E0444A",
  hidden: "rgba(255,255,255,0.06)",
};

/**
 * Render a spoiler-free 1080×1080 result card to a PNG Blob. Only REVEALED cards show
 * their colour; unrevealed cards render as neutral glass, so no key is leaked. Client-only.
 */
export async function renderShareCard(view: PlayerView): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  // background
  ctx.fillStyle = "#0A0A0F";
  ctx.fillRect(0, 0, SIZE, SIZE);

  const s = shareCardSummary(view);

  // title
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFD060";
  ctx.font = "900 84px Tajawal, sans-serif";
  ctx.fillText(`🏆 فاز ${s.winnerName}`, SIZE / 2, 150);

  ctx.fillStyle = "#9B9BC2";
  ctx.font = "700 44px Tajawal, sans-serif";
  const sub = s.assassin ? "☠️ كُشف القاتل" : `بفارق ${s.margin}`;
  ctx.fillText(sub, SIZE / 2, 220);

  // 5×5 grid (spoiler-free)
  const grid = 5;
  const pad = 90;
  const gap = 18;
  const cell = (SIZE - pad * 2 - gap * (grid - 1)) / grid;
  const top = 300;
  view.board.slice(0, 25).forEach((c, i) => {
    const r = Math.floor(i / grid);
    const col = i % grid;
    const x = pad + col * (cell + gap);
    const y = top + r * (cell + gap);
    const fill = c.rv ? (COLORS[c.t] ?? COLORS.hidden) : COLORS.hidden;
    ctx.fillStyle = fill!;
    ctx.beginPath();
    ctx.roundRect(x, y, cell, cell, 18);
    ctx.fill();
  });

  // brand footer
  ctx.fillStyle = "#A78BFA";
  ctx.font = "900 56px Tajawal, sans-serif";
  ctx.fillText("🍇 تلميحة", SIZE / 2, SIZE - 70);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
}

/** Share the card via the Web Share API, falling back to a download. */
export async function shareResult(view: PlayerView): Promise<void> {
  const blob = await renderShareCard(view);
  const file = new File([blob], "talmeeha.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ files: [file], title: "تلميحة 🍇", text: "نتيجتنا في تلميحة!" });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "talmeeha.png";
  a.click();
  URL.revokeObjectURL(url);
}
