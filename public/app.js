// app.js — Kliyan Lakou (JavaScript senp, pa gen build)
(() => {
  const $ = (id) => document.getElementById(id);
  // Si LAKOU_SERVER vid, nou konekte sou menm sit la (npm start lokal).
  const SERVER = window.LAKOU_SERVER || "";
  const socket = SERVER ? io(SERVER) : io();

  // ---------- Eta ----------
  let myId = null;
  let myName = "";
  let room = null; // { code, hostId, members }
  let player = null;
  let playerReady = false;
  let ytApiReady = !!(window.YT && window.YT.Player);
  let loadedVideoId = null;
  let pending = null; // eta pou aplike lè lektè a pare
  let suppressUntil = 0; // inyore evènman lektè a pandan n ap aplike yon chanjman ki soti lòt kote
  // Dènye eta nou konnen (pou nou pa voye menm evènman an tounen)
  let lastKnown = { playing: false, time: 0, at: Date.now() };

  const PLAYING = 1, PAUSED = 2, ENDED = 0;

  // ---------- Ti zouti ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  function toast(text) {
    const t = $("toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  function emit(event, payload = {}) {
    return new Promise((resolve) => {
      socket.timeout(5000).emit(event, payload, (err, res) => {
        if (err) return resolve({ error: "Koneksyon an pa reponn. Eseye ankò." });
        resolve(res || {});
      });
    });
  }

  function expectedTime() {
    return lastKnown.playing ? lastKnown.time + (Date.now() - lastKnown.at) / 1000 : lastKnown.time;
  }
  function remember(playing, time) { lastKnown = { playing, time, at: Date.now() }; }

  const isHost = () => room && room.hostId === myId;

  // ---------- Akèy: non an ----------
  const params = new URLSearchParams(location.search);
  const inviteCode = (params.get("room") || "").toUpperCase();
  $("name").value = store.get("lakou:name") || "";
  let joined = false; // eske nou deja di "hello" bay sèvè a

  $("welcome-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = $("name").value.trim();
    if (!n) { $("welcome-error").textContent = "Mete non w anvan."; return; }
    const btn = $("welcome-form").querySelector("button");
    btn.disabled = true;
    $("welcome-error").textContent = "";
    // Sou plan gratis Render, sèvè a ka ap dòmi: li pran ~1 minit pou l reveye.
    if (!socket.connected) $("welcome-status").textContent = "⏳ N ap reveye sèvè a… sa ka pran jiska 1 minit.";
    const connected = await waitForConnection(90000);
    $("welcome-status").textContent = "";
    if (!connected) {
      btn.disabled = false;
      $("welcome-error").textContent = "Nou pa ka jwenn sèvè a. Verifye koneksyon w, epi eseye ankò.";
      return;
    }
    const ok = await sayHello(n);
    btn.disabled = false;
    if (!ok) return;
    $("welcome").hidden = true;
    $("app").hidden = false;
    if (inviteCode) joinCode(inviteCode);
    else showView(store.get("lakou:view") || "home");
  });

  function waitForConnection(ms) {
    if (socket.connected) return Promise.resolve(true);
    return new Promise((resolve) => {
      const onConnect = () => { clearTimeout(timer); resolve(true); };
      const timer = setTimeout(() => { socket.off("connect", onConnect); resolve(false); }, ms);
      socket.once("connect", onConnect);
    });
  }

  // Chanje non: tounen nan paj akèy la (sèlman si ou pa nan yon sal)
  $("me-chip").addEventListener("click", () => {
    if (room) return toast("Kite sal la anvan pou w chanje non.");
    $("app").hidden = true;
    $("welcome").hidden = false;
    $("name").focus();
  });

  async function sayHello(name) {
    const res = await emit("hello", { name });
    if (res.error) { $("welcome-error").textContent = res.error; return false; }
    myId = res.you;
    myName = res.name;
    joined = true;
    store.set("lakou:name", myName);
    $("welcome-error").textContent = "";
    $("me-name").textContent = myName;
    $("hello-name").textContent = myName;
    setOnline(res.online);
    setRooms(res.rooms);
    setLobby(res.lobby);
    setJokes(res.jokes);
    return true;
  }

  // ---------- Navigasyon ant onglè prensipal yo ----------
  const VIEWS = ["home", "movie", "games", "rire", "konekte", "room"];
  let currentView = "home";

  function showView(v) {
    if (!VIEWS.includes(v) || (v === "room" && !room)) v = "home";
    currentView = v;
    for (const name of VIEWS) $(`view-${name}`).hidden = name !== v;
    document.querySelectorAll(".navtab").forEach((b) => {
      const on = b.dataset.view === v;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });
    if (v !== "room") store.set("lakou:view", v);
    if (v === "konekte") { const l = $("lobby-messages"); l.scrollTop = l.scrollHeight; }
    window.scrollTo({ top: 0 });
  }
  document.querySelectorAll(".navtab").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => showView(b.dataset.go)));

  // ---------- Kreye / antre nan sal ----------
  document.querySelectorAll("[data-create]").forEach((b) => b.addEventListener("click", async () => {
    const kind = b.dataset.create;
    const isPublic = $(kind === "game" ? "game-public" : "movie-public").checked;
    const res = await emit("room:create", { name: myName, kind, isPublic });
    if (res.error) return toast(res.error);
    enterRoom(res);
  }));

  document.querySelectorAll(".join-form").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = f.querySelector(".code-input");
    joinCode(input.value).then((ok) => { if (ok) input.value = ""; });
  }));

  async function joinCode(raw) {
    const code = String(raw || "").trim().toUpperCase();
    if (code.length !== 6) { toast("Kòd la dwe gen 6 karaktè."); return false; }
    if (room && room.code === code) { showView("room"); return true; }
    const res = await emit("room:join", { code, name: myName });
    if (res.error) {
      toast(res.error);
      if (!room) showView("home");
      return false;
    }
    enterRoom(res);
    return true;
  }

  function enterRoom(res) {
    myId = res.you;
    const r = res.room;
    room = { code: r.code, hostId: r.hostId, members: r.members, kind: r.kind };
    $("room-code").textContent = r.code;
    $("nav-room-label").textContent = `Sal ${r.code}`;
    $("nav-room").hidden = false;
    $("room-title").textContent = r.kind === "game" ? "🎲 Sal jwèt" : "🎬 Sal sinema";
    history.replaceState(null, "", `?room=${r.code}`);
    $("messages").innerHTML = "";
    r.history.forEach(addChat);
    addSystem(isHost() ? "Ou kreye sal la 👑 Voye kòd la bay zanmi w!" : "Ou antre nan sal la 🎉");
    renderMembers();
    applyState({ videoId: r.videoId, playing: r.playing, time: r.time });
    game = { phase: "idle" };
    setGame(r.game || { phase: "idle" });
    if (r.kind === "game") showTab("game");
    else if (!r.game || r.game.phase === "idle") showTab("movie");
    showView("room");
  }

  $("leave-btn").addEventListener("click", async () => {
    const kind = room && room.kind;
    await emit("room:leave");
    room = null;
    if (player) { try { player.stopVideo(); } catch {} }
    $("nav-room").hidden = true;
    history.replaceState(null, "", location.pathname);
    clearInterval(clockTimer);
    game = { phase: "idle" };
    showTab("movie");
    showView(kind === "game" ? "games" : "movie");
  });

  // ---------- Sal piblik yo (Movie Night & Jwèt) ----------
  let publicRooms = [];
  function setRooms(list) {
    publicRooms = list || [];
    renderRoomGrid("movie-rooms", publicRooms.filter((r) => r.kind === "movie"),
      "Pa gen sal fim ouvè kounye a. Kreye youn, epi envite zanmi w! 🍿");
    renderRoomGrid("game-rooms", publicRooms.filter((r) => r.kind === "game"),
      "Pa gen jwèt ouvè kounye a. Lanse youn!");
    const m = publicRooms.filter((r) => r.kind === "movie").length;
    const g = publicRooms.filter((r) => r.kind === "game").length;
    $("stat-movie").textContent = `${m} sal ouvè`;
    $("stat-games").textContent = `${g} jwèt ouvè`;
  }
  socket.on("rooms", setRooms);

  function renderRoomGrid(id, list, emptyText) {
    const box = $(id);
    box.replaceChildren();
    if (!list.length) { box.append(el("p", { class: "empty" }, emptyText)); return; }
    for (const r of list) {
      let status;
      if (r.kind === "game") {
        status = r.gamePhase === "question" || r.gamePhase === "reveal" ? "🔴 Jwèt ap jwe" : "Ap tann jwè";
      } else {
        status = !r.videoId ? "Ap chwazi fim nan" : r.playing ? "▶ Fim nan ap jwe" : "⏸ Fim nan an pòz";
      }
      const thumb = r.videoId
        ? el("img", { src: `https://i.ytimg.com/vi/${r.videoId}/mqdefault.jpg`, alt: "", loading: "lazy" })
        : el("span", { class: "thumb-emoji" }, r.kind === "game" ? "🧠" : "🍿");
      const mine = room && room.code === r.code;
      box.append(el("button", { class: "room-card", onclick: () => joinCode(r.code) },
        el("div", { class: "thumb" }, thumb),
        el("div", { class: "room-meta" },
          el("strong", {}, `Sal ${r.host || "?"}`),
          el("span", {}, status),
          el("span", { class: "fine" }, `👥 ${r.count} · ${r.code}`)),
        el("span", { class: "go" }, mine ? "Ou la" : "Antre →")));
    }
  }

  // ---------- 💬 Konekte ----------
  function setOnline(list) {
    const people = list || [];
    $("online-badge").textContent = people.length;
    $("online-count").textContent = people.length;
    $("stat-online").textContent = `${people.length} moun an liy`;
    const ul = $("online-list");
    ul.replaceChildren(...people.map((p) =>
      el("li", { class: p.id === myId ? "me" : "" }, el("span", { class: "dot" }), p.name + (p.id === myId ? " (ou)" : ""))));
  }
  socket.on("online", setOnline);

  function lobbyLine(m) {
    return el("li", { class: m.fromId === myId ? "mine" : "" },
      el("span", { class: "who" }, m.from), m.text,
      el("time", { class: "at" }, new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })));
  }
  function setLobby(list) {
    const ol = $("lobby-messages");
    ol.replaceChildren(...(list || []).map(lobbyLine));
    if (!list || !list.length) ol.append(el("li", { class: "system" }, "Pèsonn poko pale. Se ou ki pou kòmanse! 👋"));
    ol.scrollTop = ol.scrollHeight;
  }
  socket.on("lobby:chat", (m) => {
    const ol = $("lobby-messages");
    ol.querySelectorAll("li.system").forEach((x) => x.remove());
    const nearBottom = ol.scrollHeight - ol.scrollTop - ol.clientHeight < 60;
    ol.append(lobbyLine(m));
    while (ol.children.length > 100) ol.firstChild.remove();
    if (nearBottom || m.fromId === myId) ol.scrollTop = ol.scrollHeight;
  });
  $("lobby-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("lobby-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    const res = await emit("lobby:chat", { text });
    if (res.error) { toast(res.error); input.value = text; }
  });

  // ---------- 😂 Rire ----------
  let jokes = [];
  let jokeSort = "new";
  const myLaughs = new Set();

  function setJokes(list) {
    jokes = list || [];
    myLaughs.clear();
    jokes.forEach((j) => j.laughedByMe && myLaughs.add(j.id));
    renderJokes();
  }
  function sortedJokes() {
    const a = jokes.slice();
    if (jokeSort === "top") a.sort((x, y) => y.laughs - x.laughs || y.at - x.at);
    else a.sort((x, y) => y.at - x.at);
    return a;
  }
  function timeAgo(at) {
    const s = Math.max(0, Math.round((Date.now() - at) / 1000));
    if (s < 60) return "kounye a";
    if (s < 3600) return `${Math.floor(s / 60)} min de sa`;
    if (s < 86400) return `${Math.floor(s / 3600)} è de sa`;
    return `${Math.floor(s / 86400)} jou de sa`;
  }
  function renderJokes() {
    $("stat-rire").textContent = `${jokes.length} blag`;
    const box = $("joke-list");
    box.replaceChildren();
    if (!jokes.length) {
      box.append(el("p", { class: "empty" }, "Poko gen blag. Poste premye a, fè lakou a ri! 😄"));
      return;
    }
    sortedJokes().forEach((j, i) => {
      const laughed = myLaughs.has(j.id);
      const mine = j.byId === myId;
      box.append(el("article", { class: "joke" },
        jokeSort === "top" && i < 3 && j.laughs > 0 ? el("span", { class: "medal" }, ["🥇", "🥈", "🥉"][i]) : null,
        el("p", { class: "joke-text" }, j.text),
        el("div", { class: "joke-foot" },
          el("span", { class: "fine" }, `${j.by} · ${timeAgo(j.at)}`),
          el("div", { class: "joke-actions" },
            mine
              ? el("button", { class: "linkish", onclick: () => jokeAction("joke:delete", j.id, "Blag la efase.") }, "Efase")
              : el("button", { class: "linkish", title: "Rapòte blag sa a", onclick: () => jokeAction("joke:report", j.id, "Mèsi, nou resevwa rapò a.") }, "⚑ Rapòte"),
            el("button", { class: `laugh ${laughed ? "on" : ""}`, "aria-pressed": String(laughed), onclick: () => laugh(j.id) },
              "😂 ", el("b", {}, String(j.laughs)))))));
    });
  }
  async function laugh(id) {
    const res = await emit("joke:laugh", { id });
    if (res.error) return toast(res.error);
    if (res.laughed) myLaughs.add(id); else myLaughs.delete(id);
    renderJokes();
  }
  async function jokeAction(event, id, okText) {
    const res = await emit(event, { id });
    toast(res.error || okText);
  }
  $("joke-input").addEventListener("input", () => {
    $("joke-count").textContent = `${$("joke-input").value.length}/400`;
  });
  $("joke-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = $("joke-input").value.trim();
    if (!text) return;
    const res = await emit("joke:post", { text });
    if (res.error) return toast(res.error);
    $("joke-input").value = "";
    $("joke-count").textContent = "0/400";
    toast("Blag la poste! 😂");
  });
  document.querySelectorAll("[data-sort]").forEach((b) => b.addEventListener("click", () => {
    jokeSort = b.dataset.sort;
    document.querySelectorAll("[data-sort]").forEach((x) => x.classList.toggle("active", x === b));
    renderJokes();
  }));
  socket.on("joke:new", (j) => {
    if (jokes.some((x) => x.id === j.id)) return;
    jokes.unshift(j);
    renderJokes();
  });
  socket.on("joke:update", ({ id, laughs }) => {
    const j = jokes.find((x) => x.id === id);
    if (j) { j.laughs = laughs; renderJokes(); }
  });
  socket.on("joke:remove", ({ id }) => {
    jokes = jokes.filter((x) => x.id !== id);
    renderJokes();
  });

  $("copy-link").addEventListener("click", async () => {
    const link = `${location.origin}${location.pathname}?room=${room.code}`;
    try { await navigator.clipboard.writeText(link); toast("Lyen an kopye! Voye l bay zanmi w 📋"); }
    catch { prompt("Kopye lyen sa a:", link); }
  });

  // ---------- Manm ----------
  function renderMembers() {
    const ul = $("member-list");
    ul.innerHTML = "";
    room.members.forEach((m) => {
      const li = document.createElement("li");
      li.textContent = (m.id === room.hostId ? "👑 " : "") + m.name + (m.id === myId ? " (ou)" : "");
      if (m.id === myId) li.classList.add("me");
      ul.appendChild(li);
    });
    $("member-count").textContent = room.members.length;
    const host = room.members.find((m) => m.id === room.hostId);
    $("video-url").disabled = !isHost();
    $("video-form").querySelector("button").disabled = !isHost();
    $("host-note").textContent = isHost()
      ? "Ou se host la: ou chwazi fim nan. Tout moun ka play/pause."
      : `Se ${host ? host.name : "host la"} 👑 ki chwazi fim nan. Ou menm ou ka play/pause.`;
    $("empty-text").textContent = isHost()
      ? "Kole yon lyen YouTube anba a pou kòmanse fim nan."
      : "Host la poko chwazi yon fim.";
  }

  socket.on("members", ({ hostId, members }) => {
    if (!room) return;
    const wasHost = isHost();
    room.hostId = hostId;
    room.members = members;
    renderMembers();
    renderGame(); // bouton host la ak kantite moun ka chanje
    if (!wasHost && isHost()) toast("Kounye a se ou ki host la 👑");
  });

  // ---------- Chat ----------
  function addChat(msg) {
    const li = document.createElement("li");
    const who = document.createElement("span");
    who.className = "who";
    who.textContent = msg.from;
    li.append(who, document.createTextNode(msg.text));
    pushMessage(li);
  }
  function addSystem(text) {
    const li = document.createElement("li");
    li.className = "system";
    li.textContent = text;
    pushMessage(li);
  }
  function pushMessage(li) {
    const list = $("messages");
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
    list.appendChild(li);
    while (list.children.length > 200) list.firstChild.remove();
    if (nearBottom) list.scrollTop = list.scrollHeight;
  }

  $("chat-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("chat-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    const res = await emit("chat", { text });
    if (res.error) { toast(res.error); input.value = text; }
  });
  socket.on("chat", addChat);
  socket.on("system", ({ text }) => addSystem(text));

  // ---------- Reyaksyon ----------
  $("react-bar").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-emoji]");
    if (!btn) return;
    const res = await emit("react", { emoji: btn.dataset.emoji });
    if (res.error) toast(res.error);
  });
  socket.on("react", ({ emoji, from }) => {
    const el = document.createElement("div");
    el.className = "floater";
    el.style.left = `${8 + Math.random() * 80}%`;
    const face = document.createElement("span");
    face.textContent = emoji;
    const name = document.createElement("small");
    name.textContent = from;
    el.append(face, name);
    $("reactions-layer").appendChild(el);
    setTimeout(() => el.remove(), 2700);
  });

  // ---------- Chwazi fim ----------
  $("video-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = $("video-url").value.trim();
    if (!url) return;
    const res = await emit("video:set", { url });
    if (res.error) return toast(res.error);
    $("video-url").value = "";
  });
  socket.on("video", ({ videoId, by }) => {
    addSystem(`${by} mete yon nouvo fim 🎞️`);
    applyState({ videoId, playing: false, time: 0 });
  });

  // ---------- Lektè YouTube ----------
  window.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    if (pending) applyState(pending);
  };

  function createPlayer(videoId, startSeconds) {
    player = new YT.Player("player", {
      videoId,
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1, start: Math.floor(startSeconds || 0) },
      events: {
        onReady: () => {
          playerReady = true;
          loadedVideoId = videoId;
          if (pending) { const p = pending; pending = null; applyState(p); }
        },
        onStateChange: onPlayerState,
        onError: () => toast("Videyo sa a pa ka jwe isit la (petèt li pa pèmèt embed)."),
      },
    });
  }

  // Aplike yon eta ki soti nan sèvè a sou lektè lokal la.
  function applyState({ videoId, playing, time }) {
    remember(!!playing, time || 0);
    $("empty-screen").hidden = !!videoId;
    if (!videoId) return;
    if (!ytApiReady) { pending = { videoId, playing, time }; return; }
    if (!player) { pending = { videoId, playing, time }; createPlayer(videoId, time); return; }
    if (!playerReady) { pending = { videoId, playing, time }; return; }

    suppressUntil = Date.now() + 1200;
    if (loadedVideoId !== videoId) {
      loadedVideoId = videoId;
      if (playing) player.loadVideoById({ videoId, startSeconds: time });
      else player.cueVideoById({ videoId, startSeconds: time });
    } else {
      if (Math.abs(player.getCurrentTime() - time) > 1) player.seekTo(time, true);
      if (playing) player.playVideo(); else player.pauseVideo();
    }
    if (playing) checkAutoplay();
  }

  // Navigatè yo ka bloke autoplay ak son. Si sa rive, nou montre yon bouton.
  function checkAutoplay() {
    setTimeout(() => {
      if (!player || !lastKnown.playing) return;
      if (player.getPlayerState() !== PLAYING) $("unmute-overlay").hidden = false;
    }, 1800);
  }
  $("unmute-overlay").addEventListener("click", () => {
    $("unmute-overlay").hidden = true;
    suppressUntil = Date.now() + 1200;
    player.seekTo(expectedTime(), true);
    player.playVideo();
  });

  // Lè moun nan itilize lektè a li menm → voye evènman an bay lòt yo.
  function onPlayerState(e) {
    if (!room || Date.now() < suppressUntil) return;
    const t = player.getCurrentTime();
    if (e.data === PLAYING) {
      $("unmute-overlay").hidden = true;
      if (lastKnown.playing && Math.abs(t - expectedTime()) < 1.5) return; // deja senkronize
      sendPlayback("play", t);
    } else if (e.data === PAUSED || e.data === ENDED) {
      if (!lastKnown.playing && Math.abs(t - lastKnown.time) < 1.5) return;
      sendPlayback("pause", t);
    }
  }

  async function sendPlayback(action, time) {
    remember(action === "play" ? true : action === "pause" ? false : lastKnown.playing, time);
    const res = await emit("playback", { action, time });
    if (res.error) toast(res.error);
  }

  socket.on("playback", ({ action, playing, time, by }) => {
    if (action === "play") addSystem(`▶ ${by} lanse fim nan`);
    else if (action === "pause") addSystem(`⏸ ${by} poze fim nan`);
    applyState({ videoId: loadedVideoId || pending?.videoId, playing, time });
  });

  // Korije dekalaj (drift) chak 5 segonn.
  setInterval(async () => {
    if (!room || !playerReady || !lastKnown.playing) return;
    const res = await emit("sync:request");
    if (res.error || !res.playing || res.videoId !== loadedVideoId) return;
    remember(true, res.time);
    if (player.getPlayerState() === PLAYING && Math.abs(player.getCurrentTime() - res.time) > 2) {
      suppressUntil = Date.now() + 1200;
      player.seekTo(res.time, true);
    }
  }, 5000);

  // ---------- Onglè Fim / Jwèt ----------
  function showTab(which) {
    const isGame = which === "game";
    $("movie-view").hidden = isGame;
    $("game-view").hidden = !isGame;
    $("tab-movie").classList.toggle("active", !isGame);
    $("tab-game").classList.toggle("active", isGame);
    $("tab-movie").setAttribute("aria-selected", String(!isGame));
    $("tab-game").setAttribute("aria-selected", String(isGame));
  }
  $("tab-movie").addEventListener("click", () => showTab("movie"));
  $("tab-game").addEventListener("click", () => showTab("game"));

  // Ti zouti pou kreye eleman san innerHTML (pwoteje kont XSS)
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "onclick") node.addEventListener("click", v);
      else if (k === "disabled") node.disabled = !!v;
      else node.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c != null && c !== false) node.append(c);
    return node;
  }

  // ---------- Jwèt: Trivia ----------
  let game = { phase: "idle" };
  let gameDeadline = 0;
  let myAnswer = null; // chwa m pou kesyon aktyèl la
  let currentQ = -1;
  let answeredIds = [];
  let pickedCount = 7;
  let clockTimer = null;
  const LETTERS = ["A", "B", "C", "D"];

  function setGame(state) {
    const prevPhase = game.phase;
    if (prevPhase === "idle" || prevPhase === "over") currentQ = -1;
    if (state.phase === "question" && state.index !== currentQ) { myAnswer = null; currentQ = state.index; }
    answeredIds = state.answeredIds || [];
    game = state;
    gameDeadline = Date.now() + (state.remainingMs || 0);
    $("game-live").hidden = !(state.phase === "question" || state.phase === "reveal");
    if ((prevPhase === "idle" || prevPhase === "over") && state.phase === "question") showTab("game");
    renderGame();
  }

  socket.on("game", setGame);
  socket.on("game:progress", (p) => {
    answeredIds = p.answeredIds || [];
    if (game.phase === "question") renderGame();
  });

  function startClock() {
    clearInterval(clockTimer);
    const tick = () => {
      const left = Math.max(0, gameDeadline - Date.now());
      const clock = document.querySelector("#game-view .clock");
      const bar = document.querySelector("#game-view .timer > div");
      if (clock) {
        clock.textContent = Math.ceil(left / 1000) + "s";
        clock.classList.toggle("hurry", game.phase === "question" && left < 5000);
      }
      if (bar) bar.style.width = `${(left / (game.durationMs || 1)) * 100}%`;
      if (left <= 0) clearInterval(clockTimer);
    };
    tick();
    clockTimer = setInterval(tick, 100);
  }

  async function startTrivia() {
    const res = await emit("game:start", { count: pickedCount });
    if (res.error) toast(res.error);
  }
  async function stopGame() {
    const res = await emit("game:stop");
    if (res.error) toast(res.error);
  }

  async function pickAnswer(i) {
    if (myAnswer !== null || game.phase !== "question") return;
    myAnswer = i;
    renderGame();
    const res = await emit("game:answer", { choice: i });
    if (res.error) { toast(res.error); if (res.error !== "Ou deja reponn.") { myAnswer = null; renderGame(); } }
  }

  function boardList(rows, results = []) {
    const deltas = new Map(results.map((r) => [r.id, r.points]));
    return el("ol", { class: "board" },
      rows.map((p, i) => el("li", { class: p.id === myId ? "me" : "" },
        el("span", { class: "rank" }, `${i + 1}`),
        el("span", {}, p.name + (p.id === myId ? " (ou)" : "")),
        p.streak >= 3 ? el("span", { class: "fire", title: `${p.streak} bon repons youn dèyè lòt` }, `🔥${p.streak}`) : null,
        deltas.get(p.id) ? el("span", { class: "delta" }, `+${deltas.get(p.id)}`) : null,
        el("span", { class: "pts" }, String(p.score)),
      )));
  }

  function renderGame() {
    const view = $("game-view");
    clearInterval(clockTimer);
    view.replaceChildren();
    if (!room) return;
    const host = isHost();
    const stopBtn = host && (game.phase === "question" || game.phase === "reveal")
      ? el("button", { class: "stop-link", onclick: stopGame }, "Sispann jwèt la") : null;

    if (game.phase === "idle") {
      const picker = el("div", { class: "count-picker", role: "group", "aria-label": "Kantite kesyon" },
        [5, 7, 10].map((n) => el("button", {
          class: n === pickedCount ? "on" : "",
          onclick: () => { pickedCount = n; renderGame(); },
        }, `${n} kesyon`)));
      view.append(el("div", { class: "game-center" },
        el("p", { class: "big", style: "font-size:3rem;margin:0" }, "🧠"),
        el("h2", { class: "game-title" }, "Trivia ", el("span", {}, "Lakou")),
        el("p", { class: "game-sub" }, "Kesyon sou istwa ak kilti ayisyen, konesans jeneral ak sinema. Plis ou reponn vit, plis ou fè pwen!"),
        host ? picker : null,
        host
          ? el("button", { class: "btn primary", onclick: startTrivia }, "🎲 Lanse jwèt la")
          : el("p", { class: "game-sub" }, "Tann host la 👑 lanse jwèt la…"),
      ));
      return;
    }

    if (game.phase === "question" || game.phase === "reveal") {
      const q = game.question;
      const isReveal = game.phase === "reveal";
      const results = game.results || [];
      const counts = [0, 0, 0, 0];
      results.forEach((r) => counts[r.choice]++);
      const choices = el("div", { class: "choices" },
        q.choices.map((text, i) => {
          let cls = "choice";
          if (!isReveal && myAnswer === i) cls += " picked";
          if (!isReveal && myAnswer !== null && myAnswer !== i) cls += " dim";
          if (isReveal) cls += i === game.correct ? " right" : myAnswer === i ? " wrong" : " dim";
          return el("button", { class: cls, disabled: isReveal || myAnswer !== null, onclick: () => pickAnswer(i) },
            el("span", { class: "letter" }, LETTERS[i]),
            el("span", {}, text),
            isReveal && counts[i] ? el("span", { class: "tag" }, `${counts[i]} 👤`) : null);
        }));

      let footer;
      if (!isReveal) {
        const waiting = room.members.length;
        footer = el("p", { class: "status-line" }, myAnswer !== null
          ? `✅ Ou reponn! N ap tann lòt yo (${answeredIds.length}/${waiting})`
          : `${answeredIds.length}/${waiting} moun deja reponn`);
      } else {
        const mine = results.find((r) => r.id === myId);
        const verdict = mine && mine.correct
          ? el("p", { class: "verdict good" }, `+${mine.points} pwen 🎉`)
          : el("p", { class: "verdict bad" }, mine ? "Pa bon 😅" : "Ou pa t reponn ⏰");
        footer = el("div", { style: "display:grid;gap:.8rem" },
          verdict,
          boardList(game.leaderboard.slice(0, 5), results),
          el("p", { class: "status-line" }, game.index + 1 < game.total ? "Pwochen kesyon an ap vini…" : "Dènye kesyon! Rezilta final yo ap vini…"));
      }

      view.append(
        el("div", { class: "q-head" },
          el("span", {}, `Kesyon ${game.index + 1}/${game.total}`),
          el("span", { class: "cat" }, q.cat),
          el("span", { class: "clock" }, "")),
        el("div", { class: "timer" }, el("div", {})),
        el("p", { class: "q-text" }, q.text),
        choices,
        footer,
        stopBtn,
      );
      startClock();
      return;
    }

    if (game.phase === "over") {
      const lb = game.leaderboard;
      const spot = (p, place, medal) => p
        ? el("div", { class: `p${place}` }, el("span", { class: "nm" }, p.name), el("span", { class: "sc" }, `${p.score} pwen`), el("div", { class: "block" }, medal))
        : el("div", {});
      view.append(el("div", { class: "game-center", style: "width:100%" },
        el("h2", { class: "game-title" }, "Rezilta ", el("span", {}, "final")),
        el("div", { class: "podium" }, spot(lb[1], 2, "🥈"), spot(lb[0], 1, "🥇"), spot(lb[2], 3, "🥉")),
        el("div", { style: "width:100%;max-width:30rem" }, boardList(lb)),
        el("div", { class: "game-actions" },
          host ? el("button", { class: "btn primary", onclick: startTrivia }, "🔁 Rejwe") : null,
          host ? el("button", { class: "btn", onclick: stopGame }, "Fèmen jwèt la") : null,
          el("button", { class: "btn ghost", onclick: () => showTab("movie") }, "🎬 Retounen nan fim nan")),
      ));
    }
  }

  // ---------- Rekoneksyon ----------
  socket.on("connect", async () => {
    if (!joined) return; // premye koneksyon: moun nan poko antre non l
    await sayHello(myName);
    if (!room) return;
    const res = await emit("room:join", { code: room.code, name: myName });
    if (res.error) {
      toast("Sal la fèmen pandan ou te dekonekte.");
      room = null;
      $("nav-room").hidden = true;
      history.replaceState(null, "", location.pathname);
      showView("home");
      return;
    }
    myId = res.you;
    room = { code: res.room.code, hostId: res.room.hostId, members: res.room.members, kind: res.room.kind };
    renderMembers();
    applyState({ videoId: res.room.videoId, playing: res.room.playing, time: res.room.time });
    setGame(res.room.game || { phase: "idle" });
    toast("Ou rekonekte ✅");
  });
  socket.on("disconnect", () => { if (joined) toast("Koneksyon an koupe… n ap eseye ankò"); });
})();
