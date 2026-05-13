# Sound assets

This directory holds the four classic AOL audio files the boot sequence and chat client play. **None of them are committed.**

Place these files here:

| Filename | What it is | When it plays |
| --- | --- | --- |
| `modem.mp3` | The full 56k dial-up handshake (~20s loop or one-shot) | Loops during the "Dialing" / "Connecting" steps |
| `welcome.mp3` | The "Welcome!" voice clip | After modem completes |
| `youve-got-mail.mp3` | The "You've Got Mail!" voice clip | After "Welcome!" |
| `buddy-in.mp3` | The AIM door-open chime | When a new buddy appears in the buddy list |

Any missing file is treated as silence — the boot sequence still completes (the timed steps and the welcome screen come up regardless).

## Where to get them

These are property of their respective trademark owners. For private use / tribute projects you can usually find them on the Internet Archive:

- Dial-up: search for "56k dialup modem sound" on [archive.org](https://archive.org)
- "Welcome" / "You've Got Mail": search for "AOL welcome youve got mail"
- Buddy-in chime: search for "AIM buddy in sound"

The `scripts/fetch-sounds.sh` (or `.ps1` on Windows) script tries a handful of known URLs as a best effort. If they 404, just drop the files in by hand — the filenames above are all the boot sequence cares about.

> Don't ship these on a public production site without permission from Time Warner / AOL. Treat this as a personal/tribute build.
