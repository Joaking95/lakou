// server.js — Sèvè Express + Socket.IO pou Lakou
const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { createRoomStore } = require("./rooms");
const { createSocial } = require("./social");
const { createPlayers, XP } = require("./players");
const { createTables } = require("./tables");
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
const players = createPlayers();
const tables = createTables();
// Konbyen tan (ms) yon jwè ki dekonekte genyen pou l retounen sou tab la anvan l pèdi pa fòfè
const AWAY_MS = Number(process.env.TABLE_AWAY_MS) || 45_000;
const CHALLENGE_MS = 60_000;

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, rooms: store.size, tables: tables.size, online: social.online().length }));

// ---------- Anons pou tout moun (lis sal piblik, moun ki an liy) ----------
// "Debounce": si plizyè bagay chanje an menm tan, nou voye yon sèl mesaj.
function debounced(fn, ms = 250) {
  let t = null;
  return () => { if (!t) t = setTimeout(() => { t = null; fn(); }, ms); };
}
const announceRooms = debounced(() => io.emit("rooms", store.listPublic()));
const announceOnline = debounced(() => io.emit("online", onlineList()));
const announceTables = debounced(() => io.emit("tables", tables.listOpen()));
const announceLeaderboard = debounced(() => io.emit("leaderboard", players.leaderboard()), 1500);

// Lis moun an liy, ak avatar, nivo, ak si y ap jwe. (Pa janm mete token an!)
function onlineList() {
  return social.online().map((u) => {
    const token = social.tokenOf(u.id);
    const p = players.get(token);
    return { id: u.id, name: u.name, avatar: u.avatar || (p && p.avatar) || "😎", level: p ? players.publicStats(p).level : 1, busy: !!tables.tableOf(token) };
  });
}

// ---------- XP: voye pwogrè a bay jwè a ----------
function sendMe(token, extra = {}) {
  const sid = social.socketOfToken(token);
  const p = players.get(token);
  if (sid && p) io.to(sid).emit("me", { ...players.publicStats(p), ...extra });
}
function giveXp(token, amount, reason) {
  const r = players.award(token, amount);
  if (r.gained) { sendMe(token, { gained: r.gained, reason, leveledUp: r.leveledUp }); announceLeaderboard(); }
  return r;
}

// ---------- Tab jwèt 1v1 ----------
const awayTimers = new Map(); // token -> setTimeout

// Chak jwè resevwa tab la ak "you" = plas pa l (0 oswa 1).
function broadcastTable(t) {
  const pub = tables.publicTable(t);
  t.seats.forEach((s, i) => {
    const sid = s && !s.gone && social.socketOfToken(s.token);
    if (sid) io.to(sid).emit("table", { ...pub, you: i });
  });
}

// Lè yon pati fini: anrejistre rezilta yo epi bay XP.
function settle(t) {
  const { winner, reason } = t.result;
  t.seats.forEach((s, i) => {
    if (!s) return;
    const result = winner === "draw" ? "draw" : winner === i ? "win" : "loss";
    const r = players.recordResult(s.token, result);
    const label = result === "win" ? (reason === "forfeit" ? "Viktwa (advèsè a kite)" : "Viktwa") : result === "draw" ? "Match nil" : "Pati jwe";
    sendMe(s.token, { gained: r.gained, reason: label, leveledUp: r.leveledUp });
  });
  announceLeaderboard();
  announceOnline();
}

function afterLeave(res) {
  if (!res) return;
  const t = res.table;
  if (res.forfeit) settle(t);
  if (!res.deleted) broadcastTable(t);
  announceTables();
  announceOnline();
}

// Limit senp:

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
    const board = G.leaderboard(room.game);
    const [winner] = board;
    if (winner) io.to(room.code).emit("system", { text: `🏆 ${winner.name} genyen ak ${winner.score} pwen!` });
    board.forEach((p, i) => {
      const token = social.tokenOf(p.id);
      if (!token) return;
      const bonus = i === 0 && board.length > 1 && p.score > 0 ? 25 : 0;
      giveXp(token, Math.floor(p.score * XP.triviaPerPoint) + bonus, i === 0 && bonus ? "Ou genyen Trivia a 🏆" : "Trivia");
    });
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
  // token: idantifyan sekrè aparèy la; cached: dènye pwogrè kliyan an te konnen; today: dat lokal li.
  socket.on("hello", guard(({ name, avatar, token, cached, today }, reply) => {
    const validToken = players.validToken(token) ? token : null;
    const n = social.hello(socket.id, name, { token: validToken, avatar });
    let daily = { bonus: 0, streak: 0 };
    let myTable = null;
    if (validToken) {
      players.ensure(validToken, { name: n, avatar, cached });
      social.hello(socket.id, n, { token: validToken, avatar: players.get(validToken).avatar });
      daily = players.daily(validToken, today);
      // Si moun nan te sou yon tab (li te dekonekte), li retounen ladan l.
      const t = tables.tableOf(validToken);
      if (t) {
        clearTimeout(awayTimers.get(validToken));
        awayTimers.delete(validToken);
        tables.join(t.id, { token: validToken, name: n, avatar: players.get(validToken).avatar });
        socket.join("t:" + t.id);
        myTable = { ...tables.publicTable(t), you: tables.seatOf(t, validToken) };
        broadcastTable(t);
      }
    }
    const me = validToken ? players.publicStats(players.get(validToken)) : null;
    reply({
      ok: true, you: socket.id, name: n, me, daily,
      online: onlineList(), rooms: store.listPublic(), tables: tables.listOpen(),
      leaderboard: players.leaderboard(), myTable,
      lobby: social.lobbyHistory(), jokes: social.listJokes(socket.id, "new"),
    });
    if (daily.bonus) announceLeaderboard();
    announceOnline();
  }));

  const myToken = () => social.tokenOf(socket.id);
  const meAsPlayer = () => {
    const token = myToken();
    const p = players.get(token);
    return token && p ? { token, name: social.nameOf(socket.id), avatar: p.avatar } : null;
  };

  // ---------- Tab jwèt 1v1 ----------
  function enterTable(res, reply) {
    if (res.error) return reply({ error: res.error });
    if (res.left) afterLeave(res.left);
    const t = res.table;
    socket.join("t:" + t.id);
    reply({ ok: true, table: { ...tables.publicTable(t), you: tables.seatOf(t, myToken()) } });
    broadcastTable(t);
    announceTables();
    announceOnline();
  }

  socket.on("table:create", guard(({ game, variant, isPublic }, reply) => {
    const me = meAsPlayer();
    if (!me) return reply({ error: "Rekonekte epi eseye ankò." });
    enterTable(tables.create(me, { game, variant, isPublic }), reply);
  }));

  socket.on("table:quick", guard(({ game, variant }, reply) => {
    const me = meAsPlayer();
    if (!me) return reply({ error: "Rekonekte epi eseye ankò." });
    enterTable(tables.quickMatch(me, { game, variant }), reply);
  }));

  socket.on("table:join", guard(({ id }, reply) => {
    const me = meAsPlayer();
    if (!me) return reply({ error: "Rekonekte epi eseye ankò." });
    enterTable(tables.join(id, me), reply);
  }));

  socket.on("table:move", guard(({ move }, reply) => {
    const res = tables.move(myToken(), move);
    if (res.error) return reply({ error: res.error });
    reply({ ok: true });
    broadcastTable(res.table);
    if (res.over) settle(res.table);
  }));

  socket.on("table:rematch", guard((_p, reply) => {
    const res = tables.rematch(myToken());
    if (res.error) return reply({ error: res.error });
    reply({ ok: true });
    broadcastTable(res.table);
  }));

  socket.on("table:leave", guard((_p, reply) => {
    const t = tables.tableOf(myToken());
    if (t) socket.leave("t:" + t.id);
    afterLeave(tables.leave(myToken()));
    reply({ ok: true });
  }));

  const EMOTES = ["😂", "🔥", "😱", "👏", "😤", "🤝", "🙏", "😎"];
  socket.on("table:emote", guard(({ emoji }, reply) => {
    const t = tables.tableOf(myToken());
    if (!t || !EMOTES.includes(emoji)) return reply({ error: "Pa ka voye sa." });
    reply({ ok: true });
    io.to("t:" + t.id).emit("table:emote", { seat: tables.seatOf(t, myToken()), emoji });
  }));

  // ---------- Defi: envite yon moun ki an liy ----------
  socket.on("challenge:send", guard(({ to, game, variant }, reply) => {
    const me = meAsPlayer();
    if (!me) return reply({ error: "Rekonekte epi eseye ankò." });
    if (to === socket.id) return reply({ error: "Ou pa ka defi tèt ou 😄" });
    const targetToken = social.tokenOf(to);
    if (!targetToken) return reply({ error: "Moun sa a pa an liy ankò." });
    if (tables.tableOf(targetToken) && tables.tableOf(targetToken).status === "playing") return reply({ error: "Moun sa a ap jwe yon pati kounye a." });
    const res = tables.create(me, { game, variant, isPublic: false, invite: targetToken });
    if (res.error) return reply({ error: res.error });
    if (res.left) afterLeave(res.left);
    const t = res.table;
    socket.join("t:" + t.id);
    reply({ ok: true, table: { ...tables.publicTable(t), you: 0 } });
    io.to(to).emit("challenge", { tableId: t.id, label: tables.publicTable(t).label, game: t.game, from: { name: me.name, avatar: me.avatar } });
    setTimeout(() => {
      const still = tables.get(t.id);
      if (still && still.status === "waiting" && still.invite) {
        tables.remove(t.id);
        io.to(socket.id).emit("challenge:expired", { tableId: t.id });
        announceOnline();
      }
    }, CHALLENGE_MS);
  }));

  socket.on("challenge:decline", guard(({ tableId }, reply) => {
    const t = tables.get(tableId);
    reply({ ok: true });
    if (!t || t.invite !== myToken() || t.status !== "waiting") return;
    const host = social.socketOfToken(t.seats[0].token);
    tables.remove(t.id);
    if (host) io.to(host).emit("challenge:declined", { tableId: t.id, by: social.nameOf(socket.id) });
    announceOnline();
  }));

  // ---------- Pati kont robo a (jwe sou aparèy la): ti XP ----------
  let lastBotReward = 0;
  socket.on("stats:bot", guard(({ result, level }, reply) => {
    const token = myToken();
    if (!token || Date.now() - lastBotReward < 8000) return reply({ ok: true, gained: 0 });
    lastBotReward = Date.now();
    const amount = result === "win" ? (level === "hard" ? XP.botWin.hard : XP.botWin.easy) : result === "draw" ? XP.botDraw : 0;
    giveXp(token, amount, result === "win" ? "Ou bat Robo Lakou 🤖" : "Match nil ak Robo a");
    reply({ ok: true });
  }));

  socket.on("leaderboard", guard((_p, reply) => reply({ ok: true, leaderboard: players.leaderboard() })));

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
    if (joke.byToken) giveXp(joke.byToken, XP.joke, "Ou poste yon blag");
  }));

  socket.on("joke:laugh", guard(({ id }, reply) => {
    const { joke, laughed, firstLaugh, error } = social.toggleLaugh(socket.id, id);
    if (error) return reply({ error });
    reply({ ok: true, laughed });
    io.emit("joke:update", { id: joke.id, laughs: joke.laughs.size });
    if (firstLaugh && joke.byToken) giveXp(joke.byToken, XP.laughReceived, `${social.nameOf(socket.id)} ri ak blag ou 😂`);
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
    const token = myToken();
    const t = token && tables.tableOf(token);
    if (t) {
      if (t.status === "waiting") afterLeave(tables.leave(token));
      else {
        tables.setConnected(token, false);
        broadcastTable(t);
        // Si l pa retounen nan AWAY_MS, li pèdi pa fòfè.
        if (t.status === "playing") {
          clearTimeout(awayTimers.get(token));
          awayTimers.set(token, setTimeout(() => { awayTimers.delete(token); afterLeave(tables.forfeitIfAway(token)); }, AWAY_MS));
        }
      }
    }
    if (social.bye(socket.id)) announceOnline();
  });
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`🎉 Lakou ap kouri sou http://localhost:${PORT}`));
}

module.exports = { app, server, io };
