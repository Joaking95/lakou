# 🚀 Mete Lakou sou entènèt (Netlify + Render)

## Poukisa de sèvis?

Lakou gen de pati:

| Pati | Kisa li ye | Kote li ale |
|---|---|---|
| **Paj yo** (`public/`) | HTML, CSS, JavaScript | **Netlify** |
| **Sèvè tan reyèl la** (`server.js`) | Socket.IO: chat, jwèt, senkronizasyon fim | **Render** |

Netlify sèvi paj yo trè byen, men li pa ka kenbe yon sèvè ki rete konekte ak moun tout tan (WebSocket). Lakou bezwen sa pou chat la, jwèt yo ak movie night. Se poutèt sa sèvè a ale sou Render, ki gen yon plan gratis ki sipòte WebSocket.

```
 Navigatè moun yo ──► lakou.netlify.app          (paj yo)
        │
        └──── WebSocket ──► lakou-server.onrender.com   (sèvè a)
```

Ou bezwen 3 kont gratis: **GitHub**, **Render**, **Netlify**.

---

## Etap 1: Mete kòd la sou GitHub

1. Sou github.com, kreye yon nouvo repo (pa egzanp `lakou`). Pa ajoute README ni .gitignore, paske pwojè a deja genyen yo.
2. Nan dosye `lakou` la, sou òdinatè w:

```bash
git remote add origin https://github.com/NON-OU/lakou.git
git branch -M main
git push -u origin main
```

(Pwojè a deja gen yon premye commit. Ou pa bezwen fè `git init`.)

## Etap 2: Mete sèvè a sou Render

1. Sou dashboard.render.com: **New → Blueprint**.
2. Konekte GitHub, epi chwazi repo `lakou` la. Render jwenn fichye `render.yaml` la poukont li.
3. Li ap mande w yon valè pou `CLIENT_ORIGIN`. **Kite l vid pou kounye a**: n ap mete l nan etap 4.
4. Klike **Apply / Deploy**, epi tann li fini (2–4 minit).
5. Kopye adrès sèvè a, pa egzanp `https://lakou-server-abcd.onrender.com`.
6. Teste l: louvri `https://…onrender.com/health` nan navigatè w. Ou dwe wè `{"ok":true,…}`.

## Etap 3: Mete paj yo sou Netlify

1. Sou app.netlify.com: **Add new site → Import an existing project → GitHub**, epi chwazi repo `lakou` la.
2. Paramèt build yo soti otomatikman nan `netlify.toml` (publish: `public`, command: `node scripts/netlify-config.js`). Pa chanje yo.
3. Anvan w deplwaye, ajoute yon **varyab anviwònman** (Environment variables):
   - Kle: `LAKOU_SERVER_URL`
   - Valè: adrès Render ou te kopye a (pa egzanp `https://lakou-server-abcd.onrender.com`)
4. Klike **Deploy**. Kopye adrès sit la, pa egzanp `https://lakou.netlify.app`.

> Si build la echwe ak mesaj «Mete varyab LAKOU_SERVER_URL», varyab la manke oswa li pa kòmanse ak `https://`. Korije l nan **Site configuration → Environment variables**, epi klike **Trigger deploy**.

## Etap 4: Di sèvè a ki sit ki gen dwa konekte

1. Retounen sou Render → sèvis `lakou-server` → **Environment**.
2. Mete `CLIENT_ORIGIN` = adrès Netlify ou a (pa egzanp `https://lakou.netlify.app`), san `/` nan fen an.
3. Sove. Render rekòmanse sèvè a.

Sa anpeche lòt sit sou entènèt itilize sèvè w la. Si w achte yon non domèn pita (pa egzanp `lakou.ht`), ajoute l tou, separe ak vigil:
`https://lakou.netlify.app,https://lakou.ht`

## Etap 5: Teste

Louvri sit Netlify a sou òdinatè w **ak** sou telefòn ou. Antre ak de non diferan, epi eseye chat nan **💬 Konekte**. Si mesaj yo pase, tout bagay mache. 🎉

---

## ⚠️ Sa pou w konnen sou plan gratis Render la

- **Sèvè a dòmi** apre 15 minit san pèsonn pa itilize l. Premye moun ki vini apre sa ap wè «⏳ N ap reveye sèvè a…» pandan apeprè 1 minit. Sa nòmal.
- **Lè sèvè a dòmi, tout done yo efase**: blag yo, chat la, ak sal yo. Se paske, pou kounye a, Lakou kenbe tout bagay nan memwa. Pou yo pa pèdi, pwochen etap la se mete yon baz done (pa egzanp Supabase).
- Render bay 750 èdtan gratis pa mwa. Sa sifi pou yon sèl sèvè ki ta rete leve tout mwa a.
- Si w vle sèvè a pa janm dòmi, plan peye Render a retire limit sa a.

## Pwoblèm ki ka rive

| Sa w wè | Sa pou w verifye |
|---|---|
| «N ap reveye sèvè a…» pa janm fini | Louvri `…onrender.com/health`. Si li pa reponn, gade **Logs** sou Render. |
| `/health` mache, men sit la pa konekte | `CLIENT_ORIGIN` sou Render dwe egzakteman adrès Netlify la (ak `https://`, san `/` nan fen). |
| Sit la toujou konekte sou yon ansyen adrès | Chanje `LAKOU_SERVER_URL` sou Netlify, epi fè **Trigger deploy**. |
| Videyo YouTube pa jwe | Gen kèk videyo ki pa pèmèt embed. Eseye yon lòt. |

## Mete ajou

Chak fwa ou fè `git push` sou `main`, Netlify ak Render redeplwaye otomatikman.

## Devlopman lokal (pa chanje)

```bash
npm install
npm start     # http://localhost:3000: paj yo ak sèvè a sou menm adrès
```

Lokalman, `public/config.js` rete vid (`""`), kidonk paj la konekte sou menm sèvè a.
