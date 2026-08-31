#!/bin/bash
# Render the speaker one-pagers to PDF with headless Chrome.
#
#   bash scripts/onepagers-to-pdf.sh [port]
#
# One Letter page per applicant, for a fast go / no-go read.

set -u
PORT="${1:-3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/uplift-speaker-onepagers.pdf"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE="${TMPDIR:-/tmp}/uplift-onepagers-profile"

rm -rf "$PROFILE" "$DEST"; mkdir -p "$PROFILE"
"$CHROME" --headless --disable-gpu --no-first-run --no-pdf-header-footer \
  --virtual-time-budget=12000 --user-data-dir="$PROFILE" \
  --print-to-pdf="$DEST" "http://localhost:$PORT/uplift-speaker-onepagers.html" >/dev/null 2>&1 &
pid=$! waited=0
while [ ! -s "$DEST" ] && [ "$waited" -lt 60 ]; do sleep 0.5; waited=$((waited + 1)); done
sleep 1; kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
[ -s "$DEST" ] && { echo "wrote $DEST"; ls -lh "$DEST" | awk '{print "size:", $5}'; } || { echo FAILED; exit 1; }
