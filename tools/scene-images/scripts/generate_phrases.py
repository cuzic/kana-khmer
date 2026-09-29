# /// script
# requires-python = ">=3.10"
# dependencies = ["openai>=1.50", "python-dotenv", "pillow"]
# ///
"""Generate one illustration per phrase (packages/content/data/phrases.yaml) with gpt-image-2.

Output: apps/web/public/images/phrases/<phrase-id>.webp. Same style as the scene images
(generate.py), so the two sets look like one family. Existing files are skipped (safe to
re-run after a failure); --force regenerates, --only <id> [<id> ...] limits the set,
--dry-run prints the prompts without calling the API.

Cost: quality "low" ≈ $0.006/image, so 40 phrases ≈ $0.25.

Requires OPENAI_API_KEY in the repo root .env (gitignored).

usage: uv run tools/scene-images/scripts/generate_phrases.py [--only hello thanks] [--force] [--quality medium] [--dry-run]
"""
import argparse
import base64
import concurrent.futures as cf
import io
import pathlib
import re
import sys

from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[3]
PHRASES_YAML = ROOT / "packages/content/data/phrases.yaml"
OUT_DIR = ROOT / "apps/web/public/images/phrases"

# 練習カード・フレーズカードで幅いっぱいに出す (main の実効幅は最大 608px)。高DPI込みで 640px。
IMG_MAX = 640

# generate.py (シーン画像) と同じトーン。
STYLE = (
    "Flat minimalist vector illustration for a friendly travel phrasebook app. "
    "Warm cream background (#f7f5f1). A single muted green accent color (#0b8f5c) for "
    "the main subject, with soft charcoal (#1c1a16) linework; no other colors. "
    "Simple rounded shapes, generous negative space, centered composition, square format. "
    "No text, no letters, no numbers, no speech-bubble words anywhere in the image. "
    "Set in Cambodia (subtle cues only: palm trees, temple roofline, tuk-tuk, market stall)."
)

# フレーズ id -> 描いてほしい情景。ja の意味が絵だけで伝わるように、抽象的なものは場面に落とす。
CONCEPTS = {
    # greetings
    "hello": "a traveler waving a hand in greeting to a smiling local shopkeeper, midday sun",
    "goodbye": "a person waving goodbye while walking away down a road, the other person waving back",
    "how-are-you": "two friends meeting, one tilting their head with a caring, questioning look, "
        "the other smiling",
    "fine": "a cheerful person with arms slightly raised and a big smile, small sparkles around them",
    "good-morning": "a person stretching by a window as the sun rises over palm trees",
    "good-night": "a person asleep in bed under a blanket, a crescent moon and stars outside the window",
    "nice-to-meet": "two people meeting for the first time, bowing slightly with palms together, smiling",
    "welcome": "a host opening a door wide with both arms, welcoming a traveler with a suitcase",
    # thanks-sorry
    "yes": "a person nodding with a small smile, a simple check mark shape floating beside them",
    "no": "a person shaking their head and gently waving a hand, a simple cross shape beside them",
    "thanks": "a traveler pressing palms together in thanks while receiving a small bag from a shopkeeper",
    "sorry": "a person lightly bumping into another and bowing apologetically, hand raised",
    "welcome-reply": "a shopkeeper smiling and gesturing 'no problem' with an open palm to a thankful customer",
    "thanks-a-lot": "a person bowing deeply with palms together, several small hearts floating around",
    "ok": "a person making a relaxed thumbs-up with a calm smile, a soft check mark shape beside them",
    "apologize": "a person bowing deeply with palms together, head down, looking truly sorry",
    # address
    "older-sibling": "a young person looking up and calling out to a slightly older young person "
        "walking ahead, friendly, siblings-like relationship",
    "younger-sibling": "a young adult smiling and calling out to a small child a few steps away",
    "mr": "a person politely addressing a smartly dressed middle-aged man in a shirt, palms together",
    "mrs": "a person politely addressing an elegant middle-aged woman in a traditional skirt, palms together",
    "uncle": "a person calling out to an older man with gray hair sitting at a street food stall",
    "aunt": "a person calling out to an older woman with a headscarf selling fruit at a market stall",
    # intro
    "name-q": "two people facing each other, one leaning in curiously with a small question mark "
        "shape above their head",
    "from-japan": "a traveler with a suitcase pointing to a small simplified map of Japan (islands "
        "shape) with a plane arc towards Cambodia",
    "japanese": "a person proudly gesturing to themselves with a hand on chest, a simple "
        "Mount Fuji silhouette behind them",
    "learning-khmer": "a person studying at a small desk with an open notebook and pencil, "
        "a simple lightbulb shape above their head",
    "like-cambodia": "a person with hands clasped happily in front of Angkor-style temple towers, "
        "a heart shape floating above",
    "came-to-visit": "a traveler with a backpack and camera stepping off a tuk-tuk in front of a temple",
    # oneliners
    "dont-understand": "a confused person tilting their head with a small question mark above, "
        "hands slightly raised in a shrug",
    "understand": "a person with a bright expression and a small lightbulb shape above their head, nodding",
    "say-again": "a person cupping a hand behind their ear, leaning toward a speaker",
    "slowly": "a person gesturing with a flat downward hand for 'slow down', a small snail shape beside them",
    "how-much": "a traveler holding up an item at a market stall, asking the vendor, "
        "a simple coin shape and question mark",
    "too-expensive": "a traveler looking shocked at an item at a market stall, hand on cheek, "
        "a coin shape with an upward arrow",
    "toilet": "a person looking around with a small question mark, a simple restroom sign "
        "with two generic figures (no text) on a wall",
    "very-good": "a person happily eating a bowl of noodles, big smile, a small star beside them",
    "water": "a person at a table holding an empty glass toward a server, a water bottle on the table",
    "help": "a worried person raising both hands to flag down a passer-by, urgent but friendly",
    "wait": "a person holding up one open palm in a 'wait a moment' gesture, a small clock shape beside them",
    "what-is-this": "a traveler holding a small unfamiliar fruit up and looking curiously at a vendor, "
        "a question mark above",
}


def load_ids() -> list[str]:
    # PyYAML rejects some flow-mapping lines the JS yaml parser accepts (e.g. `ja: お名前は? }`),
    # and only the ids are needed here, so read them directly.
    ids = re.findall(r"^- id: (\S+)", PHRASES_YAML.read_text(), re.M)
    missing = [i for i in ids if i not in CONCEPTS]
    extra = [i for i in CONCEPTS if i not in ids]
    if missing or extra:
        sys.exit(f"CONCEPTS とフレーズが不一致: 足りない={missing} 余分={extra}")
    return ids


def build_prompt(pid: str) -> str:
    return f"{STYLE}\n\nScene: {CONCEPTS[pid]}."


def shrink(image_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((IMG_MAX, IMG_MAX), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=82, method=6)
    return buf.getvalue()


def generate(client: OpenAI, pid: str, quality: str) -> str:
    result = client.images.generate(
        model="gpt-image-2",
        prompt=build_prompt(pid),
        size="1024x1024",
        quality=quality,
        output_format="webp",
        n=1,
    )
    raw = base64.b64decode(result.data[0].b64_json)
    out = shrink(raw)
    (OUT_DIR / f"{pid}.webp").write_bytes(out)
    return f"{pid}: {len(raw)} -> {len(out)} bytes"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="+", help="このフレーズidだけ生成する")
    ap.add_argument("--force", action="store_true", help="既存の画像も作り直す")
    ap.add_argument("--quality", choices=["low", "medium", "high"], default="low")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--dry-run", action="store_true", help="プロンプトを表示するだけ(API呼び出しなし)")
    args = ap.parse_args()

    ids = load_ids()
    if args.only:
        unknown = [i for i in args.only if i not in ids]
        if unknown:
            sys.exit(f"unknown phrase id: {unknown}")
        ids = args.only
    if not args.force:
        ids = [i for i in ids if not (OUT_DIR / f"{i}.webp").exists()]

    if args.dry_run:
        for pid in ids:
            print(f"--- {pid} ---\n{build_prompt(pid)}\n")
        print(f"{len(ids)} images would be generated")
        return

    load_dotenv(ROOT / ".env")
    client = OpenAI()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    failed = []
    with cf.ThreadPoolExecutor(args.workers) as ex:
        futs = {ex.submit(generate, client, pid, args.quality): pid for pid in ids}
        for fut in cf.as_completed(futs):
            pid = futs[fut]
            try:
                print(fut.result(), flush=True)
            except Exception as e:  # noqa: BLE001 - report and continue so a re-run resumes
                failed.append(pid)
                print(f"{pid}: FAILED {e}", file=sys.stderr, flush=True)
    if failed:
        sys.exit(f"failed: {failed} (再実行で残りだけ生成されます)")


if __name__ == "__main__":
    main()
