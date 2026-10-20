// fx.js — Son, konfeti, ak ti animasyon "+XP". Pa gen fichye son: tout son yo fèt ak Web Audio.
(() => {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem("lakou:muted") === "1"; } catch {}

  function audio() {
    if (muted) return null;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    } catch { return null; }
  }

  // Jwe yon seri nòt: [frekans, dire, delè, tip]
  function tones(notes, volume = 0.08) {
    const a = audio();
    if (!a) return;
    const t0 = a.currentTime;
    for (const [freq, dur, delay = 0, type = "sine"] of notes) {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t0 + delay);
      g.gain.linearRampToValueAtTime(volume, t0 + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + dur);
      o.connect(g).connect(a.destination);
      o.start(t0 + delay);
      o.stop(t0 + delay + dur + 0.02);
    }
  }

  const SOUNDS = {
    click: () => tones([[660, 0.06, 0, "triangle"]], 0.05),
    move: () => tones([[520, 0.07, 0, "triangle"], [780, 0.06, 0.05, "triangle"]], 0.05),
    seed: () => tones([[900 + Math.random() * 200, 0.04, 0, "sine"]], 0.04),
    kay: () => tones([[523, 0.1], [659, 0.1, 0.08], [784, 0.18, 0.16]], 0.08),
    turn: () => tones([[880, 0.08], [1175, 0.12, 0.09]], 0.06),
    message: () => tones([[740, 0.06, 0, "sine"], [988, 0.08, 0.06, "sine"]], 0.04),
    win: () => tones([[523, 0.12], [659, 0.12, 0.12], [784, 0.12, 0.24], [1047, 0.35, 0.36]], 0.09),
    lose: () => tones([[392, 0.18, 0, "triangle"], [330, 0.18, 0.16, "triangle"], [262, 0.35, 0.32, "triangle"]], 0.07),
    level: () => tones([[523, 0.1], [784, 0.1, 0.1], [1047, 0.1, 0.2], [1319, 0.4, 0.3]], 0.09),
    challenge: () => tones([[660, 0.1], [880, 0.1, 0.12], [660, 0.1, 0.24], [880, 0.15, 0.36]], 0.08),
  };

  function sound(name) {
    try { (SOUNDS[name] || SOUNDS.click)(); } catch {}
  }

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem("lakou:muted", muted ? "1" : "0"); } catch {}
  }

  // ---------- Konfeti ----------
  function confetti(amount = 140) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.className = "confetti";
    document.body.appendChild(canvas);
    const c = canvas.getContext("2d");
    const W = (canvas.width = innerWidth), H = (canvas.height = innerHeight);
    const colors = ["#f4b740", "#d8432e", "#3fb8a6", "#8f7cf0", "#f6ece2", "#4cc38a"];
    const parts = Array.from({ length: amount }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
      r: Math.random() * 6 + 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    let frame = 0;
    (function tick() {
      c.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillStyle = p.color; c.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        c.restore();
      }
      if (++frame < 150) requestAnimationFrame(tick);
      else canvas.remove();
    })();
  }

  // ---------- "+30 XP" ki monte ----------
  function xpPop(amount, reason) {
    const el = document.createElement("div");
    el.className = "xp-pop";
    el.textContent = `+${amount} XP`;
    if (reason) {
      const s = document.createElement("small");
      s.textContent = reason;
      el.appendChild(s);
    }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  window.LakouFx = { sound, confetti, xpPop, setMuted, get muted() { return muted; } };
})();
