import { describe, expect, it } from "vitest";
import { JaHangulError, renderRomaji } from "../src";

describe("renderRomaji(修正ヘボン式)", () => {
  it.each([
    ["コンニチワ", "konnichiwa"],
    ["アリガトー", "arigatō"],
    ["オハヨーゴザイマス", "ohayōgozaimasu"],
    ["シツレイシマス", "shitsureishimasu"],
    ["ジョーズ", "jōzu"],
    ["チャ", "cha"],
    ["ジャ", "ja"],
    ["ショーガッコー", "shōgakkō"],
    ["キョーカ", "kyōka"],
    ["フジサン", "fujisan"],
    ["イーデス", "iidesu"],
  ])("%s → %s", (input, expected) => expect(renderRomaji(input)).toBe(expected));

  it("促音は次の子音を重ね、ch の前は t", () => {
    expect(renderRomaji("ニッポン")).toBe("nippon");
    expect(renderRomaji("マッチャ")).toBe("matcha");
    expect(renderRomaji("ザッシ")).toBe("zasshi");
  });
  it("ん の後ろが母音・や行なら n'", () => {
    expect(renderRomaji("ホンヤ")).toBe("hon'ya");
    expect(renderRomaji("ホニャ")).toBe("honya");
    expect(renderRomaji("ホンライ")).toBe("honrai");
    expect(renderRomaji("キンエン")).toBe("kin'en");
  });
  it("変換できない入力は JaHangulError", () => {
    expect(() => renderRomaji("ファ")).toThrow(JaHangulError);
    expect(() => renderRomaji("ーア")).toThrow(JaHangulError);
    expect(() => renderRomaji("アッ")).toThrow(JaHangulError);
  });
});
