import { type Card, createEmptyCard, fsrs, generatorParameters, type Grade } from "ts-fsrs";

export type Rating = 1 | 2 | 3 | 4; // もう一度 / 難しい / 言えた / 簡単

export interface PhraseProgress {
  phraseId: string;
  card: Card;
  lastRating?: Rating;
  introducedAt?: string; // ISO
  schema: 1;
}

// docs/design.md §5.2: 1〜2週間の学習期間に合わせる。短期(同日再出題)ステップは有効
const MAX_INTERVAL = 14;
const scheduler = fsrs(generatorParameters({ request_retention: 0.9, maximum_interval: MAX_INTERVAL, enable_short_term: true }));

/** Apply a rating; creates the progress on the first rating (= introduction of the phrase). */
export function rate(phraseId: string, prev: PhraseProgress | undefined, rating: Rating, now: Date): PhraseProgress {
  const card: Card = prev?.card ?? createEmptyCard<Card>(now);
  let next: Card = scheduler.next(card, now, rating as Grade).card;
  // ts-fsrs は Hard<Good<Easy を保つため上限を 1〜2 日超えることがある。設計どおり 14 日で止める
  if (next.scheduled_days > MAX_INTERVAL) {
    next = { ...next, scheduled_days: MAX_INTERVAL, due: new Date(now.getTime() + MAX_INTERVAL * 86400_000) };
  }
  return { phraseId, card: next, lastRating: rating, introducedAt: prev?.introducedAt ?? now.toISOString(), schema: 1 };
}
