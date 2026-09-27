import type { PhraseProgress } from "./scheduler";

export const REVIEW_LIMIT = 20;

/** 今日のキュー。1問ごとに保存し、再開時はここから続きを出す */
export interface TodayQueue {
  date: string; // ローカル日付 YYYY-MM-DD
  pending: string[]; // 残りの phraseId(先頭から出す)
  schema: 1;
}

export function dateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

/**
 * 復習(期限が来たカード。上限 REVIEW_LIMIT、期限の早い順)→ 新規(min(newPerDay, 未導入数)、導入順)。
 * `order` は導入順(シーン順→フレーズ順)。フレーズが消えた孤児の進捗は無視する。
 */
export function buildQueue(order: string[], progress: PhraseProgress[], newPerDay: number, now: Date): TodayQueue {
  const known = new Set(order);
  const live = progress.filter((p) => known.has(p.phraseId));
  const reviews = live
    .filter((p) => p.card.due <= now)
    .sort((a, b) => a.card.due.getTime() - b.card.due.getTime())
    .slice(0, REVIEW_LIMIT)
    .map((p) => p.phraseId);
  const introduced = new Set(live.map((p) => p.phraseId));
  const news = order.filter((id) => !introduced.has(id)).slice(0, newPerDay);
  return { date: dateKey(now), pending: [...reviews, ...news], schema: 1 };
}

/** 評価後のキュー。先頭を外し、同日中に再び期限が来るなら(短期ステップ)末尾へ戻す */
export function advance(queue: TodayQueue, next: PhraseProgress, now: Date): TodayQueue {
  const [head, ...rest] = queue.pending;
  const again = head !== undefined && next.card.due < endOfDay(now);
  return { ...queue, pending: again ? [...rest, head] : rest };
}
