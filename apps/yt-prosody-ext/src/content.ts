import { analyzeLine, parseDict, type Dict } from "en-prosody";
import { Overlay } from "./overlay";
import { DEFAULTS, loadSettings, onSettingsChanged, type Settings } from "./settings";

const HIDE_STYLE_ID = "yt-prosody-hide-native";
let settings: Settings = structuredClone(DEFAULTS);
let dict: Dict | null = null;
let overlay: Overlay | null = null;
let player: HTMLElement | null = null;
let observer: MutationObserver | null = null;
let resizer: ResizeObserver | null = null;
let lastKey = "";
let scheduled = false;

/** 画面に出ている字幕の文字列(字幕ウィンドウごと)。YouTube の DOM: .caption-window > .caption-visual-line > .ytp-caption-segment */
function readCaptions(root: ParentNode): string[] {
  const out: string[] = [];
  root.querySelectorAll(".ytp-caption-window-container .caption-window").forEach((win) => {
    const lines = win.querySelectorAll(".caption-visual-line");
    const parts = lines.length
      ? Array.from(lines, (l) => l.textContent ?? "")
      : Array.from(win.querySelectorAll(".ytp-caption-segment"), (s) => s.textContent ?? "");
    const text = parts.join(" ").replace(/[​-‍﻿]/g, "").replace(/\s+/g, " ").trim();
    if (text) out.push(text);
  });
  return out;
}

/** 英語らしい字幕か(ラテン文字が文字全体の 8 割以上)。日本語などの字幕では、元の字幕を隠さず、何も重ねない */
function looksEnglish(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return true; // ♪ など。隠しても失うものがない
  const latin = letters.filter((c) => /[A-Za-z]/.test(c)).length;
  return latin / letters.length >= 0.8;
}

function setNativeHidden(hidden: boolean): void {
  const existing = document.getElementById(HIDE_STYLE_ID);
  if (hidden && !existing) {
    const s = document.createElement("style");
    s.id = HIDE_STYLE_ID;
    // 元の字幕は DOM に残す(ここから読むため)。見えなくするだけ
    s.textContent = ".ytp-caption-window-container { opacity: 0 !important; }";
    document.documentElement.append(s);
  } else if (!hidden && existing) {
    existing.remove();
  }
}

function update(): void {
  scheduled = false;
  if (!player || !overlay) return;
  if (!settings.enabled || !dict) {
    overlay.clear();
    setNativeHidden(false);
    lastKey = "";
    return;
  }
  const texts = readCaptions(player);
  if (!texts.every(looksEnglish)) {
    overlay.clear();
    setNativeHidden(false);
    lastKey = "";
    return;
  }
  const key = JSON.stringify([texts, settings.layers]);
  if (key === lastKey) return;
  lastKey = key;
  setNativeHidden(true);
  overlay.render(
    texts.map((t) => analyzeLine(t, dict!)),
    settings.layers,
  );
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(update);
}

function fitMetrics(): void {
  if (!player || !overlay) return;
  overlay.setMetrics(Math.max(14, Math.min(40, player.clientHeight * 0.042)));
}

function attach(): void {
  const p = (document.querySelector("#movie_player") ?? document.querySelector(".html5-video-player")) as HTMLElement | null;
  if (!p) {
    setTimeout(attach, 1000);
    return;
  }
  if (p === player && overlay?.host.isConnected) return;
  observer?.disconnect();
  resizer?.disconnect();
  overlay?.host.remove();
  player = p;
  overlay = new Overlay(p);
  observer = new MutationObserver(schedule);
  observer.observe(p, { childList: true, characterData: true, subtree: true });
  resizer = new ResizeObserver(fitMetrics);
  resizer.observe(p);
  fitMetrics();
  lastKey = "";
  schedule();
}

async function loadDict(): Promise<Dict> {
  const res = await fetch(chrome.runtime.getURL("cmudict.txt"));
  return parseDict(await res.text());
}

async function main(): Promise<void> {
  [settings, dict] = await Promise.all([loadSettings(), loadDict()]);
  onSettingsChanged((s) => {
    settings = s;
    lastKey = "";
    schedule();
  });
  // YouTube は SPA。動画を移ってもプレーヤーは使い回されることが多いが、作り直されたときのために付け直す
  window.addEventListener("yt-navigate-finish", attach);
  attach();
}

void main();
