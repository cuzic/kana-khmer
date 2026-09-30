import type { IRWord } from "en-prosody";
import type { LayerState } from "./settings";

const CSS = `
:host { all: initial; }
.wrap { position: absolute; left: 50%; bottom: var(--bottom, 13%); transform: translateX(-50%); width: max-content; max-width: 90%;
  display: flex; flex-direction: column; align-items: center; gap: .25em; pointer-events: none; z-index: 60;
  font: var(--fs, 22px)/1.25 "Noto Sans JP", "Hiragino Sans", "Yu Gothic", system-ui, "Noto Sans", "DejaVu Sans", sans-serif; color: #fff; }
.line { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-end; gap: .15em .4em; padding: .25em .6em;
  background: rgba(8, 10, 14, .78); border-radius: .3em; }
.w { display: inline-flex; flex-direction: column; align-items: center; }
.kana { color: #8cc4ff; font-size: .62em; white-space: nowrap; min-height: 1.05em; }
.beat { color: #8cc4ff; font-size: .55em; line-height: 1; min-height: 1em; }
.en { font-weight: 400; }
.sz .p0 .en { font-size: .72em; } .sz .p1 .en { font-size: .86em; } .sz .p3 .en { font-size: 1.2em; }
.sz .p0 .kana { font-size: .5em; } .sz .p1 .kana { font-size: .56em; } .sz .p3 .kana { font-size: .74em; }
.bold .p2 .en, .bold .p3 .en { font-weight: 700; }
.weak .p0 .en { color: #a9aeb8; }
.nucleus .p3 .en { color: #ff6b5b; text-decoration: underline; text-decoration-thickness: .08em; text-underline-offset: .15em; }
.note .en { font-style: italic; color: #aab; font-weight: 400; }
.link, .brk { align-self: flex-end; color: #9aa0a6; }
.link { color: #8cc4ff; margin: 0 .2em 0 -.3em; }
.brk { margin: 0 .3em 0 -.1em; }
.nokana .kana, .nobeat .beat, .nobreaks .brk, .nolink .link, .noipa .m { display: none; }
`;

const MODS = new Set("ʳˡᶿᶞᵛᵆᶺᶦᶷᵓᵊᵑᵈᵇᵍᶻᶾᵗʰᶟ");

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function kanaNode(k: string): DocumentFragment {
  const f = document.createDocumentFragment();
  for (const ch of k) f.append(MODS.has(ch) ? el("span", "m", ch) : document.createTextNode(ch));
  return f;
}

export class Overlay {
  readonly host: HTMLElement;
  private readonly wrap: HTMLElement;

  constructor(parent: HTMLElement) {
    this.host = el("div");
    this.host.id = "yt-prosody-overlay";
    const root = this.host.attachShadow({ mode: "open" });
    const style = el("style");
    style.textContent = CSS;
    this.wrap = el("div", "wrap");
    root.append(style, this.wrap);
    parent.append(this.host);
  }

  /** 字幕の大きさ(px)と下からの位置(%)。プレーヤーの大きさに合わせる */
  setMetrics(fontPx: number): void {
    this.wrap.style.setProperty("--fs", `${fontPx}px`);
  }

  clear(): void {
    this.wrap.replaceChildren();
  }

  render(blocks: IRWord[][], layers: LayerState): void {
    const cls = ["wrap"];
    if (layers.size) cls.push("sz");
    if (layers.bold) cls.push("bold");
    if (layers.nucleus) cls.push("nucleus");
    if (layers.weak) cls.push("weak");
    for (const k of ["kana", "beat", "breaks", "link", "ipa"] as const) if (!layers[k]) cls.push("no" + k);
    this.wrap.className = cls.join(" ");
    this.wrap.replaceChildren(
      ...blocks.map((words) => {
        const line = el("div", "line");
        for (const w of words) {
          const note = w.kind === "note";
          const box = el("span", `w p${w.prominence}${note ? " note" : ""}`);
          const kana = el("span", "kana");
          if (!note && w.kana) kana.append(kanaNode(w.kana));
          const beat = el("span", "beat", note ? "" : "·●◎"[w.beat] ?? "");
          box.append(kana, beat, el("span", "en", w.text));
          line.append(box);
          if (w.linked_next) line.append(el("span", "link", "‿"));
          if (w.break_after && !note) line.append(el("span", "brk", w.break_after === 2 ? "//" : "/"));
        }
        return line;
      }),
    );
  }
}
