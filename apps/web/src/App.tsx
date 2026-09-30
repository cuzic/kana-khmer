import { useState } from "react";
import { Breakdown } from "./Breakdown";
import { course, hasGender, hasLevels, showsIpa } from "./course";
import { data, type Phrase } from "./data";
import { Guide } from "./generated/guide";
import { t } from "./i18n";
import { PhraseImage } from "./PhraseImage";
import { Practice } from "./Practice";
import { useSettings } from "./settings";
import { pickVariants } from "./variants";
import { VariantLine } from "./VariantLine";

const speakerLabel = { any: "", male: t.male, female: t.female } as const;

function Card({ phrase, notation, gender }: { phrase: Phrase; notation: "lite" | "full"; gender: "male" | "female" | "unset" }) {
  const { main, other, casual } = pickVariants(phrase, gender);
  const [hasImage, setHasImage] = useState(false);
  const reading = (v: (typeof main)[number]) => (notation === "lite" ? v.readingLite : v.readingFull);
  return (
    <li className={hasImage ? "card has-img" : "card"}>
      <PhraseImage id={phrase.id} className="phrase-thumb" onLoad={() => setHasImage(true)} />
      <div className="phrase-gloss" lang={course.from}>
        {phrase.gloss}
        {phrase.unreviewed && <span className="badge">{t.unreviewed}</span>}
      </div>
      {main.map((v) => (
        <VariantLine key={`${v.speaker}/${v.register}`} variant={v} notation={notation} tag={speakerLabel[v.speaker] || undefined} />
      ))}
      {main.some((v) => v.parts) && (
        <details className="how">
          <summary>{t.howWords}</summary>
          {main.map((v) => <Breakdown key={`${v.speaker}/${v.register}`} variant={v} notation={notation} />)}
        </details>
      )}
      {other.length > 0 && (
        <div className="sub">
          {other.map((v) => `${speakerLabel[v.speaker]}: ${reading(v)}${showsIpa && notation === "full" ? ` /${v.pron}/` : ""}`).join(" / ")}
        </div>
      )}
      {casual.length > 0 && <div className="sub">{t.casualForm}: {casual.map(reading).join(" / ")}</div>}
      {phrase.usage && <div className="sub usage" lang={course.from}>{phrase.usage}</div>}
    </li>
  );
}

export function App() {
  const [settings, setSettings] = useSettings();
  const [sceneId, setSceneId] = useState<string | null>(() => new URLSearchParams(location.search).get("scene"));
  const [practicing, setPracticing] = useState(() => new URLSearchParams(location.search).has("practice"));
  const [guide, setGuide] = useState(() => new URLSearchParams(location.search).has("guide"));
  const scene = data.scenes.find((s) => s.id === sceneId);
  const phrases = scene ? scene.phraseIds.map((id) => data.phrases.find((p) => p.id === id)!) : [];

  return (
    <main>
      <header>
        <h1>{course.title[course.from]}</h1>
        <div className="controls">
          {hasLevels && (
            <label>
              {t.notation}
              <select value={settings.notation} onChange={(e) => setSettings({ ...settings, notation: e.target.value as "lite" | "full" })}>
                <option value="lite">{t.lite}</option>
                <option value="full">{t.full}</option>
              </select>
            </label>
          )}
          {hasGender && (
            <label>
              {t.speakerGender}
              <select value={settings.speakerGender} onChange={(e) => setSettings({ ...settings, speakerGender: e.target.value as typeof settings.speakerGender })}>
                <option value="unset">{t.genderUnset}</option>
                <option value="male">{t.male}</option>
                <option value="female">{t.female}</option>
              </select>
            </label>
          )}
        </div>
      </header>
      {guide ? (
        <Guide onBack={() => setGuide(false)} />
      ) : practicing ? (
        <Practice settings={settings} onBack={() => setPracticing(false)} />
      ) : scene ? (
        <section>
          <button className="back" onClick={() => setSceneId(null)}>{t.backToScenes}</button>
          <h2>{scene.title}</h2>
          <ul className="cards">
            {phrases.map((p) => <Card key={p.id} phrase={p} notation={settings.notation} gender={settings.speakerGender} />)}
          </ul>
        </section>
      ) : (
        <section>
          <button className="reveal" onClick={() => setPracticing(true)}>{t.practiceToday}</button>
          <button className="back" onClick={() => setGuide(true)}>{t.guideLink}</button>
          <h2>{t.scenes}</h2>
          {data.scenes.length === 0 && <p>{t.noPhrases}</p>}
          <ul className="scenes">
            {data.scenes.map((s) => (
              <li key={s.id}>
                <button onClick={() => setSceneId(s.id)}>
                  <img
                    className="scene-img"
                    src={`/images/${course.id}/scenes/${s.id}.webp`}
                    alt=""
                    loading="lazy"
                    onError={(e) => e.currentTarget.remove()}
                  />
                  <span className="scene-meta">
                    <span className="scene-title">{s.title}</span>
                    <span className="scene-count">{s.phraseIds.length}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
