// questions.js — Bank kesyon pou Trivia.
// Premye chwa a (choices[0]) se toujou bon repons lan; jwèt la melanje yo.
// Ajoute pwòp kesyon pa w isit la. Verifye chak fè anvan ou mete l!

module.exports = [
  // ---- Istwa & kilti ayisyen ----
  { cat: "Ayiti", text: "Nan ki ane Ayiti te pran endepandans li?", choices: ["1804", "1791", "1825", "1915"] },
  { cat: "Ayiti", text: "Ki moun ki te pwoklame endepandans Ayiti nan Gonayiv?", choices: ["Jean-Jacques Dessalines", "Toussaint Louverture", "Henri Christophe", "Alexandre Pétion"] },
  { cat: "Ayiti", text: "Ki moun ki te fè bati Sitadèl Laferyè a?", choices: ["Henri Christophe", "Jean-Jacques Dessalines", "Alexandre Pétion", "Jean-Pierre Boyer"] },
  { cat: "Ayiti", text: "Ki dènye gwo batay Revolisyon ayisyen an, an 1803?", choices: ["Batay Vètyè", "Batay Ravin-a-Couleuvres", "Batay Krèt-a-Pyewo", "Batay Sendomeng"] },
  { cat: "Ayiti", text: "Ki manje tradisyonèl Ayisyen manje chak 1ye janvye pou fete endepandans lan?", choices: ["Soup joumou", "Diri ak djon djon", "Griyo", "Lam veritab"] },
  { cat: "Ayiti", text: "Ki lajan ofisyèl Ayiti?", choices: ["Goud", "Peso", "Franc", "Dola karayib"] },
  { cat: "Ayiti", text: "Ki pi wo mòn an Ayiti?", choices: ["Pik la Sèl", "Pik Makaya", "Mòn Lopital", "Mòn Kabrit"] },
  { cat: "Ayiti", text: "Ki koulè drapo ayisyen an?", choices: ["Ble ak wouj", "Wouj ak nwa", "Ble, blan ak wouj", "Vèt ak jòn"] },
  { cat: "Ayiti", text: "Ki deviz ki ekri sou drapo ayisyen an?", choices: ["L'union fait la force", "Liberté, égalité, fraternité", "Dieu, patrie, liberté", "Ayiti cheri"] },
  { cat: "Ayiti", text: "Ki dat yo fete Jou Drapo an Ayiti?", choices: ["18 me", "1ye janvye", "18 novanm", "14 out"] },
  { cat: "Ayiti", text: "Ki seremoni an 1791 ki konsidere kòm kòmansman Revolisyon ayisyen an?", choices: ["Bwa Kayiman", "Kongrè Akayè", "Batay Vètyè", "Konstitisyon 1801"] },
  { cat: "Ayiti", text: "Nan ki peyi Toussaint Louverture te mouri nan prizon?", choices: ["Lafrans", "Espay", "Angletè", "Etazini"] },
  { cat: "Ayiti", text: "Ki mizisyen yo konsidere kòm papa konpa dirèk la?", choices: ["Nemours Jean-Baptiste", "Webert Sicot", "Coupé Cloué", "Ti Manno"] },
  { cat: "Ayiti", text: "Ki de lang ofisyèl Ayiti?", choices: ["Kreyòl ak fransè", "Kreyòl ak angle", "Fransè ak panyòl", "Kreyòl ak panyòl"] },
  { cat: "Ayiti", text: "Ki sa ki bay diri ak djon djon koulè nwa li?", choices: ["Yon ti chanpiyon", "Pwa nwa", "Kafe", "Lank zouri"] },
  { cat: "Ayiti", text: "Ki sa pikliz ye?", choices: ["Legim pike vinèg ak piman", "Yon desè kokoye", "Yon ji fwi", "Yon kalite pen"] },
  { cat: "Ayiti", text: "Ki moun ki te dirije rezistans kont okipasyon ameriken an (1915–1934) jiskaske yo touye l an 1919?", choices: ["Charlemagne Péralte", "Benoît Batraville", "Sténio Vincent", "Dumarsais Estimé"] },
  { cat: "Ayiti", text: "Ki ekriven ayisyen ki ekri «Gouverneurs de la rosée»?", choices: ["Jacques Roumain", "Jacques Stephen Alexis", "Frankétienne", "Dany Laferrière"] },
  { cat: "Ayiti", text: "Ak ki peyi Ayiti pataje zile a?", choices: ["Repiblik Dominikèn", "Kiba", "Jamayik", "Pòtoriko"] },
  { cat: "Ayiti", text: "Ki pyebwa ki parèt sou blazon (kot dam) Ayiti a?", choices: ["Palmis", "Mango", "Kenèp", "Chèn"] },
  { cat: "Ayiti", text: "Nan ki ane ekip foutbòl Ayiti te jwe nan Koup di Mond lan?", choices: ["1974", "1986", "1998", "2010"] },
  { cat: "Ayiti", text: "Nan ki sezon yo plis jwe rara an Ayiti?", choices: ["Pandan Karèm jiska Pak", "Pandan Nwèl", "Nan mwa out", "Nan rantre lekòl"] },

  // ---- Konesans jeneral ----
  { cat: "Jeneral", text: "Ki pi gwo planèt nan sistèm solè a?", choices: ["Jipitè", "Satin", "Latè", "Neptin"] },
  { cat: "Jeneral", text: "Konbyen pye yon areye genyen?", choices: ["8", "6", "10", "12"] },
  { cat: "Jeneral", text: "Ki pi gwo oseyan sou latè?", choices: ["Pasifik", "Atlantik", "Endyen", "Aktik"] },
  { cat: "Jeneral", text: "Ki bèt ki pi rapid sou tè a?", choices: ["Gepa (cheetah)", "Lyon", "Cheval", "Antilòp"] },
  { cat: "Jeneral", text: "Nan konbyen degre Sèlsiyis dlo jele?", choices: ["0", "10", "-10", "32"] },
  { cat: "Jeneral", text: "Konbyen kontinan ki genyen (selon modèl ki pi itilize a)?", choices: ["7", "5", "6", "8"] },
  { cat: "Jeneral", text: "Ki gaz plant yo rale pou fè fotosentèz?", choices: ["Gaz kabonik (CO₂)", "Oksijèn", "Azòt", "Elyòm"] },
  { cat: "Jeneral", text: "Konbyen jou ki genyen nan yon ane bisèkstil?", choices: ["366", "365", "364", "360"] },

  // ---- Sinema ----
  { cat: "Sinema", text: "Ki aktè fim mi yo te rele «Charlot» an fransè?", choices: ["Charlie Chaplin", "Buster Keaton", "Harold Lloyd", "Stan Laurel"] },
  { cat: "Sinema", text: "Ki sa yo te rele fim ki pa t gen son pale yo nan kòmansman sinema a?", choices: ["Fim mi", "Fim nwa", "Fim kout", "Fim anime"] },
  { cat: "Sinema", text: "Ki sa «popcorn» fèt ak li?", choices: ["Grenn mayi", "Diri", "Ble", "Pwa"] },
];
