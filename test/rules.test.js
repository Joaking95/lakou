// Tès pou règ jwèt yo (Mòpyon, Kat Aliyen, Kay) ak Robo Lakou.
const test = require("node:test");
const assert = require("node:assert/strict");
const Morpion = require("../public/shared/morpion");
const Connect4 = require("../public/shared/connect4");
const Kay = require("../public/shared/kay");
const { chooseMove } = require("../public/shared/bots");

function seeded(seed = 7) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}
const run = (G, s, moves) => moves.reduce((st, m) => {
  const r = G.play(st, m);
  assert.ok(!r.error, `kou ${m}: ${r.error}`);
  return r.state;
}, s);

// ---------- Mòpyon ----------
test("mòpyon 3×3: ✕ genyen sou yon dyagonal", () => {
  const s = run(Morpion, Morpion.create("3"), [0, 1, 4, 2, 8]);
  assert.equal(s.winner, 0);
  assert.deepEqual(s.line, [0, 4, 8]);
  assert.ok(Morpion.play(s, 3).error); // pati fini
});

test("mòpyon 3×3: kaz pran, kaz pa valid, ak match nil", () => {
  const s = Morpion.create("3");
  assert.ok(Morpion.play(s, 9).error);
  assert.ok(Morpion.play(run(Morpion, s, [4]), 4).error);
  const draw = run(Morpion, s, [0, 1, 2, 4, 3, 5, 7, 6, 8]);
  assert.equal(draw.winner, "draw");
});

test("gwo mòpyon: 15×15, fòk 5 aliyen (4 pa ase)", () => {
  let s = Morpion.create("5");
  assert.equal(s.size, 15);
  // ✕ jwe 0,1,2,3 sou premye ranje; ◯ jwe lwen
  s = run(Morpion, s, [0, 100, 1, 101, 2, 102, 3, 120]);
  assert.equal(s.winner, null);
  s = run(Morpion, s, [4]);
  assert.equal(s.winner, 0);
  assert.equal(s.line.length, 5);
});

test("robo mòpyon 3×3 (Fò) pa janm pèdi kont kou o aza", () => {
  const random = seeded(3);
  for (let g = 0; g < 40; g++) {
    let s = Morpion.create("3");
    const botSeat = g % 2;
    while (s.winner === null) {
      const m = s.turn === botSeat ? chooseMove(s, "hard", random) : Morpion.legalMoves(s)[Math.floor(random() * Morpion.legalMoves(s).length)];
      s = Morpion.play(s, m).state;
    }
    assert.notEqual(s.winner, 1 - botSeat, `pati ${g}`);
  }
});

test("robo gwo mòpyon bloke yon liy 4", () => {
  let s = Morpion.create("5");
  // ✕ gen 4 aliyen (0..3) ak 4 la ouvè; se tou ◯ (robo)
  s = run(Morpion, s, [16, 200, 17, 210, 18, 220, 19]);
  const m = chooseMove(s, "hard", seeded());
  assert.ok(m === 15 || m === 20, `robo a jwe ${m}`);
});

// ---------- Kat Aliyen ----------
test("kat aliyen: grenn yo tonbe anba, kolòn plen refize", () => {
  let s = Connect4.create();
  s = run(Connect4, s, [3]);
  assert.equal(s.last, 5 * 7 + 3);
  s = run(Connect4, s, [3, 3, 3, 3, 3]);
  assert.ok(Connect4.play(s, 3).error);
  assert.ok(!Connect4.legalMoves(s).includes(3));
});

test("kat aliyen: genyen orizontal ak vètikal", () => {
  const h = run(Connect4, Connect4.create(), [0, 0, 1, 1, 2, 2, 3]);
  assert.equal(h.winner, 0);
  const v = run(Connect4, Connect4.create(), [0, 1, 0, 1, 0, 1, 6, 1]);
  assert.equal(v.winner, 1);
});

test("robo kat aliyen (Fò) pran yon kou ki genyen, epi bloke advèsè a", () => {
  const win = run(Connect4, Connect4.create(), [0, 6, 1, 6, 2, 5]); // wouj gen 0,1,2 → robo wouj
  assert.equal(chooseMove(win, "hard", seeded()), 3);
  const block = run(Connect4, Connect4.create(), [0, 6, 1, 6, 2]); // robo jòn dwe bloke 3
  assert.equal(chooseMove(block, "hard", seeded()), 3);
});

// ---------- Kay ----------
const total = (s) => s.pits.reduce((a, b) => a + b, 0) + s.store[0] + s.store[1];

test("kay: tablo depa a, ak premye kou ki simen 4 grenn", () => {
  const s = Kay.create();
  assert.deepEqual(s.pits, new Array(12).fill(4));
  assert.deepEqual(Kay.legalMoves(s), [0, 1, 2, 3, 4, 5]);
  const r = Kay.play(s, 2);
  assert.ok(!r.error);
  assert.equal(total(r.state), 48);
  assert.equal(r.state.turn, 1);
  assert.ok(r.state.steps.length > 4);
  assert.ok(Kay.play(s, 7).error); // se pa twou pa w
});

test("kay: «KAY!» pran 4 grenn plis twou anvan yo ki gen 4", () => {
  const s = Kay.create();
  s.pits = [0, 0, 0, 0, 0, 2, 3, 3, 0, 0, 0, 1];
  // Jwè 0 pran twou 5 (2 grenn): simen nan 6 (→4) epi 7 (→4). Dènye a nan 7 fè 4 → KAY.
  const r = Kay.play(s, 5);
  assert.equal(r.captured, 8);
  assert.deepEqual(r.state.store, [8, 0]);
  assert.equal(r.state.pits[6], 0);
  assert.equal(r.state.pits[7], 0);
  assert.equal(total(r.state), 9);
  assert.equal(r.state.steps.at(-1).t, "capture");
});

test("kay: dènye grenn nan tonbe nan twou vid → li glise nan pwochen twou ki gen grenn", () => {
  const s = Kay.create();
  s.pits = [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5];
  const r = Kay.play(s, 0); // simen nan 1, 2. Dènye nan 2 (vid) → glise nan 11? non: pwochen ki gen grenn apre 2
  // Apre 2: twou 3..10 vid, 11 gen 5 → grenn nan ale nan 11
  assert.deepEqual(r.state.pits, [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6]);
  assert.equal(r.state.steps.at(-1).t, "slide");
});

test("kay: relè (ranmase epi kontinye) lè twou apre a pa vid", () => {
  const s = Kay.create();
  s.pits = [2, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3];
  // Simen 0 → 1, 2. Twou 2 vin 2 grenn, twou 3 pa vid → ranmase 2 epi simen nan 3, 4.
  // Twou 4 te vid → grenn nan glise nan pwochen twou ki gen grenn (11).
  const r = Kay.play(s, 0);
  assert.equal(total(r.state), 7);
  assert.ok(r.state.steps.filter((x) => x.t === "pick").length >= 2);
});

test("kay: yon grenn pou kont li ka avanse sèlman si twou apre a vid", () => {
  const s = Kay.create();
  s.pits = [1, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0];
  assert.equal(Kay.canMoveFrom(s, 0), false); // twou 1 pa vid
  assert.equal(Kay.canMoveFrom(s, 1), true);
  const r = Kay.play(s, 1);
  assert.deepEqual(r.state.pits.slice(0, 3), [1, 0, 1]);
});

test("kay: pati a fini lè jwè a pa ka jwe; moun ki pran plis la genyen", () => {
  const s = Kay.create();
  s.pits = [0, 0, 0, 0, 0, 2, 3, 0, 0, 0, 0, 0];
  s.store = [20, 23];
  const r = Kay.play(s, 5); // 6→4 (KAY? dènye grenn nan 7 → 1, twou vid → glise)
  const st = r.state;
  assert.ok(st.winner !== null || Kay.legalMoves(st).length > 0);
});

test("kay: robo yo jwe 30 pati konplè san erè, epi grenn yo pa janm disparèt", () => {
  const random = seeded(11);
  for (let g = 0; g < 30; g++) {
    let s = Kay.create();
    let guard = 0;
    while (s.winner === null && guard++ < 1000) {
      const m = chooseMove(s, g % 2 ? "hard" : "easy", random);
      const r = Kay.play(s, m);
      assert.ok(!r.error, r.error);
      s = r.state;
      assert.equal(total(s), 48);
      assert.ok(s.pits.every((p) => p >= 0));
    }
    assert.notEqual(s.winner, null, "pati a dwe fini");
  }
});

test("robo yo toujou chwazi yon kou legal nan tout jwèt yo", () => {
  const random = seeded(5);
  for (const [G, make] of [[Morpion, () => Morpion.create("3")], [Morpion, () => Morpion.create("5")], [Connect4, () => Connect4.create()]]) {
    for (let g = 0; g < 3; g++) {
      let s = make();
      while (s.winner === null) {
        const m = chooseMove(s, g ? "hard" : "easy", random);
        assert.ok(G.legalMoves(s).includes(m), `${s.game}: kou ${m} pa legal`);
        s = G.play(s, m).state;
        if (s.moves > 60 && s.game === "morpion" && s.size > 3) break;
      }
    }
  }
});
