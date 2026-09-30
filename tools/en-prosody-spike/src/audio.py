"""16kHz モノラル wav から、語の直後の無音(ポーズ)の長さを測る。外部サービスは使わない。"""
from __future__ import annotations

import wave

import numpy as np

HOP_MS = 10


class Audio:
    def __init__(self, path: str):
        with wave.open(path) as w:
            assert w.getsampwidth() == 2 and w.getnchannels() == 1
            self.sr = w.getframerate()
            x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        hop = self.sr * HOP_MS // 1000
        n = len(x) // hop
        rms = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(axis=1))
        self.db = 20 * np.log10(rms + 1e-7)
        lo, hi = np.percentile(self.db, 5), np.percentile(self.db, 95)
        # 雑音床と発話の間の 25% 点を無音のしきい値にする(ヒューリスティック)
        self.thr = lo + 0.25 * (hi - lo)

    def trailing_pause_ms(self, start_ms: float, next_ms: float) -> float:
        """[start, next) の末尾に連続する無音フレームの長さ。自動字幕の時刻が粗い場合に備え、区間全体の 85% までに丸める。"""
        a, b = int(start_ms // HOP_MS), int(next_ms // HOP_MS)
        if b <= a:
            return 0.0
        run = 0
        for k in range(b - 1, a - 1, -1):
            if self.db[k] < self.thr:
                run += 1
            else:
                break
        return min(run * HOP_MS, 0.85 * (next_ms - start_ms))
