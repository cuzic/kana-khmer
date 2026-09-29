import { useEffect, useRef, useState } from "react";
import { Breakdown } from "./Breakdown";
import { data } from "./data";
import { PhraseImage } from "./PhraseImage";
import type { Settings } from "./settings";
import { advance, buildQueue, dateKey, type TodayQueue } from "./srs/queue";
import { type PhraseProgress, type Rating, rate } from "./srs/scheduler";
import { openStore, type Store } from "./srs/store";
import { pickVariants } from "./variants";

const ratings: { r: Rating; label: string }[] = [
  { r: 1, label: "もう一度" },
  { r: 2, label: "難しい" },
  { r: 3, label: "言えた" },
  { r: 4, label: "簡単" },
];
const order = data.scenes.flatMap((s) => s.phraseIds);

export function Practice({ settings, onBack }: { settings: Settings; onBack: () => void }) {
  const store = useRef<Store | undefined>(undefined);
  const progress = useRef(new Map<string, PhraseProgress>());
  const [queue, setQueue] = useState<TodayQueue>();
  const [total, setTotal] = useState(0);
  const [shown, setShown] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    (async () => {
      try {
        void navigator.storage?.persist?.();
        const s = await openStore();
        store.current = s;
        await s.prune(new Set(order));
        for (const p of await s.allProgress()) progress.current.set(p.phraseId, p);
        const now = new Date();
        let q = await s.getQueue();
        if (!q || q.date !== dateKey(now)) {
          q = buildQueue(order, [...progress.current.values()], settings.newPerDay, now);
          await s.putQueue(q);
        }
        setTotal(q.pending.length);
        setQueue(q);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [settings.newPerDay]);

  async function answer(r: Rating) {
    if (!queue || !store.current) return;
    const now = new Date();
    const id = queue.pending[0]!;
    const next = rate(id, progress.current.get(id), r, now);
    const q = advance(queue, next, now);
    progress.current.set(id, next);
    await store.current.putProgress(next); // 1問ごとに保存
    await store.current.putQueue(q);
    setShown(false);
    setQueue(q);
  }

  const phrase = queue?.pending[0] ? data.phrases.find((p) => p.id === queue.pending[0]) : undefined;
  const { main, usage } = phrase ? { ...pickVariants(phrase, settings.speakerGender), usage: phrase.usage } : { main: [], usage: "" };

  return (
    <section>
      <button className="back" onClick={onBack}>← シーン一覧</button>
      <h2>今日の練習</h2>
      {error && <p>進捗を保存できません: {error}</p>}
      {!error && !queue && <p>読み込み中…</p>}
      {queue && !phrase && <p>{total === 0 ? "今日やるカードはありません。" : "今日の練習は終わりです。おつかれさまでした。"}</p>}
      {queue && phrase && (
        <div className="card practice">
          <div className="sub">残り {queue.pending.length} 枚</div>
          <PhraseImage key={phrase.id} id={phrase.id} className="phrase-img" />
          <div className="ja">{phrase.gloss}</div>
          {!shown ? (
            <button className="reveal" onClick={() => setShown(true)}>答えを見る</button>
          ) : (
            <>
              {main.map((v) => (
                <div key={`${v.speaker}/${v.register}`} className="variant">
                  <span className="kana">{settings.notation === "lite" ? v.readingLite : v.readingFull}</span>
                  <span className="khmer" lang="km">{v.text}</span>
                  {settings.notation === "full" && <span className="ipa">/{v.pron}/</span>}
                </div>
              ))}
              {main.map((v) => <Breakdown key={`${v.speaker}/${v.register}`} variant={v} notation={settings.notation} />)}
              {usage && <div className="sub usage">{usage}</div>}
              <div className="rating">
                {ratings.map(({ r, label }) => (
                  <button key={r} onClick={() => answer(r)}>{label}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
