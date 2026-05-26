"use client";

/**
 * Faint decorative SVG of Arabic letterforms scattered across the board
 * stage. Pure decoration; aria-hidden. Opacity is controlled by
 * .constellation in game.css (synced to the 7s ambient glow loop).
 */
export default function ArabicConstellation() {
  return (
    <svg
      className="constellation"
      viewBox="0 0 400 240"
      preserveAspectRatio="none"
      aria-hidden="true"
      role="presentation"
    >
      <text x="36" y="60" fontSize="42" fontFamily="Tajawal, sans-serif" fontWeight="900" fill="currentColor">ا</text>
      <text x="142" y="190" fontSize="56" fontFamily="Tajawal, sans-serif" fontWeight="900" fill="currentColor">ل</text>
      <text x="260" y="80" fontSize="48" fontFamily="Tajawal, sans-serif" fontWeight="900" fill="currentColor">م</text>
      <text x="340" y="200" fontSize="44" fontFamily="Tajawal, sans-serif" fontWeight="900" fill="currentColor">ر</text>
      <text x="200" y="130" fontSize="64" fontFamily="Tajawal, sans-serif" fontWeight="900" fill="currentColor" opacity=".6">ت</text>
    </svg>
  );
}
