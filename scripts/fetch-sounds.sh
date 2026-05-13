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

# Sources (verified May 2026):
#   - 56k modem squeal: archive.org item "56kModem56kDialupModemSound"
#   - Welcome / You've Got Mail / BuddyIn: archive.org item "im_20191103"
# If any 404 in the future, hand-drop replacements into public/sounds/.
fetch modem.mp3           "https://archive.org/download/56kModem56kDialupModemSound/Der%2056k%20Modem%20Klang%20-%20The%2056k%20dialup%20modem%20sound.mp3"
fetch welcome.mp3         "https://archive.org/download/im_20191103/Welcome.mp3"
fetch youve-got-mail.mp3  "https://archive.org/download/im_20191103/You%27ve%20Got%20Mail.mp3"
fetch buddy-in.mp3        "https://archive.org/download/im_20191103/BuddyIn.mp3"

echo
echo "Done. Files in $DIR:"
ls -la "$DIR" 2>/dev/null | grep -v '^total' | tail -n +2 || true
