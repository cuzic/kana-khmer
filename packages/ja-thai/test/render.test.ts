import { describe, expect, it } from "vitest";
import { JaThaiError, renderThai, thaiWord } from "../src";

describe("母音: 開音節はすべて長母音(声調を中にそろえる。方式 G)", () => {
  it.each([["ア", "อา"], ["イ", "อี"], ["ウ", "อู"], ["エ", "เอ"], ["オ", "โอ"]])("%s", (k, t) => expect(renderThai(k)).toBe(t));
  it("語末でも短形(ะ ิ ุ)にしない", () => {
    expect(renderThai("マス")).toBe("มาซู");
    expect(renderThai("ヤマ")).toBe("ยามา");
  });
});

describe("子音(官報 2018 の規則 7〜12)", () => {
  it("語頭の k t p ch は有気字、語中は無気字(規則 7)", () => {
    expect(renderThai("カ")).toBe("คา");
    expect(renderThai("アカ")).toBe("อากา");
    expect(renderThai("タ")).toBe("ทา");
    expect(renderThai("アタ")).toBe("อาตา");
    expect(renderThai("パ")).toBe("พา");
    expect(renderThai("アパ")).toBe("อาปา");
    expect(renderThai("チ")).toBe("ชี");
    expect(renderThai("アチ")).toBe("อาจี");
  });
  it("が行は語頭 ก、語中 ง(規則 9)", () => {
    expect(renderThai("ガ")).toBe("กา");
    expect(renderThai("アガ")).toBe("อางา");
  });
  it("その他", () => {
    expect(renderThai("ラリルレロ".slice(0, 1))).toBe("รา");
    expect(renderThai("サ")).toBe("ซา");
    expect(renderThai("シ")).toBe("ชี");
    expect(renderThai("ジ")).toBe("จี");
    expect(renderThai("ズ")).toBe("ซู");
    expect(renderThai("フ")).toBe("ฟู");
    expect(renderThai("ヒ")).toBe("ฮี");
    expect(renderThai("ワ")).toBe("วา");
    expect(renderThai("ヤ")).toBe("ยา");
  });
});

describe("撥音 ん(規則 11): 後続音で น ง ม、語末は ง", () => {
  it.each([
    ["ホンヤ", "ฮงยา"], ["ギンコー", "กิงโกโอ"], ["シンブン", "ชิมบุง"], ["コンニチワ", "คนนีจีวา"],
    ["センセー", "เซ็นเซเอ"], ["ニホン", "นีฮง"], ["ボンオドリ", "บนโอโดรี"],
  ])("%s", (k, t) => expect(renderThai(k)).toBe(t));
});

describe("促音 っ: 後続音の無気閉鎖音を末子音にする", () => {
  it.each([
    ["ガッコー", "กักโกโอ"], ["ザッシ", "ซัชชี"], ["キッテ", "คิตเต"], ["マッチャ", "มัตจา"], ["ニッポン", "นิปปง"],
  ])("%s", (k, t) => expect(renderThai(k)).toBe(t));
});

describe("つ: 語頭・子音の後 สึ、母音の後 ตสึ(規則 12)", () => {
  it.each([["ツナミ", "สึนามี"], ["ミツ", "มิตสึ"], ["マッツ", "มัตสึ"], ["ンツ".slice(0, 0) + "ハンツ", "ฮันสึ"]])("%s", (k, t) => expect(renderThai(k)).toBe(t));
});

describe("拗音・連母音", () => {
  it.each([
    ["ヒャク", "เฮียกู"], ["リョコー", "เรียวโกโอ"], ["キュー", "คิวอู"], ["ジャ", "จา"], ["ショ", "โช"], ["ハイク", "ไฮกู"], ["ダイスキ", "ไดซูกี"],
  ])("%s", (k, t) => expect(renderThai(k)).toBe(t));
});

describe("長音 ー: 母音だけの音節を足して重ねる", () => {
  it.each([
    ["オカーサン", "โอกาอาซัง"], ["ホントー", "ฮนโตโอ"], ["ケー", "เคเอ"], ["ユー", "ยูอู"], ["ヨー", "โยโอ"], ["ツー", "สึอู"],
    ["アリガトー", "อารีงาโตโอ"],
  ])("%s", (k, t) => expect(renderThai(k)).toBe(t));
  it("長音の有無で綴りが変わる(おかさん / おかあさん)", () => {
    expect(renderThai("オカサン")).not.toBe(renderThai("オカーサン"));
  });
});

describe("構造", () => {
  it("空白は語の区切りとして残り、語頭の判定は語ごと", () => {
    expect(renderThai("カ カ")).toBe("คา คา");
  });
  it("syllables を連結すると text になる", () => {
    const w = thaiWord("アリガトーゴザイマス");
    expect(w.syllables.join("")).toBe(w.text);
    expect(w.syllables.length).toBeGreaterThan(8);
  });
});

describe("変換できない入力", () => {
  it.each([["ヲ"], ["ヂ"], ["ヅ"], ["ァ"], ["a"], ["漢"]])("%s は unsupported-kana", (k) => {
    expect(() => renderThai(k)).toThrowError(JaThaiError);
    try { renderThai(k); } catch (e) { expect((e as JaThaiError).code).toBe("unsupported-kana"); }
  });
  it.each([["ーア"], ["ンア"], ["ッア"], ["アッ"], ["カャ"], ["アッン"], ["アーー"]])("%s は bad-structure", (k) => {
    try { renderThai(k); throw new Error("no throw"); } catch (e) { expect((e as JaThaiError).code).toBe("bad-structure"); }
  });
});
