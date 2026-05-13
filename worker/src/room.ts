import { DurableObject } from "cloudflare:workers";

interface ChatMessage {
  type: "msg";
  from: string;
  text: string;
  ts: number;
}

interface JoinEvent {
  type: "join";
  user: string;
  ts: number;
}

interface LeaveEvent {
  type: "leave";
  user: string;
  ts: number;
}

interface MembersUpdate {
  type: "members";
  users: string[];
}

interface HistoryMsg {
  type: "history";
  messages: ChatMessage[];
}

type Outgoing = ChatMessage | JoinEvent | LeaveEvent | MembersUpdate | HistoryMsg;

const MAX_HISTORY = 50;
const MAX_TEXT = 500;
const MAX_USER = 24;

export class Room extends DurableObject {
  async fetch(req: Request): Promise<Response> {
    const upgrade = req.headers.get("Upgrade");
    if (upgrade !== "websocket") return new Response("expected websocket", { status: 426 });

    const url = new URL(req.url);
    const user = (url.searchParams.get("u") || "").trim().slice(0, MAX_USER);
    if (!/^[A-Za-z0-9_]{3,24}$/.test(user)) {
      return new Response("bad user", { status: 400 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server, [`u:${user}`]);

    const history = (await this.ctx.storage.get<ChatMessage[]>("history")) || [];
    server.send(JSON.stringify({ type: "history", messages: history } satisfies HistoryMsg));
    server.send(JSON.stringify({ type: "members", users: this.currentUsers() } satisfies MembersUpdate));

    this.broadcast({ type: "join", user, ts: Date.now() } satisfies JoinEvent);
    this.broadcastMembers();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string") return;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return; }
    if (typeof parsed !== "object" || parsed === null) return;
    const candidate = parsed as { text?: unknown };
    if (typeof candidate.text !== "string") return;
    const text = candidate.text.slice(0, MAX_TEXT).trim();
    if (!text) return;

    const user = this.userOf(ws);
    if (!user) return;

    const out: ChatMessage = { type: "msg", from: user, text, ts: Date.now() };

    const history = (await this.ctx.storage.get<ChatMessage[]>("history")) || [];
    history.push(out);
    while (history.length > MAX_HISTORY) history.shift();
    await this.ctx.storage.put("history", history);

    this.broadcast(out);
  }

  webSocketClose(ws: WebSocket): void {
    const user = this.userOf(ws);
    if (!user) return;
    this.broadcast({ type: "leave", user, ts: Date.now() } satisfies LeaveEvent);
    this.broadcastMembers();
  }

  webSocketError(ws: WebSocket): void {
    this.webSocketClose(ws);
  }

  private userOf(ws: WebSocket): string | null {
    const tags = this.ctx.getTags(ws);
    const tag = tags.find((t) => t.startsWith("u:"));
    return tag ? tag.slice(2) : null;
  }

  private currentUsers(): string[] {
    const set = new Set<string>();
    for (const ws of this.ctx.getWebSockets()) {
      const u = this.userOf(ws);
      if (u) set.add(u);
    }
    return [...set].sort();
  }

  private broadcastMembers(): void {
    this.broadcast({ type: "members", users: this.currentUsers() } satisfies MembersUpdate);
  }

  private broadcast(msg: Outgoing): void {
    const payload = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(payload); } catch { /* dropped client */ }
    }
  }
}
