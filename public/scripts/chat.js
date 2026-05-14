// Chat client: room state, WebSocket lifecycle, DOM rendering, toolbar wiring.

import { play } from "./sounds.js";

const log = document.getElementById("chat-log");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const peopleList = document.getElementById("people-list");
const buddyList = document.getElementById("buddy-list");
const buddyCount = document.getElementById("buddy-count");
const titleEl = document.getElementById("chat-title");
const tabs = document.getElementById("room-tabs");
const trayName = document.getElementById("tray-name");
const trayClock = document.getElementById("tray-clock");

const ROOMS = ["lobby", "music", "gaming", "coding", "memes", "ai", "crypto"];
const ROOM_LABELS = {
  lobby: "The Lobby",
  music: "Music",
  gaming: "Gaming",
  coding: "Coding",
  memes: "Memes",
  ai: "A.I.",
  crypto: "Crypto",
};

const state = {
  screenName: null,
  active: "lobby",
  rooms: new Map(), // room -> { ws, people:Set<string>, msgs:[] }
  allUsers: new Set(),
};

// --- Clock ---------------------------------------------------------------
function tickClock() {
  const d = new Date();
  const h = ((d.getHours() + 11) % 12) + 1;
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  trayClock.textContent = `${h}:${m} ${ampm}`;
}
tickClock();
setInterval(tickClock, 20_000);

// --- Ready handoff -------------------------------------------------------
window.addEventListener("aol-ready", (ev) => {
  state.screenName = ev.detail.screenName;
  trayName.textContent = state.screenName;
  joinRoom("lobby");
  switchRoom("lobby");
  setTimeout(() => input.focus(), 100);
});

// --- Toolbar -------------------------------------------------------------
document.querySelectorAll('[data-cmd="rooms"]').forEach((b) => b.addEventListener("click", () => {
  document.getElementById("finder-win").classList.toggle("hidden");
}));
document.getElementById("finder-close").addEventListener("click", () => {
  document.getElementById("finder-win").classList.add("hidden");
});

document.querySelectorAll(".room-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const room = btn.dataset.room;
    document.getElementById("finder-win").classList.add("hidden");
    joinRoom(room);
    switchRoom(room);
  });
});

document.querySelectorAll('[data-cmd="mail"]').forEach((b) => b.addEventListener("click", () => {
  const win = document.getElementById("mail-win");
  win.classList.toggle("hidden");
  if (!win.classList.contains("hidden")) play("mail");
}));
document.getElementById("mail-close").addEventListener("click", () => {
  document.getElementById("mail-win").classList.add("hidden");
});

document.querySelectorAll('[data-cmd="chat"]').forEach((b) => b.addEventListener("click", () => {
  document.getElementById("chat-win").scrollIntoView({ behavior: "smooth", block: "nearest" });
  input.focus();
}));
document.querySelectorAll('[data-cmd="buddies"]').forEach((b) => b.addEventListener("click", () => {
  document.getElementById("buddy-win").scrollIntoView({ behavior: "smooth", block: "nearest" });
}));

document.querySelectorAll('[data-cmd="signoff"]').forEach((b) => b.addEventListener("click", () => {
  if (!confirm("Sign off thebardchat?")) return;
  for (const r of state.rooms.values()) {
    try { r.ws.close(); } catch { /* ignore */ }
  }
  sessionStorage.removeItem("aol:screen-name");
  location.reload();
}));

// "Send IM" / "Locate" buttons
document.getElementById("buddy-im").addEventListener("click", () => promptDM());
document.getElementById("buddy-locate").addEventListener("click", () => {
  const sel = buddyList.querySelector("li.selected");
  if (!sel) return alert("Select a buddy in the list first.");
  const user = sel.dataset.user;
  for (const [room, r] of state.rooms) {
    if (r.people.has(user)) {
      alert(`${user} is in ${ROOM_LABELS[room] || room}.`);
      return;
    }
  }
  alert(`${user} is signed on, but not in a room you've joined.`);
});

// --- Send box ------------------------------------------------------------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  // Slash commands
  if (text.startsWith("/")) {
    if (handleSlash(text)) {
      input.value = "";
      return;
    }
  }

  const r = state.rooms.get(state.active);
  if (!r || r.ws.readyState !== WebSocket.OPEN) {
    appendRow(buildSysRow("Not connected. Try /reconnect."));
    return;
  }
  r.ws.send(JSON.stringify({ text }));
  input.value = "";
});

function handleSlash(text) {
  const [cmd, ...rest] = text.slice(1).split(" ");
  const arg = rest.join(" ");
  switch (cmd.toLowerCase()) {
    case "me": {
      const r = state.rooms.get(state.active);
      if (r && r.ws.readyState === WebSocket.OPEN && arg.trim()) {
        r.ws.send(JSON.stringify({ text: `* ${state.screenName} ${arg.trim()}` }));
      }
      return true;
    }
    case "join": {
      const room = (arg || "").trim().toLowerCase();
      if (ROOMS.includes(room)) { joinRoom(room); switchRoom(room); }
      else appendRow(buildSysRow(`Unknown room. Try: ${ROOMS.join(", ")}`));
      return true;
    }
    case "leave":
    case "part": {
      leaveRoom(state.active);
      return true;
    }
    case "rooms": {
      document.getElementById("finder-win").classList.remove("hidden");
      return true;
    }
    case "reconnect": {
      const room = state.active;
      leaveRoom(room);
      setTimeout(() => { joinRoom(room); switchRoom(room); }, 200);
      return true;
    }
    case "help": {
      appendRow(buildSysRow("Commands: /me <action>, /join <room>, /leave, /rooms, /reconnect"));
      return true;
    }
  }
  return false;
}

// --- Room lifecycle ------------------------------------------------------
function joinRoom(room) {
  if (!ROOMS.includes(room)) return;
  if (state.rooms.has(room)) return;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}/ws/${room}?u=${encodeURIComponent(state.screenName)}`;
  const ws = new WebSocket(url);
  const r = { ws, people: new Set(), msgs: [] };
  state.rooms.set(room, r);

  ws.addEventListener("message", (ev) => {
    let data; try { data = JSON.parse(ev.data); } catch { return; }
    handleEvent(room, data);
  });
  ws.addEventListener("open",  () => systemRow(room, `[Now in: ${ROOM_LABELS[room]}]`));
  ws.addEventListener("close", () => systemRow(room, "[Disconnected. /reconnect to try again.]"));
  renderTabs();
}

function leaveRoom(room) {
  const r = state.rooms.get(room);
  if (!r) return;
  try { r.ws.close(); } catch { /* ignore */ }
  state.rooms.delete(room);
  rebuildAllUsers();
  renderBuddyList();
  renderTabs();
  if (state.active === room) {
    const next = state.rooms.keys().next().value;
    if (next) switchRoom(next);
    else {
      titleEl.textContent = "(no room)";
      log.innerHTML = "";
      peopleList.innerHTML = "";
    }
  }
}

function switchRoom(room) {
  if (!state.rooms.has(room)) return;
  state.active = room;
  titleEl.textContent = ROOM_LABELS[room] || room;
  renderLog(room);
  renderPeople(room);
  renderTabs();
}

function handleEvent(room, evt) {
  const r = state.rooms.get(room);
  if (!r) return;
  switch (evt.type) {
    case "history":
      r.msgs = (evt.messages || []).map((m) => ({ kind: "msg", from: m.from, text: m.text, ts: m.ts }));
      if (state.active === room) renderLog(room);
      break;
    case "msg":
      r.msgs.push({ kind: "msg", from: evt.from, text: evt.text, ts: evt.ts });
      if (state.active === room) appendRow(buildMsgRow(evt));
      break;
    case "join":
      r.msgs.push({ kind: "sys", text: `${evt.user} has entered the room.` });
      if (state.active === room) appendRow(buildSysRow(`${evt.user} has entered the room.`));
      break;
    case "leave":
      r.msgs.push({ kind: "sys", text: `${evt.user} has left the room.` });
      if (state.active === room) appendRow(buildSysRow(`${evt.user} has left the room.`));
      break;
    case "members": {
      const newSet = new Set(evt.users || []);
      // Detect new users (across all rooms) for the buddy-in chime.
      for (const u of newSet) {
        if (!state.allUsers.has(u) && u !== state.screenName) {
          play("buddyIn");
          break; // one chime per batch
        }
      }
      r.people = newSet;
      rebuildAllUsers();
      if (state.active === room) renderPeople(room);
      renderBuddyList();
      break;
    }
  }
}

function rebuildAllUsers() {
  state.allUsers = new Set();
  for (const r of state.rooms.values()) for (const u of r.people) state.allUsers.add(u);
}

function systemRow(room, text) {
  const r = state.rooms.get(room);
  if (!r) return;
  r.msgs.push({ kind: "sys", text });
  if (state.active === room) appendRow(buildSysRow(text));
}

// --- Renderers -----------------------------------------------------------
function renderLog(room) {
  const r = state.rooms.get(room);
  log.innerHTML = "";
  if (!r) return;
  for (const m of r.msgs) {
    if (m.kind === "sys") appendRow(buildSysRow(m.text));
    else appendRow(buildMsgRow(m));
  }
}

function renderPeople(room) {
  const r = state.rooms.get(room);
  peopleList.innerHTML = "";
  if (!r) return;
  for (const u of [...r.people].sort()) {
    const li = document.createElement("li");
    li.textContent = u;
    li.dataset.user = u;
    if (u === state.screenName) li.classList.add("me");
    li.addEventListener("dblclick", () => {
      if (u !== state.screenName) window.dispatchEvent(new CustomEvent("aol-open-dm", { detail: { other: u } }));
    });
    peopleList.appendChild(li);
  }
}

function renderBuddyList() {
  buddyList.innerHTML = "";
  const users = [...state.allUsers].filter((u) => u !== state.screenName).sort();
  if (!users.length) {
    const li = document.createElement("li");
    li.className = "dim";
    li.textContent = "(no buddies online)";
    buddyList.appendChild(li);
    buddyCount.textContent = "0";
    return;
  }
  for (const u of users) {
    const li = document.createElement("li");
    li.textContent = u;
    li.dataset.user = u;
    li.addEventListener("click", () => {
      buddyList.querySelectorAll("li.selected").forEach((el) => el.classList.remove("selected"));
      li.classList.add("selected");
    });
    li.addEventListener("dblclick", () => window.dispatchEvent(new CustomEvent("aol-open-dm", { detail: { other: u } })));
    buddyList.appendChild(li);
  }
  buddyCount.textContent = users.length.toString();
}

function renderTabs() {
  tabs.innerHTML = "";
  for (const room of state.rooms.keys()) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "room-tab" + (room === state.active ? " active" : "");
    b.textContent = ROOM_LABELS[room] || room;
    b.addEventListener("click", () => switchRoom(room));
    if (room !== "lobby") {
      const x = document.createElement("span");
      x.className = "close-x";
      x.textContent = "×";
      x.title = "Leave room";
      x.addEventListener("click", (e) => { e.stopPropagation(); leaveRoom(room); });
      b.appendChild(x);
    }
    tabs.appendChild(b);
  }
}

function buildMsgRow(m) {
  const row = document.createElement("div");
  row.className = "row" + (m.from === state.screenName ? " self" : "");
  if (m.text.startsWith("* " + m.from + " ")) {
    // /me action — render whole line italic, no separate name span.
    row.classList.add("system");
    row.style.fontStyle = "italic";
    row.textContent = m.text;
    return row;
  }
  const name = document.createElement("span");
  name.className = "name";
  if (m.from !== state.screenName) name.style.color = colorFor(m.from);
  name.textContent = m.from + ":";
  row.appendChild(name);
  row.appendChild(document.createTextNode(" " + m.text));
  return row;
}

function buildSysRow(text) {
  const row = document.createElement("div");
  row.className = "row system";
  row.textContent = text;
  return row;
}

function appendRow(row) {
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 70%, 30%)`;
}

function promptDM() {
  const sel = buddyList.querySelector("li.selected");
  let user = sel?.dataset.user;
  if (!user) user = prompt("Send IM to whom? (screen name)") || "";
  user = user.trim();
  if (user && user !== state.screenName) {
    window.dispatchEvent(new CustomEvent("aol-open-dm", { detail: { other: user } }));
  }
}
