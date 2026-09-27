#!/usr/bin/env bash
# Tone-spike variant of android-run.sh: one Chrome screenshot per view of /tone-spike.html.
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
adb shell pm grant com.android.chrome android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
adb logcat -c || true

rc=0
for view in both; do
  name="android-api${API_LEVEL}-${view}"
  adb shell am force-stop com.android.chrome
  adb shell am start -a android.intent.action.VIEW -d "'http://10.0.2.2:8000/tone-spike.html?view=${view}&platform=${name}'" com.android.chrome
  for i in $(seq 1 60); do [ -f "$OUT/report-${name}.json" ] && break; sleep 1; done
  sleep 2
  adb exec-out screencap -p > "$OUT/${name}.png"
  [ -f "$OUT/report-${name}.json" ] || { echo "no report for $name"; rc=1; }
done
adb logcat -d -t 200 > "$OUT/android-api${API_LEVEL}-logcat.txt" || true
exit $rc
