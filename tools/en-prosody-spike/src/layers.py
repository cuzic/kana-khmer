"""見せる層の選択。IR には全部の層が入っていて、変換器(to_*.py)が Layers に従って出し分ける。

層:
  size     強勢を文字の大きさで(弱形は小さく、核は大きく)
  bold     内容語を太字に
  nucleus  核(まとまりの最後の内容語)を色+下線で
  weak     弱く読む語を灰色に
  breaks   まとまりの切れ目(/ //)
  link     語のつながり(‿)
  beat     ビート(強い語 ● / 核を兼ねる強い語 ◎。· は HTML のみ)
  kana     推定の発音のカナ
  ipa      カナの右肩の IPA(無ければライト)
  audio    カナを音声で決めた形にする(無ければ規則だけの形)
"""
from __future__ import annotations

from dataclasses import dataclass, fields

ALL = ("size", "bold", "nucleus", "weak", "breaks", "link", "beat", "kana", "ipa", "audio")

PRESETS = {
    "入門": ("size", "bold", "nucleus", "weak", "breaks", "kana", "audio"),
    "標準": ("size", "bold", "nucleus", "weak", "breaks", "link", "beat", "kana", "audio"),
    "詳細": ALL,
    "リズム": ("size", "bold", "nucleus", "weak", "breaks", "beat"),
}


@dataclass(frozen=True)
class Layers:
    size: bool = True
    bold: bool = True
    nucleus: bool = True
    weak: bool = True
    breaks: bool = True
    link: bool = True
    beat: bool = True
    kana: bool = True
    ipa: bool = True
    audio: bool = True

    @classmethod
    def parse(cls, spec: str | None) -> "Layers":
        """"標準" のようなプリセット名、"size,beat,kana" のような列挙、"詳細,-ipa" のような差し引きを受ける。"""
        if not spec:
            return cls()
        on: set[str] = set()
        for part in (p.strip() for p in spec.split(",") if p.strip()):
            if part in PRESETS:
                on = set(PRESETS[part])
            elif part == "all":
                on = set(ALL)
            elif part.startswith("-") and part[1:] in ALL:
                on.discard(part[1:])
            elif part.startswith("+") and part[1:] in ALL:
                on.add(part[1:])
            elif part in ALL:
                on.add(part)
            else:
                raise ValueError(f"未知の層: {part}(使えるもの: {', '.join(ALL)} / プリセット: {', '.join(PRESETS)})")
        return cls(**{f.name: f.name in on for f in fields(cls)})
