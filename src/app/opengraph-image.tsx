import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// File-based OG image — Next wires this into <meta og:image>/<twitter:image>
// automatically. Rendered with the bundled Tajawal font so the Arabic title
// renders correctly (ImageResponse has no Arabic font by default).
export const runtime = "nodejs";
export const alt = "تلميحة — لعبة الفرق والكلمات";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const tajawal = await readFile(join(process.cwd(), "public/fonts/Tajawal-Bold.ttf"));

  return new ImageResponse(
    (
      <div
        dir="rtl"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          // Liquid Night: dark cosmos + a grape glow.
          background:
            "radial-gradient(circle at 50% 38%, #1A1A2E 0%, #0F0F1A 45%, #0A0A0F 100%)",
          fontFamily: "Tajawal",
        }}
      >
        <div style={{ display: "flex", fontSize: 150, marginBottom: 8 }}>🍇</div>
        <div
          style={{
            display: "flex",
            fontSize: 170,
            fontWeight: 800,
            lineHeight: 1,
            // grape → gold → cyan brand gradient as text fill
            backgroundImage: "linear-gradient(90deg, #A78BFA 0%, #FFD060 50%, #34E0E0 100%)",
            backgroundClip: "text",
            color: "transparent",
            padding: "0 24px",
          }}
        >
          تلميحة
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 800,
            color: "#9999BB",
            marginTop: 16,
          }}
        >
          لعبة الفرق والكلمات
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Tajawal", data: tajawal, weight: 800, style: "normal" }],
      emoji: "noto",
    },
  );
}
