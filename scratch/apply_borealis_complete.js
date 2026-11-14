const fs = require('fs');
const path = require('path');

const audioPath = path.resolve('js/audio.js');
let raw = fs.readFileSync(audioPath, 'utf8');
const isCrlf = raw.includes('\r\n');
let lines = raw.split(/\r?\n/);

console.log('Original lines count:', lines.length);

// 1. RAW files (SETS.raw.files)
const rawLineIdx = lines.findIndex(l => l.includes("golemBellow: ['roar_mid'], wardenImpact: ['slam_heavy'],"));
if (rawLineIdx === -1) throw new Error('rawLineIdx not found');
console.log('1. Found rawLineIdx:', rawLineIdx + 1);

const rawInsert = [
  "      borealisBreath: ['ice'], borealisRoarEpic: ['roar_big'], borealisRoar: ['roar_big', 'roar_mid'],",
  "      borealisSlam: ['slam_heavy'], borealisStomp: ['slam_thud'], borealisGrowl: ['roar_mid'],",
  "      borealisFreezeMagic: ['magic_cast'], borealisIceCast: ['ice'], borealisSnarl: ['roar_mid'],",
  "      borealisBite: ['hit_flesh_slice'], borealisFrostCreak: ['ice'], borealisIceCrack: ['ice'],",
  "      borealisIceBreak: ['hit_armor'], borealisFrostbite: ['ice'],"
];
lines.splice(rawLineIdx + 1, 0, ...rawInsert);

// 2. MC_SET files (SETS.mc_set.files)
const mcLineIdx = lines.findIndex(l => l.includes("wardenImpact: ['warden_impact1', 'warden_impact2'],"));
if (mcLineIdx === -1) throw new Error('mcLineIdx not found');
console.log('2. Found mcLineIdx:', mcLineIdx + 1);

const mcInsert = [
  "      borealisBreath: ['borealis_breath1', 'borealis_breath2', 'borealis_breath3'],",
  "      borealisRoarEpic: ['borealis_roar_epic'],",
  "      borealisRoar: ['borealis_roar_deep1', 'borealis_roar_deep2', 'borealis_roar_short1', 'borealis_roar_short2', 'borealis_roar_short3'],",
  "      borealisSlam: ['borealis_slam1', 'borealis_slam2'],",
  "      borealisStomp: ['borealis_stomp1', 'borealis_stomp2', 'borealis_stomp3'],",
  "      borealisGrowl: ['borealis_growl'],",
  "      borealisFreezeMagic: ['borealis_freeze_magic'],",
  "      borealisIceCast: ['borealis_ice_cast1', 'borealis_ice_cast2'],",
  "      borealisSnarl: ['borealis_snarl1', 'borealis_snarl2', 'borealis_snarl3'],",
  "      borealisBite: ['borealis_bite1', 'borealis_bite2', 'borealis_bite3'],",
  "      borealisFrostCreak: ['borealis_frost_creak1', 'borealis_frost_creak2', 'borealis_frost_creak3', 'borealis_frost_creak4'],",
  "      borealisIceCrack: ['borealis_ice_crack1', 'borealis_ice_crack2', 'borealis_ice_crack3', 'borealis_ice_crack4', 'borealis_ice_crack5'],",
  "      borealisIceBreak: ['borealis_ice_break1', 'borealis_ice_break2', 'borealis_ice_break3'],",
  "      borealisFrostbite: ['borealis_frostbite1', 'borealis_frostbite2'],"
];
lines.splice(mcLineIdx + 1, 0, ...mcInsert);

// 3. GAP
const gapLineIdx = lines.findIndex(l => l.includes('const LONG = 0.35, GAP = {'));
if (gapLineIdx === -1) throw new Error('gapLineIdx not found');
console.log('3. Found gapLineIdx:', gapLineIdx + 1);
lines[gapLineIdx] = lines[gapLineIdx].replace(
  "wardenImpact: 0.15 };",
  "wardenImpact: 0.15, borealisBreath: 0.22, borealisRoarEpic: 1.0, borealisRoar: 0.6, borealisSlam: 0.3, borealisStomp: 0.18, borealisGrowl: 0.8, borealisFreezeMagic: 0.35, borealisIceCast: 0.15, borealisSnarl: 0.2, borealisBite: 0.15, borealisFrostCreak: 0.1, borealisIceCrack: 0.08, borealisIceBreak: 0.08, borealisFrostbite: 0.18 };"
);

// 4. MAXLEN
const maxlenLineIdx = lines.findIndex(l => l.includes('const MAXLEN = {'));
if (maxlenLineIdx === -1) throw new Error('maxlenLineIdx not found');
console.log('4. Found maxlenLineIdx:', maxlenLineIdx + 1);
lines[maxlenLineIdx] = lines[maxlenLineIdx].replace(
  "wardenImpact: 0.8 };",
  "wardenImpact: 0.8, borealisBreath: 2.5, borealisRoarEpic: 3.8, borealisRoar: 2.5, borealisSlam: 2.2, borealisStomp: 1.5, borealisGrowl: 2.5, borealisFreezeMagic: 2.4, borealisIceCast: 1.4, borealisSnarl: 0.9, borealisBite: 0.8, borealisFrostCreak: 1.0, borealisIceCrack: 0.8, borealisIceBreak: 0.8, borealisFrostbite: 1.2 };"
);

// 5. tick(w, dt) handler for borealis: insert after adula block
const adulaIdx = lines.findIndex(l => l.includes("else if (b.def && b.def.id === 'adula') {"));
if (adulaIdx === -1) throw new Error('adulaIdx not found');
console.log('5. Found adulaIdx:', adulaIdx + 1);

let adulaEnd = -1;
for (let i = adulaIdx; i < lines.length; i++) {
  if (lines[i].includes('lastSkill.delete(b);') && lines[i+1].trim() === '}' && lines[i+2].trim() === '}') {
    adulaEnd = i + 2;
    break;
  }
}
if (adulaEnd === -1) throw new Error('adulaEnd not found');
console.log('Found adulaEnd:', adulaEnd + 1);

const borealisTick = [
  "      else if (b.def && b.def.id === 'borealis') {",
  "        // 二階段轉變開始：HP 50% 進入 transition，白霧再臨演出",
  "        if ((b.state === 'transition' || b.phase === 2) && !seenP2.has(b)) {",
  "          seenP2.add(b);",
  "          play('borealisFrostCreak', 0.9);   // 背脊霜線急速凝結龜裂，極寒張力",
  "          play('borealisGrowl', 0.85);        // 喉間深沉寒息低鳴",
  "          play('ambSnow', 0.8);               // 冰結湖暴雪狂風呼嘯",
  "          setTimeout(() => {",
  "            if (b.hp > 0 && b.state !== 'dead') {",
  "              play('borealisRoarEpic', 1.0);  // 昂首將整片寒霧吼向湖面！震撼全場的極寒巨龍長吼",
  "              play('shockwave', 0.9);         // 寒氣衝擊波擴散",
  "              play('borealisIceBreak', 0.85); // 湖面浮冰隨吼聲寸寸崩碎",
  "              play('windBurst', 0.8);",
  "            }",
  "          }, 1850); // 對齊 borealis.js phase2.roarAt = 1.85s",
  "        }",
  "        const curInst = b.inst;",
  "        const prevInst = lastSkill.get(b);",
  "        if (curInst && curInst !== prevInst) {",
  "          lastSkill.set(b, curInst);",
  "          const sid = curInst.skill && curInst.skill.id;",
  "          if (sid === 'ice_bite') {",
  "            play('borealisSnarl', 0.8);       // 冰牙前噬：龍吻猛張極寒嘶吼",
  "            play('dragonFlap', 0.5);          // 翼腕下壓借力前傾",
  "          } else if (sid === 'wing_sweep') {",
  "            play('dragonFlap', 0.85);         // 霜翼橫擊：粗重翼腕排山倒海揮出",
  "            play('windBurst', 0.75);          // 狂風呼嘯",
  "            play('metalWhoosh', 0.6);",
  "          } else if (sid === 'ice_stomp') {",
  "            play('borealisGrowl', 0.75);      // 踏冰揚霧：喉間沉吼蓄力",
  "            play('maceAir', 0.7);             // 重爪高抬下墜破空",
  "          } else if (sid === 'tail_whip') {",
  "            play('dragonFlap', 0.8);          // 迴身霜尾：粗壯龍尾回旋掃過",
  "            play('windSpin', 0.85);           // 龍身回旋烈風",
  "            play('borealisSnarl', 0.7);       // 回首連咬前低吼",
  "          } else if (sid === 'ice_breath') {",
  "            play('windCharge', 0.8);          // 冰霧直息：口前深吸寒霧",
  "            play('borealisFrostCreak', 0.75); // 喉腔冰晶凝結清脆聲",
  "          } else if (sid === 'sweeping_breath') {",
  "            play('windCharge', 0.85);         // 橫掃冰息：昂首蓄霧",
  "            play('dragonFlap', 0.7);          // 雙翼大張撐地蓄勢",
  "            play('borealisFrostCreak', 0.75);",
  "          } else if (sid === 'retreat_breath') {",
  "            play('dragonFlap', 0.9);          // 後撤俯息：雙翼暴振後掠",
  "            play('windBurst', 0.85);          // 烈風推動身軀後躍",
  "            play('windCharge', 0.75);         // 滯空急吸寒氣",
  "          } else if (sid === 'aerial_breath') {",
  "            play('dragonFlap', 0.95);         // 懸空覆霜：騰空懸停振翼",
  "            play('windCharge', 0.85);         // 冰龍長吸",
  "            play('borealisGrowl', 0.75);      // 空中威懾沉鳴",
  "          } else if (sid === 'dive_bomb') {",
  "            play('dragonFlap', 1.0);          // 冰翼撲落：巨翼劇烈拍擊直衝天際",
  "            play('windBurst', 0.9);",
  "            play('dash', 0.8);                // 騰空躍起",
  "          } else if (sid === 'freezing_roar') {",
  "            play('borealisGrowl', 0.85);      // 凍結咆哮：背脊寒光劇烈蓄能",
  "            play('borealisFrostCreak', 0.85); // 霜線骨節節節亮起鳴響",
  "            play('windCharge', 0.8);",
  "          } else if (sid === 'borealis_mist') {",
  "            play('borealisFreezeMagic', 0.95);// 龍饗・玻列琉斯的冰霧：遠古龍饗幻影降臨神聖共振",
  "            play('borealisGrowl', 0.85);      // 幻影巨首低鳴",
  "            play('bell', 0.7);",
  "            play('crystalResonate', 0.8);",
  "          } else if (sid === 'ult') {",
  "            play('borealisFreezeMagic', 1.0); // 永凍白幕 / 冰海葬場：終極大招全場冰封神鳴",
  "            play('ultCast', 0.95);            // 絕景儀式展開",
  "            play('borealisFrostCreak', 0.9);  // 萬年堅冰凝結爆裂聲",
  "            play('ambSnow', 0.9);             // 終極冰暴呼嘯",
  "          }",
  "        } else if (!curInst && prevInst) {",
  "          lastSkill.delete(b);",
  "        }",
  "      }"
];
lines.splice(adulaEnd + 1, 0, ...borealisTick);

// 6. Footstep handling: insert after lubu
const lubuIdx = lines.findIndex(l => l.includes("if (b.phase === 2 && b.def && b.def.id === 'lubu') {"));
if (lubuIdx === -1) throw new Error('lubuIdx not found');
console.log('6. Found lubuIdx:', lubuIdx + 1);

const footInsert = [
  "        } else if (b.def && b.def.id === 'borealis') {",
  "          play('borealisStomp', 0.35); // 玻列琉斯巨大冰龍爪踏在冰結湖上的沉重碎冰步"
];
lines.splice(lubuIdx + 2, 0, ...footInsert);

// 7. fx(id, category, o): replace old borealis fx block
const borealisFxIdx = lines.findIndex(l => l.trim() === "if (id.startsWith('borealis')) {");
if (borealisFxIdx === -1) throw new Error('borealisFxIdx not found');
console.log('7. Found borealisFxIdx:', borealisFxIdx + 1);

let borealisFxEnd = -1;
for (let i = borealisFxIdx; i < lines.length; i++) {
  if (lines[i].trim() === 'return;' && lines[i+1].trim() === '}') {
    borealisFxEnd = i + 1;
    break;
  }
}
if (borealisFxEnd === -1) throw new Error('borealisFxEnd not found');
console.log('Found borealisFxEnd:', borealisFxEnd + 1);

const newBorealisFx = [
  "      if (id.startsWith('borealis')) {",
  "        if (id === 'borealisroar') {",
  "          play('borealisRoar', 0.95);         // 凍結咆哮：冰龍昂首長嘯",
  "          play('shockwave', 0.85);            // 衝擊波破空",
  "          play('borealisIceBreak', 0.7);      // 冰面震碎",
  "          play('windBurst', 0.6);",
  "        } else if (id === 'borealisawaken') {",
  "          play('borealisRoarEpic', 0.95);     // 白霧再臨 / 大招覺醒：極寒遠古巨吼",
  "          play('borealisFrostCreak', 0.85);   // 霜線急凍",
  "          play('shockwave', 0.85);",
  "          play('ambSnow', 0.75);",
  "        } else if (id === 'borealiscrash') {",
  "          play('borealisSlam', 1.0);          // 冰翼墜湖：龐大冰龍身軀重重砸入湖面",
  "          play('slamHeavy', 0.9);             // 巨力砸地",
  "          play('borealisIceBreak', 0.95);     // 萬頃湖冰大崩裂",
  "          play('shockwave', 0.85);",
  "        } else if (id === 'borealisstomp') {",
  "          play('borealisStomp', 0.95);        // 踏冰裂紋：厚重翼腕重踏湖冰",
  "          play('borealisIceCrack', 0.85);     // 冰層開裂",
  "          play('slamHeavy', 0.75);",
  "        } else if (id === 'borealisbreath') {",
  "          play('borealisBreath', 0.85);       // 翻湧冰息：綿密刺骨冰霧噴吐",
  "          play('borealisIceCrack', 0.45);",
  "        } else if (id === 'borealisdownbreath') {",
  "          play('borealisBreath', 0.9);        // 懸空覆霜：俯衝灌地冰息",
  "          play('borealisStomp', 0.6);         // 氣流壓地震盪",
  "          play('dragonFlap', 0.5);",
  "        } else if (id === 'borealiscommunion') {",
  "          play('borealisFreezeMagic', 0.85);  // 龍饗冰霧：龍饗儀式寒冰神威",
  "          play('borealisBreath', 0.95);       // 巨型幻影龍首澎湃吐息",
  "          play('beaconBeam', 0.7);",
  "        } else if (id === 'borealisinhale') {",
  "          play('windCharge', 0.75);           // 深吸寒霧：空氣與冰屑倒灌入喉",
  "          play('borealisFrostCreak', 0.6);",
  "        } else if (id === 'borealisgather') {",
  "          play('borealisFrostCreak', 0.8);    // 霜線聚流：背脊寒光節節聚集",
  "          play('borealisIceCast', 0.7);",
  "          play('borealisGrowl', 0.65);",
  "        } else if (id === 'borealiswing') {",
  "          play('dragonFlap', 0.85);           // 重翼雪弧：翼腕狂暴橫掃",
  "          play('borealisSlam', 0.65);",
  "          play('windBurst', 0.75);",
  "          play('metalWhoosh', 0.6);",
  "        } else if (id === 'borealistail') {",
  "          play('windSpin', 0.9);              // 霜尾回旋：巨尾割裂冰風",
  "          play('borealisSlam', 0.75);",
  "          play('metalWhoosh', 0.65);",
  "          play('borealisSnarl', 0.6);",
  "        } else if (id === 'borealistakeoff') {",
  "          play('dragonFlap', 0.95);           // 冰翼騰空：雙翼劇烈拍打排開大片暴雪",
  "          play('windBurst', 0.8);",
  "          play('borealisFrostCreak', 0.5);",
  "        } else if (id === 'borealisbite') {",
  "          play('borealisBite', 0.95);         // 冰牙閉合：巨大龍顎狠狠咬合",
  "          play('borealisIceCrack', 0.8);      // 寒冰尖牙咬碎空氣與骨肉",
  "          play('borealisSnarl', 0.6);",
  "        } else if (id === 'borealisring') {",
  "          play('borealisIceCrack', 0.95);     // 外擴冰環：裂冰前緣沿湖面極速環形炸開",
  "          play('borealisIceBreak', 0.85);     // 冰凌崩射",
  "          play('borealisFreezeMagic', 0.75);",
  "          play('shockwave', 0.65);",
  "        } else if (id === 'borealisfog') {",
  "          play('borealisFrostCreak', 0.6);    // 冰結湖遺霧：被動霜線微鳴",
  "          play('ambSnow', 0.5);",
  "        } else if (id === 'borealisburst') {",
  "          play('borealisIceBreak', 1.0);      // 凍傷爆發：體內累積凍霜瞬間爆碎！",
  "          play('borealisFrostbite', 0.95);    // 徹骨極寒寒戰",
  "          play('crit', 0.85);",
  "          play('shockwave', 0.7);",
  "        } else if (id === 'borealisthaw') {",
  "          play('poison', 0.7);                // 回溫白氣：火焰融化碎霜，蒸氣升起",
  "          play('windAir', 0.5);",
  "        } else {",
  "          play('ice', 0.6);",
  "          play('windAir', 0.4);",
  "        }",
  "        return;",
  "      }"
];
lines.splice(borealisFxIdx, borealisFxEnd - borealisFxIdx + 1, ...newBorealisFx);

const output = lines.join(isCrlf ? '\r\n' : '\n');
fs.writeFileSync(audioPath, output, 'utf8');

console.log('SUCCESSFULLY_UPDATED_AUDIO_JS');
console.log('New lines count:', lines.length);
