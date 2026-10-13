// Per-phrase illustration (apps/web/public/images/<course>/phrases/<id>.webp, made by
// tools/scene-images/scripts/generate_phrases.py). Hidden if the file is missing.
import { course } from "./course";

export function PhraseImage({ id, className, onLoad }: { id: string; className: string; onLoad?: () => void }) {
  return (
    <img
      className={className}
      src={`/images/${course.id}/phrases/${id}.webp`}
      alt=""
      loading="lazy"
      onLoad={onLoad}
      onError={(e) => e.currentTarget.remove()}
    />
  );
}
