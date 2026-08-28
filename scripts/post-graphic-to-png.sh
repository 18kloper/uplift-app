#!/bin/bash
# Render the LinkedIn post graphic to PNG with headless Chrome.
#
#   bash scripts/post-graphic-to-png.sh [port]
#
# Rendered from the dev server so the logo and Google Fonts resolve. Output is
# exactly 1080x1350, LinkedIn's 4:5 feed size.

set -u
PORT="${1:-3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/uplift-expert-sessions-post.png"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE="${TMPDIR:-/tmp}/uplift-post-graphic-profile"

rm -rf "$PROFILE" "$DEST"; mkdir -p "$PROFILE"

"$CHROME" --headless --disable-gpu --no-first-run --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1080,1350 \
  --virtual-time-budget=12000 --user-data-dir="$PROFILE" \
  --screenshot="$DEST" "http://localhost:$PORT/uplift-expert-sessions-post.html" >/dev/null 2>&1 &
pid=$! waited=0
while [ ! -s "$DEST" ] && [ "$waited" -lt 60 ]; do sleep 0.5; waited=$((waited + 1)); done
sleep 1; kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null

if [ -s "$DEST" ]; then
  echo "wrote $DEST"
  python3 - "$DEST" <<'PY'
import struct, sys
d = open(sys.argv[1], "rb").read()
w, h = struct.unpack(">II", d[16:24])
print(f"dimensions: {w} x {h} | size: {round(len(d)/1024)} KB")
PY
else echo "FAILED"; exit 1; fi
