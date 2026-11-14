const fs = require('fs');
const path = require('path');

const js = fs.readFileSync('js/audio.js', 'utf8');

// 1. 檢查 mc_set
const m = js.match(/mc_set:\s*\{\s*ext:\s*'\.ogg',\s*files:\s*\{([\s\S]*?)\}\s*\}/);
if (!m) {
  console.error('Cannot match mc_set in audio.js');
  process.exit(1);
}

const filesObj = eval('({' + m[1] + '})');
const borealisKeys = Object.keys(filesObj).filter(k => k.startsWith('borealis'));
console.log('Found Borealis sound groups in mc_set:', borealisKeys.length);

let missing = 0;
let total = 0;

for (const k of borealisKeys) {
  for (const f of filesObj[k]) {
    total++;
    const p = path.join('audio/mc_set', f + '.ogg');
    if (!fs.existsSync(p)) {
      console.error('MISSING FILE:', p, 'in group', k);
      missing++;
    }
  }
}

console.log('Files check summary: Total = ' + total + ', Missing = ' + missing);

// 2. 檢查 GAP 與 MAXLEN 是否完整
const gapMatch = js.match(/const LONG = 0\.35,\s*GAP = \{([\s\S]*?)\};/);
const maxlenMatch = js.match(/const MAXLEN = \{([\s\S]*?)\};/);

if (!gapMatch) console.error('GAP definition not matched');
if (!maxlenMatch) console.error('MAXLEN definition not matched');

const LONG = 0.35;
const gapObj = eval('({' + gapMatch[1] + '})');
const maxlenObj = eval('({' + maxlenMatch[1] + '})');

for (const k of borealisKeys) {
  if (gapObj[k] === undefined) {
    console.error('Missing GAP for', k);
    missing++;
  } else {
    console.log('GAP for ' + k + ' = ' + gapObj[k]);
  }
  if (maxlenObj[k] === undefined) {
    console.error('Missing MAXLEN for', k);
    missing++;
  } else {
    console.log('MAXLEN for ' + k + ' = ' + maxlenObj[k]);
  }
}

// 3. 檢查 raw_set
const rawMatch = js.match(/raw:\s*\{\s*ext:\s*'\.mp3',\s*files:\s*\{([\s\S]*?)\}\s*\}/);
if (!rawMatch) {
  console.error('Cannot match raw set in audio.js');
  process.exit(1);
}
const rawObj = eval('({' + rawMatch[1] + '})');
for (const k of borealisKeys) {
  if (!rawObj[k]) {
    console.error('Missing raw fallback for', k);
    missing++;
  } else {
    console.log('raw fallback for ' + k + ' = ' + JSON.stringify(rawObj[k]));
  }
}

// 4. 檢查 tick(w, dt) 與 fx 裡的呼叫
const expectedCalls = [
  'borealisFrostCreak', 'borealisGrowl', 'borealisRoarEpic', 'borealisIceBreak',
  'borealisSnarl', 'dragonFlap', 'windBurst', 'metalWhoosh', 'maceAir',
  'windSpin', 'windCharge', 'dash', 'borealisFreezeMagic', 'borealisRoar',
  'borealisSlam', 'borealisStomp', 'borealisBreath', 'borealisIceCrack',
  'borealisBite', 'borealisFrostbite', 'shockwave', 'ambSnow'
];

for (const c of expectedCalls) {
  if (!js.includes("play('" + c + "'")) {
    console.error('Expected call play(\'' + c + '\') not found in audio.js');
    missing++;
  }
}

if (missing === 0) {
  console.log('\n=============================================');
  console.log('ALL BOREALIS AUDIO CHECKS PASSED 100% PERFECTLY!');
  console.log('=============================================');
} else {
  console.error('Total issues found:', missing);
  process.exit(1);
}
