// Netlify kouri script sa a pandan build la (gade netlify.toml).
// Li ekri public/config.js ak adrès sèvè Render la (varyab LAKOU_SERVER_URL).
const fs = require("fs");
const path = require("path");

const url = (process.env.LAKOU_SERVER_URL || "").trim().replace(/\/+$/, "");
if (!url) {
  console.error("❌ Mete varyab LAKOU_SERVER_URL nan Netlify (pa egzanp https://lakou-server.onrender.com).");
  process.exit(1);
}
if (!/^https:\/\//.test(url)) {
  console.error(`❌ LAKOU_SERVER_URL dwe kòmanse ak https:// (ou bay: ${url})`);
  process.exit(1);
}
const out = path.join(__dirname, "..", "public", "config.js");
fs.writeFileSync(out, `// Jenere otomatikman pa scripts/netlify-config.js\nwindow.LAKOU_SERVER = ${JSON.stringify(url)};\n`);
console.log(`✅ config.js: sèvè = ${url}`);
