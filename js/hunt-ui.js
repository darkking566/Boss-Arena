'use strict';
// 獵魂模式據點介面（僅瀏覽器）：出擊 / 武器 / 靈魂能力 / 鍛造 / 強化 五個分頁。資料與規則都在 BD.Hunt（js/engine/hunt.js），這裡只負責畫面與存檔（localStorage）。
(function (G) {
  const BD = G.BD, H = BD.HUNT, Hunt = BD.Hunt, KEY = 'bd.hunt.save';
  const TABS = [['go', '⚔ 出擊'], ['weapon', '🗡 武器'], ['soul', '👻 靈魂能力'], ['forge', '🛡 鍛造'], ['upg', '✨ 強化']];
  const KIND = { skill: '技能', ult: '大招', passive: '被動' };
  const ui = { tab: 'go', boss: null, target: null, pay: null, msg: '', save: null, root: null, hooks: null };

  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* file:// 下可能不可用 */ }
    return Hunt.sanitize(raw);
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(ui.save)); } catch (e) { /* ignore */ } }
  const def = (id) => BD.bossById[id];
  const souls = (id) => ui.save.souls[id] || 0;
  const chip = (id, sel, attr) => `<button class="chip${sel ? ' sel' : ''}" data-${attr}="${id}" style="border-color:${def(id).color}"><b style="color:${def(id).color}">${def(id).name}</b><i>👻 ${souls(id)}</i></button>`;
  const chips = (attr, selId) => `<div class="chips">${BD.bosses.map((b) => chip(b.id, b.id === selId, attr)).join('')}</div>`;

  function viewGo() {
    const lo = ui.save.loadout, wp = H.WEAPON_BY_ID[lo.weapon], st = Hunt.stats(ui.save);
    const names = lo.skills.map((k) => Hunt.abilityByKey(k).name).join('、') || '（無）';
    const ult = lo.ult ? Hunt.abilityByKey(lo.ult).name : '（無）';
    const pass = lo.passives.map((k) => Hunt.abilityByKey(k).name).join('、') || '（無）';
    const sets = Hunt.setsOf(ui.save).map((s) => `${H.BOSS_META[s.boss].short}${s.n >= 4 ? '四' : '二'}件套`).join('、') || '（無）';
    const maps = BD.MAPS.map((m) => `<option value="${m.id}"${m.id === ui.map ? ' selected' : ''}>${m.icon} ${m.name}</option>`).join('');
    return `<div class="h-sum"><div><b>武器</b> ${wp.icon} ${wp.name}　<b>技能</b> ${names}　<b>大招</b> ${ult}</div>
      <div><b>被動</b> ${pass}　<b>套裝</b> ${sets}</div>
      <div class="dim">${Hunt.describeMods(st.mods) || '沒有額外加成'}</div></div>
      <h3>選擇要挑戰的 Boss（擊敗可獲得該 Boss 的靈魂，可無限重複挑戰）</h3>
      <div class="h-bosses">${BD.bosses.map((b) => `<div class="h-boss${b.id === ui.target ? ' sel' : ''}" data-target="${b.id}" style="border-color:${b.color}">
        <b style="color:${b.color}">${b.name}</b><span>${b.title}</span><span class="dim">HP ${b.maxHp}　已擊敗 ${ui.save.kills[b.id] || 0} 次</span><span>👻 ${souls(b.id)}</span></div>`).join('')}</div>
      <div class="opts"><label>地圖 <select id="hMap">${maps}</select></label>
      <label title="由 AI 操控主角，與玩家同樣限制（需在揮刀窗內彈刀）"><input type="checkbox" id="hAgent"${ui.agent ? ' checked' : ''}> 代理（AI 自動戰鬥）</label>
      <button class="primary" id="hGo">⚔ 挑戰 ${ui.target ? def(ui.target).name : '（請先選擇 Boss）'}</button></div>`;
  }
  function viewWeapon() {
    return `<h3>武器（其餘武器之後開放）</h3><div class="h-grid">${H.WEAPONS.filter((w) => !w.hidden).map((w) => `<div class="h-card${w.id === ui.save.loadout.weapon ? ' sel' : ''}" data-weapon="${w.id}">
      <b>${w.icon} ${w.name}</b><p>${w.desc}</p><div class="dim">${w.skills.map((s) => s.name).join(' / ')}${Object.keys(w.bonus).length ? '　加成：' + Hunt.describeMods(w.bonus) : ''}</div></div>`).join('')}</div>`;
  }
  function viewSoul() {
    const lo = ui.save.loadout, b = ui.boss;
    const rows = Hunt.abilitiesOf(b).map((a) => {
      const on = a.kind === 'ult' ? lo.ult === a.key : (a.kind === 'skill' ? lo.skills : lo.passives).includes(a.key), owned = ui.save.unlocked[a.key];
      return `<div class="h-row${on ? ' sel' : ''}"><span class="tag ${a.kind}">${KIND[a.kind]}</span><b>${a.name}</b><span class="dim">${a.desc}</span>
        ${owned ? `<button data-toggle="${a.key}">${on ? '卸下' : '裝備'}</button>` : `<button class="primary" data-unlock="${a.key}">解鎖（👻 ${a.cost}）</button>`}</div>`;
    }).join('');
    return `<h3>用 Boss 的靈魂解鎖其招式 / 被動（技能 ${lo.skills.length}/${H.SKILL_SLOTS}　被動 ${lo.passives.length}/${H.PASSIVE_SLOTS}　大招 ${lo.ult ? 1 : 0}/1）</h3>
      ${chips('boss', b)}<div class="h-rows">${rows}</div>
      <div class="dim">借用的招式消耗法力、威力為原招的 ${Math.round(H.BASE.soulMul * 100)}%（可由「魂力」強化提升），按 Q E R F 施放；大招按 X。</div>`;
  }
  function viewForge() {
    const b = ui.boss, meta = H.BOSS_META[b], eq = ui.save.equip;
    const pieces = H.SLOTS.map((s) => {
      const p = Hunt.piece(b, s.id), made = ui.save.crafted[p.key], worn = eq[s.id] === b;
      return `<div class="h-row${worn ? ' sel' : ''}"><span class="tag skill">${s.name}</span><b>${p.name}</b><span class="dim">${p.desc}</span>
        ${made ? `<button data-wear="${s.id}:${worn ? '' : b}">${worn ? '卸下' : '穿上'}</button>` : `<button class="primary" data-craft="${s.id}">製作（👻 ${H.COST.gear}）</button>`}</div>`;
    }).join('');
    const cur = H.SLOTS.map((s) => `<span class="chip2">${s.name}：${eq[s.id] ? Hunt.piece(eq[s.id], s.id).name : '—'}</span>`).join('');
    const sets = Hunt.setsOf(ui.save).map((s) => s.bonuses.map((x, i) => `<div>✔ ${H.BOSS_META[s.boss].short}${i ? '四' : '二'}件套【${x.name}】${Hunt.describeMods(x.mods)}</div>`).join('')).join('') || '<div class="dim">尚無生效的套裝（同一位 Boss 的裝備穿滿 2 / 4 件）</div>';
    return `<h3>用 Boss 的靈魂鍛造其裝備（一顆靈魂一件；同一位 Boss 的 2 件 / 4 件有套裝獎勵）</h3>${chips('boss', b)}
      <div class="h-rows">${pieces}</div>
      <div class="dim">二件套【${meta.set2.name}】${Hunt.describeMods(meta.set2.mods)}　｜　四件套【${meta.set4.name}】${Hunt.describeMods(meta.set4.mods)}</div>
      <h3>目前穿戴</h3><div>${cur}</div><div class="h-sets">${sets}</div>`;
  }
  function viewUpg() {
    const pay = ui.pay || BD.bosses.slice().sort((a, b) => souls(b.id) - souls(a.id))[0].id;
    const rows = H.UPGRADES.map((u) => {
      const lv = ui.save.upg[u.id] || 0, max = lv >= u.max, eff = u.unit === '%' ? `+${Math.round(u.per * 100)}%` : `+${u.per}`;
      return `<div class="h-row"><b>${u.name}</b><span class="dim">Lv.${lv}/${u.max}　每級 ${eff}</span>
        ${max ? '<button disabled>已滿級</button>' : `<button class="primary" data-upg="${u.id}">升級（👻 ${Hunt.upgradeCost(ui.save, u.id)}）</button>`}</div>`;
    }).join('');
    return `<h3>用靈魂強化基礎數值（可用任一位 Boss 的靈魂支付）</h3><div class="dim">支付靈魂來源：</div>${chips('pay', pay)}<div class="h-rows">${rows}</div>`;
  }
  const VIEWS = { go: viewGo, weapon: viewWeapon, soul: viewSoul, forge: viewForge, upg: viewUpg };

  function render() {
    const r = ui.root, total = Object.values(ui.save.souls).reduce((a, b) => a + b, 0);
    r.querySelector('.h-tabs').innerHTML = TABS.map(([id, n]) => `<button class="tab${id === ui.tab ? ' on' : ''}" data-tab="${id}">${n}</button>`).join('') + `<span class="h-total">👻 靈魂總數 ${total}</span>`;
    r.querySelector('.h-body').innerHTML = VIEWS[ui.tab]();
    r.querySelector('.h-msg').textContent = ui.msg;
  }
  function act(res) { ui.msg = res.msg; persist(); render(); }

  function create(app, hooks) {
    ui.hooks = hooks; ui.save = load(); ui.boss = ui.target = BD.bosses[0].id; ui.map = BD.DEFAULT_MAP;
    const r = ui.root = document.createElement('div');
    r.id = 'hunt'; r.className = 'screen hidden';
    r.innerHTML = `<div class="sel-wrap h-wrap"><h1>獵魂<span>據點</span></h1><p class="sub">挑戰 Boss、奪取靈魂，把牠們的力量化為己用</p>
      <div class="h-tabs"></div><div class="h-body"></div><div class="h-msg"></div>
      <div class="btns"><button id="hBack">↩ 回到選單</button></div></div>`;
    app.appendChild(r);
    r.addEventListener('click', (e) => {
      const el = e.target.closest('[data-tab],[data-target],[data-weapon],[data-boss],[data-pay],[data-unlock],[data-toggle],[data-craft],[data-wear],[data-upg],#hGo,#hBack');
      if (!el) return;
      const d = el.dataset, S = ui.save;
      if (el.id === 'hBack') { hooks.onBack(); return; }
      if (el.id === 'hGo') { if (ui.target) hooks.onStart(ui.target, ui.map, ui.agent); return; }
      if (d.tab) { ui.tab = d.tab; ui.msg = ''; } else if (d.target) ui.target = d.target;
      else if (d.weapon) { S.loadout.weapon = d.weapon; persist(); } else if (d.boss) ui.boss = d.boss; else if (d.pay) ui.pay = d.pay;
      else if (d.unlock) return act(Hunt.unlock(S, d.unlock)); else if (d.toggle) return act(Hunt.toggle(S, d.toggle));
      else if (d.craft) return act(Hunt.craft(S, ui.boss, d.craft));
      else if (d.wear) { const [slot, id] = d.wear.split(':'); return act(Hunt.equip(S, slot, id || null)); }
      else if (d.upg) return act(Hunt.upgrade(S, d.upg, ui.pay || BD.bosses.slice().sort((a, b) => souls(b.id) - souls(a.id))[0].id));
      render();
    });
    r.addEventListener('change', (e) => { if (e.target.id === 'hMap') ui.map = e.target.value; else if (e.target.id === 'hAgent') ui.agent = e.target.checked; });
  }
  BD.HuntUI = {
    create, render, getSave: () => ui.save, persist, hide() { ui.root.classList.add('hidden'); },
    open(msg) { ui.msg = msg || ''; ui.root.classList.remove('hidden'); render(); },
    setMap(id) { ui.map = id; },
  };
})(window);
