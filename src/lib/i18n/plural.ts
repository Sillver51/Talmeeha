export interface ArabicCountForms {
  one: string;   // singular (e.g. "لاعب واحد") — no numeral
  two: string;   // dual (e.g. "لاعبان") — no numeral
  plural: string; // counted plural noun (e.g. "لاعبين") — numeral is prefixed by the caller path
}

/**
 * Grammatically correct Arabic count phrase. The numeral is shown only for the
 * plural case (1 and 2 use the dedicated singular/dual word forms, where Arabic
 * omits the numeral). `formattedN` is the already-digit-styled number string.
 */
export function arabicCount(n: number, formattedN: string, forms: ArabicCountForms): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  return `${formattedN} ${forms.plural}`;
}
