import { course } from "./course";
import type { Variant } from "./data";
import { t } from "./i18n";
import { Text } from "./VariantLine";

type Part = NonNullable<Variant["parts"]>[number];

/** 単語ごとに区切った読み・本文・ローマ字・直訳・品詞。SVO の位置が分かる語には役割の印を付ける */
export function Breakdown({ variant, notation }: { variant: Variant; notation: "lite" | "full" }) {
  const parts = variant.parts;
  if (!parts) return null;
  const reading = (p: Part) => (notation === "lite" ? p.readingLite : p.readingFull);
  const roles = parts.filter((p) => p.role).map((p) => p.role!);
  return (
    <div className="breakdown">
      <div className="split" aria-label={t.splitAria}>
        {parts.map((p, i) => <span key={i} className="kana">{reading(p)}</span>)}
      </div>
      <ul className="parts">
        {parts.map((p, i) => (
          <li key={i} className={p.role ? `role-${p.role}` : undefined}>
            <span className="kana">{reading(p)}</span>
            <Text text={p.text} furigana={p.furigana} />
            {p.latin && <span className="latin">{p.latin}</span>}
            <span className="gloss">{p.gloss}</span>
            <span className="pos">{t.pos[p.pos]}{p.role && t.role[p.role] !== t.pos[p.pos] && <b>{t.role[p.role]}</b>}</span>
          </li>
        ))}
      </ul>
      {roles.length > 0 && <div className="sub order">{t.wordOrder(roles.map((r) => t.role[r]).join(" → "), course.to)}</div>}
    </div>
  );
}
