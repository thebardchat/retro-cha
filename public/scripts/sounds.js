// Preloader for the AOL classic audio. Falls back to silence if a file
// is missing or fails to decode, so the boot sequence still completes.

const SOUND_FILES = {
  modem:   "/sounds/modem.mp3",
  welcome: "/sounds/welcome.mp3",
  mail:    "/sounds/youve-got-mail.mp3",
  buddyIn: "/sounds/buddy-in.mp3",
};

const cache = new Map();
let unlocked = false;

function load(name, url) {
  const a = new Audio();
  a.preload = "auto";
  a.src = url;
  a.addEventListener("error", () => { /* swallow; play() will resolve immediately */ });
  cache.set(name, a);
}

export function preload() {
  for (const [name, url] of Object.entries(SOUND_FILES)) {
    if (!cache.has(name)) load(name, url);
  }
}

// Call inside a user gesture (e.g. the CONNECT button) so subsequent
// programmatic .play() calls are permitted on iOS/Safari.
export async function unlock() {
  if (unlocked) return;
  preload();
  unlocked = true;
  for (const a of cache.values()) {
    try {
      a.muted = true;
      const p = a.play();
      if (p && p.then) await p.catch(() => {});
      a.pause();
      a.currentTime = 0;
      a.muted = false;
    } catch { /* nothing */ }
  }
}

export function play(name) {
  const a = cache.get(name);
  if (!a) return Promise.resolve();
  try {
    a.currentTime = 0;
    const p = a.play();
    return p && p.catch ? p.catch(() => {}) : Promise.resolve();
  } catch {
    return Promise.resolve();
  }
}

export function playAndWait(name) {
  const a = cache.get(name);
  if (!a) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      a.removeEventListener("ended", finish);
      a.removeEventListener("error", finish);
      resolve();
    };
    a.addEventListener("ended", finish);
    a.addEventListener("error", finish);
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => finish());
      // Safety net: if no `ended` fires within 10s, resolve anyway.
      setTimeout(finish, 10_000);
    } catch {
      finish();
    }
  });
}

export function stop(name) {
  const a = cache.get(name);
  if (!a) return;
  try { a.pause(); a.currentTime = 0; } catch { /* ignore */ }
}

preload();
