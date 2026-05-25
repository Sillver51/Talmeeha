export type DigitStyle = "western" | "eastern";

const EASTERN = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;

/** Replace ASCII digits in a string with Eastern-Arabic digits. */
export function toEasternDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => EASTERN[Number(d)]!);
}

/** Format a number per the chosen digit style. */
export function formatNumber(n: number, style: DigitStyle): string {
  const s = String(n);
  return style === "eastern" ? toEasternDigits(s) : s;
}

/** Format any string's embedded digits per the chosen style. */
export function formatDigits(input: string, style: DigitStyle): string {
  return style === "eastern" ? toEasternDigits(input) : input;
}
