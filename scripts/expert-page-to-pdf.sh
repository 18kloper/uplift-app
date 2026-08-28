#!/bin/bash
# Render /share-your-expertise to a PDF for LinkedIn document posts.
#
#   bash scripts/expert-page-to-pdf.sh [port]
#
# Rendered from the running dev server (not file://) so the live slot board
# fetches /api/speaker-slots and the dates print with their real open/booked
# state. Print CSS in public/uplift-speak.html drops the buttons and floating
# CTA and prints the URL as text, since a LinkedIn document is not clickable.

set -u
PORT="${1:-3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/uplift-share-your-expertise.pdf"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE="${TMPDIR:-/tmp}/uplift-expert-pdf-profile"

rm -rf "$PROFILE" "$DEST"; mkdir -p "$PROFILE"

"$CHROME" --headless --disable-gpu --no-first-run --no-pdf-header-footer \
  --virtual-time-budget=15000 --user-data-dir="$PROFILE" \
  --print-to-pdf="$DEST" "http://localhost:$PORT/share-your-expertise" >/dev/null 2>&1 &
pid=$! waited=0
while [ ! -s "$DEST" ] && [ "$waited" -lt 70 ]; do sleep 0.5; waited=$((waited + 1)); done
sleep 1; kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null

if [ -s "$DEST" ]; then echo "wrote $DEST"; ls -lh "$DEST" | awk '{print "size:", $5}';
else echo "FAILED"; exit 1; fi
