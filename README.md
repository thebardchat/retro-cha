# retro-cha

A real-time chat that signs on like AOL 3.0 in 1998 — full dial-up modem handshake, "Welcome!" / "You've Got Mail!" voices, buddy-list chimes, AIM-style yellow DM pop-ups, and chat rooms ranging from the classic (Lobby, Music, Gaming, Coding) to the modern wing (Memes, AI, Crypto).

Built on **Cloudflare Workers + Durable Objects** so any two browsers anywhere on the planet land in the same room with sub-second sync.

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│   index.html  →  signon layer  ▶  boot layer  ▶  chat layer  │
│                                                  │           │
└──────────────────────────────────────────────────┼───────────┘
                                                   ▼ WebSocket
                              /ws/:room  ┌──────────────────┐
                              /dm/:a/:b  │ Cloudflare Worker│
                                         │     ↓ idFromName │
                                         │    Room (DO)     │
                                         │ • hibernatable WS│
                                         │ • member list    │
                                         │ • last-50 history│
                                         └──────────────────┘
```

## Quick start (local dev)

```bash
npm install
npm run fetch-sounds   # best-effort; see public/sounds/README.md if any miss
npm run dev            # http://localhost:8787
```

`wrangler dev` serves the static assets from `public/` and runs the Worker + Durable Object locally. Open the URL in two browsers and sign on with different screen names to verify multi-user chat.

## Deploy

Durable Objects require the **Workers Paid plan ($5/mo)**.

```bash
npx wrangler login
npx wrangler deploy
```

The first deploy runs the `v1` migration that creates the `Room` SQLite DO class. After that, `wrangler deploy` is idempotent.

## Repo layout

| Path | Purpose |
| --- | --- |
| `worker/src/index.ts` | Router: WS upgrade for `/ws/:room` and `/dm/:a/:b`; everything else → static assets |
| `worker/src/room.ts` | The `Room` Durable Object — hibernatable WebSockets, member list, last-50 history |
| `public/index.html` | Single-page app: sign-on → dial-up → chat |
| `public/styles/aol.css` | Win95 chrome (titlebars, bevels, buttons, running-man) |
| `public/styles/chat.css` | Chat-room layout, buddy list, DM windows, tabs |
| `public/scripts/sounds.js` | Audio preloader + autoplay-unlock helper |
| `public/scripts/signon.js` | Sign-on form, saved names |
| `public/scripts/boot.js` | Dial-up sequence + welcome/mail audio |
| `public/scripts/chat.js` | Room state, WS lifecycle, slash commands |
| `public/scripts/dm.js` | AIM-style IM pop-up windows (draggable, multi-instance) |
| `scripts/fetch-sounds.*` | Best-effort downloader for the four audio clips |

## How routing works

Rooms are keyed by name — the Worker resolves `/ws/lobby` to `env.ROOM.idFromName("room:lobby")` so every visitor lands in the same Durable Object. The valid room set is fixed: `lobby, music, gaming, coding, memes, ai, crypto`.

DM windows route to `env.ROOM.idFromName("dm:<a>:<b>")` where the names are lowercased and sorted, so both sides land on the same DO regardless of who opened the IM first.

## Slash commands

In the chat input:

- `/me <action>` — emote (`* CoolDude1998 waves`)
- `/join <room>` — join one of the seven rooms
- `/leave` (or `/part`) — leave the current room
- `/rooms` — open the chat-room finder
- `/reconnect` — close and reopen the WS for the current room
- `/help` — list commands

Double-click any name in the buddy list or the "People Here" panel to open a DM window.

## Sounds

See [`public/sounds/README.md`](public/sounds/README.md). Place four MP3s in `public/sounds/` (`modem.mp3`, `welcome.mp3`, `youve-got-mail.mp3`, `buddy-in.mp3`) or run `npm run fetch-sounds` and let it try Internet Archive. Missing files are treated as silence so the boot sequence always completes.

## Why these tools

- **Single Worker + DOs** keeps cost flat. With hibernatable WebSockets you only pay duration when a room is actively passing messages.
- **No build step** for the frontend — vanilla HTML/CSS/JS hits the browser directly. Easier to tweak in DevTools and faster to iterate.
- **Single-page app** (not two HTML files) so the SIGN ON click carries autoplay credit into the modem audio. Mobile Safari and iOS Chrome are the strict ones; this works around them.

## License

MIT for the code in this repo. The AOL/AIM trademarks and audio belong to their respective owners — this is a tribute, not for commercial use.
