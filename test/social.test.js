// Tès pou Konekte (prezans, chat jeneral), Rire (mi blag), ak lis sal piblik yo.
const test = require("node:test");
const assert = require("node:assert/strict");
const { createSocial, REPORTS_TO_HIDE } = require("../social");
const { createRoomStore } = require("../rooms");

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

test("prezans: hello, non pwòp, bye", () => {
  const s = createSocial();
  assert.equal(s.hello("a", "  Ana  "), "Ana");
  s.hello("b", "Ben");
  assert.deepEqual(s.online().map((u) => u.name), ["Ana", "Ben"]);
  s.hello("a", "Ana Mari"); // chanje non
  assert.equal(s.nameOf("a"), "Ana Mari");
  assert.equal(s.bye("a"), true);
  assert.deepEqual(s.online().map((u) => u.name), ["Ben"]);
});

test("chat jeneral: fòk ou gen non, mesaj vid refize, istorik limite", () => {
  const s = createSocial();
  assert.ok(s.lobbyMessage("x", "alo").error);
  s.hello("a", "Ana");
  assert.ok(s.lobbyMessage("a", "   ").error);
  const { msg } = s.lobbyMessage("a", "Bonjou lakou a!");
  assert.equal(msg.from, "Ana");
  for (let i = 0; i < 80; i++) s.lobbyMessage("a", `m${i}`);
  assert.equal(s.lobbyHistory().length, 60);
  assert.equal(s.lobbyHistory().at(-1).text, "m79");
});

test("blag: poste, ri, retire ri, klasman 'top'", () => {
  const c = clock();
  const s = createSocial({ now: c.now });
  s.hello("a", "Ana"); s.hello("b", "Ben"); s.hello("c", "Cé");
  const j1 = s.postJoke("a", "Premye blag la").joke;
  c.advance(1000);
  const j2 = s.postJoke("b", "Dezyèm blag la").joke;

  assert.deepEqual(s.listJokes("a").map((j) => j.text), ["Dezyèm blag la", "Premye blag la"]); // nouvo anwo
  s.toggleLaugh("b", j1.id);
  s.toggleLaugh("c", j1.id);
  assert.deepEqual(s.listJokes("a", "top").map((j) => [j.text, j.laughs]), [["Premye blag la", 2], ["Dezyèm blag la", 0]]);

  const view = s.listJokes("b").find((j) => j.id === j1.id);
  assert.equal(view.laughedByMe, true);
  assert.equal(view.mine, false);
  assert.equal(s.listJokes("a").find((j) => j.id === j1.id).mine, true);

  assert.equal(s.toggleLaugh("b", j1.id).laughed, false); // klike ankò = retire
  assert.equal(s.publicJoke(j1).laughs, 1);
  assert.equal(j2.laughs.size, 0);
});

test("blag: validasyon", () => {
  const s = createSocial();
  assert.ok(s.postJoke("x", "Blag san non").error);
  s.hello("a", "Ana");
  assert.ok(s.postJoke("a", "ha").error);
  assert.ok(!s.postJoke("a", "Yon bèl blag").error);
  assert.ok(s.postJoke("a", "Yon bèl blag").error); // repete
  assert.equal(s.postJoke("a", "z".repeat(1000)).joke.text.length, 400);
  assert.ok(s.toggleLaugh("a", "pa-egziste").error);
});

test("rapò: blag la kache apre plizyè rapò diferan; otè a pa ka rapòte tèt li", () => {
  const s = createSocial();
  ["a", "b", "c", "d"].forEach((id) => s.hello(id, id.toUpperCase()));
  const j = s.postJoke("a", "Yon blag ki pa bon").joke;
  assert.ok(s.report("a", j.id).error);
  s.report("b", j.id);
  s.report("b", j.id); // menm moun 2 fwa = 1 rapò
  assert.equal(s.listJokes("a").length, 1);
  s.report("c", j.id);
  const r = s.report("d", j.id);
  assert.equal(REPORTS_TO_HIDE, 3);
  assert.equal(r.hidden, true);
  assert.equal(s.listJokes("a").length, 0);
});

test("efase: sèlman otè a", () => {
  const s = createSocial();
  s.hello("a", "Ana"); s.hello("b", "Ben");
  const j = s.postJoke("a", "Blag pou efase").joke;
  assert.ok(s.deleteJoke("b", j.id).error);
  assert.ok(!s.deleteJoke("a", j.id).error);
  assert.equal(s.listJokes("b").length, 0);
});

test("sal piblik: sèlman sal piblik yo parèt, ak bon enfòmasyon", () => {
  const store = createRoomStore();
  const movie = store.createRoom("a", "Ana", { kind: "movie", isPublic: true });
  store.createRoom("b", "Ben", { kind: "game", isPublic: false });
  const game = store.createRoom("c", "Cé", { kind: "game", isPublic: true });
  store.joinRoom(game.code, "d", "Dodo");
  store.setVideo("a", "dQw4w9WgXcQ");

  const list = store.listPublic();
  assert.equal(list.length, 2);
  assert.deepEqual(list[0], { code: game.code, kind: "game", host: "Cé", count: 2, videoId: null, playing: false, gamePhase: "idle" });
  assert.equal(list[1].code, movie.code);
  assert.equal(list[1].videoId, "dQw4w9WgXcQ");
  assert.equal(store.createRoom("e", "E", { kind: "nenpòt" }).kind, "movie");
});
