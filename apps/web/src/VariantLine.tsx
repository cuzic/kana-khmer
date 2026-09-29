import { course, showsIpa } from "./course";
import type { Variant } from "./data";

const HAS_KANJI = /[㐀-鿿]/;

/** 学ぶ言語の本文。ふりがな(furigana)が語ごとにあれば、漢字を含む語に ruby を付ける */
export function Text({ text, furigana, parts }: { text: string; furigana?: string; parts?: Variant["parts"] }) {
  const ruby = parts && parts.length > 0 && parts.every((p) => p.furigana !== undefined);
  return (
    <span className="text" lang={course.to}>
      {ruby
        ? parts.map((p, i) => (HAS_KANJI.test(p.text) ? <ruby key={i}>{p.text}<rt>{p.furigana}</rt></ruby> : <span key={i}>{p.text}</span>))
        : text}
      {!ruby && furigana && HAS_KANJI.test(text) && <span className="furigana-line">{furigana}</span>}
    </span>
  );
}

/** 1つの言い方の表示: 読み(カナ/ハングル)・本文(ふりがな付き)・ローマ字・IPA */
export function VariantLine({ variant, notation, tag }: { variant: Variant; notation: "lite" | "full"; tag?: string }) {
  const reading = notation === "lite" ? variant.readingLite : variant.readingFull;
  return (
    <div className="variant">
      {tag && <span className="tag">{tag}</span>}
      <span className="kana">{reading}</span>
      <Text text={variant.text} furigana={variant.furigana} parts={variant.parts} />
      {variant.latin && <span className="latin">{variant.latin}</span>}
      {showsIpa && notation === "full" && <span className="ipa">/{variant.pron}/</span>}
    </div>
  );
}
