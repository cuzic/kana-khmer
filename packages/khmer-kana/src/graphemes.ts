type SegmenterCtor = new (
  locale?: string,
  options?: { granularity: "grapheme" },
) => { segment(input: string): Iterable<{ segment: string }> };

/** Marks (\p{M}) attach to the previous character: same behaviour as Intl.Segmenter for kana + ◌̯ / ゚. */
function fallback(s: string): string[] {
  const out: string[] = [];
  for (const ch of s) {
    if (out.length > 0 && /^\p{M}$/u.test(ch)) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

/** Split into user-perceived characters (kana + its combining mark = 1). Old Chrome (74) has no Intl.Segmenter. */
export function graphemes(s: string, opts: { useSegmenter?: boolean } = {}): string[] {
  const Seg = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  if (Seg && opts.useSegmenter !== false) {
    return [...new Seg("ja", { granularity: "grapheme" }).segment(s)].map((x) => x.segment);
  }
  return fallback(s);
}
