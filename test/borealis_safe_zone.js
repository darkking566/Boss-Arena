'use strict';
// 同一組魔女安全圈機會，只評估新冰龍；正式總門檻與舊角色資料都不動。
const { load } = require('./lib/load');
const { BD } = load({ noFx: true }), U = BD.U, def = BD.bossById.borealis;
const candidates = process.argv[2] ? JSON.parse(process.argv[2]) : [[215, 0.2]];
for (const [speed, dodge] of candidates) for (const pace of ['light', 'heavy']) {
  def.speed = speed; def.ai.dodge = dodge; BD.clearPaceCache(); let ults = 0, inside = 0, rolls = 0, channel = 0;
  for (let n = 0; n < 12; n++) {
    const seed = (n >> 1) + 1, side = n & 1, w = side ? new BD.World(def, BD.bossById.witch, { seed, pace }) : new BD.World(BD.bossById.witch, def, { seed, pace });
    const wi = w.bosses[side ? 1 : 0], b = w.bosses[side ? 0 : 1], seen = new Map();
    for (let f = 0; f < 60 * 300 && !w.winner; f++) {
      w.step(BD.STEP);
      for (const t of w.telegraphs) if (t.owner === wi && t.shape.kind === 'except' && !seen.has(t)) seen.set(t, { d0: b.lastDodgeStart, skill: b.inst && b.inst.skill.id });
      for (const [t, rec] of seen) {
        if (rec.done || w.telegraphs.includes(t)) continue;
        rec.done = true; ults++;
        if (U.dist(b, t.shape) <= t.shape.r - b.r * 0.5) inside++; else if (rec.skill) channel++;
        if (b.lastDodgeStart !== rec.d0) rolls++;
      }
    }
  }
  console.log(JSON.stringify({ speed, dodge, pace, ults, inside, ratio: +(inside / ults).toFixed(3), rolls, failuresStartingInSkill: channel }));
}
