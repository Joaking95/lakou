// kay.js — Règ Kay (Toukay / Warri ayisyen).
//
// Tablo: 2 ranje 6 twou, 4 grenn nan chak twou.
//   Twou 0–5  = jwè 0 (ranje anba, de goch a dwat)
//   Twou 6–11 = jwè 1 (ranje anlè, de dwat a goch)
// Konsa, simen "kont sans zegwi mont" se jis 0 → 1 → … → 11 → 0.
//
// Règ yo (selon tradisyon ayisyen an):
//  • Ou pran tout grenn yon twou pa w ki gen omwen 2 grenn, epi ou simen yo youn pa youn.
//  • Yon grenn ki pou kont li ka avanse sèlman si twou ki vin apre a vid.
//  • Si dènye grenn nan tonbe nan yon twou advèsè a epi li fè l gen 4 grenn: «KAY!»
//    Ou pran 4 grenn sa yo, plis twou advèsè ki vin anvan yo (san kase) ki gen 4 grenn tou.
//  • Si dènye grenn nan tonbe nan yon twou ki te gen grenn deja:
//      – si twou ki vin apre a vid, kou a fini;
//      – sinon, ou ranmase tout grenn twou sa a epi ou kontinye simen.
//  • Si dènye grenn nan tonbe nan yon twou vid, ou deplase l nan pwochen twou ki gen grenn, epi kou a fini.
//  • Pati a fini lè jwè ki pou jwe a pa ka fè okenn kou. Moun ki pran plis grenn nan genyen.
//  • Règ Lakou: si 80 kou pase san pèsonn pa pran, pati a fini; chak jwè konte grenn ki sou bò pa l tou.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.LakouGames = root.LakouGames || {}).kay = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const PITS = 12, START = 4, MAX_LAPS = 60, STALL = 80;

  const owner = (i) => (i < 6 ? 0 : 1);
  const next = (i) => (i + 1) % PITS;
  const prev = (i) => (i + PITS - 1) % PITS;

  function create() {
    return {
      game: "kay", variant: "",
      pits: new Array(PITS).fill(START),
      store: [0, 0],
      turn: 0, moves: 0, sinceCapture: 0,
      winner: null, reason: null,
      steps: [], // dènye kou a, pou anime l
      lastFrom: null,
    };
  }

  function clone(s) {
    return { ...s, pits: s.pits.slice(), store: s.store.slice(), steps: [] };
  }

  function canMoveFrom(s, i) {
    if (owner(i) !== s.turn) return false;
    if (s.pits[i] >= 2) return true;
    return s.pits[i] === 1 && s.pits[next(i)] === 0;
  }

  function legalMoves(s) {
    if (s.winner !== null) return [];
    const out = [];
    for (let i = 0; i < PITS; i++) if (canMoveFrom(s, i)) out.push(i);
    return out;
  }

  function finish(n, reason) {
    n.reason = reason;
    let a = n.store[0], b = n.store[1];
    if (reason === "stall") {
      for (let i = 0; i < PITS; i++) { if (owner(i) === 0) a += n.pits[i]; else b += n.pits[i]; }
      n.final = [a, b];
    } else {
      n.final = [a, b];
    }
    n.winner = a > b ? 0 : b > a ? 1 : "draw";
  }

  function play(s, move) {
    const i = Number(move);
    if (s.winner !== null) return { error: "Pati a fini." };
    if (!Number.isInteger(i) || i < 0 || i >= PITS) return { error: "Twou sa a pa valid." };
    if (owner(i) !== s.turn) return { error: "Se pa twou pa w." };
    if (!canMoveFrom(s, i)) return { error: s.pits[i] === 0 ? "Twou sa a vid." : "Yon grenn pou kont li ka avanse sèlman si twou apre a vid." };

    const n = clone(s);
    const me = s.turn;
    const steps = n.steps;
    let captured = 0;
    n.lastFrom = i;

    if (n.pits[i] === 1) {
      // Yon sèl grenn: li avanse nan twou vid ki vin apre a.
      n.pits[i] = 0; n.pits[next(i)] = 1;
      steps.push({ t: "pick", i }, { t: "drop", i: next(i) });
    } else {
      let seeds = n.pits[i];
      n.pits[i] = 0;
      steps.push({ t: "pick", i });
      let pos = i;
      for (let lap = 0; ; lap++) {
        while (seeds > 0) {
          pos = next(pos);
          n.pits[pos] += 1;
          seeds -= 1;
          steps.push({ t: "drop", i: pos });
        }
        const last = pos;
        if (owner(last) !== me && n.pits[last] === 4) {
          // KAY! Pran twou sa a ak twou advèsè anvan l yo ki gen 4 grenn.
          const holes = [];
          let j = last;
          while (owner(j) !== me && n.pits[j] === 4) {
            holes.push(j); captured += 4; n.pits[j] = 0; j = prev(j);
          }
          steps.push({ t: "capture", holes, total: captured, by: me });
          break;
        }
        if (n.pits[last] === 1) {
          // Tonbe nan yon twou vid: deplase grenn nan nan pwochen twou ki gen grenn.
          let k = next(last);
          while (n.pits[k] === 0 && k !== last) k = next(k);
          if (k !== last) {
            n.pits[last] = 0; n.pits[k] += 1;
            steps.push({ t: "slide", from: last, to: k });
          }
          break;
        }
        if (n.pits[next(last)] === 0 || lap >= MAX_LAPS) break; // twou apre a vid: kou a fini
        // Sinon: ranmase epi kontinye simen.
        seeds = n.pits[last];
        n.pits[last] = 0;
        steps.push({ t: "pick", i: last });
      }
    }

    n.store[me] += captured;
    n.moves += 1;
    n.sinceCapture = captured ? 0 : s.sinceCapture + 1;
    n.turn = 1 - me;
    if (legalMoves(n).length === 0) finish(n, "blocked");
    else if (n.sinceCapture >= STALL) finish(n, "stall");
    return { state: n, captured };
  }

  return { name: "kay", PITS, owner, next, create, play, legalMoves, canMoveFrom, clone };
});
