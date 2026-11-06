'use strict';
// 自繪，不載入第三方素材。依已查看遊戲圖 / 模型：兩翼肢＋兩後腿、灰白分枝菌絲、暗紅傷口。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U, TAU = U.TAU;
  const IVORY = '#dfd9c5', DARK = '#403e37', GREY = '#79776b', WOUND = '#79372f';
  // 決定性分枝，烘入部位精靈；每幀不重建數百條菌絲。
  function branch(g, x, y, a, len, width) {
    g.strokeStyle = IVORY; g.lineWidth = width; g.lineCap = 'round';
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + len * 0.25, y + Math.sin(a) * len * 0.5, ex, ey); g.stroke();
    for (let j = 1; j <= 3; j++) {
      const u = j / 4, sx = U.lerp(x, ex, u), sy = U.lerp(y, ey, u), aa = a + (j % 2 ? 0.7 : -0.8), l = len * (0.4 - j * 0.045);
      g.lineWidth = width * 0.65; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(aa) * l, sy + Math.sin(aa) * l); g.stroke();
    }
  }
  function fungus(g, r, n, rx, ry) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, d = Math.sqrt((i + 0.5) / n), x = Math.cos(a) * rx * d, y = Math.sin(a) * ry * d;
      branch(g, x, y, a + Math.sin(i * 1.7), r * (0.16 + 0.17 * ((i * 7 % 13) / 13)), Math.max(0.8, r * 0.017));
    }
  }
  function wing(g, r) {
    R.blit(g, 'ekzykes:wing:'+r, r*3.1, r*3.1, r*1.7, r*0.18, c => {
      const wx=r*.45, wy=r*1.25, tx=-r*.15, ty=r*2.65;
      c.fillStyle='#47483e';c.strokeStyle='#292b25';c.lineWidth=r*.035;
      c.beginPath();c.moveTo(0,0);c.lineTo(wx,wy);c.lineTo(tx,ty);
      for(let i=0;i<7;i++){
        const u=(i+1)/7,ex=-r*(.2+1.18*u),ey=r*(2.65*(1-u)+.1);
        c.quadraticCurveTo(ex+r*.16,ey+r*.25,ex,ey);
      }
      c.lineTo(-r*.5,0);c.closePath();c.fill();c.stroke();
      // 翼骨與仍然可辨的破翼膜，菌絲沿骨架聚生。
      c.strokeStyle=GREY;c.lineWidth=r*.12;c.beginPath();c.moveTo(0,0);c.lineTo(wx,wy);c.lineTo(tx,ty);c.stroke();
      c.strokeStyle='#b5b29c';c.lineWidth=r*.035;c.beginPath();c.moveTo(0,-r*.01);c.lineTo(wx-r*.02,wy);c.lineTo(tx,ty);c.stroke();
      for(let j=0;j<13;j++){const u=j/13;branch(c,U.lerp(wx,tx,u),U.lerp(wy,ty,u),-.6,r*(.24+.08*(j%3)),r*.021);}
      for(let i=0;i<4;i++){
        const ex=-r*(.4+i*.28),ey=r*(2.3-i*.57);
        c.strokeStyle='#9e9d8b';c.lineWidth=r*.045;c.beginPath();c.moveTo(wx,wy);c.lineTo(ex,ey);c.stroke();
        for(let j=0;j<7;j++){const u=j/7;branch(c,U.lerp(wx,ex,u),U.lerp(wy,ey,u),Math.PI+.3*i,r*(.17+.05*(j%3)),r*.019);}
      }
      c.fillStyle=WOUND;for(let i=0;i<5;i++){c.beginPath();c.ellipse(-r*(.3+.16*i),r*(1.8-i*.23),r*.16,r*.06,-.5,0,TAU);c.fill();}
      c.save();c.translate(-r*.15,r*1.12);fungus(c,r,45,r*.95,r*.9);c.restore();
      for(let i=0;i<3;i++){c.strokeStyle='#c7bea5';c.lineWidth=r*.03;c.beginPath();c.moveTo(wx,wy);c.lineTo(wx+r*(.18+i*.08),wy+r*(.12-i*.12));c.stroke();}
    });
  }
  function torso(g,r,phase){
    R.blit(g,'ekzykes:torso:'+r+':'+phase,r*2.7,r*1.9,r*1.45,r*.95,c=>{
      const gr=c.createLinearGradient(0,-r*.6,0,r*.6);gr.addColorStop(0,DARK);gr.addColorStop(.5,'#8a897a');gr.addColorStop(1,'#33372f');
      c.fillStyle=gr;c.beginPath();c.ellipse(-r*.15,0,r*.95,r*.53,0,0,TAU);c.fill();
      for(let i=0;i<9;i++){const x=-r*.85+i*r*.17;c.strokeStyle='#a2a08d';c.lineWidth=r*.045;c.beginPath();c.ellipse(x,0,r*.15,r*.44,0,-1.2,1.2);c.stroke();}
      c.fillStyle=WOUND;for(let i=0;i<5;i++){c.beginPath();c.ellipse(r*(.55-i*.29),r*(i%2?.23:-.2),r*.15,r*.09,.6,0,TAU);c.fill();}
      fungus(c,r,75,r*.89,r*.46);
    });
  }
  function head(g,r,jaw){
    g.save();g.fillStyle='#251d18';g.beginPath();g.moveTo(0,-r*.12);g.lineTo(r*.74,-r*(.08+jaw));g.lineTo(r*.82,0);g.lineTo(r*.74,r*(.08+jaw));g.lineTo(0,r*.12);g.closePath();g.fill();
    g.fillStyle='#a46655';g.beginPath();g.ellipse(r*.4,0,r*.3,r*(.035+jaw*.45),0,0,TAU);g.fill();
    R.blit(g,'ekzykes:head:'+r,r*1.7,r*1.4,r*.65,r*.7,c=>{
      for(const s of [-1,1]){c.strokeStyle='#aaa48e';c.lineWidth=r*.07;c.beginPath();c.moveTo(0,s*r*.15);c.quadraticCurveTo(-r*.35,s*r*.52,-r*.55,s*r*.5);c.stroke();}
      c.fillStyle='#777667';c.beginPath();c.moveTo(-r*.18,-r*.19);c.quadraticCurveTo(r*.3,-r*.26,r*.77,-r*.055);c.lineTo(r*.83,0);c.lineTo(r*.77,r*.055);c.quadraticCurveTo(r*.3,r*.26,-r*.18,r*.19);c.closePath();c.fill();
      c.save();c.translate(r*.13,0);fungus(c,r,38,r*.48,r*.19);c.restore();
      for(const s of [-1,1]){c.fillStyle='#eddda7';c.beginPath();c.ellipse(r*.14,s*r*.13,r*.045,r*.026,s*.4,0,TAU);c.fill();c.fillStyle='#4c3223';c.fillRect(r*.135,s*r*.13-r*.02,r*.01,r*.04);}
    });
    for(let i=0;i<7;i++)for(const s of [-1,1]){const x=r*(.18+i*.075);g.fillStyle='#d6c9ab';g.beginPath();g.moveTo(x,s*r*(.12+jaw*.3));g.lineTo(x+r*.025,s*r*.025);g.lineTo(x+r*.045,s*r*(.12+jaw*.3));g.fill();}
    g.restore();
  }
  function dragon(g,o,t,r,st,air){
    const inst=o.inst,id=inst?inst.skill.id:'',time=inst?inst.t:0,p2=o.phase===2;
    const casting=['sweeping_breath','tracking_breath','retreat_breath','great_miasma','ekzykes_decay','ult'].includes(id);
    const a=inst?R.skillPace(inst,{hit:1,dash:1}):{wind:0,snap:0};
    let yaw=casting&&id==='sweeping_breath'?Math.cos(Math.max(0,time-1.1)*1.5)*.85:Math.sin(t*1.1)*.08;
    if(id==='double_bite'||id==='tail_whip')yaw+=(a.wind-a.snap)*.5;
    const spread=air?.95:st==='transition'?.8:id==='wing_sweep'?.65+Math.sin(time*5)*.2:.28+Math.sin(t*1.4)*.025;
    // 長尾：有節的灰黑肉體，灰白菌絲貼著尾背，遠端自然收細。
    let px=-r*.8,py=0;
    for(let i=0;i<17;i++){
      const u=i/16,nx=-r*(.8+2.8*u),ny=Math.sin(t*1.3-u*2)*r*u*.4+(id==='tail_whip'?Math.sin(time*4)*r*u*u:0);
      g.strokeStyle=i%2?GREY:DARK;g.lineWidth=r*(.28*(1-u)+.035);g.lineCap='round';g.beginPath();g.moveTo(px,py);g.lineTo(nx,ny);g.stroke();
      if(i%2===0)branch(g,nx,ny,-Math.PI*.8,r*.15*(1-u)+r*.04,Math.max(.7,r*.012));px=nx;py=ny;
    }
    // 只有兩隻後腿；前方的爪屬於翅膀。
    for(const s of [-1,1]){
      const step=st==='idle'&&o.moveX?Math.sin(t*7+s)*r*.12:0;
      g.fillStyle=DARK;g.beginPath();g.ellipse(-r*.6+step,s*r*.59,r*.37,r*.2,-s*.3,0,TAU);g.fill();
      for(let j=0;j<3;j++){g.strokeStyle='#c6bda3';g.lineWidth=r*.025;g.beginPath();g.moveTo(-r*.38+step,s*r*(.5+j*.08));g.lineTo(-r*.14+step,s*r*(.51+j*.09));g.stroke();}
    }
    for(const s of [-1,1]){g.save();g.translate(r*.25,s*r*.3);g.scale(1,s);g.rotate(-.9*(1-spread)+(air?Math.sin(t*7)*.15:0));g.scale(1,.4+.6*spread);wing(g,r);g.restore();}
    torso(g,r,p2?2:1);
    if(p2){g.save();g.globalAlpha=.3+.16*Math.sin(t*4);g.fillStyle='#c15845';g.beginPath();g.ellipse(-r*.1,0,r*.76,r*.34,0,0,TAU);g.fill();g.restore();}
    // 分節長頸的白色菌絲隨頭部擺動。
    g.save();g.translate(r*.65,0);
    for(let i=0;i<4;i++){g.rotate(yaw/4);g.strokeStyle=GREY;g.lineWidth=r*(.34-i*.035);g.beginPath();g.moveTo(0,0);g.lineTo(r*.27,0);g.stroke();for(const s of [-1,1])branch(g,r*.08,s*r*.08,s*1.9,r*.23,r*.017);g.translate(r*.25,0);}
    const jaw=casting||st==='transition'?.14:.035+(id==='double_bite'?a.snap*.16:0);head(g,r,jaw);
    if(casting||st==='transition'){g.fillStyle='rgba(201,91,66,0.3)';g.beginPath();g.ellipse(r*.45,0,r*.32,r*.12,0,0,TAU);g.fill();}
    g.restore();
    // 輕薄孢子環境演出，不影響狀態或亂數。
    for(let i=0;i<(p2?18:9);i++){const a0=i*2.4,ph=(t*.32+i*.17)%1;g.fillStyle=R.hexA(IVORY,(1-ph)*.55);g.beginPath();g.arc(Math.cos(a0)*r*(.6+ph),Math.sin(a0)*r*.9-ph*r*.45,Math.max(.7,r*.013),0,TAU);g.fill();}
  }
  R.defineBossStyle('ekzykes',{
    body(g,o,t,k){
      const air=o.inst&&['retreat_breath','ekzykes_decay'].includes(o.inst.skill.id),age=o.inst?o.inst.t:0,h=air?Math.sin(U.clamp(age/3,0,1)*Math.PI)*k.r*.6:0;
      g.save();if(h)g.translate(-Math.sin(o.face||0)*h,-Math.cos(o.face||0)*h);dragon(g,o,t,k.r,k.st,!!air);g.restore();
    },
    hidden(g,b,t){
      const inst=b.inst;if(!inst)return;const land=inst.v.actions.find(a=>a.do==='land'&&a.at>inst.t),hide=inst.v.actions.filter(a=>a.do==='hide'&&a.at<=inst.t).pop();
      const mark=(land&&inst.marks[land.mark])||b.enemy||b,p=land&&hide?U.clamp((inst.t-hide.at)/(land.at-hide.at),0,1):.5;
      const x=U.lerp(b.x,mark.x,p),y=U.lerp(b.y,mark.y,p),h=Math.sin(p*Math.PI)*b.r*1.45;
      g.save();g.fillStyle='rgba(35,20,16,0.35)';g.beginPath();g.ellipse(x,y,b.r*1.8,b.r,0,0,TAU);g.fill();g.translate(x,y-h);g.rotate(b.face);dragon(g,b,t,b.r,'skill',true);g.restore();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
