import { describe, expect, it } from "vitest";
import { JaHangulError, koreanReading, renderHangul } from "../src";

const full = (p: string) => renderHangul(p, "full");
const lite = (p: string) => renderHangul(p, "lite");

describe("基本の対応(ADR-0019 の表)", () => {
  it("す・ず・つ は 스・즈・츠(수・주・추 にしない)", () => {
    expect(full("スズ")).toBe("스즈");
    expect(full("ツキ")).toBe("츠키");
  });
  it("拗音", () => {
    expect(full("シャシュショ")).toBe("샤슈쇼");
    expect(full("キョウト".replace("ウ", "ー"))).toBe("쿄ᵒ̄토");
  });
});

describe("長音: 直前の母音の上付き文字 + 結合マクロン", () => {
  it.each([
    ["オバーサン", "오바ᵃ̄산"],
    ["オバサン", "오바산"],
    ["トーキョー", "토ᵒ̄쿄ᵒ̄"],
    ["ホーン", "혼ᵒ̄"],
    ["フーフ", "후ᵘ̄후"],
    ["ケー", "케ᵉ̄"],
    ["キー", "키ⁱ̄"],
  ])("%s → %s", (input, expected) => expect(full(input)).toBe(expected));
  it("ライトにも残る", () => expect(lite("オバーサン")).toBe("오바ᵃ̄산"));
  it("語頭の長音は不可", () => expect(() => full("ーア")).toThrow(JaHangulError));
});

describe("促音: 同位置のパッチム", () => {
  it.each([
    ["ニッポン", "닙폰"],
    ["サッカ", "삭카"],
    ["ザッシ", "잣시"],
  ])("%s → %s", (input, expected) => expect(full(input)).toBe(expected));
  it("語末の ッ は不可", () => expect(() => full("アッ")).toThrow(JaHangulError));
});

describe("ん の区切り(ADR-0018)", () => {
  it("ん+母音・や行に · を入れ、ほにゃ と区別する", () => {
    expect(full("ホンヤ")).toBe("혼·야");
    expect(full("ホニャ")).toBe("호냐");
  });
  it("ん+ら行", () => expect(full("ホンライ")).toBe("혼·라이"));
  it("ん+その他は入れない", () => expect(full("ホンジツ")).toBe("혼지츠"));
  it("ライトにも残る", () => expect(lite("ホンライ")).toBe("혼·라이"));
});

describe("じゃ・じょ の ʲ(ADR-0019)", () => {
  it("詳細は ʲ を付け、ライトは付けない", () => {
    expect(full("ジャ")).toBe("쟈ʲ");
    expect(full("ジョー")).toBe("죠ʲᵒ̄");
    expect(lite("ジャ")).toBe("쟈");
    expect(lite("ジョー")).toBe("죠ᵒ̄");
  });
  it("ぞ・ざ・じゅ には付けない", () => {
    expect(full("ゾー")).toBe("조ᵒ̄");
    expect(full("ザ")).toBe("자");
    expect(full("ジュ")).toBe("쥬");
  });
});

describe("入力の検証", () => {
  it("小さい ァィゥェォ は不可(発音を確定してから入れる)", () => {
    expect(() => full("ファ")).toThrow(JaHangulError);
  });
  it("拗音にできない組み合わせ", () => expect(() => full("カャ")).toThrow(JaHangulError));
});

describe("koreanReading: 韓国語話者の読みの近似", () => {
  it("区切りなしの ん+母音 は連音化して ほにゃ と同音になる", () => {
    expect(koreanReading("혼야")).toBe("호냐");
    expect(koreanReading(full("ホンヤ"))).toBe(full("ホンヤ"));
  });
  it("区切りなしの ん+ら行 は流音化する", () => {
    expect(koreanReading("혼라이")).toBe("홀라이");
    expect(koreanReading(full("ホンライ"))).toBe("혼·라이");
  });
  it("ㅈ+ㅑㅛㅠ は硬口蓋化済みで自・조 と区別されない", () => {
    expect(koreanReading("쟈")).toBe("자");
    expect(koreanReading("죠")).toBe("조");
  });
});
