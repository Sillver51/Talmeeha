"use client";

const PIECES = Array.from({ length: 28 });
const COLORS = ["#FF4D8D", "#34A8FF", "#FFD060", "#34E0E0", "#A78BFA"];

/** Pure-CSS confetti burst for the win modal. Hidden under reduced-motion. */
export default function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {PIECES.map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 97) % 100}%`,
            animationDelay: `${(i % 10) * 0.08}s`,
            background: COLORS[i % COLORS.length],
          }}
        />
      ))}
    </div>
  );
}
