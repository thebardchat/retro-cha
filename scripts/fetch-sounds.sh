#!/usr/bin/env bash
# Best-effort fetch of the four AOL sound clips into public/sounds/.
# Any 404 is non-fatal — boot sequence treats missing audio as silence.
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="$HERE/../public/sounds"
mkdir -p "$DIR"

echo "Fetching to $DIR"
echo "(if any of these miss, drop the file in by hand — see public/sounds/README.md)"
echo

fetch() {
  local out="$1"; local url="$2"
  if [ -f "$DIR/$out" ] && [ -s "$DIR/$out" ]; then
    echo "skip  $out  (already present)"
    return
  fi
  if curl -fsSL "$url" -o "$DIR/$out" 2>/dev/null; then
    echo "ok    $out"
  else
    echo "miss  $out  ($url)"
    rm -f "$DIR/$out"
  fi
}

# These URLs change over time. If they 404, drop the file in by hand.
fetch modem.mp3           "https://archive.org/download/DialupInternet/Dialup%20Internet.mp3"
fetch welcome.mp3         "https://archive.org/download/AOLClassic/welcome.mp3"
fetch youve-got-mail.mp3  "https://archive.org/download/AOLClassic/youve_got_mail.mp3"
fetch buddy-in.mp3        "https://archive.org/download/AIMBuddySounds/buddyin.mp3"

echo
echo "Done. Files in $DIR:"
ls -la "$DIR" 2>/dev/null | grep -v '^total' | tail -n +2 || true
