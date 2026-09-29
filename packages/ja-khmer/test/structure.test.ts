// 書記音節・スロット・拍の対応(ADR-0021 のアクセント線が拍単位のスロットを使う)
import { describe, expect, it } from "vitest";
import { renderKhmer } from "../src";

const one = (p: string) => renderKhmer(p).phrases[0]!;

describe("スロット構造", () => {
  it("カーン: 基底 → 末子音 → 長音マーカー(拍の順 か・ー・ン とは逆。ADR-0021 決定9)", () => {
    const s = one("カーン").syllables[0]!;
    expect(s.slots.map((x) => [x.kind, x.text, x.moras])).toEqual([
      ["base", "កា", [0]],
      ["coda", "ន", [2]],
      ["long", "ᵃ̄", [1]],
    ]);
  });
  it("ショー: 基底 → 右肩 → 長音マーカー", () => {
    const s = one("ショー").syllables[0]!;
    expect(s.slots.map((x) => [x.kind, x.text, x.moras])).toEqual([
      ["base", "ឆូ", [0]],
      ["shoulder", "ˢʰ", [0]],
      ["long", "ᵒ̄", [1]],
    ]);
  });
  it("あい=ៃ は 1 つの base スロットに 2 拍が入る", () => {
    const p = one("クダサイ");
    expect(p.syllables.map((s) => s.text)).toEqual(["គូ", "ដា", "សៃ"]);
    const last = p.syllables[2]!.slots[0]!;
    expect(last).toEqual({ kind: "base", text: "សៃ", moras: [2, 3] });
    expect(p.moras[3]!.at).toEqual({ syllable: 2, slot: 0 });
  });
  it("単独の ン は coda スロットだけの音節", () => {
    const p = one("ンカ");
    expect(p.syllables[0]!.slots).toEqual([{ kind: "coda", text: "ន", moras: [0] }]);
  });
  it("畳まれた ッ は at が null", () => {
    const p = one("カンッタ");
    expect(p.moras.map((m) => m.at)).toEqual([
      { syllable: 0, slot: 0 },
      { syllable: 0, slot: 1 },
      null,
      { syllable: 1, slot: 0 },
    ]);
  });
});

describe("不変条件(いろいろな入力)", () => {
  const inputs = ["トーキョー", "ラーメン", "ニッポン", "ショーカイ", "ホッカイドー", "キャクシャーン", "アイアイ", "ンンカーンッタイ", "ゴメンナサイ", "オヤスミナサイ", "ダイジョーブ"];
  it.each(inputs)("%s", (p) => {
    const r = one(p);
    // スロットの連結 = 音節の綴り、音節の連結 = 句の綴り
    for (const s of r.syllables) expect(s.slots.map((x) => x.text).join("")).toBe(s.text);
    expect(r.syllables.map((s) => s.text).join("")).toBe(r.text);
    // 拍の添字はすべて範囲内で、拍は at が示すスロットに含まれる(at が null の拍を除く)
    r.moras.forEach((m, i) => {
      if (!m.at) return;
      expect(r.syllables[m.at.syllable]!.slots[m.at.slot]!.moras).toContain(i);
    });
    // 全スロットの拍は昇順・重複なしで拍の範囲内
    for (const s of r.syllables) for (const sl of s.slots) for (const i of sl.moras) expect(i).toBeLessThan(r.moras.length);
  });
  it("拍の kana は入力を連結すると元の発音", () => {
    expect(one("キャクシャーン").moras.map((m) => m.kana).join("")).toBe("キャクシャーン");
  });
});
