# 🎉 Lakou

Yon lakou anliy kote moun vin **jwe, ri, gade fim ansanm, epi konekte**. Pa bezwen kont: ou mete non w, epi ou antre.

| Onglè | Sa li fè |
|---|---|
| 🏠 **Lakou** | Paj akèy: kat pou chak seksyon, ak kantite moun an liy, sal ouvè, ak blag. |
| 🎬 **Movie Night** | Kreye yon sal sinema (piblik oswa prive). Videyo YouTube senkronize pou tout moun, ak chat ak reyaksyon. |
| 🎲 **Jwèt** | Trivia Lakou: kesyon sou kilti ayisyen, konesans jeneral ak sinema, ak revèy, pwen, klasman ak podyòm. *Krik? Krak!* ak *Desen & Devine* ap vini. |
| 😂 **Rire** | Mi blag: poste yon blag, klike 😂 sou sa ki fè w ri, epi triye pa *Nouvo* oswa *Pi komik*. |
| 💬 **Konekte** | Chat jeneral pou tout moun ki nan lakou a, ak lis moun ki an liy. |
| 📍 **Sal ou** | Parèt lè w nan yon sal. Ou ka ale nan lòt onglè san w pa kite sal la. |

Sou telefòn, onglè yo parèt nan yon ba anba ekran an.

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
- Pa gen kont: yon moun ka pran nenpòt non. Si koneksyon an koupe, li pa rekonèt blag li ankò (bouton *Efase* a disparèt).
- Modération an senp: rapò sou blag yo, ak limit vitès sou chak koneksyon. Chat yo poko gen filtre mo ni bouton bloke.
- Gen kèk videyo YouTube ki pa pèmèt embed.

## Pwochen etap

1. Plis jwèt: **Krik? Krak!** (devinèt), **Desen & Devine**
2. Kont itilizatè (Supabase Auth oswa Clerk), pou moun kenbe non yo, pwen yo, ak blag yo
3. Modération pi fò: bloke yon moun, filtre mo, rapò nan chat yo
4. Mesaj prive ant zanmi
5. Pwograme movie night (dat + lè) ak envitasyon
6. Mete done yo nan yon baz done pou yo pa pèdi
