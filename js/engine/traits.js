'use strict';
// Boss 特性（trait）：個別 Boss 的特殊機制，Boss 資料以 traits: [...] 啟用
//   counter：見切 / 彈反——架式（do:'counter'）期間被 Boss 直接攻擊時，閃到背後反斬
//   echo：影分身追斬——二階段每記斬擊 / 衝刺在 0.3 秒後由影子以 40% 威力重複
//   reflect：神虛視（亞當）——見切架式（counter 動作帶 reflect:true）看穿對手出招時，把整招複製成自己的反擊；二階段過載、將死時死立不倒
(function (G) {
  const BD = G.BD, K = BD.K;

  function triggerCounter(w, b, attacker) {
    const cs = BD.getStatus(b, 'counter'), p = (cs && cs.data) || { dmg: 150, posture: 60 };
    b.stats.counters++;
    w.fx.text(b.x, b.y - b.r - 30, p.name ? '彈反！' : '見切！', '#ffffff', 26);
    BD.spawnFx(w, p.fx || 'parry', b.x, b.y, { src: b }); w.hitstop = 0.12;
    if (p.slowmo) w.slowmo = Math.max(w.slowmo, p.slowmo); // 純演出：慢動作只影響實際播放速度
    w.log(b, (p.name ? '彈反成功，' : '見切成功，') + '看穿了 ' + attacker.name + ' 的攻擊！', true);
    if (!b._riposte) {
      b._riposte = BD.prepSkill({ id: 'riposte', name: p.name || '見切・反斬', track: 20, recovery: 0.35,
        actions: [{ do: 'blink', at: 0.06, to: 'behind', dist: 60 },
          { do: 'hit', at: 0.2, shape: 'cone', r: 140, arc: 2.4, dmg: p.dmg, posture: p.posture, kb: 380, fx: 'slash', unblockable: true, status: p.status }] });
    }
    b.cancelSkill(); b.state = 'idle';
    b.startSkill(b._riposte, { force: true });
  }
  BD.triggerCounter = triggerCounter;

  BD.defineTrait('counter', {
    // 在傷害結算前攔截：回傳非空值即中止此次傷害
    interceptDamage(w, b, src, p) {
      if (BD.hasStatus(b, 'counter') && src && src.isBoss && !p.dot && !p.unblockable) { triggerCounter(w, b, src); return 'countered'; }
      return null;
    },
  });

  function echo(w, b, s, a) {
    const copy = Object.assign({}, s);
    K.addTele(w, b, null, copy, 0.3, { detached: true, color: '#a070ff' });
    w.later(0.3, () => {
      if (b.state === 'dead') return;
      w.applyArea(b, copy, { dmg: a.dmg * 0.4, posture: (a.posture || 0) * 0.4, kb: (a.kb || 0) * 0.4 });
      const P = BD.parseFx(a.fx), isLine = P && (P.id === 'thrust' || P.id === 'cross');
      K.hitFx(w, b, copy, isLine ? 'cross' : 'slash', { color: '#b48cff' });
    });
  }
  BD.defineTrait('echo', {
    onHit(w, b, s, a) { if (b.phase === 2 && !a.multi) echo(w, b, s, a); },
    onDash(w, b, x0, y0, ang, a) { if (b.phase === 2) echo(w, b, { kind: 'rect', x: x0, y: y0, ang, len: a.dist, w: 60 }, Object.assign({ fx: 'cross' }, a.hit)); },
  });

  // ── reflect：神虛視（亞當）──
  // 帶 reflect:true 的見切架式被攻擊時，不用固定反斬，而是把對手「正在使出的整招」複製成自己的時間軸立刻打回去：
  // 只複製預警 / 判定 / 衝刺 / 投射物 / 噴發等攻擊動作，節奏壓到 0.6 倍、傷害 80%（原作：複製不會超越原招），同一招看第三次起 100%。
  const COPYABLE = new Set(['tele', 'hit', 'dash', 'proj', 'lob', 'erupt', 'zone']);
  function reflectCopy(b, src, seen) {
    const sk = src.inst.skill, acts = src.inst.v.actions.filter((a) => COPYABLE.has(a.do)).slice(0, 14);
    if (!acts.length) return null;
    const t0 = acts[0].at, mul = 0.8 + 0.1 * Math.min(2, seen), cap = (d) => Math.min(210, d * mul);
    const actions = acts.map((a) => {
      const c = Object.assign({}, a, { at: 0.12 + (a.at - t0) * 0.6 });
      if (a.dur != null && (a.do === 'tele' || a.do === 'dash')) c.dur = Math.max(0.15, a.dur * 0.6);
      if (a.hitIn != null) c.hitIn = a.hitIn * 0.6;
      if (a.dmg) c.dmg = cap(a.dmg);
      if (a.hit && a.hit.dmg) c.hit = Object.assign({}, a.hit, { dmg: cap(a.hit.dmg) });
      return c;
    });
    return BD.prepSkill({ id: 'reflect_copy', name: '神虛視・' + sk.name, track: 14, recovery: 0.35, actions });
  }
  BD.defineTrait('reflect', {
    interceptDamage(w, b, src, p) {
      const cs = BD.getStatus(b, 'counter');
      if (!(cs && cs.data && cs.data.reflect) || !src || !src.isBoss || !src.inst || p.dot || p.unblockable) return null;
      const seen = b._seen || (b._seen = {}), id = src.inst.skill.id, cp = reflectCopy(b, src, seen[id] || 0);
      if (!cp) return null; // 沒有可複製的攻擊動作：交給 counter 特性（固定反斬）
      seen[id] = (seen[id] || 0) + 1; b.stats.counters++;
      w.fx.text(b.x, b.y - b.r - 30, '神虛視！', '#ffe27a', 26);
      BD.spawnFx(w, 'divinesight', b.x, b.y, { src: b }); w.hitstop = 0.12; w.slowmo = Math.max(w.slowmo, 0.3);
      w.log(b, '神虛視——完整複製了 ' + src.name + ' 的【' + src.inst.skill.name + '】！', true);
      if (b.phase === 2) { // 眼睛過載：每複製一次損耗生命（不會因此倒下）
        b.hp = Math.max(1, b.hp - b.maxHp * 0.012); w.fx.text(b.x + 34, b.y - b.r - 8, '眼睛過載', '#ff5a5a', 16);
      }
      b.cancelSkill(); b.state = 'idle';
      b.startSkill(cp, { force: true });
      return 'countered';
    },
    // 二階段將死時死立不倒：生命鎖在 1、4 秒內無敵並全力出拳，時間到才倒下
    onLethal(w, b) {
      if (b._stood || b.phase !== 2) return false;
      b._stood = true; b.hp = 1; b.posture = 0; BD.applyStatus(b, 'deathstand', { dur: 4 }, w);
      w.fx.text(b.x, b.y - b.r - 36, '死立不倒', '#ffe27a', 30);
      BD.spawnFx(w, 'roar', b.x, b.y, { src: b, el: 'holy', flashColor: '#fff2c0' }); w.slowmo = Math.max(w.slowmo, 0.8);
      w.banner('死立不倒', b.name + ' 已超越極限，仍在揮拳', b.def.color);
      w.log(b, '生命耗盡，卻憑意志繼續站著揮拳！', true);
      return true;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
