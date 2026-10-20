// social.js — Pati "Konekte" ak "Rire" yo: moun ki an liy, chat jeneral, mi blag.
// San rezo: server.js rele fonksyon sa yo; tès yo teste yo dirèkteman.

const { cleanName } = require("./rooms");

const MAX_CHAT = 300;
const MAX_JOKE = 400;
const MAX_JOKES = 500;
const LOBBY_HISTORY = 60;
const REPORTS_TO_HIDE = 3;

function createSocial({ now = () => Date.now(), random = Math.random } = {}) {
  const users = new Map(); // socketId -> { name, since }
  const lobby = []; // dènye mesaj chat jeneral yo
  const jokes = []; // { id, by, byId, text, at, laughs:Set, reports:Set, hidden }
  let seq = 0;
  const newId = () => `${now().toString(36)}${(++seq).toString(36)}${Math.floor(random() * 1e4).toString(36)}`;

  // ---------- Prezans ----------
  // extra: { token, avatar } (token pa janm soti nan modil sa a)
  function hello(socketId, name, extra = {}) {
    const n = cleanName(name);
    const existing = users.get(socketId);
    users.set(socketId, {
      name: n,
      since: existing ? existing.since : now(),
      token: extra.token || (existing && existing.token) || null,
      avatar: extra.avatar || (existing && existing.avatar) || null,
    });
    return n;
  }
  function tokenOf(socketId) {
    const u = users.get(socketId);
    return u ? u.token : null;
  }
  function socketOfToken(token) {
    if (!token) return null;
    for (const [id, u] of users) if (u.token === token) return id;
    return null;
  }
  function bye(socketId) {
    return users.delete(socketId);
  }
  function nameOf(socketId) {
    const u = users.get(socketId);
    return u ? u.name : null;
  }
  function online() {
    return [...users.entries()]
      .map(([id, u]) => ({ id, name: u.name, avatar: u.avatar }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // ---------- Chat jeneral ----------
  function lobbyMessage(socketId, text) {
    const from = nameOf(socketId);
    if (!from) return { error: "Antre non w anvan." };
    const body = String(text || "").trim().slice(0, MAX_CHAT);
    if (!body) return { error: "Mesaj la vid." };
    const msg = { id: newId(), fromId: socketId, from, avatar: (users.get(socketId) || {}).avatar || null, text: body, at: now() };
    lobby.push(msg);
    if (lobby.length > LOBBY_HISTORY) lobby.shift();
    return { msg };
  }
  function lobbyHistory() {
    return lobby.slice();
  }

  // ---------- Mi blag (Rire) ----------
  function publicJoke(j, viewerId) {
    return {
      id: j.id,
      by: j.by,
      avatar: j.avatar,
      byId: j.byId, // pou kliyan an konnen si se blag pa l (bouton "Efase")
      text: j.text,
      at: j.at,
      laughs: j.laughs.size,
      laughedByMe: viewerId ? j.laughs.has(viewerId) : false,
      mine: viewerId ? j.byId === viewerId : false,
    };
  }

  function postJoke(socketId, text) {
    const by = nameOf(socketId);
    if (!by) return { error: "Antre non w anvan." };
    const body = String(text || "").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_JOKE);
    if (body.length < 3) return { error: "Blag la twò kout." };
    const recentSame = jokes.find((j) => j.byId === socketId && j.text === body && !j.hidden);
    if (recentSame) return { error: "Ou deja poste blag sa a." };
    const joke = {
      id: newId(), by, byId: socketId, byToken: tokenOf(socketId), avatar: (users.get(socketId) || {}).avatar || null,
      text: body, at: now(), laughs: new Set(), everLaughed: new Set(), reports: new Set(), hidden: false,
    };
    jokes.unshift(joke);
    if (jokes.length > MAX_JOKES) jokes.pop();
    return { joke };
  }

  function find(jokeId) {
    const j = jokes.find((x) => x.id === jokeId);
    return j && !j.hidden ? j : null;
  }

  // 😂 se yon switch: klike ankò pou retire l.
  function toggleLaugh(socketId, jokeId) {
    if (!nameOf(socketId)) return { error: "Antre non w anvan." };
    const j = find(jokeId);
    if (!j) return { error: "Blag sa a pa egziste ankò." };
    let firstLaugh = false;
    if (j.laughs.has(socketId)) j.laughs.delete(socketId);
    else {
      j.laughs.add(socketId);
      // XP pou otè a sèlman premye fwa yon moun ri (pa pou pwòp blag ou)
      const t = tokenOf(socketId) || socketId;
      if (!j.everLaughed.has(t) && t !== j.byToken) { j.everLaughed.add(t); firstLaugh = true; }
    }
    return { joke: j, laughed: j.laughs.has(socketId), firstLaugh };
  }

  // Apre REPORTS_TO_HIDE rapò diferan, blag la kache pou tout moun.
  function report(socketId, jokeId) {
    if (!nameOf(socketId)) return { error: "Antre non w anvan." };
    const j = find(jokeId);
    if (!j) return { error: "Blag sa a pa egziste ankò." };
    if (j.byId === socketId) return { error: "Ou pa ka rapòte pwòp blag ou." };
    j.reports.add(socketId);
    if (j.reports.size >= REPORTS_TO_HIDE) j.hidden = true;
    return { joke: j, hidden: j.hidden };
  }

  function deleteJoke(socketId, jokeId) {
    const j = find(jokeId);
    if (!j) return { error: "Blag sa a pa egziste ankò." };
    if (j.byId !== socketId) return { error: "Se sèlman moun ki poste l la ki ka efase l." };
    j.hidden = true;
    return { joke: j };
  }

  // sort: "new" (pi resan an anwo) oswa "top" (pi komik la anwo)
  function listJokes(viewerId, sort = "new", limit = 100) {
    const visible = jokes.filter((j) => !j.hidden);
    if (sort === "top") visible.sort((a, b) => b.laughs.size - a.laughs.size || b.at - a.at);
    return visible.slice(0, limit).map((j) => publicJoke(j, viewerId));
  }

  return {
    hello, bye, nameOf, online, tokenOf, socketOfToken,
    lobbyMessage, lobbyHistory,
    postJoke, toggleLaugh, report, deleteJoke, listJokes, publicJoke,
  };
}

module.exports = { createSocial, REPORTS_TO_HIDE };
