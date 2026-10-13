"""音素認識(facebook/wav2vec2-lv-60-espeak-cv-ft、Apache-2.0、1.26GB)を掛け、音素列と時刻を出す。貪欲デコード。

使い方: python phone_rec.py AUDIO.wav 開始秒 終了秒 [OUT.json]   (AUDIO は 16kHz モノラル wav。出力は [{"t": 秒, "p": espeak の音素}])
このスパイクの依存(pyproject.toml)には含めていない。別の仮想環境に torch(CPU 版)と transformers を入れて動かした:
  uv venv --python 3.12 && uv pip install --index-url https://download.pytorch.org/whl/cpu torch && uv pip install transformers huggingface_hub numpy
CPU(8 スレッド、AVX2 なし)で実時間の約 0.8〜0.9 倍。モデルは HF_HOME に約 2.4GB 取得される。
"""
import json, sys, time, wave
import numpy as np, torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2FeatureExtractor
from huggingface_hub import hf_hub_download
wav, lo, hi = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
MID = "facebook/wav2vec2-lv-60-espeak-cv-ft"
t0 = time.time()
fe = Wav2Vec2FeatureExtractor.from_pretrained(MID)
model = Wav2Vec2ForCTC.from_pretrained(MID).eval()
vocab = json.load(open(hf_hub_download(MID, "vocab.json")))
inv = {v: k for k, v in vocab.items()}
blank = vocab.get("<pad>", 0)
print(f"load {time.time()-t0:.1f}s threads={torch.get_num_threads()}", flush=True)
with wave.open(wav) as w:
    sr = w.getframerate(); w.setpos(int(lo * sr))
    x = np.frombuffer(w.readframes(int((hi - lo) * sr)), dtype=np.int16).astype(np.float32) / 32768
out, CH = [], 20 * sr       # 20 秒ずつ(メモリ節約)
t1 = time.time()
for s in range(0, len(x), CH):
    seg = x[s:s + CH]
    inp = fe(seg, sampling_rate=sr, return_tensors="pt")
    with torch.no_grad():
        ids = model(inp.input_values).logits.argmax(-1)[0].tolist()
    prev = blank
    for f, i in enumerate(ids):
        if i != prev and i != blank:
            out.append({"t": round(lo + s / sr + f * 0.02, 2), "p": inv[i]})
        prev = i
el = time.time() - t1
print(f"infer {el:.1f}s for {hi-lo:.0f}s audio -> {el/(hi-lo):.2f}x realtime, {len(out)} phones", flush=True)
json.dump(out, open(sys.argv[4] if len(sys.argv) > 4 else "phones.json", "w"), ensure_ascii=False)
