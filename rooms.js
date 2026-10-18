// rooms.js — Tout lojik sal yo, san okenn depandans rezo.
// Sèvè a (server.js) itilize modil sa a; tès yo (test/) teste l dirèkteman.

const { publicState: gameState } = require("./games");

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // pa gen O/0, I/1 pou evite konfizyon
const MAX_NAME = 24;
const MAX_MESSAGE = 300;
const MAX_HISTORY = 50;
const ALLOWED_REACTIONS = ["😂", "🔥", "😱", "❤️", "👏", "😭"];

function cleanName(name) {
  const n = String(name || "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  return n || "Envite";
}

// Aksepte yon lyen YouTube oswa yon ID 11 karaktè. Retounen null si li pa valid.
function parseVideoId(input) {
  const s = String(input || "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function createRoomStore({ now = () => Date.now(), random = Math.random } = {}) {
  const rooms = new Map(); // code -> room
  const memberRoom = new Map(); // socketId -> code

  function newCode() {
    for (let tries = 0; tries < 1000; tries++) {
      let code = "";
      for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
      if (!rooms.has(code)) return code;
    }
    throw new Error("Pa ka jenere kòd sal");
  }

  // Pozisyon videyo a kounye a, an segonn.
  function currentTime(room) {
    const p = room.playback;
    if (!p.playing) return p.time;
    return p.time + ((now() - p.updatedAt) / 1000) * p.rate;
  }

  function snapshot(room) {
    return {
      code: room.code,
      hostId: room.hostId,
      kind: room.kind,
      isPublic: room.isPublic,
      members: [...room.members.entries()].map(([id, name]) => ({ id, name })),
      videoId: room.playback.videoId,
      playing: room.playback.playing,
      time: currentTime(room),
      rate: room.playback.rate,
      history: room.history.slice(),
      game: gameState(room, now()),
    };
  }

  // kind: "movie" oswa "game" (sèlman pou montre l nan bon onglè a; tout sal ka fè tou de)
  // isPublic: si true, sal la parèt nan lis sal ouvè yo pou tout moun
  function createRoom(socketId, name, { kind = "movie", isPublic = false } = {}) {
    leaveRoom(socketId);
    const code = newCode();
    const room = {
      code,
      kind: kind === "game" ? "game" : "movie",
      isPublic: !!isPublic,
      hostId: socketId,
      members: new Map([[socketId, cleanName(name)]]),
      playback: { videoId: null, playing: false, time: 0, rate: 1, updatedAt: now() },
      history: [],
      game: null, // eta jwèt (gade games.js)
    };
    rooms.set(code, room);
    memberRoom.set(socketId, code);
    return room;
  }

  function joinRoom(code, socketId, name) {
    const c = String(code || "").trim().toUpperCase();
    const room = rooms.get(c);
    if (!room) return { error: "Sal sa a pa egziste. Verifye kòd la." };
    if (memberRoom.get(socketId) !== c) leaveRoom(socketId);
    room.members.set(socketId, cleanName(name));
    memberRoom.set(socketId, c);
    return { room };
  }

  // Retounen { room, newHostId, deleted } oswa null si moun nan pa t nan okenn sal.
  function leaveRoom(socketId) {
    const code = memberRoom.get(socketId);
    if (!code) return null;
    memberRoom.delete(socketId);
    const room = rooms.get(code);
    if (!room) return null;
    room.members.delete(socketId);
    if (room.members.size === 0) {
      rooms.delete(code);
      return { room, deleted: true, newHostId: null };
    }
    let newHostId = null;
    if (room.hostId === socketId) {
      newHostId = room.members.keys().next().value; // moun ki te la pi lontan an
      room.hostId = newHostId;
    }
    return { room, deleted: false, newHostId };
  }

  // Lis sal piblik yo, pou onglè Movie Night ak Jwèt yo.
  function listPublic() {
    return [...rooms.values()]
      .filter((r) => r.isPublic)
      .map((r) => ({
        code: r.code,
        kind: r.kind,
        host: r.members.get(r.hostId),
        count: r.members.size,
        videoId: r.playback.videoId,
        playing: r.playback.playing,
        gamePhase: r.game ? r.game.phase : "idle",
      }))
      .sort((a, b) => b.count - a.count);
  }

  function getRoom(code) {
    return rooms.get(code) || null;
  }

  function roomOf(socketId) {
    const code = memberRoom.get(socketId);
    return code ? rooms.get(code) || null : null;
  }

  // Se sèlman host la ki ka chanje fim nan.
  function setVideo(socketId, input) {
    const room = roomOf(socketId);
    if (!room) return { error: "Ou pa nan okenn sal." };
    if (room.hostId !== socketId) return { error: "Se sèlman host la ki ka chanje fim nan." };
    const videoId = parseVideoId(input);
    if (!videoId) return { error: "Lyen YouTube sa a pa valid." };
    room.playback = { videoId, playing: false, time: 0, rate: 1, updatedAt: now() };
    return { room };
  }

  // Nenpòt moun nan sal la ka play / pause / seek (tankou Teleparty).
  function updatePlayback(socketId, { action, time } = {}) {
    const room = roomOf(socketId);
    if (!room) return { error: "Ou pa nan okenn sal." };
    if (!room.playback.videoId) return { error: "Pa gen fim chwazi ankò." };
    const t = Number(time);
    if (!Number.isFinite(t) || t < 0 || t > 24 * 3600) return { error: "Tan pa valid." };
    const p = room.playback;
    if (action === "play") p.playing = true;
    else if (action === "pause") p.playing = false;
    else if (action !== "seek") return { error: "Aksyon pa valid." };
    p.time = t;
    p.updatedAt = now();
    return { room };
  }

  function addMessage(socketId, text) {
    const room = roomOf(socketId);
    if (!room) return { error: "Ou pa nan okenn sal." };
    const body = String(text || "").trim().slice(0, MAX_MESSAGE);
    if (!body) return { error: "Mesaj la vid." };
    const msg = { id: `${now()}-${Math.floor(random() * 1e6)}`, from: room.members.get(socketId), text: body, at: now() };
    room.history.push(msg);
    if (room.history.length > MAX_HISTORY) room.history.shift();
    return { room, msg };
  }

  function react(socketId, emoji) {
    const room = roomOf(socketId);
    if (!room) return { error: "Ou pa nan okenn sal." };
    if (!ALLOWED_REACTIONS.includes(emoji)) return { error: "Reyaksyon pa valid." };
    return { room, reaction: { emoji, from: room.members.get(socketId) } };
  }

  return {
    createRoom, joinRoom, leaveRoom, roomOf, getRoom, listPublic, setVideo, updatePlayback,
    addMessage, react, snapshot, currentTime, now,
    get size() { return rooms.size; },
  };
}

module.exports = { createRoomStore, parseVideoId, cleanName, ALLOWED_REACTIONS };
