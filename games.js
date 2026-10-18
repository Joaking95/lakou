// games.js — Lojik jwèt Trivia a (san rezo, san revèy: sèvè a deside KILÈ pou avanse).
//
// Faz yo:  idle → question → reveal → question → … → over
// Pwen:    bon repons = 500 + jiska 500 bonis pou vitès; move repons = 0.

const QUESTION_MS = 20_000;
const REVEAL_MS = 6_000;
const MIN_COUNT = 3;
const MAX_COUNT = 15;

function shuffle(arr, random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Prepare kesyon yo: chwazi `count`, melanje chwa yo, sonje ki endèks ki bon an.
function pickQuestions(bank, count, random) {
  return shuffle(bank, random).slice(0, count).map((q) => {
    const order = shuffle([0, 1, 2, 3].slice(0, q.choices.length), random);
    return {
      cat: q.cat,
      text: q.text,
      choices: order.map((i) => q.choices[i]),
      correct: order.indexOf(0), // choices[0] nan bank lan se bon repons lan
    };
  });
}

function startGame(room, { bank, count = 7, now, random = Math.random, questionMs = QUESTION_MS, revealMs = REVEAL_MS }) {
  const n = Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.floor(Number(count)) || 7, bank.length));
  const scores = new Map();
  for (const [id, name] of room.members) scores.set(id, { name, score: 0, streak: 0 });
  room.game = {
    type: "trivia",
    phase: "question",
    questions: pickQuestions(bank, n, random),
    index: 0,
    questionMs,
    revealMs,
    deadline: now + questionMs,
    startedAt: now,
    answers: new Map(), // socketId -> { choice, at }
    scores,
    lastResults: [],
  };
  return room.game;
}

function stopGame(room) {
  room.game = null;
}

function answer(room, socketId, choice, now) {
  const g = room.game;
  if (!g) return { error: "Pa gen jwèt k ap jwe." };
  if (g.phase !== "question") return { error: "Tann pwochen kesyon an." };
  if (now > g.deadline) return { error: "Tan an fini!" };
  if (g.answers.has(socketId)) return { error: "Ou deja reponn." };
  const q = g.questions[g.index];
  const c = Number(choice);
  if (!Number.isInteger(c) || c < 0 || c >= q.choices.length) return { error: "Chwa pa valid." };
  g.answers.set(socketId, { choice: c, at: now });
  if (!g.scores.has(socketId)) {
    g.scores.set(socketId, { name: room.members.get(socketId) || "Envite", score: 0, streak: 0 });
  }
  return { allAnswered: everyoneAnswered(room) };
}

function everyoneAnswered(room) {
  const g = room.game;
  if (!g || room.members.size === 0) return false;
  for (const id of room.members.keys()) if (!g.answers.has(id)) return false;
  return true;
}

// Fèmen kesyon an, kalkile pwen yo.
function reveal(room, now) {
  const g = room.game;
  if (!g || g.phase !== "question") return null;
  const q = g.questions[g.index];
  const questionStart = g.deadline - g.questionMs;
  g.lastResults = [];
  for (const [id, s] of g.scores) {
    const a = g.answers.get(id);
    const correct = !!a && a.choice === q.correct;
    let points = 0;
    if (correct) {
      const remaining = Math.max(0, g.deadline - a.at) / g.questionMs;
      points = 500 + Math.round(500 * Math.min(1, remaining));
      s.streak += 1;
    } else {
      s.streak = 0;
    }
    s.score += points;
    if (a) g.lastResults.push({ id, name: s.name, choice: a.choice, correct, points, ms: a.at - questionStart });
  }
  g.phase = "reveal";
  g.deadline = now + g.revealMs;
  return g;
}

// Pase nan pwochen kesyon an, oswa fini jwèt la.
function next(room, now) {
  const g = room.game;
  if (!g || g.phase !== "reveal") return null;
  g.index += 1;
  g.answers = new Map();
  g.lastResults = [];
  if (g.index >= g.questions.length) {
    g.phase = "over";
    g.deadline = null;
  } else {
    g.phase = "question";
    g.deadline = now + g.questionMs;
  }
  return g;
}

function leaderboard(g) {
  return [...g.scores.entries()]
    .map(([id, s]) => ({ id, name: s.name, score: s.score, streak: s.streak }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

// Sa nou voye bay kliyan yo. Pa janm voye bon repons lan pandan faz "question"!
function publicState(room, now) {
  const g = room.game;
  if (!g) return { phase: "idle" };
  const q = g.questions[g.index];
  const base = {
    type: g.type,
    phase: g.phase,
    index: g.index,
    total: g.questions.length,
    remainingMs: g.deadline ? Math.max(0, g.deadline - now) : 0,
    durationMs: g.phase === "reveal" ? g.revealMs : g.questionMs,
    leaderboard: leaderboard(g),
  };
  if (g.phase === "question") {
    return { ...base, question: { cat: q.cat, text: q.text, choices: q.choices }, answeredIds: [...g.answers.keys()] };
  }
  if (g.phase === "reveal") {
    return { ...base, question: { cat: q.cat, text: q.text, choices: q.choices }, correct: q.correct, results: g.lastResults };
  }
  return base; // over
}

module.exports = {
  startGame, stopGame, answer, reveal, next, publicState, everyoneAnswered, leaderboard,
  pickQuestions, QUESTION_MS, REVEAL_MS, MIN_COUNT, MAX_COUNT,
};
