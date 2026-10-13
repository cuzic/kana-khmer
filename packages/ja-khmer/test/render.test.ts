import { describe, expect, it } from "vitest";
import { JaKhmerError, longMark, renderKhmer } from "../src";

const k = (p: string) => renderKhmer(p).text;

describe("長音: 段の既定の長母音記号 + 直前の母音の上付き文字 + 結合マクロン(§6.3)", () => {
  it.each([
    ["トーキョー", "តូᵒ̄ក្យូᵒ̄"], // 例外セル と の長い拍は តូ(短い តុ と違う)
    ["コーベ", "កូᵒ̄បេ"],
    ["ホー", "ហូᵒ̄"],
    ["ルー", "រូᵘ̄"],
    ["ツー", "ត្ស៊ូᵘ̄"],
    ["ゴー", "ហ្កូᵒ̄"],
    ["グー", "ហ្គូᵘ̄"],
    ["ラーメン", "រ៉ាᵃ̄មេន"],
    ["ショー", "ឆូˢʰᵒ̄"], // 子音の印 → 長音マーカーの順
    ["ズー", "ហ្សូᵘ̄"],
    ["ゾー", "ហ្សូᵒ̄"], // ず と ぞ は長音マーカーの母音字で分かれる
  ])("%s → %s", (p, e) => expect(k(p)).toBe(e));
  it("短い拍の例外セルは ុ ឹ", () => {
    expect(k("コ")).toBe("កុ");
    expect(k("ツ")).toBe("ត្ស៊ឹ");
  });
  it("重ね書き(フォールバック)", () => {
    expect(renderKhmer("トー", { longStyle: "double" }).text).toBe("តូᵒᵒ");
    expect(longMark("a", "double")).toBe("ᵃᵃ");
  });
  it("長音マーカーは末子音の後ろ(D16)。カーン → កាន+ᵃ̄", () => expect(k("カーン")).toBe("កានᵃ̄"));
  it("ちゃ/じゃ は同綴りを許容(§3.5)、しゃ/しゅ/しょ は ˢʰ で分かれる", () => {
    expect(k("チャ")).toBe(k("ジャ"));
    expect(k("シャ")).not.toBe(k("サ"));
    expect(k("ショ")).not.toBe(k("チョ"));
  });
});

describe("撥音・促音", () => {
  it("撥音は ន 固定(同化しない。§6.1)", () => {
    expect(k("サンポ")).toBe("សានប៉ូ");
    expect(k("ホンダ")).toBe("ហុនដា");
  });
  it("語頭・ン の連続は単独の ន", () => {
    expect(k("ン")).toBe("ន");
    expect(k("カンン")).toBe("កានន");
  });
  it.each([
    ["キッテ", "គីតតេ"], // t 系 → ត
    ["イッパイ", "អ៊ីបប៉ៃ"], // p 系 → ប(あい=ៃ)
    ["コッカイ", "កុកកៃ"], // k 系 → ក
    ["ホッカイドー", "ហុកកៃដូᵒ̄"],
    ["ニッポン", "នីបប៉ូន"],
    ["ザッシ", "ហ្សាតស៊ី"],
  ])("促音 %s → %s", (p, e) => expect(k(p)).toBe(e));
  it("ンッ は畳む", () => expect(k("カンッタ")).toBe(k("カンタ")));
  it("句末の ッ は ត(次の子音が分からない。設計書 §6.2 で要決定)", () => expect(k("トッ")).toBe("តុត"));
  it("語頭の ッ、語頭の ー、ーー は例外", () => {
    for (const p of ["ッカ", "ーア", "アーー", "ンー", "ッー"]) expect(() => k(p)).toThrow(JaKhmerError);
  });
});

describe("連母音 あい = ៃ(§6.4)", () => {
  it.each([
    ["アイ", "អៃ"],
    ["カイ", "កៃ"],
    ["タイ", "តៃ"],
    ["クダサイ", "គូដាសៃ"],
    ["ゴザイ", "ហ្កុហ្សៃ"],
    ["キャイ", "ក្យៃ"],
  ])("%s → %s", (p, e) => expect(k(p)).toBe(e));
  it("あい にしない場合: い が長い・あ が長い・あ段でない・末子音がある・あいい", () => {
    expect(k("アーイ")).toBe("អាᵃ̄អ៊ី");
    expect(k("アイー")).toBe("អាអ៊ីⁱ̄");
    expect(k("キイ")).toBe("គីអ៊ី");
    expect(k("カンイ")).toBe("កានអ៊ី");
    expect(k("アイイ")).toBe("អៃអ៊ី");
  });
});

describe("しゃ・しゅ・しょ", () => {
  it.each([
    ["シャ", "សាˢʰ"],
    ["シュ", "ស៊ូˢʰ"],
    ["ショ", "ឆូˢʰ"],
    ["シ", "ស៊ី"], // し には付けない(D6)
    ["シャシン", "សាˢʰស៊ីន"],
    ["シャッカ", "សាកˢʰកា"], // 右肩は末子音の後ろ
  ])("%s → %s", (p, e) => expect(k(p)).toBe(e));
});

describe("入力形式(§2)", () => {
  it("空白は句の区切り。連続した空白は畳む", () => {
    const r = renderKhmer("コレ  ワ");
    expect(r.phrases).toHaveLength(2);
    expect(r.text).toBe("កុរ៉េ វ៉ា");
  });
  it("助詞は発音どおり。ヲ ヂ ヅ も表にある", () => {
    expect(k("ヲ")).toBe(k("オ"));
    expect(k("ヂ")).toBe(k("ジ"));
    expect(k("ヅ")).toBe(k("ズ"));
  });
  it("空入力は空", () => expect(renderKhmer("").text).toBe(""));
});

describe("NFKC/NFKD を適用しない(CLAUDE.md・設計書 §3.2)", () => {
  it("長音マーカーは U+0304 付きの上付き母音で、NFKC すると平文の ō に潰れる", () => {
    const mark = longMark("o");
    expect(mark).toBe("ᵒ̄");
    expect(mark.normalize("NFKC")).toBe("ō");
    expect(mark.normalize("NFKC")).not.toBe(mark);
    expect(k("トー")).toBe("តូ" + mark);
  });
  it("ˢʰ は NFKC で sh に潰れる。出力は潰れていない", () => {
    expect("ˢʰ".normalize("NFKC")).toBe("sh");
    expect(k("ショ")).toContain("ˢʰ");
  });
  it("長音・右肩を含む出力は NFKC で変わる形のまま(生成器が正規化していない)", () => {
    for (const p of ["トーキョー", "シャシン", "オーサカ"]) {
      const t = k(p);
      expect(t.normalize("NFKC")).not.toBe(t);
    }
  });
});
