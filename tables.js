// tables.js — Tab jwèt 1 kont 1 (Mòpyon, Kay, Kat Aliyen).
// Jwè yo idantifye pa "token" yo (pa socket la), konsa yon moun ki dekonekte ka retounen.
// ⚠️ Pa janm voye token yo bay lòt kliyan: itilize publicTable().

const Morpion = require("./public/shared/morpion");
const Connect4 = require("./public/shared/connect4");
const Kay = require("./public/shared/kay");

const RULES = { morpion: Morpion, connect4: Connect4, kay: Kay };
const GAMES = {
  morpion: { label: "Mòpyon", variants: ["3", "5"] },
  kay: { label: "Kay", variants: [""] },
  connect4: { label: "Kat Aliyen", variants: [""] },
};
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function normGame(game, variant) {
  const g = GAMES[game];
  if (!g) return null;
  const v = g.variants.includes(String(variant ?? "")) ? String(variant ?? "") : g.variants[0];
  return { game, variant: v };
}

function gameLabel(game, variant) {
  if (game === "morpion") return variant === "5" ? "Gwo mòpyon" : "Ti mòpyon";
  return GAMES[game] ? GAMES[game].label : game;
}

function createTables({ now = () => Date.now(), random = Math.random } = {}) {
  const tables = new Map(); // id -> table
  const byToken = new Map(); // token -> id

  function newId() {
    for (let k = 0; k < 1000; k++) {
      let id = "";
      for (let i = 0; i < 6; i++) id += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
      if (!tables.has(id)) return id;
    }
    throw new Error("Pa ka jenere kòd tab");
  }

  const seatOf = (t, token) => t.seats.findIndex((s) => s && s.token === token);
  const tableOf = (token) => tables.get(byToken.get(token)) || null;
  const get = (id) => tables.get(String(id || "").trim().toUpperCase()) || null;

  function newState(t) {
    return RULES[t.game].create(t.variant);
  }

  function publicTable(t) {
    return {
      id: t.id, game: t.game, variant: t.variant, label: gameLabel(t.game, t.variant),
      status: t.status, isPublic: t.isPublic, round: t.round,
      seats: t.seats.map((s) => (s ? { name: s.name, avatar: s.avatar, connected: s.connected, wins: s.wins } : null)),
      state: t.state, result: t.result,
      rematch: t.seats.map((s) => !!s && t.rematch.has(s.token)),
      invited: !!t.invite,
    };
  }

  // player = { token, name, avatar }
  function create(player, { game, variant, isPublic = false, invite = null } = {}) {
    const g = normGame(game, variant);
    if (!g) return { error: "Jwèt sa a pa egziste." };
    const left = leave(player.token);
    const t = {
      id: newId(), ...g, isPublic: !!isPublic, invite,
      seats: [{ ...player, connected: true, wins: 0 }, null],
      state: null, status: "waiting", result: null, round: 0,
      rematch: new Set(), createdAt: now(),
    };
    t.state = newState(t);
    tables.set(t.id, t);
    byToken.set(player.token, t.id);
    return { table: t, left };
  }

  function join(id, player) {
    const t = get(id);
    if (!t) return { error: "Tab sa a pa egziste ankò." };
    const seat = seatOf(t, player.token);
    if (seat >= 0) {
      // Moun nan te deja chita la (pa egzanp li te dekonekte): li retounen.
      Object.assign(t.seats[seat], { name: player.name, avatar: player.avatar, connected: true });
      byToken.set(player.token, t.id);
      return { table: t, rejoined: true };
    }
    if (t.status !== "waiting" || t.seats[1]) return { error: "Tab sa a deja gen 2 jwè." };
    if (t.invite && t.invite !== player.token) return { error: "Se yon defi prive." };
    const left = leave(player.token);
    t.seats[1] = { ...player, connected: true, wins: 0 };
    byToken.set(player.token, t.id);
    start(t);
    return { table: t, started: true, left };
  }

  function start(t) {
    t.state = newState(t);
    t.status = "playing";
    t.result = null;
    t.rematch.clear();
    t.round += 1;
    t.invite = null;
  }

  // Jwenn yon advèsè: antre nan yon tab piblik k ap tann, oswa kreye youn.
  function quickMatch(player, { game, variant } = {}) {
    const g = normGame(game, variant);
    if (!g) return { error: "Jwèt sa a pa egziste." };
    const waiting = [...tables.values()]
      .filter((t) => t.isPublic && t.status === "waiting" && !t.invite && t.game === g.game && t.variant === g.variant &&
        t.seats[0] && t.seats[0].token !== player.token && t.seats[0].connected)
      .sort((a, b) => a.createdAt - b.createdAt)[0];
    if (waiting) return join(waiting.id, player);
    return create(player, { ...g, isPublic: true });
  }

  function end(t, winner, reason) {
    t.status = "over";
    t.result = { winner, reason };
    if (winner === 0 || winner === 1) t.seats[winner].wins += 1;
    return t;
  }

  function move(token, mv) {
    const t = tableOf(token);
    if (!t) return { error: "Ou pa sou okenn tab." };
    if (t.status !== "playing") return { error: t.status === "waiting" ? "N ap tann yon advèsè." : "Pati a fini." };
    const seat = seatOf(t, token);
    if (t.state.turn !== seat) return { error: "Se pa tou pa w." };
    const r = RULES[t.game].play(t.state, mv);
    if (r.error) return { error: r.error };
    t.state = r.state;
    if (t.state.winner !== null) {
      end(t, t.state.winner, "normal");
      return { table: t, over: true };
    }
    return { table: t };
  }

  // Kite tab la. Si pati a t ap jwe, lòt jwè a genyen pa fòfè.
  function leave(token) {
    const t = tableOf(token);
    if (!t) return null;
    byToken.delete(token);
    const seat = seatOf(t, token);
    let forfeit = false;
    if (t.status === "playing" && t.seats[1 - seat]) {
      end(t, 1 - seat, "forfeit");
      forfeit = true;
    }
    t.rematch.delete(token);
    if (t.status === "waiting") {
      tables.delete(t.id);
      return { table: t, deleted: true, seat };
    }
    t.seats[seat] = { ...t.seats[seat], connected: false, gone: true };
    const anyone = t.seats.some((s) => s && !s.gone);
    if (!anyone) tables.delete(t.id);
    return { table: t, forfeit, deleted: !anyone, seat };
  }

  function setConnected(token, connected) {
    const t = tableOf(token);
    if (!t) return null;
    const seat = seatOf(t, token);
    if (seat >= 0) t.seats[seat].connected = connected;
    return t;
  }

  // Apèl apre yon delè: si moun nan toujou pa la, li pèdi pa fòfè.
  function forfeitIfAway(token) {
    const t = tableOf(token);
    if (!t) return null;
    const seat = seatOf(t, token);
    if (seat < 0 || t.seats[seat].connected) return null;
    return leave(token);
  }

  // Tou de jwè yo dwe mande revanj. Lè sa a, yo chanje plas (lòt moun nan kòmanse).
  function rematch(token) {
    const t = tableOf(token);
    if (!t) return { error: "Ou pa sou okenn tab." };
    if (t.status !== "over") return { error: "Pati a poko fini." };
    const other = t.seats[1 - seatOf(t, token)];
    if (!other || other.gone) return { error: "Advèsè a kite tab la." };
    t.rematch.add(token);
    if (t.seats.every((s) => s && t.rematch.has(s.token))) {
      t.seats.reverse();
      start(t);
      return { table: t, restarted: true };
    }
    return { table: t };
  }

  function listOpen() {
    return [...tables.values()]
      .filter((t) => t.isPublic && t.status === "waiting" && !t.invite && t.seats[0] && t.seats[0].connected)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((t) => ({ id: t.id, game: t.game, variant: t.variant, label: gameLabel(t.game, t.variant), host: { name: t.seats[0].name, avatar: t.seats[0].avatar } }));
  }

  function remove(id) {
    const t = get(id);
    if (!t) return;
    for (const s of t.seats) if (s && byToken.get(s.token) === t.id) byToken.delete(s.token);
    tables.delete(t.id);
  }

  return {
    create, join, quickMatch, move, leave, rematch, setConnected, forfeitIfAway,
    tableOf, get, listOpen, publicTable, seatOf, remove,
    get size() { return tables.size; },
  };
}

module.exports = { createTables, GAMES, normGame, gameLabel };
