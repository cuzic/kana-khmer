# /// script
# requires-python = ">=3.10"
# dependencies = ["openai>=1.50", "python-dotenv", "pyyaml", "pillow"]
# ///
"""Generate one illustration per scene (packages/content/data/scenes.yaml) with gpt-image-2.

Output: apps/web/public/images/scenes/<scene-id>.webp (served by Vite from /public as-is,
same convention as /fonts/*.woff2). Re-run for one scene with --only <id>; --dry-run prints
the prompts without calling the API (no cost).

Cost: quality defaults to "low" (~$0.006/image at 1024x1024, per OpenAI's per-token image
pricing) because these render as a 44x44px thumbnail in .scenes button (apps/web/src/style.css)
-- detail above that is wasted. 5 scenes ≈ $0.03 total. --quality medium/high cost ~9x/~35x
more per image; only use them if low looks visibly rough once generated.

Requires OPENAI_API_KEY in the repo root .env (gitignored; not part of the published app).

usage: uv run tools/scene-images/scripts/generate.py [--only greetings] [--quality medium] [--dry-run]
"""
import argparse
import base64
import io
import pathlib
import sys

import yaml
from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[3]
SCENES_YAML = ROOT / "packages/content/data/scenes.yaml"
OUT_DIR = ROOT / "apps/web/public/images/scenes"

# .scenes button の .scene-img はカード上部のバナー (幅いっぱい x 140px, apps/web/src/style.css)。
# main の実効幅は最大 608px (max-width 640px - padding 32px) なので、高DPI込みで 768px あれば十分。
# gpt-image-2 は low quality でも 1024x1024 を返すので、768 は縮小のみ (アップスケールなし)。
THUMB_MAX = 768

# 見た目は apps/web/src/style.css のトーンに合わせる (クリーム背景 + 差し色1色のフラットイラスト)。
STYLE = (
    "Flat minimalist vector illustration for a friendly travel phrasebook app. "
    "Warm cream background (#f7f5f1). A single muted green accent color (#0b8f5c) for "
    "the main subject, with soft charcoal (#1c1a16) linework; no other colors. "
    "Simple rounded shapes, generous negative space, centered composition, square format. "
    "No text, no letters, no numbers, no speech-bubble words anywhere in the image."
)

# シーン id -> 描いてほしい情景 (packages/content/data/scenes.yaml の id/title と対応)
CONCEPTS = {
    "greetings": "two people meeting on a street lined with palm trees and a small "
        "Cambodian temple roofline in the distance, one waving hello to the other",
    "thanks-sorry": "a person bowing slightly with both palms pressed together at chest "
        "height (the sampeah greeting gesture), a small heart shape floating beside them",
    "address": "a person cupping a hand near their mouth calling out to someone walking "
        "away in the distance, a small speech bubble (empty, no text) above them",
    "intro": "two people shaking hands warmly, one wearing a small round name-tag "
        "(blank, no text) on their chest",
    "oneliners": "a single rounded speech bubble (empty, no text) with a small star "
        "inside it, floating above a simple tuk-tuk silhouette",
}


def load_scene_ids() -> list[str]:
    scenes = yaml.safe_load(SCENES_YAML.read_text())
    ids = [s["id"] for s in scenes]
    missing = [i for i in ids if i not in CONCEPTS]
    if missing:
        sys.exit(f"CONCEPTS に無いシーンがあります: {missing} (scripts/generate.py を更新してください)")
    return ids


def build_prompt(scene_id: str) -> str:
    return f"{STYLE}\n\nScene: {CONCEPTS[scene_id]}."


def downscale(image_bytes: bytes) -> bytes:
    """Shrink to THUMB_MAX and re-encode as lossy webp (thumbnail use, not a print asset)."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((THUMB_MAX, THUMB_MAX), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=82, method=6)
    return buf.getvalue()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="このシーンidだけ生成する")
    ap.add_argument("--quality", choices=["low", "medium", "high"], default="low",
                     help="デフォルト low (~$0.006/枚, サムネイル用途なら十分)")
    ap.add_argument("--dry-run", action="store_true", help="プロンプトを表示するだけ(API呼び出しなし)")
    args = ap.parse_args()

    ids = load_scene_ids()
    if args.only:
        if args.only not in ids:
            sys.exit(f"unknown scene id: {args.only} (candidates: {ids})")
        ids = [args.only]

    if args.dry_run:
        for sid in ids:
            print(f"--- {sid} ---\n{build_prompt(sid)}\n")
        return

    load_dotenv(ROOT / ".env")
    client = OpenAI()  # OPENAI_API_KEY from env
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for sid in ids:
        prompt = build_prompt(sid)
        print(f"generating {sid} (quality={args.quality}) ...")
        result = client.images.generate(
            model="gpt-image-2",
            prompt=prompt,
            size="1024x1024",
            quality=args.quality,
            output_format="webp",
            n=1,
        )
        raw_bytes = base64.b64decode(result.data[0].b64_json)
        image_bytes = downscale(raw_bytes)
        out_path = OUT_DIR / f"{sid}.webp"
        out_path.write_bytes(image_bytes)
        print(f"  -> {out_path.relative_to(ROOT)} ({len(raw_bytes)} -> {len(image_bytes)} bytes)")


if __name__ == "__main__":
    main()
