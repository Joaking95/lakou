# 🎉 Lakou

Yon lakou anliy kote moun vin **jwe, ri, gade fim ansanm, epi konekte**. Pa bezwen kont: ou mete non w, epi ou antre.

| Onglè | Sa li fè |
|---|---|
| 🏠 **Lakou** | Paj akèy: kat pou chak seksyon, ak kantite moun an liy, sal ouvè, ak blag. |
| 🎬 **Movie Night** | Kreye yon sal sinema (piblik oswa prive). Videyo YouTube senkronize pou tout moun, ak chat ak reyaksyon. |
| 🎲 **Jwèt** | **Mòpyon** (3×3 ak 5 aliyen), **Kay / Toukay**, **Kat Aliyen**: kont Robo Lakou 🤖 (Fasil/Fò), kont yon advèsè an liy, oswa ak yon lyen envitasyon. **Trivia** an gwoup tou. |
| 😂 **Rire** | Mi blag: poste yon blag, klike 😂 sou sa ki fè w ri, epi triye pa *Nouvo* oswa *Pi komik*. |
| 💬 **Konekte** | Chat jeneral pou tout moun ki nan lakou a, ak lis moun ki an liy. |
| 📍 **Sal ou** | Parèt lè w nan yon sal. Ou ka ale nan lòt onglè san w pa kite sal la. |

Sou telefòn, onglè yo parèt nan yon ba anba ekran an.

## Sa ki fè moun rete (v0.4)

- **Avatar** ak **pwofil**: chak moun chwazi yon avatar; non, nivo ak viktwa parèt toupatou.
- **XP ak nivo**: viktwa (+30), match nil (+15), pati jwe (+5), bat robo a (+8/+20), poste blag (+5), yon moun ri ak blag ou (+2), Trivia. Nivo yo: *Ti moun lakou → Vwazen → Zanmi lakou → Jwè serye → Chèf lakou → Lejann*.
- **Bonis chak jou** ak **seri jou** 🔥: plis jou youn dèyè lòt, plis bonis.
- **🏆 Klasman** sou paj akèy la.
- **⚔️ Defi**: klike sou yon moun an liy pou envite l nan yon jwèt. Li resevwa yon fenèt «Aksepte / Refize».
- **Son** (ka koupe ak 🔊), **konfeti** lè w genyen, animasyon grenn nan Kay, reyaksyon emoji pandan pati a.
- **Notifikasyon**: tit onglè a klignote «Se tou pa w!», ak badj sou onglè yo (mesaj ki poko li, tou pa w).
- **Rekoneksyon**: si koneksyon an koupe pandan yon pati, ou gen 45 segonn pou w retounen anvan ou pèdi pa fòfè.

## Kòmanse

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # rekòmanse otomatikman lè w chanje kòd
npm test           # tès yo
```

Pou teste ak plizyè moun sou menm òdinatè, louvri `http://localhost:3000` nan yon fenèt nòmal ak yon fenèt prive. Pou teste ak zanmi ki sou lòt rezo, deplwaye l (Render, Railway, Fly.io), oswa itilize yon tinèl tankou `cloudflared tunnel --url http://localhost:3000`.

Lyen envitasyon: `http://…/?room=KOD123`. Moun nan mete non l, epi li antre dirèk nan sal la.

## Mete l sou entènèt

Paj yo ale sou **Netlify**, epi sèvè tan reyèl la ale sou **Render**. Tout etap yo nan **[DEPLOY.md](DEPLOY.md)**.

## Estrikti

```
public/            Kliyan (HTML + CSS + JS senp, pa gen build)
  index.html       Akèy + tout onglè yo + sal la
  app.js           Navigasyon, Konekte, Rire, sal yo, lektè YouTube, Trivia
  style.css
server.js          Express + Socket.IO: konekte evènman yo ak lojik la
public/config.js   Adrès sèvè a (vid lokalman; Netlify ranpli l pandan build la)
netlify.toml       Konfigirasyon Netlify (paj yo)
render.yaml        Konfigirasyon Render (sèvè a)
scripts/           Script build Netlify
rooms.js           Sal yo: kreye/antre/kite, host, senkronizasyon fim, chat sal, lis sal piblik
games.js           Lojik jwèt Trivia a (faz, pwen, klasman)
questions.js       Bank kesyon yo: ajoute pwòp kesyon pa w isit la
social.js          Moun an liy, chat jeneral, mi blag (😂, rapò, efase)
tables.js          Tab jwèt 1v1: jwenn advèsè, defi, revanj, fòfè
players.js         Pwofil: avatar, XP, nivo, seri jou, klasman
public/shared/     Règ jwèt yo (morpion, kay, connect4) ak robo a: menm kòd sou sèvè a ak nan navigatè a
public/boards.js   Entèfas jwèt 1v1 yo (tablo, animasyon, defi)
public/fx.js       Son (Web Audio), konfeti, «+XP»
test/              Tès inite (node:test)
```

Tout lojik la (rooms, games, social) pa depann de rezo, kidonk li fasil pou teste. `server.js` la sèlman konekte evènman Socket.IO yo ak lojik sa a.

## Règ enpòtan

**Sal yo**
- Chak sal gen yon kòd 6 karaktè. Yon sal *piblik* parèt nan lis Movie Night oswa Jwèt la. Yon sal *prive* aksesib sèlman ak kòd la.
- Se host la (👑) ki chwazi fim nan epi ki lanse jwèt la. Tout moun ka fè play/pause.
- Si host la kite, moun ki te la pi lontan an vin host. Yon sal efase lè dènye moun nan kite.
- Chak sal gen de onglè, **🎬 Fim** ak **🎲 Jwèt**, kidonk ou ka gade yon fim, epi lanse yon Trivia nan menm sal la.

**Fim (senkronizasyon)**: sèvè a se sous verite a. Li sonje ki videyo, si l ap jwe, nan ki pozisyon, ak *ki lè* pozisyon sa a te mete. Konsa, yon moun ki antre an reta kalkile kote fim nan rive. Chak 5 segonn, kliyan an korije dekalaj ki depase 2 segonn.

**Trivia**: chak kesyon dire 20 segonn. Bon repons = 500 pwen + jiska 500 bonis pou vitès. Lè tout moun reponn, rezilta a parèt touswit. Se sèvè a ki kenbe revèy la ak bon repons yo, kidonk moun pa ka triche lè yo gade kòd paj la.

**Rire**: yon blag ki resevwa rapò nan men 3 moun diferan kache otomatikman. Moun ki poste yon blag ka efase l.

## Ajoute kesyon Trivia

Louvri `questions.js`. Premye chwa a se toujou bon repons lan (jwèt la melanje yo):

```js
{ cat: "Ayiti", text: "Ki kote Sitadèl Laferyè a ye?", choices: ["Milo", "Jakmèl", "Okay", "Jeremi"] },
```

Pou teste pi vit: `TRIVIA_QUESTION_MS=8000 TRIVIA_REVEAL_MS=3000 npm start`.

## Evènman Socket.IO

| Kliyan → sèvè | Sèvè → kliyan |
|---|---|
| `hello {name}` → resevwa online, rooms, lobby, jokes | `online [moun]` |
| `lobby:chat {text}` | `lobby:chat {from, text, at}` |
| `jokes:list {sort}`, `joke:post {text}` | `joke:new`, `joke:update {id, laughs}`, `joke:remove {id}` |
| `joke:laugh {id}`, `joke:report {id}`, `joke:delete {id}` | `rooms [sal piblik]` |
| `rooms:list`, `room:create {kind, isPublic}`, `room:join {code}`, `room:leave` | `members {hostId, members}`, `system {text}` |
| `video:set {url}` (host), `playback {action, time}`, `sync:request` | `video`, `playback` |
| `chat {text}`, `react {emoji}` | `chat`, `react` |
| `game:start {count}` (host), `game:answer {choice}`, `game:stop` (host) | `game {phase, …}`, `game:progress` |

## Limit pwototip sa a

- Tout bagay rete nan memwa: si sèvè a rekòmanse, sal yo, chat la ak blag yo efase. Pou pwodiksyon, mete yo nan yon baz done (PostgreSQL/Supabase) ak Redis.
- Pa gen kont: yon moun ka pran nenpòt non. Pwogrè a (XP, nivo) mare ak aparèy la. Si moun nan chanje telefòn oswa li efase done navigatè a, li rekòmanse a zewo.
- Lè sèvè Render la dòmi, XP yo pa pèdi pou moun ki retounen (aparèy la renvoye dènye pwogrè li), men klasman an rekòmanse ak moun ki retounen yo. Yon moun ki konn kòd ka manipile pwogrè sere sou pwòp aparèy li: baz done a ap regle sa.
- Modération an senp: rapò sou blag yo, ak limit vitès sou chak koneksyon. Chat yo poko gen filtre mo ni bouton bloke.
- Gen kèk videyo YouTube ki pa pèmèt embed.

## Pwochen etap

1. Plis jwèt: **Krik? Krak!** (devinèt), **Desen & Devine**
2. Kont itilizatè (Supabase Auth oswa Clerk), pou moun kenbe non yo, pwen yo, ak blag yo
3. Modération pi fò: bloke yon moun, filtre mo, rapò nan chat yo
4. Mesaj prive ant zanmi
5. Pwograme movie night (dat + lè) ak envitasyon
6. Mete done yo nan yon baz done pou yo pa pèdi
