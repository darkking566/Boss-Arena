// 共用載入器：解析 index.html 的 <script src> 清單，依序載入到 Node vm（不需任何相依套件）
// 標記 data-browser 的腳本（繪圖 / 輸入 / 主程式）在無頭模式預設略過；opts.render=true 時會一併載入 js/render/ 底下的檔案（僅定義函式，不觸碰 DOM）
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function scriptList() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const out = [];
  const re = /<script\b([^>]*)\bsrc\s*=\s*"([^"]+)"([^>]*)>/g;
  let m;
  while ((m = re.exec(html))) out.push({ src: m[2], browser: /\bdata-browser\b/.test(m[1] + m[3]) });
  // 舊版 index.html（尚未標記 data-browser）時的後備規則
  if (!out.some((s) => s.browser)) for (const s of out) s.browser = /(^|\/)(render|input|main)(\.js$|\/)/.test(s.src);
  return out;
}

function load(opts) {
  opts = opts || {};
  const ctx = { console, Math, Set, Map, Object, Array, JSON, Number, String, Error, isFinite, performance: { now: () => 0 } };
  ctx.globalThis = ctx; vm.createContext(ctx);
  const files = [];
  for (const s of scriptList()) {
    if (s.browser && !(opts.render && /^js\/render(\.js$|\/)/.test(s.src))) continue;
    const file = path.join(ROOT, s.src);
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: s.src });
    files.push(s.src);
  }
  if (opts.noFx) ctx.BD.spawnFx = () => {}; // 全配對模擬不需要視覺特效（特效純視覺、不影響戰鬥）：略過可省約一半時間
  return { BD: ctx.BD, ctx, files };
}
module.exports = { load, scriptList, ROOT };
