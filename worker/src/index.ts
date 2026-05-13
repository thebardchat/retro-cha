import { Room } from "./room";

export { Room };

interface Env {
  ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

const VALID_ROOMS = new Set([
  "lobby",
  "music",
  "gaming",
  "coding",
  "memes",
  "ai",
  "crypto",
]);

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path.startsWith("/ws/")) {
      const room = path.slice(4).toLowerCase();
      if (!VALID_ROOMS.has(room)) return new Response("unknown room", { status: 404 });
      const id = env.ROOM.idFromName(`room:${room}`);
      return env.ROOM.get(id).fetch(req);
    }

    if (path.startsWith("/dm/")) {
      const parts = path.slice(4).split("/").map(decodeURIComponent);
      if (parts.length !== 2) return new Response("bad dm path", { status: 400 });
      const a = parts[0].trim().toLowerCase();
      const b = parts[1].trim().toLowerCase();
      if (!a || !b || a === b) return new Response("bad dm path", { status: 400 });
      if (!/^[a-z0-9_]{3,24}$/.test(a) || !/^[a-z0-9_]{3,24}$/.test(b)) {
        return new Response("bad dm path", { status: 400 });
      }
      const [first, second] = [a, b].sort();
      const id = env.ROOM.idFromName(`dm:${first}:${second}`);
      return env.ROOM.get(id).fetch(req);
    }

    return env.ASSETS.fetch(req);
  },
};
