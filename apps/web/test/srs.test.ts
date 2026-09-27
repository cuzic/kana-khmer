import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { advance, buildQueue, dateKey, REVIEW_LIMIT } from "../src/srs/queue";
import { type PhraseProgress, rate } from "../src/srs/scheduler";
import { openStore } from "../src/srs/store";

const t0 = new Date(2026, 8, 27, 10, 0, 0);
const days = (n: number) => new Date(t0.getTime() + n * 86400_000);

describe("rate", () => {
  it("初回の評価で導入日を記録し、再評価でも保つ", () => {
    const a = rate("hello", undefined, 3, t0);
    expect(a.introducedAt).toBe(t0.toISOString());
    const b = rate("hello", a, 3, days(1));
    expect(b.introducedAt).toBe(t0.toISOString());
    expect(b.lastRating).toBe(3);
  });
  it("間隔は maximum_interval(14日)を超えない", () => {
    let p: PhraseProgress | undefined;
    let now = t0;
    for (let i = 0; i < 12; i++) {
      p = rate("x", p, 4, now);
      now = p.card.due;
    }
    expect((p!.card.due.getTime() - p!.card.last_review!.getTime()) / 86400_000).toBeLessThanOrEqual(14);
  });
});

describe("buildQueue", () => {
  const order = ["a", "b", "c", "d", "e"];
  it("進捗なしなら新規を newPerDay 件、導入順で出す", () => {
    expect(buildQueue(order, [], 3, t0).pending).toEqual(["a", "b", "c"]);
  });
  it("復習(期限順)が先、新規は未導入から。未導入数を超えない", () => {
    const pa = rate("a", undefined, 3, days(-3));
    const pb = rate("b", undefined, 3, days(-5));
    const q = buildQueue(order, [pa, pb], 6, t0);
    expect(q.pending).toEqual(["b", "a", "c", "d", "e"]);
  });
  it("期限前のカードは復習に出さない", () => {
    const pa = rate("a", undefined, 4, t0);
    expect(buildQueue(order, [pa], 0, t0).pending).toEqual([]);
  });
  it("復習は上限 20 枚", () => {
    const ids = Array.from({ length: 30 }, (_, i) => `p${i}`);
    const prog = ids.map((id) => rate(id, undefined, 1, days(-2)));
    expect(buildQueue(ids, prog, 0, t0).pending).toHaveLength(REVIEW_LIMIT);
  });
  it("消えたフレーズの進捗は無視する", () => {
    const orphan = rate("gone", undefined, 1, days(-2));
    expect(buildQueue(order, [orphan], 0, t0).pending).toEqual([]);
  });
});

describe("advance", () => {
  it("『もう一度』は同日に再び期限が来るので末尾へ戻る", () => {
    const q = { date: dateKey(t0), pending: ["a", "b"], schema: 1 as const };
    const p = rate("a", undefined, 1, t0);
    expect(advance(q, p, t0).pending).toEqual(["b", "a"]);
  });
  it("『簡単』は翌日以降なのでキューから外れる", () => {
    const q = { date: dateKey(t0), pending: ["a", "b"], schema: 1 as const };
    const p = rate("a", undefined, 4, t0);
    expect(advance(q, p, t0).pending).toEqual(["b"]);
  });
});

describe("IndexedDB store", () => {
  it("進捗とキューを保存でき、Date が保たれる。孤児は掃除される", async () => {
    const store = await openStore();
    await store.putProgress(rate("a", undefined, 3, t0));
    await store.putProgress(rate("gone", undefined, 3, t0));
    await store.putQueue({ date: "2026-09-27", pending: ["a"], schema: 1 });
    await store.prune(new Set(["a"]));
    const all = await store.allProgress();
    expect(all.map((p) => p.phraseId)).toEqual(["a"]);
    expect(all[0]!.card.due).toBeInstanceOf(Date);
    expect((await store.getQueue())?.pending).toEqual(["a"]);
  });
});
