// Direct-message pop-ups (yellow IM windows, draggable).

const openDms = new Map(); // other (lowercase) -> { win, ws, log, form, input }

window.addEventListener("aol-open-dm", (ev) => openDm(ev.detail.other));

function openDm(rawOther) {
  const screenName = sessionStorage.getItem("aol:screen-name");
  const other = (rawOther || "").trim();
  if (!screenName || !other) return;
  if (other.toLowerCase() === screenName.toLowerCase()) return;

  const key = other.toLowerCase();
  const existing = openDms.get(key);
  if (existing) {
    existing.input.focus();
    bringToFront(existing.win);
    return;
  }

  const win = document.createElement("section");
  win.className = "win dm-win";
  const n = openDms.size;
  win.style.top = (140 + n * 26) + "px";
  win.style.left = (240 + n * 26) + "px";
  win.innerHTML = `
    <div class="title-bar dm-titlebar">
      <div class="title">Instant Message — ${escapeHtml(other)}</div>
      <div class="title-btns">
        <button class="tbtn close" aria-label="Close" type="button">×</button>
      </div>
    </div>
    <div class="dm-log" aria-live="polite"></div>
    <form class="dm-form" autocomplete="off">
      <input class="input" maxlength="500" placeholder="Type your IM…">
      <button type="submit" class="btn small primary">Send</button>
    </form>`;
  document.getElementById("desktop").appendChild(win);

  const log = win.querySelector(".dm-log");
  const form = win.querySelector(".dm-form");
  const input = form.querySelector("input");
  const closeBtn = win.querySelector(".tbtn.close");

  // Drag the window by its title bar.
  makeDraggable(win, win.querySelector(".dm-titlebar"));

  closeBtn.addEventListener("click", () => closeDm(key));
  win.addEventListener("mousedown", () => bringToFront(win));

  const proto = location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${proto}://${location.host}/dm/${encodeURIComponent(screenName)}/${encodeURIComponent(other)}?u=${encodeURIComponent(screenName)}`;
  const ws = new WebSocket(wsUrl);

  ws.addEventListener("message", (ev) => {
    let data; try { data = JSON.parse(ev.data); } catch { return; }
    if (data.type === "history" && Array.isArray(data.messages)) {
      for (const m of data.messages) appendMsg(log, m, screenName);
    } else if (data.type === "msg") {
      appendMsg(log, data, screenName);
    }
  });
  ws.addEventListener("open",  () => appendSys(log, `[Connected]`));
  ws.addEventListener("close", () => appendSys(log, `[Connection closed]`));
  ws.addEventListener("error", () => appendSys(log, `[Could not reach ${other}]`));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ text }));
    input.value = "";
  });

  openDms.set(key, { win, ws, log, form, input });
  input.focus();
  bringToFront(win);
}

function closeDm(key) {
  const dm = openDms.get(key);
  if (!dm) return;
  try { dm.ws.close(); } catch { /* ignore */ }
  dm.win.remove();
  openDms.delete(key);
}

function appendMsg(log, m, me) {
  const row = document.createElement("div");
  row.className = "row";
  const name = document.createElement("span");
  name.style.fontWeight = "bold";
  name.style.color = m.from === me ? "#006400" : "#00008b";
  name.textContent = m.from + ": ";
  row.appendChild(name);
  row.appendChild(document.createTextNode(m.text));
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function appendSys(log, text) {
  const row = document.createElement("div");
  row.style.color = "#707070";
  row.style.fontStyle = "italic";
  row.textContent = text;
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}

let zCounter = 100;
function bringToFront(win) {
  zCounter += 1;
  win.style.zIndex = String(zCounter);
}

function makeDraggable(win, handle) {
  let ox = 0, oy = 0, startX = 0, startY = 0, dragging = false;
  handle.addEventListener("mousedown", (e) => {
    if (e.target.closest(".tbtn")) return;
    dragging = true;
    const rect = win.getBoundingClientRect();
    ox = rect.left;
    oy = rect.top;
    startX = e.clientX;
    startY = e.clientY;
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const x = ox + (e.clientX - startX);
    const y = oy + (e.clientY - startY);
    win.style.left = Math.max(0, Math.min(window.innerWidth - 80,  x)) + "px";
    win.style.top  = Math.max(0, Math.min(window.innerHeight - 30, y)) + "px";
  });
  window.addEventListener("mouseup", () => { dragging = false; });
}
