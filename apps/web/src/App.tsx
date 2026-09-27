import { useState } from "react";
import { data, type Phrase } from "./data";
import { useSettings } from "./settings";
import { pickVariants } from "./variants";

const speakerLabel = { any: "", male: "男性", female: "女性" } as const;

function Card({ phrase, notation, gender }: { phrase: Phrase; notation: "lite" | "full"; gender: "male" | "female" | "unset" }) {
  const { main, other, casual } = pickVariants(phrase, gender);
  const kana = (v: (typeof main)[number]) => (notation === "lite" ? v.kanaLite : v.kanaFull);
  return (
    <li className="card">
      <div className="ja">
        {phrase.ja}
        {phrase.unreviewed && <span className="badge">未確認</span>}
      </div>
      {main.map((v) => (
        <div key={`${v.speaker}/${v.register}`} className="variant">
          {speakerLabel[v.speaker] && <span className="tag">{speakerLabel[v.speaker]}</span>}
          <span className="kana">{kana(v)}</span>
          <span className="khmer" lang="km">{v.khmer}</span>
          {notation === "full" && <span className="ipa">/{v.ipa}/</span>}
        </div>
      ))}
      {other.length > 0 && (
        <div className="sub">
          {other.map((v) => `${speakerLabel[v.speaker]}: ${kana(v)}${notation === "full" ? ` /${v.ipa}/` : ""}`).join(" / ")}
        </div>
      )}
      {casual.length > 0 && <div className="sub">くだけた形: {casual.map(kana).join(" / ")}</div>}
      {phrase.usage && <div className="sub usage">{phrase.usage}</div>}
    </li>
  );
}

export function App() {
  const [settings, setSettings] = useSettings();
  const [sceneId, setSceneId] = useState<string | null>(() => new URLSearchParams(location.search).get("scene"));
  const scene = data.scenes.find((s) => s.id === sceneId);
  const phrases = scene ? scene.phraseIds.map((id) => data.phrases.find((p) => p.id === id)!) : [];

  return (
    <main>
      <header>
        <h1>クメール語 かんたん会話</h1>
        <div className="controls">
          <label>
            表記
            <select value={settings.notation} onChange={(e) => setSettings({ ...settings, notation: e.target.value as "lite" | "full" })}>
              <option value="lite">ライト</option>
              <option value="full">詳細</option>
            </select>
          </label>
          <label>
            自分の性別
            <select value={settings.speakerGender} onChange={(e) => setSettings({ ...settings, speakerGender: e.target.value as typeof settings.speakerGender })}>
              <option value="unset">未設定(両方)</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
          </label>
        </div>
      </header>
      {scene ? (
        <section>
          <button className="back" onClick={() => setSceneId(null)}>← シーン一覧</button>
          <h2>{scene.title}</h2>
          <ul className="cards">
            {phrases.map((p) => <Card key={p.id} phrase={p} notation={settings.notation} gender={settings.speakerGender} />)}
          </ul>
        </section>
      ) : (
        <section>
          <h2>シーン</h2>
          {data.scenes.length === 0 && <p>公開できるフレーズがありません。</p>}
          <ul className="scenes">
            {data.scenes.map((s) => (
              <li key={s.id}>
                <button onClick={() => setSceneId(s.id)}>{s.title}<span>{s.phraseIds.length}</span></button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
