// Sign-on layer: validate the screen name, store it, swap to the boot layer.

const form = document.getElementById("signon-form");
const input = document.getElementById("screen-name");
const status = document.getElementById("status");
const savedSelect = document.getElementById("screen-name-saved");

const SAVED_KEY = "aol:saved-names";

function loadSavedNames() {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch { return []; }
}

function saveName(name) {
  const list = loadSavedNames().filter((n) => n.toLowerCase() !== name.toLowerCase());
  list.unshift(name);
  localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 5)));
}

function renderSaved() {
  const names = loadSavedNames();
  savedSelect.innerHTML = '<option value="">&lt; New Screen Name &gt;</option>';
  for (const n of names) {
    const o = document.createElement("option");
    o.value = n;
    o.textContent = n;
    savedSelect.appendChild(o);
  }
  if (names.length) {
    savedSelect.value = names[0];
    input.value = names[0];
  }
}
renderSaved();

savedSelect.addEventListener("change", () => {
  if (savedSelect.value) input.value = savedSelect.value;
  else input.value = "";
  input.focus();
});

input.focus();

document.getElementById("setup").addEventListener("click", () => {
  status.className = "signon-status";
  status.textContent = "Modem detected at COM1. Speed: 56000 bps.";
});

document.getElementById("help").addEventListener("click", () => {
  status.className = "signon-status";
  status.textContent = "Pick a screen name (3-24 letters, numbers, or _). Password is decorative.";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = (input.value || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_]{2,23}$/.test(name)) {
    status.className = "signon-status error";
    status.textContent = "Invalid screen name. Use 3-24 chars: letters, numbers, underscore.";
    input.focus();
    input.select();
    return;
  }
  saveName(name);
  sessionStorage.setItem("aol:screen-name", name);

  // Swap layers
  document.getElementById("signon-layer").classList.add("hidden");
  document.getElementById("boot-layer").classList.remove("hidden");

  // Pre-position name in the tray for when chat opens.
  const tray = document.getElementById("tray-name");
  if (tray) tray.textContent = name;

  // Tell boot.js it can proceed.
  window.dispatchEvent(new CustomEvent("aol-signon", { detail: { screenName: name } }));
});
