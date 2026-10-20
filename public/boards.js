// boards.js — Jwèt 1 kont 1: Mòpyon, Kay, Kat Aliyen.
// Mòd "bot": pati a jwe sou aparèy la kont Robo Lakou (pa bezwen sèvè).
// Mòd "online": pati a jwe sou sèvè a kont yon lòt moun.
(() => {
  const G = window.LakouGames;
  const Fx = window.LakouFx;
  const RULES = { morpion: G.morpion, connect4: G.connect4, kay: G.kay };

  const GAMES = {
    morpion: {
      title: "Mòpyon", icon: "✕◯", color: "c-red",
      desc: "Aliyen ✕ oswa ◯ ou yo anvan advèsè a. Ti mòpyon 3×3, oswa gwo mòpyon 5 aliyen.",
      variants: [["3", "3×3"], ["5", "5 aliyen"]],
      rules: `
        <p><b>Objektif:</b> se premye moun ki aliyen grenn li yo.</p>
        <ul>
          <li><b>Ti mòpyon (3×3):</b> aliyen <b>3</b> ✕ oswa ◯, sou yon liy, yon kolòn, oswa yon dyagonal.</li>
          <li><b>Gwo mòpyon (15×15):</b> aliyen <b>5</b>. Kontwole mitan an, epi bloke advèsè a lè l gen 3 oswa 4!</li>
          <li>✕ toujou kòmanse. Nan revanj la, se lòt moun nan ki kòmanse.</li>
          <li>Si griy la plen san pèsonn pa aliyen, se match nil.</li>
        </ul>`,
    },
    kay: {
      title: "Kay (Toukay)", icon: "🫘", color: "c-gold",
      desc: "Jwèt grenn ayisyen an: simen grenn ou yo epi rele «KAY!» lè w fè 4.",
      variants: [],
      rules: `
        <p><b>Tablo a:</b> 2 ranje 6 twou, 4 grenn nan chak twou. Ranje <b>anba a se pa w</b>. Grenn yo vire kont sans zegwi mont: anba a goch → dwat, anlè a dwat → goch.</p>
        <ul>
          <li><b>Jwe:</b> klike sou yon twou pa w ki gen <b>omwen 2 grenn</b>. Ou simen yo youn pa youn nan twou ki vin apre yo.</li>
          <li><b>Yon grenn pou kont li</b> ka avanse sèlman si twou ki vin apre a vid.</li>
          <li><b>KAY!</b> Si dènye grenn ou tonbe lakay advèsè a epi li fè twou a gen <b>4 grenn</b>, ou pran yo. Ou pran tou twou advèsè ki vin anvan yo ki gen 4 grenn, san kase.</li>
          <li>Si dènye grenn nan tonbe nan yon twou <b>ki te gen grenn deja</b>: si twou apre a vid, tou w fini. Sinon, ou ranmase tout grenn yo epi ou kontinye simen.</li>
          <li>Si dènye grenn nan tonbe nan yon <b>twou vid</b>, li glise nan pwochen twou ki gen grenn, epi tou w fini.</li>
          <li><b>Fen:</b> lè yon jwè pa ka jwe ankò. Moun ki pran plis grenn nan genyen.</li>
          <li class="fine">Règ Lakou: si 80 kou pase san pèsonn pa pran, pati a fini, epi chak moun konte grenn ki sou bò pa l tou.</li>
        </ul>`,
    },
    connect4: {
      title: "Kat Aliyen", icon: "🔴", color: "c-teal",
      desc: "Lage grenn ou nan yon kolòn. Premye moun ki aliyen 4 genyen.",
      variants: [],
      rules: `
        <p><b>Objektif:</b> aliyen <b>4 grenn</b> koulè pa w: orizontal, vètikal, oswa an dyagonal.</p>
        <ul>
          <li>Klike sou yon kolòn: grenn nan tonbe jiska anba.</li>
          <li>🔴 Wouj toujou kòmanse. Nan revanj la, se lòt moun nan ki kòmanse.</li>
          <li>Konsèy: kolòn nan mitan an se pi bon kolòn nan!</li>
        </ul>`,
    },
  };

  const EMOTES = ["😂", "🔥", "😱", "👏", "😤", "🤝", "🙏", "😎"];
  const LEVELS = [["easy", "Fasil"], ["hard", "Fò"]];

  let api = null; // fonksyon app.js ban nou
  let mode = null; // null | "bot" | "online"
  let table = null; // tab k ap jwe a (fòm piblik)
  let shown = null; // eta k ap parèt sou ekran an (pou animasyon Kay)
  let animating = false;
  let animToken = 0;
  let botTimer = null;

  const store = {
    get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const pref = (game, key, d) => store.get(`lakou:${game}:${key}`, d);
  const setPref = (game, key, v) => store.set(`lakou:${game}:${key}`, v);

  const $ = (id) => document.getElementById(id);
  const el = (...a) => api.el(...a);

  function labelOf(game, variant) {
    if (game === "morpion") return variant === "5" ? "Gwo mòpyon (5 aliyen)" : "Ti mòpyon 3×3";
    return GAMES[game].title;
  }

  // ================= Kat jwèt yo (onglè Jwèt) =================
  function seg(options, value, onPick, label) {
    return el("div", { class: "seg", role: "group", "aria-label": label },
      options.map(([v, text]) => el("button", {
        class: v === value ? "on" : "", "aria-pressed": String(v === value), type: "button",
        onclick: () => { Fx.sound("click"); onPick(v); },
      }, text)));
  }

  function renderArcade() {
    const box = $("arcade");
    box.replaceChildren(...Object.entries(GAMES).map(([key, g]) => {
      const variant = pref(key, "variant", g.variants[0] ? g.variants[0][0] : "");
      const level = pref("bot", "level", "easy");
      return el("article", { class: `arcade-card ${g.color}` },
        el("div", { class: "ac-top" },
          el("span", { class: "ac-icon", "aria-hidden": "true" }, g.icon),
          el("div", { class: "ac-text" }, el("strong", {}, g.title), el("span", {}, g.desc)),
          el("button", { class: "icon-btn", title: "Règ yo", "aria-label": `Règ ${g.title}`, onclick: () => showRules(key) }, "❓")),
        g.variants.length ? seg(g.variants, variant, (v) => { setPref(key, "variant", v); renderArcade(); }, "Varyant") : null,
        el("div", { class: "ac-row" },
          el("button", { class: "btn primary", onclick: () => startBot(key, variant, pref("bot", "level", "easy")) }, "🤖 Kont Robo"),
          seg(LEVELS, level, (v) => { setPref("bot", "level", v); renderArcade(); }, "Nivo robo a")),
        el("div", { class: "ac-row" },
          el("button", { class: "btn", onclick: () => quickMatch(key, variant) }, "⚡ Jwenn yon advèsè"),
          el("button", { class: "btn ghost", onclick: () => createPrivate(key, variant) }, "🔗 Envite yon zanmi")));
    }));
  }

  function renderQuickRow() {
    const box = $("quick-row");
    const items = [
      ["🤖", "Mòpyon kont Robo", "3×3 · 1 minit", () => startBot("morpion", "3", pref("bot", "level", "easy"))],
      ["⚡", "Kay ak yon moun", "Jwèt grenn ayisyen an", () => quickMatch("kay", "")],
      ["🔴", "Kat Aliyen kont Robo", "Aliyen 4", () => startBot("connect4", "", pref("bot", "level", "easy"))],
      ["🧠", "Trivia an gwoup", "Kilti ayisyen", () => api.showView("games")],
    ];
    box.replaceChildren(...items.map(([icon, title, sub, fn]) =>
      el("button", { class: "quick", onclick: () => { Fx.sound("click"); fn(); } },
        el("span", { class: "qk-icon" }, icon), el("span", { class: "qk-text" }, el("b", {}, title), el("small", {}, sub)))));
  }

  function renderOpenTables(list) {
    const box = $("open-tables");
    const items = (list || []).filter((t) => !(table && table.id === t.id));
    if (!items.length) {
      box.replaceChildren(el("p", { class: "empty" }, "Pèsonn p ap tann kounye a. Klike «⚡ Jwenn yon advèsè» pou se ou ki premye a!"));
      return;
    }
    box.replaceChildren(...items.map((t) => el("button", { class: "room-card", onclick: () => joinTable(t.id) },
      el("div", { class: "thumb" }, el("span", { class: "thumb-emoji" }, t.host.avatar || "😎")),
      el("div", { class: "room-meta" }, el("strong", {}, t.host.name), el("span", {}, `${GAMES[t.game].icon} ${t.label}`), el("span", { class: "fine" }, "ap tann yon advèsè")),
      el("span", { class: "go" }, "Jwe →"))));
  }

  function showRules(game) {
    $("rules-title").textContent = `Règ ${GAMES[game].title}`;
    $("rules-body").innerHTML = GAMES[game].rules; // kontni fiks nou ekri, pa soti nan itilizatè
    $("dlg-rules").showModal();
  }

  // ================= Kòmanse yon pati =================
  function startBot(game, variant, level) {
    leaveCurrent(true);
    const me = api.me();
    mode = "bot";
    table = {
      id: null, game, variant, label: labelOf(game, variant), status: "playing", round: 1, bot: true, level,
      seats: [{ name: me.name, avatar: me.avatar, wins: 0, connected: true }, { name: "Robo Lakou", avatar: "🤖", wins: 0, connected: true, botLevel: level }],
      you: 0, state: RULES[game].create(variant), result: null, rematch: [false, false],
    };
    shown = table.state;
    openTableView();
  }

  async function quickMatch(game, variant) {
    const res = await api.emit("table:quick", { game, variant });
    if (res.error) return api.toast(res.error);
    enterOnline(res.table);
    if (res.table.status === "waiting") api.toast("N ap chèche yon advèsè… Pandan w ap tann, ou ka voye lyen an bay yon zanmi.");
  }

  async function createPrivate(game, variant) {
    const res = await api.emit("table:create", { game, variant, isPublic: false });
    if (res.error) return api.toast(res.error);
    enterOnline(res.table);
  }

  async function joinTable(id) {
    const res = await api.emit("table:join", { id });
    if (res.error) { api.toast(res.error); return false; }
    enterOnline(res.table);
    return true;
  }

  function enterOnline(t) {
    if (mode === "bot") stopBot();
    mode = "online";
    table = null;
    shown = null;
    setTable(t);
    openTableView();
  }

  function openTableView() {
    $("nav-table").hidden = false;
    renderTable();
    api.showView("table");
  }

  function stopBot() {
    clearTimeout(botTimer);
    botTimer = null;
  }

  // silent = pa chanje paj (pa egzanp lè n ap kòmanse yon lòt pati)
  // Tout netwayaj lokal la fèt touswit (anvan nenpòt await), pou l pa efase yon pati
  // ki ta kòmanse pandan n ap tann sèvè a reponn.
  function leaveCurrent(silent) {
    const wasOnline = mode === "online";
    animToken++;
    animating = false;
    stopBot();
    mode = null;
    table = null;
    shown = null;
    $("nav-table").hidden = true;
    $("turn-badge").hidden = true;
    history.replaceState(null, "", location.pathname);
    if (!silent) api.showView("games");
    return wasOnline ? api.emit("table:leave") : Promise.resolve();
  }

  // ================= Resevwa eta tab la (online) =================
  function setTable(t) {
    const prev = table;
    const prevState = prev && prev.id === t.id ? prev.state : null;
    table = t;
    if (t.status === "waiting") history.replaceState(null, "", `?table=${t.id}`);
    // Anime kou Kay la si nou te konnen eta anvan an
    if (t.game === "kay" && prevState && t.state.moves === prevState.moves + 1 && t.state.steps && t.state.steps.length) {
      animateKay(prevState, t.state, () => afterUpdate(prev));
    } else {
      shown = t.state;
      afterUpdate(prev);
    }
  }

  function afterUpdate(prev) {
    renderTable();
    if (!table) return;
    const s = table.state;
    const wasOver = prev && prev.status === "over" && prev.round === table.round;
    if (table.status === "over" && !wasOver) celebrate();
    else if (table.status === "playing" && s.turn === table.you && s.winner === null) {
      const wasMyTurn = prev && prev.status === "playing" && prev.state.turn === prev.you && prev.round === table.round && prev.state.moves === s.moves;
      if (!wasMyTurn) notifyTurn();
    } else if (prev && prev.state && s.moves > prev.state.moves && table.game !== "kay") Fx.sound("move");
  }

  function notifyTurn() {
    Fx.sound("turn");
    if (api.currentView() !== "table") $("turn-badge").hidden = false;
    api.flashTitle("🎲 Se tou pa w!");
  }

  function celebrate() {
    const r = table.result || {};
    if (r.winner === table.you) { Fx.sound("win"); Fx.confetti(); }
    else if (r.winner === "draw") Fx.sound("move");
    else Fx.sound("lose");
    if (mode === "bot") {
      const result = r.winner === table.you ? "win" : r.winner === "draw" ? "draw" : "loss";
      api.emit("stats:bot", { game: table.game, result, level: table.level });
    }
  }

  // ================= Jwe yon kou =================
  async function play(move) {
    if (!table || animating) return;
    const s = table.state;
    if (table.status !== "playing" || s.turn !== table.you || s.winner !== null) return;
    const r = RULES[table.game].play(s, move);
    if (r.error) { Fx.sound("click"); return api.toast(r.error); }

    if (mode === "bot") return applyLocal(r.state);

    // Online: montre kou a touswit, sèvè a ap konfime.
    const res = await api.emit("table:move", { move });
    if (res.error) { api.toast(res.error); renderTable(); }
  }

  function applyLocal(next) {
    const prev = { ...table, state: table.state };
    const prevState = table.state;
    table.state = next;
    if (next.winner !== null) {
      table.status = "over";
      table.result = { winner: next.winner, reason: "normal" };
      if (next.winner === 0 || next.winner === 1) table.seats[next.winner].wins += 1;
    }
    const done = () => {
      shown = next;
      renderTable();
      if (table.status === "over") celebrate();
      else if (next.turn !== table.you) scheduleBot();
      else if (prev.state.turn !== table.you) Fx.sound("turn");
    };
    if (table.game === "kay") animateKay(prevState, next, done);
    else { Fx.sound("move"); done(); }
  }

  function scheduleBot() {
    stopBot();
    renderTable();
    botTimer = setTimeout(() => {
      botTimer = null;
      if (mode !== "bot" || !table || table.state.winner !== null) return;
      const move = G.bots.chooseMove(table.state, table.level);
      const r = RULES[table.game].play(table.state, move);
      if (!r.error) applyLocal(r.state);
    }, 450 + Math.random() * 500);
  }

  async function rematch() {
    if (mode === "bot") {
      const t = table;
      t.round += 1;
      t.seats.reverse(); // lòt moun nan kòmanse
      t.you = t.seats[0].botLevel ? 1 : 0;
      t.state = RULES[t.game].create(t.variant);
      t.status = "playing";
      t.result = null;
      shown = t.state;
      renderTable();
      if (t.state.turn !== t.you) scheduleBot();
      return;
    }
    const res = await api.emit("table:rematch");
    if (res.error) api.toast(res.error);
  }

  // ================= Animasyon Kay =================
  function animateKay(from, to, done) {
    const my = ++animToken;
    animating = true;
    const pits = from.pits.slice();
    const store = from.store.slice();
    const steps = to.steps || [];
    const drops = steps.filter((x) => x.t === "drop").length;
    const delay = Math.max(45, Math.min(150, 2600 / Math.max(1, drops)));
    let k = 0;
    shown = { ...to, pits, store, _hl: null };
    const tick = () => {
      if (my !== animToken) return;
      if (k >= steps.length) {
        animating = false;
        shown = to;
        done();
        return;
      }
      const st = steps[k++];
      let wait = delay;
      if (st.t === "pick") { pits[st.i] = 0; shown._hl = st.i; wait = delay * 1.5; }
      else if (st.t === "drop") { pits[st.i] += 1; shown._hl = st.i; Fx.sound("seed"); }
      else if (st.t === "slide") { pits[st.from] -= 1; pits[st.to] += 1; shown._hl = st.to; }
      else if (st.t === "capture") {
        for (const h of st.holes) pits[h] = 0;
        store[st.by] += st.total;
        shown._hl = null;
        shown._kay = st.holes;
        Fx.sound("kay");
        flashKay(st.total);
        wait = 900;
      }
      renderBoard();
      setTimeout(tick, wait);
    };
    renderTable();
    tick();
  }

  function flashKay(total) {
    const layer = $("emote-layer");
    const b = el("div", { class: "kay-flash" }, "KAY! ", el("small", {}, `+${total} grenn`));
    layer.append(b);
    setTimeout(() => b.remove(), 1400);
  }

  // ================= Desen tab la =================
  function seatText(i) {
    const g = table.game;
    if (g === "morpion") return i === 0 ? "✕" : "◯";
    if (g === "connect4") return i === 0 ? "🔴" : "🟡";
    return "";
  }

  function renderTable() {
    if (!table) return;
    const t = table;
    const s = t.state;
    const me = t.you;
    $("table-title").textContent = `${GAMES[t.game].icon} ${t.label}${t.round > 1 ? ` · Pati ${t.round}` : ""}`;

    // Jwè yo
    const chip = (i) => {
      const p = t.seats[i];
      if (!p) return el("div", { class: "pchip empty" }, el("span", { class: "pc-av" }, "❔"), el("span", {}, "N ap tann…"));
      const active = t.status === "playing" && s.turn === i && s.winner === null;
      const score = t.game === "kay" ? el("b", { class: "pc-score", title: "Grenn ou pran" }, `${(shown || s).store[i]} 🫘`) : el("b", { class: "pc-sym" }, seatText(i));
      return el("div", { class: `pchip ${active ? "active" : ""} ${i === me ? "me" : ""} ${p.connected === false ? "away" : ""}`, "data-seat": String(i) },
        el("span", { class: "pc-av" }, p.avatar || "😎"),
        el("span", { class: "pc-name" }, p.name + (i === me ? " (ou)" : ""), el("small", {}, p.connected === false ? "dekonekte…" : t.rematch && t.rematch[i] ? "vle revanj ✓" : `${p.wins || 0} viktwa`)),
        score);
    };
    const vs = el("span", { class: "vs" }, "VS");
    const order = me === 1 ? [1, 0] : [0, 1]; // ou menm toujou agoch
    $("players-bar").replaceChildren(chip(order[0]), vs, chip(order[1]));

    // Estati
    let status = "";
    let cls = "";
    if (t.status === "waiting") {
      status = t.invited ? "⏳ N ap tann zanmi w aksepte defi a…" : "⏳ N ap tann yon advèsè…";
    } else if (t.status === "playing") {
      const other = t.seats[1 - me];
      if (animating) status = "…";
      else if (s.turn === me) { status = "👉 Se tou pa w!"; cls = "mine"; }
      else status = mode === "bot" ? "🤖 Robo a ap reflechi…" : `⏳ Se tou ${other ? other.name : "advèsè a"}…`;
      if (t.game === "kay" && s.turn === me && !animating) status += " Chwazi yon twou anba a.";
    } else if (t.status === "over") {
      const r = t.result || {};
      if (r.winner === "draw") status = "🤝 Match nil!";
      else if (r.winner === me) { status = r.reason === "forfeit" ? "🏆 Ou genyen: advèsè a kite pati a." : "🏆 Ou genyen! Bravo!"; cls = "win"; }
      else status = "😅 Ou pèdi pati sa a. Pran revanj ou!";
      if (t.game === "kay" && s.final) status += ` (${s.final[me]} kont ${s.final[1 - me]})`;
    }
    $("table-status").textContent = status;
    $("table-status").className = `table-status ${cls}`;

    // Lyen envitasyon
    const showInvite = mode === "online" && t.status === "waiting" && !t.invited;
    $("invite-box").hidden = !showInvite;
    if (showInvite) $("invite-link").value = `${location.origin}${location.pathname}?table=${t.id}`;

    // Bouton aksyon
    const actions = [];
    if (t.status === "over") {
      const asked = t.rematch && t.rematch[me];
      actions.push(el("button", { class: "btn primary", disabled: !!asked, onclick: rematch }, asked ? "⏳ N ap tann advèsè a…" : "🔁 Revanj"));
      if (mode === "bot") actions.push(el("button", { class: "btn", onclick: () => startBot(t.game, t.variant, t.level === "easy" ? "hard" : "easy") }, t.level === "easy" ? "💪 Eseye nivo Fò" : "🙂 Eseye nivo Fasil"));
    }
    actions.push(el("button", { class: "btn ghost", onclick: () => leaveCurrent(false) },
      t.status === "playing" && mode === "online" ? "🏳️ Abandone" : "Kite tab la"));
    $("table-actions").replaceChildren(...actions);

    // Reyaksyon (sèlman ak yon moun)
    $("emote-bar").hidden = mode !== "online" || t.status === "waiting";
    if (!$("emote-bar").children.length) {
      $("emote-bar").append(...EMOTES.map((e) => el("button", { onclick: () => sendEmote(e), "aria-label": `Voye ${e}` }, e)));
    }

    renderBoard();
  }

  function canPlay() {
    return table && table.status === "playing" && table.state.turn === table.you && table.state.winner === null && !animating && !botTimer;
  }

  function renderBoard() {
    const board = $("board");
    if (!table) return board.replaceChildren();
    const s = shown || table.state;
    board.className = `board b-${table.game}${table.game === "morpion" ? " size-" + s.size : ""}`;
    if (table.game === "morpion") return renderMorpion(board, s);
    if (table.game === "connect4") return renderConnect4(board, s);
    return renderKay(board, s);
  }

  function renderMorpion(board, s) {
    const mine = canPlay();
    const line = new Set(s.line || []);
    board.style.setProperty("--n", s.size);
    board.replaceChildren(...s.cells.map((c, i) => el("button", {
      class: `cell ${c === 0 ? "x" : c === 1 ? "o" : ""} ${s.last === i ? "last" : ""} ${line.has(i) ? "win" : ""}`,
      disabled: !mine || c !== null,
      "aria-label": `Kaz ${Math.floor(i / s.size) + 1}-${(i % s.size) + 1}${c === 0 ? " ✕" : c === 1 ? " ◯" : ""}`,
      onclick: () => play(i),
    }, c === 0 ? "✕" : c === 1 ? "◯" : "")));
  }

  function renderConnect4(board, s) {
    const C = G.connect4;
    const mine = canPlay();
    const line = new Set(s.line || []);
    const cols = [];
    for (let c = 0; c < C.COLS; c++) {
      const cells = [];
      for (let r = 0; r < C.ROWS; r++) {
        const i = r * C.COLS + c;
        const v = s.cells[i];
        cells.push(el("span", {
          class: `disc ${v === 0 ? "red" : v === 1 ? "yellow" : ""} ${s.last === i ? "drop" : ""} ${line.has(i) ? "win" : ""}`,
          style: s.last === i ? `--from:${-(r + 1) * 100}%` : "",
        }));
      }
      cols.push(el("button", {
        class: "col", disabled: !mine || s.cells[c] !== null, "aria-label": `Kolòn ${c + 1}`, onclick: () => play(c),
      }, ...cells));
    }
    board.replaceChildren(...cols);
  }

  function renderKay(board, s) {
    const me = table.you;
    const mine = canPlay();
    const legal = new Set(mine ? G.kay.legalMoves(table.state) : []);
    const kayHoles = new Set(s._kay || []);
    // Ranje anba = pa m (de goch a dwat nan lòd simen an); anlè = advèsè a (de dwat a goch)
    const bottom = me === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
    const top = me === 0 ? [11, 10, 9, 8, 7, 6] : [5, 4, 3, 2, 1, 0];
    const pit = (i) => {
      const n = s.pits[i];
      const seeds = [];
      for (let k = 0; k < Math.min(n, 12); k++) seeds.push(el("i", { class: "seed", style: `--k:${k}` }));
      return el("button", {
        class: `pit ${legal.has(i) ? "legal" : ""} ${s._hl === i ? "hl" : ""} ${kayHoles.has(i) ? "kayed" : ""} ${table.state.lastFrom === i && !animating ? "from" : ""}`,
        disabled: !legal.has(i), "aria-label": `Twou ${i + 1}: ${n} grenn`, onclick: () => play(i),
      }, el("span", { class: "seeds" }, ...seeds), el("b", { class: "count" }, String(n)));
    };
    const storeBox = (who, label) => el("div", { class: `store ${who === me ? "mine" : ""}` },
      el("small", {}, label), el("b", {}, String(s.store[who])), el("small", {}, "grenn"));
    board.replaceChildren(
      storeBox(1 - me, "Li pran"),
      el("div", { class: "rows" },
        el("div", { class: "row theirs" }, ...top.map(pit)),
        el("div", { class: "row mine" }, ...bottom.map(pit))),
      storeBox(me, "Ou pran"));
  }

  // ================= Reyaksyon =================
  async function sendEmote(e) {
    const res = await api.emit("table:emote", { emoji: e });
    if (res.error) api.toast(res.error);
  }
  function showEmote(seat, emoji) {
    const chipEl = document.querySelector(`.pchip[data-seat="${seat}"]`);
    const layer = $("emote-layer");
    const b = el("div", { class: "emote-pop" }, emoji);
    if (chipEl) {
      const r = chipEl.getBoundingClientRect(), L = layer.getBoundingClientRect();
      b.style.left = `${Math.max(10, r.left - L.left + r.width / 2 - 24)}px`;
    } else b.style.left = "45%";
    layer.append(b);
    setTimeout(() => b.remove(), 1800);
  }

  // ================= Defi =================
  function openChallengePicker(person) {
    $("pick-title").textContent = `⚔️ Defi ${person.avatar || ""} ${person.name}`;
    const opts = [["morpion", "3", "✕◯ Ti mòpyon 3×3"], ["morpion", "5", "✕◯ Gwo mòpyon (5 aliyen)"], ["kay", "", "🫘 Kay (Toukay)"], ["connect4", "", "🔴 Kat Aliyen"]];
    $("pick-list").replaceChildren(...opts.map(([game, variant, text]) => el("button", {
      class: "btn", onclick: async () => {
        $("dlg-pick").close();
        const res = await api.emit("challenge:send", { to: person.id, game, variant });
        if (res.error) return api.toast(res.error);
        enterOnline(res.table);
        api.toast(`Defi a voye bay ${person.name}! 🚀`);
      },
    }, text)));
    $("dlg-pick").showModal();
  }

  let incoming = null;
  let incomingTimer = null;
  function onChallenge(c) {
    incoming = c;
    $("ch-avatar").textContent = c.from.avatar || "😎";
    $("ch-title").textContent = `${c.from.name} defi w nan ${c.label}!`;
    let left = 60;
    $("ch-timer").textContent = `${left} s pou w reponn`;
    clearInterval(incomingTimer);
    incomingTimer = setInterval(() => {
      left -= 1;
      $("ch-timer").textContent = `${left} s pou w reponn`;
      if (left <= 0) { clearInterval(incomingTimer); if ($("dlg-challenge").open) $("dlg-challenge").close(); }
    }, 1000);
    Fx.sound("challenge");
    api.flashTitle("⚔️ Yon moun defi w!");
    if (!$("dlg-challenge").open) $("dlg-challenge").showModal();
  }

  // ================= Inisyalize =================
  function init(a) {
    api = a;
    renderArcade();
    renderQuickRow();
    renderOpenTables([]);
    const s = api.socket;
    s.on("table", (t) => {
      if (mode !== "online" || (table && table.id !== t.id)) return;
      setTable(t);
    });
    s.on("tables", renderOpenTables);
    s.on("table:emote", ({ seat, emoji }) => showEmote(seat, emoji));
    s.on("challenge", onChallenge);
    s.on("challenge:declined", ({ tableId, by }) => {
      if (table && table.id === tableId) { api.toast(`${by} refize defi a.`); leaveLocalOnly(); }
    });
    s.on("challenge:expired", ({ tableId }) => {
      if (table && table.id === tableId) { api.toast("Pèsonn pa t reponn defi a."); leaveLocalOnly(); }
    });

    $("ch-accept").addEventListener("click", async () => {
      clearInterval(incomingTimer);
      $("dlg-challenge").close();
      if (incoming) await joinTable(incoming.tableId);
      incoming = null;
    });
    $("ch-decline").addEventListener("click", () => {
      clearInterval(incomingTimer);
      $("dlg-challenge").close();
      if (incoming) api.emit("challenge:decline", { tableId: incoming.tableId });
      incoming = null;
    });
    $("pick-cancel").addEventListener("click", () => $("dlg-pick").close());
    $("rules-close").addEventListener("click", () => $("dlg-rules").close());
    $("table-rules-btn").addEventListener("click", () => table && showRules(table.game));
    $("table-back").addEventListener("click", () => api.showView("games"));
    $("invite-copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("invite-link").value); api.toast("Lyen an kopye! 📋"); }
      catch { $("invite-link").select(); }
    });
  }

  function leaveLocalOnly() {
    mode = null; table = null; shown = null;
    $("nav-table").hidden = true;
    history.replaceState(null, "", location.pathname);
    if (api.currentView() === "table") api.showView("games");
  }

  // Lè kliyan an di "hello" (premye fwa oswa apre rekoneksyon)
  function onHello(res) {
    renderOpenTables(res.tables);
    if (res.myTable && (mode !== "bot")) {
      mode = "online";
      setTable(res.myTable);
      $("nav-table").hidden = false;
    } else if (mode === "online" && !res.myTable) {
      api.toast("Pati a fini pandan ou te dekonekte.");
      leaveLocalOnly();
    }
  }

  window.LakouBoards = {
    init, onHello, joinTable, openChallengePicker, renderQuickRow,
    active: () => !!table,
    clearTurnBadge: () => { $("turn-badge").hidden = true; },
  };
})();
