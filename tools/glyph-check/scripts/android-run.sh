#!/usr/bin/env bash
# Runs inside the emulator step. The static server already listens on the runner host (10.0.2.2 from the emulator).
set -uo pipefail
OUT="${OUT_DIR:-artifacts}"
mkdir -p "$OUT"

adb wait-for-device
# skip Chrome's first-run screens (needs root; adbd restarts after `adb root`)
if adb root >/dev/null 2>&1; then
  sleep 3; adb wait-for-device; sleep 2
  adb shell 'echo "chrome --disable-fre --no-default-browser-check --no-first-run" > /data/local/tmp/chrome-command-line'
  adb shell chmod 755 /data/local/tmp/chrome-command-line
fi
adb shell settings put global window_animation_scale 0 || true
adb shell pm grant com.android.chrome android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
adb logcat -c || true

rc=0
for mode in sys merged; do
  name="android-api${API_LEVEL}-${mode}"
  adb shell am force-stop com.android.chrome
  adb shell am start -a android.intent.action.VIEW -d "'http://10.0.2.2:8000/?platform=${name}&mode=${mode}'" com.android.chrome
  for i in $(seq 1 60); do [ -f "$OUT/report-${name}.json" ] && break; sleep 1; done
  sleep 2
  adb exec-out screencap -p > "$OUT/${name}.png"
  [ -f "$OUT/report-${name}.json" ] || { echo "no report for $name"; rc=1; }
done
adb shell dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity" > "$OUT/android-api${API_LEVEL}-activity.txt" || true
adb logcat -d -t 400 > "$OUT/android-api${API_LEVEL}-logcat.txt" || true
exit $rc
