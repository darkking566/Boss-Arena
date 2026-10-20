'use strict';
// Boss 特性（trait）：個別 Boss 的特殊機制，Boss 資料以 traits: [...] 啟用
//   counter：見切 / 彈反——架式（do:'counter'）期間被 Boss 直接攻擊時，閃到背後反斬
//   echo：影分身追斬——二階段每記斬擊 / 衝刺在 0.3 秒後由影子以 40% 威力重複
//   learn：一看就會（範馬勇次郎）——同一招每被他「看過」一次，下次的傷害與架勢傷害降低 12%（最多 36%）
//   tyrant：大海暴君（波賽頓）——每挨 4 下動怒（傷害與速度短暫提升）
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
    const col = b.def.echoColor || '#a070ff'; // 殘影的顏色（波賽頓的海藍殘影等）
    K.addTele(w, b, null, copy, 0.3, { detached: true, color: col });
    w.later(0.3, () => {
      if (b.state === 'dead') return;
      w.applyArea(b, copy, { dmg: a.dmg * 0.4, posture: (a.posture || 0) * 0.4, kb: (a.kb || 0) * 0.4 });
      const P = BD.parseFx(a.fx), isLine = P && (P.id === 'thrust' || P.id === 'cross');
      K.hitFx(w, b, copy, isLine ? 'cross' : 'slash', { color: b.def.echoColor || '#b48cff' });
    });
  }
  BD.defineTrait('echo', {
    onHit(w, b, s, a) { if (b.phase === 2 && !a.multi) echo(w, b, s, a); },
    onDash(w, b, x0, y0, ang, a) { if (b.phase === 2) echo(w, b, { kind: 'rect', x: x0, y: y0, ang, len: a.dist, w: 60 }, Object.assign({ fx: 'cross' }, a.hit)); },
  });

  // ── battlelust：鬥神狂喜（宙斯）——原作被亞當打中反而「開心得受不了」、青筋暴起肌肉再膨脹：一階段每挨 3 下（非持續傷害）進入狂喜 ──
  BD.defineTrait('battlelust', {
    interceptDamage(w, b, src, p) {
      if (b.phase !== 1 || p.dot || !src || BD.hasStatus(b, 'ecstasy') || BD.getMod(b, 'invuln')) return null;
      if ((b._lust = (b._lust || 0) + 1) < 3) return null;
      b._lust = 0; BD.applyStatus(b, 'ecstasy', {}, w);
      w.fx.text(b.x, b.y - b.r - 30, '太開心了！', '#ffd36a', 22);
      BD.spawnFx(w, 'awaken', b.x, b.y, { src: b, el: 'holy' });
      w.log(b, '越挨打越興奮——肌肉又膨脹了一圈！');
      return null; // 只計數，不攔截傷害
    },
  });

  // ── tyrant：大海暴君（波賽頓）——原作神極易動怒（連瀏海被削都要親自出手）：每挨 4 下（非持續傷害）就「動怒」，短時間傷害與速度提升 ──
  BD.defineTrait('tyrant', {
    interceptDamage(w, b, src, p) {
      if (p.dot || !src || BD.hasStatus(b, 'tyrantwrath') || BD.getMod(b, 'invuln')) return null;
      if ((b._wrath = (b._wrath || 0) + 1) < 4) return null;
      b._wrath = 0; BD.applyStatus(b, 'tyrantwrath', {}, w);
      w.fx.text(b.x, b.y - b.r - 30, '雜魚！', '#ffe27a', 26);
      BD.spawnFx(w, 'pressure', b.x, b.y, { src: b, el: 'ocean' });
      w.log(b, '被雜魚碰到了——海神動怒！');
      return null; // 只計數，不攔截傷害
    },
  });

  // ── reflect：神虛視（亞當）──
  // 帶 reflect:true 的見切架式被攻擊時（或已看過的招式再被打中時，每 4 秒一次），不用固定反斬，而是把對手「正在使出的整招」複製成自己的時間軸立刻打回去：
  // 只複製預警 / 判定 / 衝刺 / 投射物 / 噴發等攻擊動作，節奏壓到 0.6 倍、傷害 60%（原作：複製不會超越原招），同一招每多看一次 +10%、最高 80%。
  const REFLECT_GAP = 4;
  const COPYABLE = new Set(['tele', 'hit', 'dash', 'proj', 'lob', 'erupt', 'zone']);
  function reflectCopy(b, src, seen) {
    const sk = src.inst.skill, acts = src.inst.v.actions.filter((a) => COPYABLE.has(a.do)).slice(0, 14);
    if (!acts.length) return null;
    const t0 = acts[0].at, mul = 0.6 + 0.1 * Math.min(2, seen), cap = (d) => Math.min(210, d * mul);
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
      if (!src || !src.isBoss || !src.inst || p.dot || p.unblockable) return null;
      const cs = BD.getStatus(b, 'counter'), seen = b._seen || (b._seen = {}), id = src.inst.skill.id;
      // 架式中一定複製；沒擺架式時，「已經看過」的招式被打中也會自動複製（每 REFLECT_GAP 秒一次，且只在待機 / 出招中）
      const stance = cs && cs.data && cs.data.reflect, auto = seen[id] > 0 && w.time - (b._reflectAt || -99) > REFLECT_GAP && (b.state === 'idle' || b.state === 'skill');
      if (!stance && !auto) return null;
      const cp = reflectCopy(b, src, seen[id] || 0);
      if (!cp) return null; // 沒有可複製的攻擊動作：交給 counter 特性（固定反斬）
      seen[id] = (seen[id] || 0) + 1; b.stats.counters++; b._reflectAt = w.time;
      w.fx.text(b.x, b.y - b.r - 30, '神虛視！', '#ffe27a', 26);
      BD.spawnFx(w, 'divinesight', b.x, b.y, { src: b, el: 'replica' }); w.hitstop = 0.12; w.slowmo = Math.max(w.slowmo, 0.3);
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
      BD.spawnFx(w, 'roar', b.x, b.y, { src: b, el: 'replica', flashColor: '#ffd0dc' }); w.slowmo = Math.max(w.slowmo, 0.8);
      w.banner('死立不倒', b.name + ' 已超越極限，仍在揮拳', b.def.color);
      w.log(b, '生命耗盡，卻憑意志繼續站著揮拳！', true);
      return true;
    },
  });

  // ── crowsub：烏鴉分身（鼬）——原作他常以烏鴉分身代替本體挨打：每 14 秒一次，被直接攻擊命中時換成一群烏鴉四散，本體出現在後方 ──
  const CROWSUB_GAP = 14;
  BD.defineTrait('crowsub', {
    interceptDamage(w, b, src, p) {
      if (!src || !src.isBoss || p.dot || w.time - (b._crowAt == null ? -99 : b._crowAt) < CROWSUB_GAP || (b.state !== 'idle' && b.state !== 'skill')) return null;
      if (BD.getMod(b, 'invuln')) return null;
      b._crowAt = w.time;
      const a = BD.U.angTo(src, b), [x, y] = K.clampPt(b.x + Math.cos(a) * 190, b.y + Math.sin(a) * 190, b.r + 10);
      BD.spawnFx(w, 'crowburst', b.x, b.y, { src: b, toX: x, toY: y });
      b.x = x; b.y = y; w.confine(b); b.face = BD.U.angTo(b, src);
      w.fx.text(b.x, b.y - b.r - 30, '烏鴉分身！', '#ff6a7d', 24); w.hitstop = 0.08;
      BD.spawnProj(w, b, b, b.face, { n: 1, speed: 700, r: 22, dmg: 30, posture: 8, kb: 90, life: 1.2, homing: 3.5, kind: 'crow' }); // 替身的烏鴉群反撲：扇形 5 隻追蹤烏鴉
      for (const d of [-0.5, -0.25, 0.25, 0.5]) BD.spawnProj(w, b, b, b.face + d, { n: 1, speed: 700, r: 22, dmg: 30, posture: 8, kb: 90, life: 1.2, homing: 3.5, kind: 'crow' });
      w.log(b, '被打中的只是烏鴉分身——真身已在後方！', true);
      return 'dodged';
    },
  });

  // ── learn：一看就會（勇次郎）——原作他看一眼就能學會任何招式（郭海皇的消力）：同一招每施放一次（多段算一次）就被他「看過」一次，之後再被這招打中，傷害與架勢傷害各降 12%、最多 36% ──
  BD.defineTrait('learn', {
    interceptDamage(w, b, src, p) {
      if (!src || !src.isBoss || !src.inst || p.dot) return null;
      const id = src.inst.skill.id, seen = b._learn || (b._learn = {}), e = seen[id] || (seen[id] = { n: 0, inst: null });
      if (e.inst !== src.inst) { e.inst = src.inst; e.n++; if (e.n === 2) w.fx.text(b.x, b.y - b.r - 30, '看過了', '#ffb0a0', 20); }
      const cut = 1 - 0.12 * Math.min(3, e.n - 1);
      if (cut < 1) { p.dmg *= cut; if (p.posture != null) p.posture *= cut; }
      return null; // 只減傷，不攔截
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
