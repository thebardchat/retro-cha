# Sound assets

This directory holds the four late-90s dial-up era audio files the boot sequence and chat client play. **None of them are committed.**

Place these files here:

| Filename | What it is | When it plays |
| --- | --- | --- |
| `modem.mp3` | The full 56k dial-up handshake (~20s loop or one-shot) | Loops during the "Dialing" / "Connecting" steps |
| `welcome.mp3` | A short "Welcome!" voice clip | After modem completes |
| `youve-got-mail.mp3` | A "You've Got Mail!"-style voice clip | After "Welcome!" |
| `buddy-in.mp3` | A door-open / chime sound | When a new buddy appears in the buddy list |

Any missing file is treated as silence — the boot sequence still completes (the timed steps and the welcome screen come up regardless).

## Where to get them

If you have your own recordings, drop them in. For private use / tribute builds you can often find period-appropriate clips on the Internet Archive:

- Dial-up: search for "56k dialup modem sound" on [archive.org](https://archive.org)
- Voice clips and chimes: search for "1990s ISP welcome sound" or record your own

The `scripts/fetch-sounds.sh` (or `.ps1` on Windows) script tries a handful of known URLs as a best effort. If they 404, just drop the files in by hand — the filenames above are all the boot sequence cares about.

> Anything that's the property of a specific trademark owner should not be shipped on a public production site without permission. Treat third-party audio as a personal/tribute use only.
