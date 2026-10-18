// server.js — Sèvè Express + Socket.IO pou Lakou
const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { createRoomStore } = require("./rooms");
const { createSocial } = require("./social");
const G = require("./games");
const QUESTION_BANK = require("./questions");
// Tan pou chak kesyon / rezilta (ou ka chanje yo ak varyab anviwònman, pa egzanp pou tès)
const QUESTION_MS = Number(process.env.TRIVIA_QUESTION_MS) || G.QUESTION_MS;
const REVEAL_MS = Number(process.env.TRIVIA_REVEAL_MS) || G.REVEAL_MS;

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
// CLIENT_ORIGIN: sit ki gen dwa konekte (pa egzanp https://lakou.netlify.app).
// Si li pa defini, tout sit aksepte (bon pou devlopman, pa pou pwodiksyon).
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || "").split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
const io = new Server(server, { cors: { origin: CLIENT_ORIGIN.length ? CLIENT_ORIGIN : "*" } });
const store = createRoomStore();
const social = createSocial();

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, rooms: store.size, online: social.online().length }));

// ---------- Anons pou tout moun (lis sal piblik, moun ki an liy) ----------
// "Debounce": si plizyè bagay chanje an menm tan, nou voye yon sèl mesaj.
function debounced(fn, ms = 250) {
  let t = null;
  return () => { if (!t) t = setTimeout(() => { t = null; fn(); }, ms); };
}
const announceRooms = debounced(() => io.emit("rooms", store.listPublic()));
const announceOnline = debounced(() => io.emit("online", social.online()));

// ---------- Jwèt: sèvè a kontwole revèy la ----------
const gameTimers = new Map(); // code sal -> setTimeout

function broadcastGame(room) {
  io.to(room.code).emit("game", G.publicState(room, Date.now()));
}

function clearGameTimer(code) {
  clearTimeout(gameTimers.get(code));
  gameTimers.delete(code);
}

// Pwograme pwochen etap jwèt la (fèmen kesyon an, oswa pase nan pwochen an).
function scheduleGame(room) {
  clearGameTimer(room.code);
  const g = room.game;
  if (!g || !g.deadline) return;
  const delay = Math.max(0, g.deadline - Date.now());
  gameTimers.set(room.code, setTimeout(() => advanceGame(room), delay));
}

function advanceGame(room) {
  if (store.getRoom(room.code) !== room || !room.game) return; // sal la fèmen oswa jwèt la sispann
  const now = Date.now();
  if (room.game.phase === "question") G.reveal(room, now);
  else if (room.game.phase === "reveal") G.next(room, now);
  broadcastGame(room);
  if (room.game.phase === "over") {
    announceRooms();
    const [winner] = G.leaderboard(room.game);
    if (winner) io.to(room.code).emit("system", { text: `🏆 ${winner.name} genyen ak ${winner.score} pwen!` });
  }
  scheduleGame(room);
}

// Limit senp: maksimòm N evènman pa segonn pou chak koneksyon (anti-spam).
function rateLimiter(max = 8) {
  let count = 0;
  let windowStart = Date.now();
  return () => {
    const t = Date.now();
    if (t - windowStart > 1000) { windowStart = t; count = 0; }
    return ++count <= max;
  };
}

io.on("connection", (socket) => {
  const allowed = rateLimiter();

  // Ti fonksyon pou evite repete menm kòd la
  const guard = (handler) => (payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    if (!allowed()) return reply({ error: "Ou twò rapid! Tann yon ti moman." });
    try { handler(payload || {}, reply); }
    catch (err) { console.error(err); reply({ error: "Erè sèvè." }); }
  };

  const broadcastMembers = (room) =>
    io.to(room.code).emit("members", { hostId: room.hostId, members: store.snapshot(room).members });

  // ---------- Prezans ----------
  // Premye bagay kliyan an fè: di ki non li. Li resevwa tout sa l bezwen pou onglè yo.
  socket.on("hello", guard(({ name }, reply) => {
    const n = social.hello(socket.id, name);
    reply({
      ok: true, you: socket.id, name: n,
      online: social.online(), rooms: store.listPublic(),
      lobby: social.lobbyHistory(), jokes: social.listJokes(socket.id, "new"),
    });
    announceOnline();
  }));

  // ---------- Konekte: chat jeneral ----------
  socket.on("lobby:chat", guard(({ text }, reply) => {
    const { msg, error } = social.lobbyMessage(socket.id, text);
    if (error) return reply({ error });
    reply({ ok: true });
    io.emit("lobby:chat", msg);
  }));

  // ---------- Rire: mi blag ----------
  socket.on("jokes:list", guard(({ sort }, reply) => {
    reply({ ok: true, jokes: social.listJokes(socket.id, sort === "top" ? "top" : "new") });
  }));

  socket.on("joke:post", guard(({ text }, reply) => {
    const { joke, error } = social.postJoke(socket.id, text);
    if (error) return reply({ error });
    reply({ ok: true });
    io.emit("joke:new", social.publicJoke(joke));
  }));

  socket.on("joke:laugh", guard(({ id }, reply) => {
    const { joke, laughed, error } = social.toggleLaugh(socket.id, id);
    if (error) return reply({ error });
    reply({ ok: true, laughed });
    io.emit("joke:update", { id: joke.id, laughs: joke.laughs.size });
  }));

  socket.on("joke:report", guard(({ id }, reply) => {
    const { joke, hidden, error } = social.report(socket.id, id);
    if (error) return reply({ error });
    reply({ ok: true });
    if (hidden) io.emit("joke:remove", { id: joke.id });
  }));

  socket.on("joke:delete", guard(({ id }, reply) => {
    const { joke, error } = social.deleteJoke(socket.id, id);
    if (error) return reply({ error });
    reply({ ok: true });
    io.emit("joke:remove", { id: joke.id });
  }));

  // ---------- Sal ----------
  socket.on("rooms:list", guard((_p, reply) => reply({ ok: true, rooms: store.listPublic() })));

  socket.on("room:create", guard(({ name, kind, isPublic }, reply) => {
    const old = store.roomOf(socket.id);
    if (old) leave();
    const room = store.createRoom(socket.id, name || social.nameOf(socket.id), { kind, isPublic });
    socket.join(room.code);
    reply({ ok: true, you: socket.id, room: store.snapshot(room) });
    if (room.isPublic) announceRooms();
  }));

  socket.on("room:join", guard(({ code, name }, reply) => {
    const old = store.roomOf(socket.id);
    if (old && old.code !== String(code || "").toUpperCase()) leave();
    const { room, error } = store.joinRoom(code, socket.id, name || social.nameOf(socket.id));
    if (error) return reply({ error });
    if (room.isPublic) announceRooms();
    socket.join(room.code);
    reply({ ok: true, you: socket.id, room: store.snapshot(room) });
    socket.to(room.code).emit("system", { text: `${room.members.get(socket.id)} antre nan sal la 👋` });
    broadcastMembers(room);
  }));

  socket.on("video:set", guard(({ url }, reply) => {
    const { room, error } = store.setVideo(socket.id, url);
    if (error) return reply({ error });
    reply({ ok: true });
    io.to(room.code).emit("video", { videoId: room.playback.videoId, by: room.members.get(socket.id) });
    if (room.isPublic) announceRooms();
  }));

  // action: "play" | "pause" | "seek", time: segonn
  socket.on("playback", guard(({ action, time }, reply) => {
    const { room, error } = store.updatePlayback(socket.id, { action, time });
    if (error) return reply({ error });
    reply({ ok: true });
    const s = store.snapshot(room);
    socket.to(room.code).emit("playback", {
      action, playing: s.playing, time: s.time, by: room.members.get(socket.id),
    });
  }));

  // Kliyan an mande eta aktyèl la (pa egzanp pou korije dekalaj).
  socket.on("sync:request", guard((_p, reply) => {
    const room = store.roomOf(socket.id);
    if (!room) return reply({ error: "Ou pa nan okenn sal." });
    const s = store.snapshot(room);
    reply({ ok: true, videoId: s.videoId, playing: s.playing, time: s.time });
  }));

  socket.on("chat", guard(({ text }, reply) => {
    const { room, msg, error } = store.addMessage(socket.id, text);
    if (error) return reply({ error });
    reply({ ok: true });
    io.to(room.code).emit("chat", msg);
  }));

  socket.on("react", guard(({ emoji }, reply) => {
    const { room, reaction, error } = store.react(socket.id, emoji);
    if (error) return reply({ error });
    reply({ ok: true });
    io.to(room.code).emit("react", reaction);
  }));

  // ---------- Jwèt ----------
  socket.on("game:start", guard(({ count }, reply) => {
    const room = store.roomOf(socket.id);
    if (!room) return reply({ error: "Ou pa nan okenn sal." });
    if (room.hostId !== socket.id) return reply({ error: "Se sèlman host la ki ka lanse jwèt la." });
    // Poze fim nan si l ap jwe, pou tout moun ka konsantre sou jwèt la
    if (room.playback.videoId && room.playback.playing) {
      const time = store.currentTime(room);
      store.updatePlayback(socket.id, { action: "pause", time });
      io.to(room.code).emit("playback", { action: "pause", playing: false, time, by: "🎲 Jwèt la" });
    }
    G.startGame(room, { bank: QUESTION_BANK, count, now: Date.now(), questionMs: QUESTION_MS, revealMs: REVEAL_MS });
    reply({ ok: true });
    io.to(room.code).emit("system", { text: `🎲 ${room.members.get(socket.id)} lanse yon Trivia!` });
    broadcastGame(room);
    scheduleGame(room);
    if (room.isPublic) announceRooms();
  }));

  socket.on("game:answer", guard(({ choice }, reply) => {
    const room = store.roomOf(socket.id);
    if (!room) return reply({ error: "Ou pa nan okenn sal." });
    const res = G.answer(room, socket.id, choice, Date.now());
    if (res.error) return reply({ error: res.error });
    reply({ ok: true });
    io.to(room.code).emit("game:progress", { answeredIds: [...room.game.answers.keys()] });
    if (res.allAnswered) advanceGame(room); // tout moun reponn → montre rezilta touswit
  }));

  socket.on("game:stop", guard((_p, reply) => {
    const room = store.roomOf(socket.id);
    if (!room) return reply({ error: "Ou pa nan okenn sal." });
    if (room.hostId !== socket.id) return reply({ error: "Se sèlman host la ki ka sispann jwèt la." });
    clearGameTimer(room.code);
    G.stopGame(room);
    reply({ ok: true });
    broadcastGame(room);
    if (room.isPublic) announceRooms();
  }));

  function leave() {
    const room = store.roomOf(socket.id);
    const name = room && room.members.get(socket.id);
    const result = store.leaveRoom(socket.id);
    if (!result) return;
    socket.leave(result.room.code);
    if (result.room.isPublic) announceRooms();
    if (result.deleted) return clearGameTimer(result.room.code);
    const g = result.room.game;
    if (g && g.phase === "question" && G.everyoneAnswered(result.room)) advanceGame(result.room);
    io.to(result.room.code).emit("system", { text: `${name} kite sal la` });
    if (result.newHostId) {
      io.to(result.room.code).emit("system", {
        text: `${result.room.members.get(result.newHostId)} se nouvo host la 👑`,
      });
    }
    broadcastMembers(result.room);
  }

  socket.on("room:leave", guard((_p, reply) => { leave(); reply({ ok: true }); }));
  socket.on("disconnect", () => {
    leave();
    if (social.bye(socket.id)) announceOnline();
  });
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`🎉 Lakou ap kouri sou http://localhost:${PORT}`));
}

module.exports = { app, server, io };
