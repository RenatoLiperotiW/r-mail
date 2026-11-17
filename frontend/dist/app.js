// ===== R-Mail 0.1 — interfaccia =====

const ICONS = {
  inbox: "M19 3H4.99C3.89 3 3 3.9 3 5v14c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  send: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
  spam: "M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM12 17.3c-.72 0-1.3-.58-1.3-1.3s.58-1.3 1.3-1.3 1.3.58 1.3 1.3-.58 1.3-1.3 1.3zm1-4.3h-2V7h2v6z",
  trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  refresh: "M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  archive: "M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z",
  mail: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  search: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  min: "M6 19h12v2H6z",
  logout: "M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5a2 2 0 0 0-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z",
  attach: "M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z",
  reply: "M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z",
};

const FOLDERS = [
  { id: "inbox", name: "Posta in arrivo", icon: "inbox" },
  { id: "starred", name: "Speciali", icon: "star" },
  { id: "sent", name: "Inviati", icon: "send" },
  { id: "spam", name: "Spam", icon: "spam" },
  { id: "trash", name: "Cestino", icon: "trash" },
];

const state = { folder: "inbox", mails: [], open: null, filter: "", account: null, loading: 0 };

const $ = (s) => document.querySelector(s);
const api = () => window.go.main.App;
const icon = (n) => `<svg class="ic" viewBox="0 0 24 24"><path d="${ICONS[n]}"/></svg>`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const errText = (e) => (typeof e === "string" ? e : e?.message || String(e));

function hue(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function avatar(el, name) {
  const t = (name || "?").trim();
  el.textContent = (t.match(/[\p{L}\p{N}]/u) || ["?"])[0].toUpperCase();
  el.style.background = `hsl(${hue(t)} 55% 48%)`;
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return d.toLocaleDateString("it-IT");
}
const fmtLong = (iso) => (iso ? new Date(iso).toLocaleString("it-IT", { dateStyle: "full", timeStyle: "short" }) : "");

function toast(msg, isErr = false) {
  const t = document.createElement("div");
  t.className = "toast" + (isErr ? " err" : "");
  t.textContent = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), isErr ? 6000 : 3500);
}

// Aspetta che Wails abbia preparato il collegamento con Go.
function ready() {
  return new Promise((res) => {
    const check = () => (window.go?.main?.App && window.runtime ? res() : setTimeout(check, 30));
    check();
  });
}

// ---------- Accesso ----------
function showLogin() {
  $("#app").classList.add("hidden");
  $("#login").classList.remove("hidden");
  $("#lgEmail").focus();
}

async function doLogin(ev) {
  ev.preventDefault();
  const btn = $("#lgBtn"), err = $("#lgError");
  err.classList.add("hidden");
  btn.disabled = true; btn.textContent = "Collegamento a Gmail…";
  try {
    await api().Login($("#lgName").value, $("#lgEmail").value, $("#lgPass").value);
    $("#lgPass").value = "";
    showApp(await api().GetAccount());
  } catch (e) {
    err.textContent = errText(e);
    err.classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Accedi";
  }
}

// ---------- App ----------
function showApp(acc) {
  state.account = acc;
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#accName").textContent = acc.name || acc.email.split("@")[0];
  $("#accEmail").textContent = acc.email;
  avatar($("#accAvatar"), acc.name || acc.email);
  selectFolder("inbox");
}

function renderNav(unread) {
  $("#nav").innerHTML = FOLDERS.map((f) => `
    <button class="nav-item ${f.id === state.folder ? "active" : ""}" data-folder="${f.id}">
      ${icon(f.icon)}<span class="label">${f.name}</span>
      ${f.id === "inbox" && unread ? `<span class="badge">${unread}</span>` : ""}
    </button>`).join("");
}
let lastUnread = 0;
function setUnread(n) { lastUnread = n; renderNav(n); }

function selectFolder(id) {
  state.folder = id;
  renderNav(lastUnread);
  $("#folderTitle").textContent = FOLDERS.find((f) => f.id === id).name;
  closeRead();
  loadList();
}

async function loadList() {
  const ticket = ++state.loading;
  $("#list").innerHTML = '<div class="skeleton"></div>'.repeat(8);
  $("#listCount").textContent = "";
  try {
    const mails = await api().FetchList(state.folder, 50);
    if (ticket !== state.loading) return; // nel frattempo hai cambiato cartella
    state.mails = mails || [];
    renderList();
  } catch (e) {
    if (ticket !== state.loading) return;
    $("#list").innerHTML = `<div class="empty">Impossibile caricare la posta.<br><span class="small">${esc(errText(e))}</span></div>`;
  }
}

function renderList() {
  const q = state.filter.toLowerCase();
  const list = q ? state.mails.filter((m) => (m.from + " " + m.fromAddr + " " + m.subject).toLowerCase().includes(q)) : state.mails;
  $("#listCount").textContent = list.length ? `${list.length} messaggi` : "";
  if (!list.length) {
    $("#list").innerHTML = `<div class="empty"><div class="big-ic">${icon("mail")}</div>${q ? "Nessun risultato" : "Qui non c'è niente"}</div>`;
    return;
  }
  $("#list").innerHTML = list.map((m) => `
    <div class="row ${m.seen ? "" : "unread"}" data-uid="${m.uid}">
      <button class="icon-btn sm star ${m.starred ? "on" : ""}" data-act="star" title="Speciale">${icon("star")}</button>
      <div class="avatar sm" data-av="${esc(m.from)}"></div>
      <div class="from">${esc(m.from)}</div>
      <div class="subject">${esc(m.subject)}</div>
      <div class="date">${fmtDate(m.date)}</div>
      <div class="hover-actions">
        <button class="icon-btn sm" data-act="archive" title="Archivia">${icon("archive")}</button>
        <button class="icon-btn sm" data-act="delete" title="Elimina">${icon("trash")}</button>
        <button class="icon-btn sm" data-act="unread" title="${m.seen ? "Segna come da leggere" : "Segna come letta"}">${icon("mail")}</button>
      </div>
    </div>`).join("");
  document.querySelectorAll("#list [data-av]").forEach((el) => avatar(el, el.dataset.av));
}

const findMail = (uid) => state.mails.find((m) => m.uid === uid);

async function rowAction(act, uid, rowEl) {
  const m = findMail(uid);
  try {
    if (act === "star") {
      await api().SetStarred(state.folder, uid, !m.starred);
      m.starred = !m.starred;
      if (state.folder === "starred" && !m.starred) return removeRow(uid, rowEl);
      renderList();
    } else if (act === "unread") {
      await api().SetSeen(state.folder, uid, !m.seen);
      m.seen = !m.seen;
      renderList();
    } else if (act === "archive") {
      await api().Archive(state.folder, uid);
      removeRow(uid, rowEl); toast("Conversazione archiviata");
    } else if (act === "delete") {
      await api().Delete(state.folder, uid);
      removeRow(uid, rowEl); toast(state.folder === "trash" ? "Eliminata definitivamente" : "Spostata nel cestino");
    }
    api().CheckNow().catch(() => {});
  } catch (e) { toast(errText(e), true); }
}

function removeRow(uid, rowEl) {
  state.mails = state.mails.filter((x) => x.uid !== uid);
  if (rowEl) { rowEl.classList.add("leaving"); setTimeout(renderList, 200); } else renderList();
}

// ---------- Lettura ----------
async function openMail(uid) {
  const m = findMail(uid);
  state.open = uid;
  $("#listView").classList.add("hidden");
  $("#readView").classList.remove("hidden");
  $("#readView").scrollTop = 0;
  $("#rSubject").textContent = m?.subject || "";
  $("#rFrom").textContent = m?.from || "";
  $("#rFromAddr").textContent = m ? `<${m.fromAddr}>` : "";
  $("#rTo").textContent = "…";
  $("#rDate").textContent = fmtLong(m?.date);
  $("#rAttach").innerHTML = "";
  $("#rStar").classList.toggle("on", !!m?.starred);
  avatar($("#rAvatar"), m?.from);
  setFrame('<p style="color:#888;font-family:sans-serif">Caricamento…</p>');
  try {
    const f = await api().OpenMail(state.folder, uid);
    if (state.open !== uid) return;
    $("#rSubject").textContent = f.subject;
    $("#rFrom").textContent = f.from;
    $("#rFromAddr").textContent = `<${f.fromAddr}>`;
    $("#rTo").textContent = f.to || "me";
    if (f.date) $("#rDate").textContent = fmtLong(f.date);
    $("#rAttach").innerHTML = (f.attachments || []).map((a) => `<span class="chip">${icon("attach")}${esc(a)}</span>`).join("");
    state.openFull = f;
    setFrame(f.html || `<pre style="white-space:pre-wrap;font:14px/1.5 'Segoe UI',sans-serif;margin:0">${esc(f.text)}</pre>`);
    if (m && !m.seen) { m.seen = true; api().CheckNow().catch(() => {}); }
  } catch (e) {
    setFrame(`<p style="color:#b3261e;font-family:sans-serif">${esc(errText(e))}</p>`);
  }
}

// La mail viene mostrata in un riquadro isolato: niente script, link aperti nel browser.
function setFrame(html) {
  const frame = $("#rFrame");
  frame.onload = () => {
    const d = frame.contentDocument;
    if (!d) return;
    d.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (a) { e.preventDefault(); window.runtime.BrowserOpenURL(a.href); }
    });
    frame.style.height = d.documentElement.scrollHeight + 24 + "px";
    setTimeout(() => (frame.style.height = d.documentElement.scrollHeight + 24 + "px"), 600);
  };
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
    <style>body{margin:20px;font:14px/1.5 'Segoe UI','Noto Sans',sans-serif;color:#202124;word-wrap:break-word}
    img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${html}</body></html>`;
}

function closeRead() {
  state.open = null;
  $("#readView").classList.add("hidden");
  $("#listView").classList.remove("hidden");
  renderList();
}

async function readAction(act) {
  const uid = state.open;
  if (!uid) return;
  if (act === "star") {
    const m = findMail(uid);
    await rowAction("star", uid);
    $("#rStar").classList.toggle("on", !!m?.starred);
    return;
  }
  if (act === "unread") {
    try { await api().SetSeen(state.folder, uid, false); const m = findMail(uid); if (m) m.seen = false; toast("Segnata come da leggere"); closeRead(); }
    catch (e) { toast(errText(e), true); }
    return;
  }
  closeRead();
  await rowAction(act, uid);
}

// ---------- Scrivi ----------
function openCompose(to = "", subject = "", body = "") {
  const c = $("#compose");
  c.classList.remove("hidden", "min");
  $("#cTo").value = to; $("#cSubject").value = subject; $("#cText").value = body;
  (to ? $("#cText") : $("#cTo")).focus();
  if (body) $("#cText").setSelectionRange(0, 0);
}
function closeCompose() { $("#compose").classList.add("hidden"); }

async function sendMail() {
  const btn = $("#cSend");
  btn.disabled = true; btn.textContent = "Invio…";
  try {
    await api().Send($("#cTo").value, $("#cSubject").value, $("#cText").value);
    closeCompose();
    toast("Messaggio inviato");
    if (state.folder === "sent") loadList();
  } catch (e) { toast(errText(e), true); }
  finally { btn.disabled = false; btn.textContent = "Invia"; }
}

function reply() {
  const f = state.openFull;
  if (!f) return;
  const subj = /^re:/i.test(f.subject) ? f.subject : "Re: " + f.subject;
  const quoted = (f.text || "").split("\n").map((l) => "> " + l).join("\n");
  openCompose(f.fromAddr, subj, `\n\nIl ${fmtLong(f.date)}, ${f.from} ha scritto:\n${quoted}`);
}

// ---------- Avvio ----------
function wire() {
  $("#composeBtn").innerHTML = `${icon("edit")}<span>Scrivi</span>`;
  $("#refreshBtn").innerHTML = icon("refresh");
  $("#logoutBtn").innerHTML = icon("logout");
  $("#searchIcon").innerHTML = icon("search");
  $("#backBtn").innerHTML = icon("back");
  $("#rArchive").innerHTML = icon("archive");
  $("#rDelete").innerHTML = icon("trash");
  $("#rUnread").innerHTML = icon("mail");
  $("#rStar").innerHTML = icon("star");
  $("#rReply").innerHTML = `${icon("reply")}Rispondi`;
  $("#cMin").innerHTML = icon("min");
  $("#cClose").innerHTML = icon("close");

  $("#loginForm").addEventListener("submit", doLogin);
  $("#lgHelp").addEventListener("click", (e) => { e.preventDefault(); window.runtime.BrowserOpenURL("https://myaccount.google.com/apppasswords"); });

  $("#nav").addEventListener("click", (e) => { const b = e.target.closest("[data-folder]"); if (b) selectFolder(b.dataset.folder); });
  $("#list").addEventListener("click", (e) => {
    const row = e.target.closest(".row"); if (!row) return;
    const uid = Number(row.dataset.uid);
    const act = e.target.closest("[data-act]");
    if (act) { e.stopPropagation(); rowAction(act.dataset.act, uid, row); } else openMail(uid);
  });

  $("#search").addEventListener("input", (e) => { state.filter = e.target.value; if (state.open) closeRead(); renderList(); });
  $("#refreshBtn").addEventListener("click", () => { loadList(); api().CheckNow().catch(() => {}); });
  $("#logoutBtn").addEventListener("click", async () => { if (!confirm("Vuoi scollegare questo account da R-Mail?")) return; await api().Logout(); showLogin(); });

  $("#backBtn").addEventListener("click", closeRead);
  $("#rArchive").addEventListener("click", () => readAction("archive"));
  $("#rDelete").addEventListener("click", () => readAction("delete"));
  $("#rUnread").addEventListener("click", () => readAction("unread"));
  $("#rStar").addEventListener("click", () => readAction("star"));
  $("#rReply").addEventListener("click", reply);

  $("#composeBtn").addEventListener("click", () => openCompose());
  $("#cClose").addEventListener("click", (e) => { e.stopPropagation(); closeCompose(); });
  $("#cMin").addEventListener("click", (e) => { e.stopPropagation(); $("#compose").classList.toggle("min"); });
  $(".compose-head").addEventListener("click", () => $("#compose").classList.remove("min"));
  $("#cSend").addEventListener("click", sendMail);
  $("#compose").addEventListener("keydown", (e) => { if (e.ctrlKey && e.key === "Enter") sendMail(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.open && $("#compose").classList.contains("hidden")) closeRead();
  });
}

async function init() {
  wire();
  renderNav(0);
  await ready();
  window.runtime.EventsOn("unread", (n) => setUnread(n));
  window.runtime.EventsOn("new-mail", (list) => {
    const last = list[list.length - 1];
    toast(list.length > 1 ? `${list.length} nuove mail` : `Nuova mail da ${last.from}: ${last.subject}`);
    if (state.folder === "inbox" && !state.open) loadList();
  });
  const acc = await api().GetAccount();
  if (acc) showApp(acc); else showLogin();
}

init();
