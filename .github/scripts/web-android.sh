#!/usr/bin/env bash
# Runs inside the emulator step. vite preview listens on the runner host (10.0.2.2 from the emulator).
set -uo pipefail
OUT="${OUT_DIR:-artifacts}"
mkdir -p "$OUT"
adb wait-for-device
if adb root >/dev/null 2>&1; then
  sleep 3; adb wait-for-device; sleep 2
  adb shell 'echo "chrome --disable-fre --no-default-browser-check --no-first-run" > /data/local/tmp/chrome-command-line'
  adb shell chmod 755 /data/local/tmp/chrome-command-line
fi
adb shell settings put global window_animation_scale 0 || true
adb shell settings put global hide_error_dialogs 1 || true  # emulator "System UI/Launcher isn't responding" dialogs cover the page
adb shell pm grant com.android.chrome android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
adb logcat -c || true

i=0
for q in "" "?scene=thanks-sorry" "?scene=thanks-sorry&notation=full" "?scene=thanks-sorry&gender=female"; do
  i=$((i+1))
  adb shell am force-stop com.android.chrome
  adb shell am start -a android.intent.action.VIEW -d "'http://10.0.2.2:8000/${q}'" com.android.chrome
  sleep 12
  # a crashed Chrome leaves the launcher in front; record it and retry once
  if ! adb shell dumpsys activity activities | grep -E "topResumedActivity|mResumedActivity" | grep -q chrome; then
    echo "chrome not in front for shot $i, retrying"
    adb shell am start -a android.intent.action.VIEW -d "'http://10.0.2.2:8000/${q}'" com.android.chrome
    sleep 12
  fi
  adb exec-out screencap -p > "$OUT/android-api${API_LEVEL}-$i.png"
done
adb logcat -d -t 600 > "$OUT/android-api${API_LEVEL}-logcat.txt" || true
