// Tès pou jwèt Trivia a. Kouri: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const { createRoomStore } = require("../rooms");
const G = require("../games");
const bank = require("../questions");

// Jeneratè "o aza" ki toujou bay menm rezilta (pou tès yo stab)
function seeded(seed = 42) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

function setup() {
  let t = 1_000_000;
  const clock = { now: () => t, advance: (ms) => (t += ms) };
  const store = createRoomStore({ now: clock.now });
  const room = store.createRoom("a", "Ana");
  store.joinRoom(room.code, "b", "Ben");
  const game = G.startGame(room, { bank, count: 3, now: clock.now(), random: seeded() });
  return { clock, store, room, game };
}

test("bank kesyon an valid", () => {
  assert.ok(bank.length >= 15);
  const seen = new Set();
  for (const q of bank) {
    assert.equal(q.choices.length, 4, q.text);
    assert.equal(new Set(q.choices).size, 4, `chwa repete: ${q.text}`);
    assert.ok(!seen.has(q.text), `kesyon repete: ${q.text}`);
    seen.add(q.text);
  }
});

test("pickQuestions melanje chwa yo men kenbe bon repons lan", () => {
  const qs = G.pickQuestions(bank, bank.length, seeded(7));
  for (const q of qs) {
    const original = bank.find((b) => b.text === q.text);
    assert.equal(q.choices[q.correct], original.choices[0]);
  }
  // Omwen kèk kesyon pa dwe gen bon repons lan nan pozisyon 0
  assert.ok(qs.some((q) => q.correct !== 0));
});

test("eta piblik la pa janm devwale bon repons lan pandan kesyon an", () => {
  const { room, clock } = setup();
  const s = G.publicState(room, clock.now());
  assert.equal(s.phase, "question");
  assert.equal(s.correct, undefined);
  assert.equal(JSON.stringify(s).includes('"correct"'), false);
  assert.equal(s.total, 3);
  assert.equal(s.remainingMs, G.QUESTION_MS);
});

test("pwen: bon repons rapid > bon repons lan, move repons = 0", () => {
  const { room, clock, game } = setup();
  const q = game.questions[0];
  const wrong = (q.correct + 1) % 4;
  G.answer(room, "a", q.correct, clock.now()); // imedyatman → 1000
  clock.advance(10_000);
  const r = G.answer(room, "b", wrong, clock.now());
  assert.equal(r.allAnswered, true);
  G.reveal(room, clock.now());
  const lb = G.leaderboard(room.game);
  assert.deepEqual(lb.map((p) => [p.name, p.score]), [["Ana", 1000], ["Ben", 0]]);

  // Kesyon 2: Ben reponn bon nan mitan tan an → 750
  clock.advance(G.REVEAL_MS);
  G.next(room, clock.now());
  clock.advance(10_000);
  G.answer(room, "b", room.game.questions[1].correct, clock.now());
  G.reveal(room, clock.now());
  assert.equal(room.game.scores.get("b").score, 750);
  assert.equal(room.game.scores.get("a").streak, 0); // Ana pa t reponn
});

test("pa ka reponn de fwa, apre tan an, oswa ak yon chwa ki pa valid", () => {
  const { room, clock } = setup();
  assert.ok(G.answer(room, "a", 9, clock.now()).error);
  assert.ok(G.answer(room, "a", "x", clock.now()).error);
  assert.ok(!G.answer(room, "a", 1, clock.now()).error);
  assert.ok(G.answer(room, "a", 2, clock.now()).error);
  clock.advance(G.QUESTION_MS + 1);
  assert.ok(G.answer(room, "b", 1, clock.now()).error);
});

test("tout faz yo jiska fen jwèt la", () => {
  const { room, clock } = setup();
  for (let i = 0; i < 3; i++) {
    assert.equal(room.game.phase, "question");
    assert.equal(room.game.index, i);
    G.reveal(room, clock.now());
    assert.equal(G.publicState(room, clock.now()).phase, "reveal");
    assert.equal(typeof G.publicState(room, clock.now()).correct, "number");
    G.next(room, clock.now());
  }
  assert.equal(room.game.phase, "over");
  assert.equal(G.publicState(room, clock.now()).leaderboard.length, 2);
  // Pa ka reponn apre jwèt la fini
  assert.ok(G.answer(room, "a", 0, clock.now()).error);
});

test("yon moun ki antre nan mitan jwèt la ka jwe, epi snapshot gen eta jwèt la", () => {
  const { room, store, clock } = setup();
  const { room: r } = store.joinRoom(room.code, "c", "Cé");
  assert.equal(store.snapshot(r).game.phase, "question");
  assert.ok(!G.answer(r, "c", 0, clock.now()).error);
  assert.equal(r.game.scores.get("c").name, "Cé");
});

test("si yon moun kite, everyoneAnswered konte sèlman moun ki la", () => {
  const { room, store, clock } = setup();
  G.answer(room, "a", 0, clock.now());
  assert.equal(G.everyoneAnswered(room), false);
  store.leaveRoom("b");
  assert.equal(G.everyoneAnswered(room), true);
});

test("kantite kesyon limite ant MIN ak MAX", () => {
  const { room, clock } = setup();
  assert.equal(G.startGame(room, { bank, count: 1, now: clock.now() }).questions.length, G.MIN_COUNT);
  assert.equal(G.startGame(room, { bank, count: 999, now: clock.now() }).questions.length, G.MAX_COUNT);
  assert.equal(G.startGame(room, { bank, count: "abc", now: clock.now() }).questions.length, 7);
});
