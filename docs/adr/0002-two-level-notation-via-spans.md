---
status: accepted
date: 2026-09-26
deciders: agent (opus-reviewed)
note: 2026-09-27 に ADR-0005 が DENASAL 例外を撤去、2026-09-28 に ADR-0006 が LITE_DROP の中身を機能負担量ベースに置き換えた(いずれもこの ADR の「落とす集合の中身」を差し替えるだけで、span 方式そのものは変えていない)
---

# ADR-0002: 詳細/ライトの2階層表記を span 方式で導出、NFKC/NFKD 禁止

## コンテキスト
日本語話者向けにクメール語の発音をカナで表す際、全ての音韻対立を書く「詳細」表記と、学習初期向けの
簡易な「ライト」表記の2段階が要る。ライトは詳細から機械的に導出する必要があるが、文字列の正規表現置換で
行うと、`ㇷ゚`(半濁点付きプ)のような複合文字をトークン境界を跨いで誤って壊すリスクがある。また、
修飾文字は Unicode の spacing modifier letter(`ʰ ˡ ʳ ᵑ ᵋ ᵓ ᵅ ᵊ ᶤ` 等)であり、NFKC/NFKD 正規化を通すと
通常の文字に潰されてしまう(例: `ʰ → h`、`ᵊ → ə`。`"ᵊʰˡ".normalize("NFKC") === "əhl"`、
`packages/khmer-kana/test/parse.test.ts` L64-65 でこの破壊を実演している)。

## 決定
`renderFull` は「役割付き span 列」(`Rendered.spans: SpanKind[]`。`kana` / `kana-nonsyl` / `cons-mod` /
`vowel-mod` / `long` / `space`)を返す。`renderLite`(`liteFromFull`)はこの span 列に対して
**「`cons-mod`/`vowel-mod` の span のうち、"落とす集合" に入っているものだけを捨てる」という
トークン単位の1操作だけ**を行い、文字列の正規表現置換は使わない。

この決定時点(2026-09-26、`9f2e26b`)の「落とす集合」の中身は、**種別一律(cons-mod/vowel-mod は
全部落とす)+ ŋ だけの例外**だった: ŋ は半濁点 `゚` を使い回していたため、`゚` を無条件に落とすと
`ㇷ゚`(p の半濁点)まで壊れてしまう。そこで ŋ だけ専用の変換表 `DENASAL`(`カ゚キ゚ク゚ケ゚コ゚ン゚` の
6パターン→平カナ置換)で個別に処理していた。**この「落とす集合の中身」自体は、本 ADR の決定ではなく、
後続の [ADR-0005](0005-ng-shared-modifier.md)(ŋ を独立記号 `ᵑ` にして `DENASAL` を撤去、
2026-09-27)と [ADR-0006](0006-lite-drop-by-functional-load.md)(落とす集合を機能負担量で個別選定、
2026-09-28)によって置き換えられている。** 本 ADR が固定しているのは「span 列に対するトークン単位の
1操作」という **導出方式**であり、何を落とすかではない。

NFKC/NFKD の適用はライブラリ・アプリ全体で禁止し、プロジェクトの `CLAUDE.md` のルールと
`parse.test.ts` の実演テストの両方で固定する(NFKC を適用しても失敗しないことを保証する自動テストは
現状ない。CI での grep 等での禁止は未整備)。

## 検討した代替案
- **文字列正規表現による置換(旧 v0.2 方式)**: 半濁点の誤削除など、トークン境界を跨いだ破壊が起きるため却下。

## 結果(影響)
新しい修飾記号を追加する際は、その記号を「落とす集合」に入れるかどうかを1箇所判断するだけでよい
([ADR-0006](0006-lite-drop-by-functional-load.md))。UI の色分け・タップ説明も span 種別をそのまま使える。
「詳細から機械的にライトを導出するトークン単位の結果」と「詳細の文字列から落とす集合の文字を引いた
文字列単位の結果」が一致することは `render.test.ts` L22 でテストしている(`liteFromFull`/`renderLite`
自体の冪等性テストは無い)。span 方式と「落とす集合の中身」を別レイヤーに分けたことで、中身側は
実装(span 導出処理)を変えずに2回改定できた(ADR-0005、ADR-0006)。

## 参照
- `docs/khmer-kana-spec.md` §3, §7
- `docs/design.md` §2.2, §2.4
- `packages/khmer-kana/src/render.ts`, `packages/khmer-kana/test/render.test.ts`, `packages/khmer-kana/test/parse.test.ts`
- commits `9f2e26b`(初期実装、DENASAL を含む), `3fd8126`, `078b14f`
