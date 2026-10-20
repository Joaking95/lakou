// connect4.js — Règ Kat Aliyen (7 kolòn × 6 ranje, grenn yo tonbe anba).
// Jwè 0 = wouj, jwè 1 = jòn. Yon kou = nimewo kolòn nan (0–6).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.LakouGames = root.LakouGames || {}).connect4 = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const COLS = 7, ROWS = 6, WIN = 4;

  function create() {
    return {
      game: "connect4", variant: "", cols: COLS, rows: ROWS,
      cells: new Array(COLS * ROWS).fill(null), // ranje 0 = anlè
      turn: 0, moves: 0, last: null, winner: null, line: null,
    };
  }

  function clone(s) {
    return { ...s, cells: s.cells.slice(), line: s.line ? s.line.slice() : null };
  }

  function dropRow(s, col) {
    for (let r = ROWS - 1; r >= 0; r--) if (s.cells[r * COLS + col] === null) return r;
    return -1;
  }

  function legalMoves(s) {
    if (s.winner !== null) return [];
    const out = [];
    for (let c = 0; c < COLS; c++) if (s.cells[c] === null) out.push(c);
    return out;
  }

  function lineThrough(cells, idx) {
    const p = cells[idx];
    const r = Math.floor(idx / COLS), c = idx % COLS;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const line = [idx];
      for (const sign of [1, -1]) {
        let rr = r + dr * sign, cc = c + dc * sign;
        while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && cells[rr * COLS + cc] === p) {
          line.push(rr * COLS + cc);
          rr += dr * sign; cc += dc * sign;
        }
      }
      if (line.length >= WIN) return line.sort((a, b) => a - b);
    }
    return null;
  }

  function play(s, move) {
    const col = Number(move);
    if (s.winner !== null) return { error: "Pati a fini." };
    if (!Number.isInteger(col) || col < 0 || col >= COLS) return { error: "Kolòn sa a pa valid." };
    const r = dropRow(s, col);
    if (r < 0) return { error: "Kolòn sa a plen." };
    const n = clone(s);
    const idx = r * COLS + col;
    n.cells[idx] = s.turn;
    n.moves += 1;
    n.last = idx;
    const line = lineThrough(n.cells, idx);
    if (line) { n.winner = s.turn; n.line = line; }
    else if (n.moves === COLS * ROWS) n.winner = "draw";
    else n.turn = 1 - s.turn;
    return { state: n };
  }

  return { name: "connect4", COLS, ROWS, create, play, legalMoves, dropRow, clone };
});
