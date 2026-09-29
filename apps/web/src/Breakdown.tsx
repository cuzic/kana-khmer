import type { Variant } from "./data";

type Part = NonNullable<Variant["parts"]>[number];

const posLabel: Record<Part["pos"], string> = {
  noun: "名詞", pron: "代名詞", verb: "動詞", adj: "形容詞", adv: "副詞",
  particle: "助詞", prep: "前置詞", question: "疑問詞", interj: "感動詞",
};
const roleLabel = { S: "主語", V: "動詞", O: "目的語" } as const;

/** 単語ごとに区切ったカナ・品詞・直訳。SVO の位置が分かる語には役割の印を付ける */
export function Breakdown({ variant, notation }: { variant: Variant; notation: "lite" | "full" }) {
  const parts = variant.parts;
  if (!parts) return null;
  const kana = (p: Part) => (notation === "lite" ? p.readingLite : p.readingFull);
  const roles = parts.filter((p) => p.role).map((p) => p.role!);
  return (
    <div className="breakdown">
      <div className="split" aria-label="分かち書き">
        {parts.map((p, i) => <span key={i} className="kana">{kana(p)}</span>)}
      </div>
      <ul className="parts">
        {parts.map((p, i) => (
          <li key={i} className={p.role ? `role-${p.role}` : undefined}>
            <span className="kana">{kana(p)}</span>
            <span className="khmer" lang="km">{p.text}</span>
            <span className="gloss">{p.gloss}</span>
            <span className="pos">{posLabel[p.pos]}{p.role && roleLabel[p.role] !== posLabel[p.pos] && <b>{roleLabel[p.role]}</b>}</span>
          </li>
        ))}
      </ul>
      {roles.length > 0 && <div className="sub order">語順: {roles.map((r) => roleLabel[r]).join(" → ")}(クメール語は主語・動詞・目的語の順)</div>}
    </div>
  );
}
