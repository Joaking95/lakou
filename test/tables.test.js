// Tès pou tab jwèt 1v1 yo ak pwofil jwè yo (XP, nivo, seri jou).
const test = require("node:test");
const assert = require("node:assert/strict");
const { createTables } = require("../tables");
const { createPlayers, levelInfo, dayBefore } = require("../players");

const A = { token: "tokenAAAAAAAAAAAAAAA", name: "Ana", avatar: "🦁" };
const B = { token: "tokenBBBBBBBBBBBBBBB", name: "Ben", avatar: "🐸" };
const C = { token: "tokenCCCCCCCCCCCCCCC", name: "Cé", avatar: "🦊" };

test("tab: kreye, antre, jwe tou pa tou, epi genyen", () => {
  const T = createTables();
  const { table } = T.create(A, { game: "morpion", variant: "3", isPublic: true });
  assert.equal(table.status, "waiting");
  assert.equal(T.listOpen().length, 1);
  assert.ok(T.move(A.token, 0).error); // poko gen advèsè
  const j = T.join(table.id.toLowerCase(), B);
  assert.equal(j.started, true);
  assert.equal(T.listOpen().length, 0);
  assert.equal(T.move(B.token, 0).error, "Se pa tou pa w.");
  for (const [who, m] of [[A, 0], [B, 3], [A, 1], [B, 4]]) assert.ok(!T.move(who.token, m).error);
  const r = T.move(A.token, 2);
  assert.equal(r.over, true);
  assert.deepEqual(table.result, { winner: 0, reason: "normal" });
  assert.equal(table.seats[0].wins, 1);
});

test("tab: eta piblik la pa janm gen token yo", () => {
  const T = createTables();
  const { table } = T.create(A, { game: "kay" });
  T.join(table.id, B);
  const json = JSON.stringify(T.publicTable(table));
  assert.ok(!json.includes(A.token) && !json.includes(B.token));
});

test("tab: yon twazyèm moun pa ka antre; jwèt enkoni refize", () => {
  const T = createTables();
  const { table } = T.create(A, { game: "connect4" });
  T.join(table.id, B);
  assert.ok(T.join(table.id, C).error);
  assert.ok(T.create(A, { game: "echèk" }).error);
  assert.equal(T.create(C, { game: "morpion", variant: "99" }).table.variant, "3");
});

test("jwenn advèsè: de moun ki chèche menm jwèt la tonbe ansanm", () => {
  const T = createTables();
  const a = T.quickMatch(A, { game: "kay" });
  assert.equal(a.table.status, "waiting");
  const c = T.quickMatch(C, { game: "morpion", variant: "5" }); // lòt jwèt: pa melanje
  assert.equal(c.table.status, "waiting");
  const b = T.quickMatch(B, { game: "kay" });
  assert.equal(b.table, a.table);
  assert.equal(b.table.status, "playing");
});

test("kite pandan pati a: lòt la genyen pa fòfè; tab k ap tann efase", () => {
  const T = createTables();
  const { table } = T.create(A, { game: "morpion" });
  T.join(table.id, B);
  const r = T.leave(A.token);
  assert.equal(r.forfeit, true);
  assert.deepEqual(table.result, { winner: 1, reason: "forfeit" });
  assert.ok(T.rematch(B.token).error); // advèsè a ale
  T.leave(B.token);
  assert.equal(T.size, 0);
  const w = T.create(C, { game: "kay" });
  T.leave(C.token);
  assert.equal(T.get(w.table.id), null);
});

test("dekoneksyon: moun nan ka retounen; si l pa retounen, li pèdi", () => {
  const T = createTables();
  const { table } = T.create(A, { game: "connect4" });
  T.join(table.id, B);
  T.setConnected(A.token, false);
  assert.equal(T.publicTable(table).seats[0].connected, false);
  const back = T.join(table.id, A);
  assert.equal(back.rejoined, true);
  assert.equal(T.forfeitIfAway(A.token), null); // li la: pa gen fòfè
  T.setConnected(B.token, false);
  const f = T.forfeitIfAway(B.token);
  assert.equal(f.forfeit, true);
  assert.equal(table.result.winner, 0);
});

test("revanj: tou de dwe mande, epi yo chanje plas", () => {
  const T = createTables();
  const { table } = T.create(A, { game: "morpion" });
  T.join(table.id, B);
  assert.ok(T.rematch(A.token).error); // poko fini
  for (const [who, m] of [[A, 0], [B, 3], [A, 1], [B, 4], [A, 2]]) T.move(who.token, m);
  assert.equal(T.rematch(A.token).restarted, undefined);
  assert.deepEqual(T.publicTable(table).rematch, [true, false]);
  assert.equal(T.rematch(B.token).restarted, true);
  assert.equal(table.seats[0].name, "Ben"); // Ben kòmanse kounye a
  assert.equal(table.round, 2);
  assert.equal(table.seats[1].wins, 1); // viktwa Ana a swiv li
});

test("defi prive: sèlman moun ki envite a ka antre", () => {
  const T = createTables();
  const { table } = T.create(A, { game: "kay", invite: B.token });
  assert.equal(T.listOpen().length, 0);
  assert.ok(T.join(table.id, C).error);
  assert.equal(T.join(table.id, B).started, true);
});

test("Kay sou yon tab: sèvè a valide kou yo", () => {
  const T = createTables();
  const { table } = T.create(A, { game: "kay" });
  T.join(table.id, B);
  assert.ok(T.move(A.token, 7).error); // se pa twou pa l
  assert.ok(!T.move(A.token, 0).error);
  assert.equal(table.state.turn, 1);
});

// ---------- Pwofil / XP ----------
test("nivo: 0→N1, 100→N2, 300→N3, 1000→N5", () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2);
  assert.equal(levelInfo(300).level, 3);
  assert.equal(levelInfo(1000).level, 5);
  assert.equal(levelInfo(1000).title, "Zanmi lakou");
  assert.ok(levelInfo(150).progress > 0.2 && levelInfo(150).progress < 0.3);
});

test("pwofil: token valid sèlman, avatar otorize sèlman", () => {
  const P = createPlayers();
  assert.equal(P.ensure("kout", { name: "X" }), null);
  const p = P.ensure(A.token, { name: "Ana", avatar: "💣" });
  assert.equal(p.avatar, "😎");
  P.ensure(A.token, { avatar: "🦁" });
  assert.equal(P.get(A.token).avatar, "🦁");
});

test("XP: viktwa, nivo monte, klasman", () => {
  const P = createPlayers();
  P.ensure(A.token, { name: "Ana" });
  P.ensure(B.token, { name: "Ben" });
  for (let i = 0; i < 3; i++) P.recordResult(A.token, "win");
  const r = P.recordResult(A.token, "win"); // 120 XP → N2
  assert.equal(r.leveledUp, true);
  P.recordResult(B.token, "loss");
  assert.deepEqual(P.leaderboard().map((x) => [x.name, x.xp]), [["Ana", 120], ["Ben", 5]]);
  assert.equal(P.publicStats(P.get(A.token)).wins, 4);
});

test("bonis chak jou ak seri jou (streak)", () => {
  const P = createPlayers();
  P.ensure(A.token, { name: "Ana" });
  assert.equal(dayBefore("2026-03-01"), "2026-02-28");
  assert.equal(P.daily(A.token, "2026-10-18").bonus, 20);
  assert.equal(P.daily(A.token, "2026-10-18").bonus, 0); // menm jou: pa gen bonis
  const d2 = P.daily(A.token, "2026-10-19");
  assert.equal(d2.streak, 2);
  assert.equal(d2.bonus, 25);
  assert.equal(P.daily(A.token, "2026-10-25").streak, 1); // li te sote jou → rekòmanse
  assert.equal(P.daily(A.token, "pa-yon-dat").bonus, 0);
});

test("pwogrè kliyan an reprann apre sèvè a rekòmanse, avèk limit", () => {
  const P = createPlayers();
  const p = P.ensure(A.token, { name: "Ana", cached: { xp: 450, wins: 7, streak: 3, lastDaily: "2026-10-18" } });
  assert.equal(p.xp, 450);
  assert.equal(p.streak, 3);
  const cheat = P.ensure(B.token, { name: "Ben", cached: { xp: 1e12, wins: -5 } });
  assert.equal(cheat.xp, 1_000_000);
  assert.equal(cheat.wins, 0);
  // Si jwè a deja egziste sou sèvè a, nou pa kwè cache a
  P.ensure(A.token, { cached: { xp: 99999 } });
  assert.equal(P.get(A.token).xp, 450);
});
