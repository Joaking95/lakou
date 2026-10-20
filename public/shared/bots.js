// bots.js — «Robo Lakou»: advèsè òdinatè pou chak jwèt.
// level: "easy" (Fasil) oswa "hard" (Fò). Chak fonksyon retounen yon kou valid.
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./morpion"), require("./connect4"), require("./kay"));
  } else {
    const G = root.LakouGames;
    G.bots = factory(G.morpion, G.connect4, G.kay);
  }
})(typeof self !== "undefined" ? self : this, function (Morpion, Connect4, Kay) {
  const pick = (arr, random = Math.random) => arr[Math.floor(random() * arr.length)];

  // ---------- Mòpyon 3×3: minimax konplè ----------
  function minimax3(s, me, depth) {
    if (s.winner === me) return 10 - depth;
    if (s.winner === "draw") return 0;
    if (s.winner !== null) return depth - 10;
    const scores = Morpion.legalMoves(s).map((m) => minimax3(Morpion.play(s, m).state, me, depth + 1));
    return s.turn === me ? Math.max(...scores) : Math.min(...scores);
  }
  function morpion3(s, level, random) {
    const moves = Morpion.legalMoves(s);
    if (level === "easy" && random() < 0.5) return pick(moves, random);
    let best = -Infinity, bestMoves = [];
    for (const m of moves) {
      const v = minimax3(Morpion.play(s, m).state, s.turn, 1);
      if (v > best) { best = v; bestMoves = [m]; } else if (v === best) bestMoves.push(m);
    }
    return pick(bestMoves, random);
  }

  // ---------- Gwo mòpyon: evalye chak kaz toupre grenn yo ----------
  function lineScore(s, idx, p) {
    const { size, cells, win } = s;
    const r = Math.floor(idx / size), c = idx % size;
    let total = 0;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      let count = 1, open = 0;
      for (const sign of [1, -1]) {
        let rr = r + dr * sign, cc = c + dc * sign;
        while (rr >= 0 && rr < size && cc >= 0 && cc < size && cells[rr * size + cc] === p) {
          count++; rr += dr * sign; cc += dc * sign;
        }
        if (rr >= 0 && rr < size && cc >= 0 && cc < size && cells[rr * size + cc] === null) open++;
      }
      if (count >= win) total += 1e6;
      else if (count === win - 1) total += open === 2 ? 5e4 : open === 1 ? 4e3 : 0;
      else if (count === win - 2) total += open === 2 ? 2e3 : open === 1 ? 150 : 0;
      else if (count === 2) total += open === 2 ? 60 : open === 1 ? 10 : 0;
      else total += open;
    }
    return total;
  }
  function morpionBig(s, level, random) {
    const { size, cells } = s;
    if (s.moves === 0) return Math.floor(size / 2) * size + Math.floor(size / 2);
    const me = s.turn, them = 1 - me;
    let best = -Infinity, bestMoves = [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] !== null) continue;
      const r = Math.floor(i / size), c = i % size;
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < size && cc >= 0 && cc < size && cells[rr * size + cc] !== null) { near = true; break; }
      }
      if (!near) continue;
      cells[i] = me; const atk = lineScore(s, i, me);
      cells[i] = them; const def = lineScore(s, i, them);
      cells[i] = null;
      let v = atk * 1.1 + def;
      if (level === "easy") v = v * (0.4 + random() * 0.6) + random() * 40;
      if (v > best) { best = v; bestMoves = [i]; } else if (v === best) bestMoves.push(i);
    }
    return bestMoves.length ? pick(bestMoves, random) : pick(Morpion.legalMoves(s), random);
  }

  // ---------- Kat Aliyen: minimax ak koupe alpha-beta ----------
  const { COLS, ROWS } = Connect4;
  function windowScore(w, me) {
    const mine = w.filter((x) => x === me).length;
    const theirs = w.filter((x) => x === 1 - me).length;
    const empty = w.filter((x) => x === null).length;
    if (mine === 4) return 1000;
    if (mine === 3 && empty === 1) return 6;
    if (mine === 2 && empty === 2) return 2;
    if (theirs === 3 && empty === 1) return -8;
    return 0;
  }
  function evalC4(s, me) {
    const at = (r, c) => s.cells[r * COLS + c];
    let score = 0;
    for (let r = 0; r < ROWS; r++) if (at(r, 3) === me) score += 3;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (c + 3 < COLS) score += windowScore([0, 1, 2, 3].map((k) => at(r, c + k)), me);
      if (r + 3 < ROWS) score += windowScore([0, 1, 2, 3].map((k) => at(r + k, c)), me);
      if (r + 3 < ROWS && c + 3 < COLS) score += windowScore([0, 1, 2, 3].map((k) => at(r + k, c + k)), me);
      if (r + 3 < ROWS && c - 3 >= 0) score += windowScore([0, 1, 2, 3].map((k) => at(r + k, c - k)), me);
    }
    return score;
  }
  function abC4(s, depth, alpha, beta, me) {
    if (s.winner === me) return 1e5 + depth;
    if (s.winner === "draw") return 0;
    if (s.winner !== null) return -1e5 - depth;
    if (depth === 0) return evalC4(s, me);
    const order = [3, 2, 4, 1, 5, 0, 6].filter((c) => s.cells[c] === null);
    if (s.turn === me) {
      let v = -Infinity;
      for (const m of order) {
        v = Math.max(v, abC4(Connect4.play(s, m).state, depth - 1, alpha, beta, me));
        alpha = Math.max(alpha, v); if (alpha >= beta) break;
      }
      return v;
    }
    let v = Infinity;
    for (const m of order) {
      v = Math.min(v, abC4(Connect4.play(s, m).state, depth - 1, alpha, beta, me));
      beta = Math.min(beta, v); if (alpha >= beta) break;
    }
    return v;
  }
  function connect4(s, level, random) {
    const moves = Connect4.legalMoves(s);
    const depth = level === "easy" ? 2 : 6;
    if (level === "easy" && random() < 0.3) return pick(moves, random);
    let best = -Infinity, bestMoves = [];
    for (const m of moves) {
      const v = abC4(Connect4.play(s, m).state, depth - 1, -Infinity, Infinity, s.turn);
      if (v > best) { best = v; bestMoves = [m]; } else if (v === best) bestMoves.push(m);
    }
    return pick(bestMoves, random);
  }

  // ---------- Kay: gade 2 kou devan ----------
  function kayValue(s, me) {
    if (s.winner === me) return 1000;
    if (s.winner === 1 - me) return -1000;
    return s.store[me] - s.store[1 - me];
  }
  function kay(s, level, random) {
    const moves = Kay.legalMoves(s);
    if (level === "easy" && random() < 0.4) return pick(moves, random);
    const me = s.turn;
    let best = -Infinity, bestMoves = [];
    for (const m of moves) {
      const after = Kay.play(s, m).state;
      let v = kayValue(after, me);
      if (level !== "easy" && after.winner === null) {
        // Advèsè a ap chwazi pi bon kou pa l
        let worst = Infinity;
        for (const r of Kay.legalMoves(after)) worst = Math.min(worst, kayValue(Kay.play(after, r).state, me));
        v = worst;
      }
      if (v > best) { best = v; bestMoves = [m]; } else if (v === best) bestMoves.push(m);
    }
    return pick(bestMoves, random);
  }

  function chooseMove(state, level = "hard", random = Math.random) {
    if (state.game === "morpion") return state.size === 3 ? morpion3(state, level, random) : morpionBig(state, level, random);
    if (state.game === "connect4") return connect4(state, level, random);
    if (state.game === "kay") return kay(state, level, random);
    throw new Error("Jwèt enkoni: " + state.game);
  }

  return { chooseMove };
});
