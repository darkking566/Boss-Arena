'use strict';
// 特效元素主題：任何特效 × 任何元素都能組合（例如 slam + fire = 熔岩砸地、slam + poison = 毒沼砸地）
// core 亮核心（additive 光、前緣）、glow 外光 / 主色、particle 粒子色、debris 碎塊色、smoke 煙塵、decal 地面痕跡、crack 裂縫內發光（null = 不發光）
// rim 對比邊緣色：刀光 / 震波 / 光束外緣的深色或反差描邊，讓同色系特效有輪廓、和地面分得開
// extra：額外粒子行為（實作在 js/engine/entities/fx.js 的 FX.motes）
// 純資料，不觸碰 DOM。
(function (G) {
  const BD = G.BD;
  BD.defineElement('physical', { rim: '#5a4630', debris: '#8c7b66', name: '物理', core: '#fff4e0', glow: '#ffd7a0', particle: '#d8c8b0', smoke: 'rgba(190,170,140,0.38)', decal: 'rgba(20,14,8,0.32)', crack: null, extra: 'dust' });
  BD.defineElement('fire', { rim: '#b8200a', debris: '#8a3a14', name: '火焰', core: '#fff1b8', glow: '#ff8a2a', particle: '#ffb347', smoke: 'rgba(70,40,30,0.45)', decal: 'rgba(40,10,0,0.38)', crack: '#ff6a1a', extra: 'embers' });
  BD.defineElement('ice', { rim: '#2a6fd6', debris: '#cfefff', name: '冰霜', core: '#f4feff', glow: '#9fe6ff', particle: '#dff6ff', smoke: 'rgba(200,235,255,0.35)', decal: 'rgba(170,225,255,0.22)', crack: '#bff3ff', extra: 'shards' });
  BD.defineElement('poison', { rim: '#2f5a0a', debris: '#5e7a2a', name: '劇毒', core: '#eaffb0', glow: '#9be15d', particle: '#b6ff5c', smoke: 'rgba(90,130,30,0.42)', decal: 'rgba(60,110,10,0.32)', crack: '#a8ff40', extra: 'bubbles' });
  BD.defineElement('shadow', { rim: '#14082a', debris: '#3a2a55', name: '暗影', core: '#e6d8ff', glow: '#9a6bff', particle: '#6b4aa8', smoke: 'rgba(30,20,45,0.6)', decal: 'rgba(20,10,35,0.42)', crack: '#7a4dff', extra: 'wisps' });
  BD.defineElement('umbra', { rim: '#000000', debris: '#2a1518', name: '影流', core: '#ffd6da', glow: '#e01e37', particle: '#1a0a0e', smoke: 'rgba(8,4,8,0.62)', decal: 'rgba(10,0,4,0.45)', crack: '#ff2a44', extra: 'wisps' });
  BD.defineElement('holy', { rim: '#c8800c', debris: '#e8d9a8', name: '聖光', core: '#fffef0', glow: '#ffe27a', particle: '#fff1b0', smoke: 'rgba(255,245,210,0.3)', decal: 'rgba(255,230,150,0.18)', crack: '#ffe9a0', extra: 'motes' });
  BD.defineElement('lightning', { rim: '#3a4cff', debris: '#5a6a88', name: '雷電', core: '#ffffff', glow: '#7fc8ff', particle: '#cfe9ff', smoke: 'rgba(120,150,200,0.3)', decal: 'rgba(10,20,40,0.35)', crack: '#a8dcff', extra: 'crackle' });
  BD.defineElement('blood', { rim: '#3a0008', debris: '#7a0a18', name: '血', core: '#ffd0d0', glow: '#d0102a', particle: '#9a0a1c', smoke: 'rgba(110,0,15,0.5)', decal: 'rgba(100,0,12,0.5)', crack: '#ff2a40', extra: 'drips' });
  BD.defineElement('replica', { rim: '#5a0a24', debris: '#8a2a48', name: '神虛視', core: '#fff0f4', glow: '#ff4f7e', particle: '#ffa0bc', smoke: 'rgba(255,120,150,0.3)', decal: 'rgba(120,20,50,0.3)', crack: '#ff6f95', extra: 'runes' });
  BD.defineElement('cosmos', { rim: '#1a0636', debris: '#3a2450', name: '星海', core: '#f3e8ff', glow: '#9b5cff', particle: '#d6b8ff', smoke: 'rgba(40,20,70,0.5)', decal: 'rgba(30,10,50,0.45)', crack: '#b07bff', extra: 'motes' });
  BD.defineElement('blackfire', { rim: '#000000', debris: '#0c0408', name: '黑炎', core: '#ffffff', glow: '#b3123c', particle: '#06020a', smoke: 'rgba(4,0,8,0.7)', decal: 'rgba(4,0,8,0.62)', crack: '#d81c4a', extra: 'embers' });
  BD.defineElement('dragon', { rim: '#12000a', debris: '#3a1018', name: '龍屬性', core: '#ffd9df', glow: '#d0143c', particle: '#2a0812', smoke: 'rgba(40,4,16,0.62)', decal: 'rgba(40,0,10,0.5)', crack: '#ff2a55', extra: 'crackle' });
  BD.defineElement('ocean', { rim: '#0a2f8a', debris: '#2c6a96', name: '大海', core: '#f2ffff', glow: '#35b6ff', particle: '#a8ecff', smoke: 'rgba(110,185,230,0.36)', decal: 'rgba(8,40,80,0.4)', crack: '#8fe6ff', extra: 'bubbles' });
  BD.defineElement('wind', { rim: '#2f7fa6', debris: '#b8d8e6', name: '風', core: '#ffffff', glow: '#9fe8ff', particle: '#e6fbff', smoke: 'rgba(210,240,255,0.32)', decal: 'rgba(160,210,235,0.18)', crack: null, extra: 'motes' });
  BD.defineElement('arcane', { rim: '#3a1a7a', debris: '#6a3a8a', name: '秘法', core: '#f6e8ff', glow: '#c77dff', particle: '#e0b8ff', smoke: 'rgba(120,60,170,0.35)', decal: 'rgba(60,20,90,0.3)', crack: '#d9a0ff', extra: 'runes' });
})(typeof window !== 'undefined' ? window : globalThis);
(function (G) {
  const BD = G.BD;
  // 投射物 / 區域 / 陷阱 / 拋射物的 kind → 元素（找不到時用 fallback，通常是施放者的元素）
  const KIND_EL = { fire: 'fire', flame: 'fire', lava: 'fire', meteor: 'fire', magma: 'fire',
    ice: 'ice', blizzard: 'ice', mine: 'ice', frost: 'ice',
    acid: 'poison', poison: 'poison', swarm: 'poison', egg: 'poison', spider: 'poison',
    kunai: 'physical', caltrops: 'physical', web: 'physical', clone: 'shadow', sentinel: 'shadow', watcher: 'shadow', crow: 'umbra', blackfire: 'blackfire', magatama: 'fire', rock: 'physical', tidewave: 'ocean', tide: 'ocean', tornado: 'wind', windblade: 'wind', goldbeam: 'holy', holydagger: 'holy', holysword: 'holy', stormblade: 'wind', firerock: 'fire' };
  BD.KIND_EL = KIND_EL;
  BD.kindElement = function (kind, fallback) { return KIND_EL[kind] || fallback || 'physical'; };
})(typeof window !== 'undefined' ? window : globalThis);
