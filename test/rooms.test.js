// Tès pou lojik sal yo. Kouri: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const { createRoomStore, parseVideoId, cleanName } = require("../rooms");

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

test("parseVideoId aksepte plizyè fòma lyen YouTube", () => {
  const id = "dQw4w9WgXcQ";
  assert.equal(parseVideoId(id), id);
  assert.equal(parseVideoId(`https://www.youtube.com/watch?v=${id}`), id);
  assert.equal(parseVideoId(`https://www.youtube.com/watch?feature=share&v=${id}&t=30`), id);
  assert.equal(parseVideoId(`https://youtu.be/${id}?si=abc`), id);
  assert.equal(parseVideoId(`https://www.youtube.com/embed/${id}`), id);
  assert.equal(parseVideoId(`https://youtube.com/shorts/${id}`), id);
  assert.equal(parseVideoId("https://example.com/video"), null);
  assert.equal(parseVideoId("<script>"), null);
  assert.equal(parseVideoId(""), null);
});

test("cleanName koupe non ki twò long epi mete yon non pa defo", () => {
  assert.equal(cleanName("   "), "Envite");
  assert.equal(cleanName("  Ti   Jak  "), "Ti Jak");
  assert.equal(cleanName("x".repeat(100)).length, 24);
});

test("kreye ak antre nan yon sal", () => {
  const s = createRoomStore();
  const room = s.createRoom("a", "Ana");
  assert.match(room.code, /^[A-Z2-9]{6}$/);
  assert.equal(room.hostId, "a");
  const { room: r2 } = s.joinRoom(room.code.toLowerCase(), "b", "Ben"); // kòd an miniskil mache
  assert.equal(r2, room);
  assert.deepEqual(s.snapshot(room).members.map((m) => m.name), ["Ana", "Ben"]);
  assert.ok(s.joinRoom("ZZZZZZ", "c", "Cé").error);
});

test("se sèlman host la ki ka chanje fim nan", () => {
  const s = createRoomStore();
  const room = s.createRoom("a", "Ana");
  s.joinRoom(room.code, "b", "Ben");
  assert.ok(s.setVideo("b", "dQw4w9WgXcQ").error);
  assert.ok(s.setVideo("a", "pa yon lyen").error);
  assert.ok(!s.setVideo("a", "https://youtu.be/dQw4w9WgXcQ").error);
  assert.equal(room.playback.videoId, "dQw4w9WgXcQ");
  assert.equal(room.playback.playing, false);
});

test("pozisyon videyo a avanse ak tan lè l ap jwe, epi rete fikse lè l poze", () => {
  const c = clock();
  const s = createRoomStore({ now: c.now });
  const room = s.createRoom("a", "Ana");
  s.joinRoom(room.code, "b", "Ben");
  s.setVideo("a", "dQw4w9WgXcQ");

  assert.ok(s.updatePlayback("b", { action: "play", time: 10 }).room); // envite ka play
  c.advance(30_000);
  assert.equal(s.currentTime(room), 40);

  s.updatePlayback("a", { action: "pause", time: 40 });
  c.advance(60_000);
  assert.equal(s.currentTime(room), 40);

  s.updatePlayback("a", { action: "seek", time: 120 });
  assert.equal(s.currentTime(room), 120);
  assert.equal(room.playback.playing, false);
});

test("yon moun ki antre an reta resevwa bon pozisyon an", () => {
  const c = clock();
  const s = createRoomStore({ now: c.now });
  const room = s.createRoom("a", "Ana");
  s.setVideo("a", "dQw4w9WgXcQ");
  s.updatePlayback("a", { action: "play", time: 0 });
  c.advance(95_500);
  const { room: r } = s.joinRoom(room.code, "late", "Reta");
  const snap = s.snapshot(r);
  assert.equal(snap.playing, true);
  assert.equal(snap.time, 95.5);
});

test("playback refize done ki pa valid", () => {
  const s = createRoomStore();
  const room = s.createRoom("a", "Ana");
  assert.ok(s.updatePlayback("a", { action: "play", time: 0 }).error); // pa gen fim
  s.setVideo("a", "dQw4w9WgXcQ");
  assert.ok(s.updatePlayback("a", { action: "play", time: -5 }).error);
  assert.ok(s.updatePlayback("a", { action: "play", time: "abc" }).error);
  assert.ok(s.updatePlayback("a", { action: "delete", time: 1 }).error);
  assert.ok(s.updatePlayback("x", { action: "play", time: 1 }).error); // pa nan sal la
  assert.equal(room.playback.playing, false);
});

test("lè host la kite, moun ki te la pi lontan an vin host; sal vid efase", () => {
  const s = createRoomStore();
  const room = s.createRoom("a", "Ana");
  s.joinRoom(room.code, "b", "Ben");
  s.joinRoom(room.code, "c", "Cé");
  const r1 = s.leaveRoom("a");
  assert.equal(r1.newHostId, "b");
  assert.equal(room.hostId, "b");
  assert.equal(s.leaveRoom("c").newHostId, null);
  const r3 = s.leaveRoom("b");
  assert.equal(r3.deleted, true);
  assert.equal(s.size, 0);
  assert.equal(s.leaveRoom("b"), null);
});

test("chanje sal kite ansyen sal la", () => {
  const s = createRoomStore();
  const r1 = s.createRoom("a", "Ana");
  const r2 = s.createRoom("b", "Ben");
  s.joinRoom(r1.code, "c", "Cé");
  s.joinRoom(r2.code, "c", "Cé");
  assert.equal(r1.members.has("c"), false);
  assert.equal(r2.members.has("c"), true);
});

test("chat: limit longè, mesaj vid refize, istorik limite a 50", () => {
  const s = createRoomStore();
  const room = s.createRoom("a", "Ana");
  assert.ok(s.addMessage("a", "   ").error);
  const { msg } = s.addMessage("a", "y".repeat(1000));
  assert.equal(msg.text.length, 300);
  assert.equal(msg.from, "Ana");
  for (let i = 0; i < 60; i++) s.addMessage("a", `m${i}`);
  assert.equal(room.history.length, 50);
  assert.equal(room.history.at(-1).text, "m59");
});

test("reyaksyon: sèlman emoji ki otorize yo", () => {
  const s = createRoomStore();
  s.createRoom("a", "Ana");
  assert.equal(s.react("a", "😂").reaction.emoji, "😂");
  assert.ok(s.react("a", "<img src=x>").error);
});
