import { useEffect, useRef, useState } from "react";
import { Breakdown } from "./Breakdown";
import { course } from "./course";
import { data } from "./data";
import { t } from "./i18n";
import { PhraseImage } from "./PhraseImage";
import type { Settings } from "./settings";
import { advance, buildQueue, dateKey, type TodayQueue } from "./srs/queue";
import { type PhraseProgress, type Rating, rate } from "./srs/scheduler";
import { openStore, type Store } from "./srs/store";
import { pickVariants } from "./variants";
import { VariantLine } from "./VariantLine";

const ratings: { r: Rating; label: string }[] = [
  { r: 1, label: t.ratings.again },
  { r: 2, label: t.ratings.hard },
  { r: 3, label: t.ratings.good },
  { r: 4, label: t.ratings.easy },
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
      <button className="back" onClick={onBack}>{t.backToScenes}</button>
      <h2>{t.practiceToday}</h2>
      {error && <p>{t.saveError(error)}</p>}
      {!error && !queue && <p>{t.loading}</p>}
      {queue && !phrase && <p>{total === 0 ? t.noCardsToday : t.finishedToday}</p>}
      {queue && phrase && (
        <div className="card practice">
          <div className="sub">{t.remaining(queue.pending.length)}</div>
          <PhraseImage key={phrase.id} id={phrase.id} className="phrase-img" />
          <div className="phrase-gloss" lang={course.from}>{phrase.gloss}</div>
          {!shown ? (
            <button className="reveal" onClick={() => setShown(true)}>{t.showAnswer}</button>
          ) : (
            <>
              {main.map((v) => <VariantLine key={`${v.speaker}/${v.register}`} variant={v} notation={settings.notation} />)}
              {main.map((v) => <Breakdown key={`${v.speaker}/${v.register}`} variant={v} notation={settings.notation} />)}
              {usage && <div className="sub usage" lang={course.from}>{usage}</div>}
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
