// players.js — Pwofil jwè yo: avatar, XP, nivo, viktwa, seri jou (streak), klasman.
//
// Pa gen kont: chak aparèy gen yon "token" sekrè (lakou:token nan localStorage).
// ⚠️ Tout bagay rete nan memwa sèvè a. Si sèvè a rekòmanse, kliyan an voye dènye
// pwogrè li te konnen (cached), epi nou reprann li (avèk limit). Pou vrè pèmanans: baz done.

const AVATARS = ["😎", "🦁", "🐯", "🐸", "🦊", "🐼", "🐵", "🦄", "🐙", "🐢", "🦜", "🌺", "🌴", "🥭", "⚽", "🎸"];
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const MAX_XP = 1_000_000;

const XP = {
  daily: 20,
  win: 30, draw: 15, loss: 5,
  botWin: { easy: 8, hard: 20 }, botDraw: 5,
  joke: 5, laughReceived: 2,
  triviaPerPoint: 1 / 100, // 1 XP pou chak 100 pwen trivia
};

const TITLES = [
  [1, "Ti moun lakou"], [3, "Vwazen"], [5, "Zanmi lakou"], [8, "Jwè serye"], [12, "Chèf lakou"], [18, "Lejann"],
];

// Nivo n bezwen 50·n·(n−1) XP: N2 = 100, N3 = 300, N4 = 600, N5 = 1000…
function levelInfo(xp) {
  let level = 1;
  while (50 * (level + 1) * level <= xp) level++;
  const cur = 50 * level * (level - 1);
  const next = 50 * (level + 1) * level;
  let title = TITLES[0][1];
  for (const [lv, t] of TITLES) if (level >= lv) title = t;
  return { level, title, cur, next, progress: (xp - cur) / (next - cur) };
}

function isDate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}
function dayBefore(s) {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
const int = (v, max = 1e6) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

function createPlayers() {
  const byToken = new Map();

  function validToken(t) {
    return typeof t === "string" && TOKEN_RE.test(t);
  }

  // Kreye oswa mete ajou yon jwè. `cached` = pwogrè kliyan an te sere (si sèvè a te rekòmanse).
  function ensure(token, { name, avatar, cached } = {}) {
    if (!validToken(token)) return null;
    let p = byToken.get(token);
    if (!p) {
      const c = cached && typeof cached === "object" ? cached : {};
      p = {
        token,
        xp: int(c.xp, MAX_XP),
        wins: int(c.wins), losses: int(c.losses), draws: int(c.draws),
        streak: int(c.streak, 3650),
        lastDaily: isDate(c.lastDaily) ? c.lastDaily : null,
      };
      byToken.set(token, p);
    }
    if (name) p.name = name;
    p.avatar = AVATARS.includes(avatar) ? avatar : p.avatar || AVATARS[0];
    return p;
  }

  function get(token) {
    return byToken.get(token) || null;
  }

  function publicStats(p) {
    if (!p) return null;
    return {
      name: p.name, avatar: p.avatar, xp: p.xp,
      wins: p.wins, losses: p.losses, draws: p.draws,
      streak: p.streak, lastDaily: p.lastDaily,
      ...levelInfo(p.xp),
    };
  }

  // Ajoute XP. Retounen { gained, leveledUp, level }.
  function award(token, amount) {
    const p = byToken.get(token);
    const gained = Math.max(0, Math.round(amount));
    if (!p || !gained) return { gained: 0, leveledUp: false };
    const before = levelInfo(p.xp).level;
    p.xp = Math.min(MAX_XP, p.xp + gained);
    const after = levelInfo(p.xp).level;
    return { gained, leveledUp: after > before, level: after };
  }

  // result: "win" | "loss" | "draw"
  function recordResult(token, result) {
    const p = byToken.get(token);
    if (!p) return { gained: 0 };
    if (result === "win") p.wins++;
    else if (result === "loss") p.losses++;
    else p.draws++;
    return award(token, XP[result] || 0);
  }

  // Bonis chak jou. `today` = dat lokal kliyan an (YYYY-MM-DD).
  function daily(token, today) {
    const p = byToken.get(token);
    if (!p || !isDate(today) || p.lastDaily === today) return { bonus: 0, streak: p ? p.streak : 0 };
    p.streak = p.lastDaily === dayBefore(today) ? p.streak + 1 : 1;
    p.lastDaily = today;
    const bonus = XP.daily + Math.min(p.streak - 1, 7) * 5; // plis jou youn dèyè lòt = plis bonis
    const r = award(token, bonus);
    return { bonus, streak: p.streak, leveledUp: r.leveledUp };
  }

  function leaderboard(limit = 10) {
    return [...byToken.values()]
      .filter((p) => p.name && p.xp > 0)
      .sort((a, b) => b.xp - a.xp || b.wins - a.wins)
      .slice(0, limit)
      .map((p) => ({ name: p.name, avatar: p.avatar, xp: p.xp, wins: p.wins, level: levelInfo(p.xp).level }));
  }

  return { validToken, ensure, get, publicStats, award, recordResult, daily, leaderboard };
}

module.exports = { createPlayers, levelInfo, AVATARS, XP, dayBefore };
