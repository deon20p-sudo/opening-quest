#!/usr/bin/env bash
# Builds dist/OpeningQuest-<version>.aab, the Android App Bundle that Google Play needs,
# signed with your UPLOAD key (android/upload-keystore.jks). No Gradle needed.
#
# bundletool comes from Android Studio's Gradle cache (or set BUNDLETOOL_CP to a classpath).
set -euo pipefail
cd "$(dirname "$0")"
export MSYS_NO_PATHCONV=1
w() { cygpath -w "$1"; }

ROOT="$(cd .. && pwd)"
VERSION="$(grep -o 'android:versionName="[^"]*"' AndroidManifest.xml | cut -d'"' -f2)"
SDK="$(cygpath -u "${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}")"
BT="$SDK/build-tools/$(ls "$SDK/build-tools" | sort -V | tail -1)"
PLATFORM="$SDK/platforms/$(ls "$SDK/platforms" | sort -V | tail -1)/android.jar"
JDK="$(cygpath -u "${JAVA_HOME:-C:/Program Files/Android/Android Studio/jbr}")"
export JAVA_HOME="$(w "$JDK")"
OUT="$ROOT/build/aab"
DIST="$ROOT/dist"
AAB="$DIST/OpeningQuest-$VERSION.aab"
rm -rf "$OUT" && mkdir -p "$OUT/res" "$OUT/gen" "$OUT/classes" "$OUT/assets/web" "$DIST"

# bundletool and its libraries, from Android Studio's Gradle cache
if [ -z "${BUNDLETOOL_CP:-}" ]; then
  C="$HOME/.gradle/caches/modules-2/files-2.1"
  BUNDLETOOL_CP=""
  for j in bundletool-1 aapt2-proto- auto-value-annotations protobuf-java-util-3 guava-3 protobuf-java-3 dagger-2 javax.inject-1 jose4j slf4j-api failureaccess jsr305 gson-2; do
    f=$(find "$C" -name "${j}*.jar" ! -name "*sources*" 2>/dev/null | sort -V | tail -1)
    [ -n "$f" ] || { echo "Missing $j in the Gradle cache. Open any project in Android Studio once, or set BUNDLETOOL_CP."; exit 1; }
    BUNDLETOOL_CP="$BUNDLETOOL_CP;$(w "$f")"
  done
  BUNDLETOOL_CP="${BUNDLETOOL_CP:1}"
fi
bundletool() { "$JDK/bin/java.exe" -cp "$BUNDLETOOL_CP" com.android.tools.build.bundletool.BundleToolMain "$@"; }

# 1. web app -> assets
cp -r "$ROOT/web/." "$OUT/assets/web/"
find "$OUT/assets/web" -name package.json -delete

# 2. resources in protobuf format (what app bundles use)
for f in $(find res -type f); do "$BT/aapt2.exe" compile -o "$(w "$OUT/res")" "$(w "$f")"; done
FLATS=(); for f in "$OUT"/res/*.flat; do FLATS+=("$(w "$f")"); done
"$BT/aapt2.exe" link --proto-format -o "$(w "$OUT/proto.zip")" -I "$(w "$PLATFORM")" --manifest "$(w AndroidManifest.xml)" \
  --java "$(w "$OUT/gen")" -A "$(w "$OUT/assets")" --auto-add-overlay "${FLATS[@]}"

# 3. Java -> dex
SRCS=(); while read -r f; do SRCS+=("$(w "$f")"); done < <(find src "$OUT/gen" -name '*.java')
"$JDK/bin/javac.exe" -source 11 -target 11 -encoding UTF-8 -nowarn -Xlint:-options -classpath "$(w "$PLATFORM")" -d "$(w "$OUT/classes")" "${SRCS[@]}"
CLASSES=(); while read -r f; do CLASSES+=("$(w "$f")"); done < <(find "$OUT/classes" -name '*.class')
cmd /c "$(w "$BT/d8.bat")" --release --min-api 24 --lib "$(w "$PLATFORM")" --output "$(w "$OUT")" "${CLASSES[@]}"

# 4. lay out the base module: manifest/, dex/, res/, assets/, resources.pb
python - "$(w "$OUT/proto.zip")" "$(w "$OUT/classes.dex")" "$(w "$OUT/base.zip")" <<'PY'
import sys, zipfile
src, dex, out = sys.argv[1:4]
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for i in zin.infolist():
        n = i.filename
        dest = 'manifest/AndroidManifest.xml' if n == 'AndroidManifest.xml' else n
        z.writestr(dest, zin.read(n))
    z.write(dex, 'dex/classes.dex')
PY
cat > "$OUT/config.json" <<'JSON'
{ "compression": { "uncompressedGlob": ["assets/**/*.wasm"] } }
JSON
rm -f "$OUT/unsigned.aab"
bundletool build-bundle --modules="$(w "$OUT/base.zip")" --config="$(w "$OUT/config.json")" --output="$(w "$OUT/unsigned.aab")"

# 5. sign with the upload key (created on first run; KEEP IT SAFE, see STORE-RELEASE.md)
KS="$ROOT/android/upload-keystore.jks"
PWF="$ROOT/android/upload-keystore-password.txt"
if [ ! -f "$KS" ]; then
  PW="$(python -c "import secrets,string;print(''.join(secrets.choice(string.ascii_letters+string.digits) for _ in range(24)))")"
  printf '%s\n' "$PW" > "$PWF"
  "$JDK/bin/keytool.exe" -genkeypair -keystore "$(w "$KS")" -storetype PKCS12 -storepass "$PW" -keypass "$PW" -alias upload \
    -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=Opening Quest, O=Opening Quest" >/dev/null 2>&1
  echo "Created a new upload key: android/upload-keystore.jks (password in android/upload-keystore-password.txt). Back both up!"
fi
PW="$(head -1 "$PWF" | tr -d '\r\n')"
cp "$OUT/unsigned.aab" "$AAB"
"$JDK/bin/jarsigner.exe" -keystore "$(w "$KS")" -storepass "$PW" -sigalg SHA256withRSA -digestalg SHA-256 "$(w "$AAB")" upload >/dev/null
"$JDK/bin/jarsigner.exe" -verify "$(w "$AAB")" | tail -1
bundletool validate --bundle="$(w "$AAB")" | head -3
ls -la "$AAB"
