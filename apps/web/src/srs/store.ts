import type { TodayQueue } from "./queue";
import type { PhraseProgress } from "./scheduler";

export interface Store {
  allProgress(): Promise<PhraseProgress[]>;
  putProgress(p: PhraseProgress): Promise<void>;
  getQueue(): Promise<TodayQueue | undefined>;
  putQueue(q: TodayQueue): Promise<void>;
  /** フレーズ id が変わった/消えたときの孤児の進捗を掃除する */
  prune(liveIds: Set<string>): Promise<void>;
}

const DB = "kana-khmer";
const VERSION = 1; // schema を変えるときは onupgradeneeded に移行を書く

function open(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("progress")) db.createObjectStore("progress", { keyPath: "phraseId" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function openStore(factory: IDBFactory = indexedDB): Promise<Store> {
  const db = await open(factory);
  const os = (name: string, mode: IDBTransactionMode) => db.transaction(name, mode).objectStore(name);
  return {
    allProgress: () => wrap(os("progress", "readonly").getAll()),
    putProgress: async (p) => void (await wrap(os("progress", "readwrite").put(p))),
    getQueue: () => wrap(os("meta", "readonly").get("queue")),
    putQueue: async (q) => void (await wrap(os("meta", "readwrite").put(q, "queue"))),
    prune: async (liveIds) => {
      const store = os("progress", "readwrite");
      for (const key of await wrap(store.getAllKeys())) if (!liveIds.has(key as string)) store.delete(key);
    },
  };
}
