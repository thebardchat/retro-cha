// Boot layer: dial-up modem sequence with the sounds.

import { play, playAndWait, unlock, stop } from "./sounds.js";

const boot = document.getElementById("boot-layer");
const bootTitle = document.getElementById("boot-title");
const bootText = document.getElementById("boot-text");
const bootBar = document.getElementById("boot-bar");
const connectBtn = document.getElementById("boot-connect");
const cancelBtn = document.getElementById("boot-cancel");
const phone = boot.querySelector(".phone");
const checklist = document.getElementById("boot-checklist");

const STEPS = [
  { id: "dial",    title: "Dialing",            text: "Dialing 1-800-555-BARD…",                duration: 1400, bar: 18 },
  { id: "connect", title: "Connecting",         text: "Connecting to thebardchat…",             duration: 4800, bar: 60 },
  { id: "verify",  title: "Verifying",          text: "Verifying user name and password…",      duration: 1800, bar: 88 },
  { id: "welcome", title: "Welcome",            text: "You have signed on at " + currentTime(), duration: 900,  bar: 100 },
];

function currentTime() {
  const d = new Date();
  const h = ((d.getHours() + 11) % 12) + 1;
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  return `${h}:${m} ${ampm}`;
}

function markStep(id, cls) {
  const li = checklist.querySelector(`li[data-step="${id}"]`);
  if (li) li.className = cls;
}

cancelBtn.addEventListener("click", () => {
  stop("modem");
  bootText.textContent = "Connection cancelled.";
  // Send the user back to the sign-on layer.
  document.getElementById("boot-layer").classList.add("hidden");
  document.getElementById("signon-layer").classList.remove("hidden");
});

connectBtn.addEventListener("click", async () => {
  connectBtn.disabled = true;
  cancelBtn.disabled = true;
  phone.classList.add("ringing");

  // Unlock audio under user gesture.
  await unlock();
  // Start the modem squeal immediately. It loops in the background while we step through.
  play("modem");

  for (const step of STEPS) {
    markStep(step.id, "active");
    bootTitle.textContent = step.title;
    bootText.textContent = step.text;
    bootBar.style.width = step.bar + "%";
    await wait(step.duration);
    markStep(step.id, "done");
  }

  stop("modem");
  phone.classList.remove("ringing");

  // "Welcome!" voice, beat, then "You've Got Mail!"
  await playAndWait("welcome");
  await wait(350);
  await playAndWait("mail");

  // Brand splash: hand off from the dial-up boot to the chat desktop with
  // a brief full-screen reveal of the thebardchat lockup.
  const splash = document.getElementById("splash-layer");
  document.getElementById("boot-layer").classList.add("hidden");
  splash.classList.remove("hidden");
  await wait(1500);
  splash.classList.add("fade-out");
  await wait(420);
  splash.classList.add("hidden");
  splash.classList.remove("fade-out");

  // Reveal chat. Bring in the toolbar's mail blink.
  document.getElementById("chat-layer").classList.remove("hidden");

  // Add a transient "has-mail" class so the mailbox icon blinks until clicked.
  const mailBtn = document.querySelector('[data-cmd="mail"]');
  if (mailBtn) mailBtn.classList.add("has-mail");
  mailBtn?.addEventListener("click", () => mailBtn.classList.remove("has-mail"), { once: true });

  // Hand control to chat.js
  const screenName = sessionStorage.getItem("aol:screen-name");
  window.dispatchEvent(new CustomEvent("aol-ready", { detail: { screenName } }));
});

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
