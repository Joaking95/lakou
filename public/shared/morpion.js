// morpion.js — Règ Mòpyon. Mache nan navigatè a (window.LakouGames.morpion) ak sou sèvè a (require).
// Jwè 0 = ✕, jwè 1 = ◯. Varyant: "3" (3x3, 3 aliyen) oswa "5" (15x15, 5 aliyen).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.LakouGames = root.LakouGames || {}).morpion = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const VARIANTS = {
    "3": { size: 3, win: 3, label: "Ti mòpyon 3×3" },
    "5": { size: 15, win: 5, label: "Gwo mòpyon (5 aliyen)" },
  };

  function create(variant = "3") {
    const v = VARIANTS[variant] || VARIANTS["3"];
    return {
      game: "morpion",
      variant: VARIANTS[variant] ? variant : "3",
      size: v.size,
      win: v.win,
      cells: new Array(v.size * v.size).fill(null),
      turn: 0,
      moves: 0,
      last: null,
      winner: null, // 0, 1, "draw" oswa null
      line: null, // endèks ki fè liy ki genyen an
    };
  }

  function clone(s) {
    return { ...s, cells: s.cells.slice(), line: s.line ? s.line.slice() : null };
  }

  function legalMoves(s) {
    if (s.winner !== null) return [];
    const out = [];
    for (let i = 0; i < s.cells.length; i++) if (s.cells[i] === null) out.push(i);
    return out;
  }

  // Chèche si kou nan `idx` la fè yon liy ki genyen.
  function lineThrough(s, idx) {
    const { size, win, cells } = s;
    const p = cells[idx];
    const r = Math.floor(idx / size), c = idx % size;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const line = [idx];
      for (const sign of [1, -1]) {
        let rr = r + dr * sign, cc = c + dc * sign;
        while (rr >= 0 && rr < size && cc >= 0 && cc < size && cells[rr * size + cc] === p) {
          line.push(rr * size + cc);
          rr += dr * sign; cc += dc * sign;
        }
      }
      if (line.length >= win) return line.sort((a, b) => a - b);
    }
    return null;
  }

  function play(s, move) {
    const idx = Number(move);
    if (s.winner !== null) return { error: "Pati a fini." };
    if (!Number.isInteger(idx) || idx < 0 || idx >= s.cells.length) return { error: "Kaz sa a pa valid." };
    if (s.cells[idx] !== null) return { error: "Kaz sa a deja pran." };
    const n = clone(s);
    n.cells[idx] = s.turn;
    n.moves += 1;
    n.last = idx;
    const line = lineThrough(n, idx);
    if (line) { n.winner = s.turn; n.line = line; }
    else if (n.moves === n.cells.length) n.winner = "draw";
    else n.turn = 1 - s.turn;
    return { state: n };
  }

  return { name: "morpion", VARIANTS, create, play, legalMoves, lineThrough, clone };
});
