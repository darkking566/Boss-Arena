'use strict';
// Boss 資料共用小工具（純資料產生器，不含邏輯）：角度常數、「預警 + 判定」組合、「預警 + 衝刺」組合
// 時間軸動作 do: tele 預警 / hit 判定 / dash 衝刺 / proj 投射物 / lob 拋射 / zone 區域 / trap 陷阱 /
//   summon 召喚 / blink 閃現 / counter 見切 / hide,land 隱身與落地 / erupt 連續爆發 / rain 流星雨 /
//   slashes 連續斬線 / appear 現身 / invuln 無敵 / circle 繞圈衝刺
(function (G) {
  const BD = G.BD;
  const D = Math.PI / 180;
  // 預警 + 判定 的組合
  function strike(at, tele, shape, hitp) {
    return [
      Object.assign({ do: 'tele', at: at - tele, dur: tele, follow: true }, shape),
      Object.assign({ do: 'hit', at }, shape, hitp),
    ];
  }
  function dashStrike(at, tele, len, w, dur, hit, extra) {
    return [
      { do: 'tele', at: at - tele, dur: tele, shape: 'rect', len, w, follow: true },
      Object.assign({ do: 'dash', at, dist: len, dur, hit }, extra || {}),
    ];
  }
  BD.DataKit = { D, strike, dashStrike };
})(typeof window !== 'undefined' ? window : globalThis);
