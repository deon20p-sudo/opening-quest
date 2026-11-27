#!/usr/bin/env bash
# Builds dist/OpeningQuest-1.7.0.apk from web/ using only the Android SDK tools (no Gradle).
set -euo pipefail
cd "$(dirname "$0")"
export MSYS_NO_PATHCONV=1
w() { cygpath -w "$1"; }

ROOT="$(cd .. && pwd)"
SDK="$(cygpath -u "${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}")"
BT="$SDK/build-tools/$(ls "$SDK/build-tools" | sort -V | tail -1)"
PLATFORM="$SDK/platforms/$(ls "$SDK/platforms" | sort -V | tail -1)/android.jar"
JDK="$(cygpath -u "${JAVA_HOME:-C:/Program Files/Android/Android Studio/jbr}")"
export JAVA_HOME="$(w "$JDK")"
export PATH="$JDK/bin:$PATH"
OUT="$ROOT/build/android"
DIST="$ROOT/dist"
APK="$DIST/OpeningQuest-1.7.0.apk"
rm -rf "$OUT" && mkdir -p "$OUT/res" "$OUT/gen" "$OUT/classes" "$OUT/assets/web" "$DIST"
echo "build-tools: $BT"

# 1. the web app becomes the APK's assets
cp -r "$ROOT/web/." "$OUT/assets/web/"
find "$OUT/assets/web" -name package.json -delete

# 2. resources + manifest
for f in $(find res -type f); do
  "$BT/aapt2.exe" compile -o "$(w "$OUT/res")" "$(w "$f")"
done
FLATS=()
for f in "$OUT"/res/*.flat; do FLATS+=("$(w "$f")"); done
"$BT/aapt2.exe" link -o "$(w "$OUT/base.apk")" -I "$(w "$PLATFORM")" --manifest "$(w AndroidManifest.xml)" \
  --java "$(w "$OUT/gen")" -A "$(w "$OUT/assets")" --auto-add-overlay -0 wasm "${FLATS[@]}"

# 3. Java -> classes -> dex
SRCS=()
while read -r f; do SRCS+=("$(w "$f")"); done < <(find src "$OUT/gen" -name '*.java')
"$JDK/bin/javac.exe" -source 11 -target 11 -encoding UTF-8 -nowarn -Xlint:-options \
  -classpath "$(w "$PLATFORM")" -d "$(w "$OUT/classes")" "${SRCS[@]}"
CLASSES=()
while read -r f; do CLASSES+=("$(w "$f")"); done < <(find "$OUT/classes" -name '*.class')
cmd /c "$(w "$BT/d8.bat")" --release --min-api 24 --lib "$(w "$PLATFORM")" --output "$(w "$OUT")" "${CLASSES[@]}"

# 4. add classes.dex, align, sign
python - "$(w "$OUT/base.apk")" "$(w "$OUT/classes.dex")" "$(w "$OUT/unaligned.apk")" <<'PY'
# Rewrite the archive in one pass (consistent headers), adding classes.dex.
# resources.arsc and .wasm stay uncompressed, as Android requires / prefers.
import sys, zipfile
src, dex, out = sys.argv[1:4]
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(out, 'w') as zout:
    for info in zin.infolist():
        data = zin.read(info.filename)
        stored = info.filename == 'resources.arsc' or info.filename.endswith(('.wasm', '.png')) or info.compress_type == zipfile.ZIP_STORED
        zi = zipfile.ZipInfo(info.filename, date_time=(2026, 1, 1, 0, 0, 0))
        zi.compress_type = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
        zi.external_attr = 0o644 << 16
        zout.writestr(zi, data)
    zi = zipfile.ZipInfo('classes.dex', date_time=(2026, 1, 1, 0, 0, 0))
    zi.compress_type = zipfile.ZIP_DEFLATED
    zout.writestr(zi, open(dex, 'rb').read())
PY
"$BT/zipalign.exe" -f -p 4 "$(w "$OUT/unaligned.apk")" "$(w "$OUT/aligned.apk")"
"$BT/zipalign.exe" -c -p 4 "$(w "$OUT/aligned.apk")" && echo "alignment OK"
KS="$ROOT/android/debug.keystore"
if [ ! -f "$KS" ]; then
  "$JDK/bin/keytool.exe" -genkeypair -keystore "$(w "$KS")" -storepass android -keypass android -alias openingquest \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Opening Quest, O=Opening Quest" >/dev/null 2>&1
fi
cmd /c "$(w "$BT/apksigner.bat")" sign --ks "$(w "$KS")" --ks-pass pass:android --key-pass pass:android \
  --out "$(w "$APK")" "$(w "$OUT/aligned.apk")"
cmd /c "$(w "$BT/apksigner.bat")" verify --print-certs "$(w "$APK")" | head -2
ls -la "$APK"
