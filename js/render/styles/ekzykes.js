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
  // ───────── 姿勢（讀實際時間軸；沉重節奏會拉長預警，不能寫死秒數）─────────
  const cl=v=>U.clamp(v,0,1),ease=v=>{v=cl(v);return v*v*(3-2*v);};
  const fxId=a=>typeof a.fx==='string'?a.fx:a.fx&&a.fx.id;
  const INFO=new WeakMap();
  function info(inst){
    let I=INFO.get(inst.v);if(I)return I;
    const A=inst.v.actions,of=k=>A.filter(a=>a.do===k),hits=of('hit');
    I={hits,breath:hits.filter(a=>fxId(a)==='ekzykesbreath'),fog:hits.filter(a=>fxId(a)==='ekzykesmiasma'&&a.shape==='circle'),
      ring:hits.filter(a=>a.shape==='ring'),dash:of('dash'),hide:of('hide'),land:of('land'),tele:of('tele')};
    INFO.set(inst.v,I);return I;
  }
  // 離地程度 0~1：後躍洩腐、龍饗吐息在空中
  function elev(inst){
    if(!inst)return 0;
    const I=info(inst),T=inst.t,id=inst.skill.id;let a,b;
    if(id==='retreat_breath'&&I.dash[0]&&I.fog.length){a=I.dash[0].at;b=I.fog[I.fog.length-1].at+.25;}
    else if(id==='ekzykes_decay'&&I.breath.length){a=I.tele[0]?I.tele[0].at:0;b=I.breath[I.breath.length-1].at+.25;}
    else return 0;
    return ease((T-a)/.5)*(1-ease((T-b)/.45));
  }
  function breathAng(list,t){
    if(t<=list[0].at)return list[0].angOff||0;
    for(let i=1;i<list.length;i++)if(t<list[i].at){const a=list[i-1],b=list[i];return U.lerp(a.angOff||0,b.angOff||0,(t-a.at)/(b.at-a.at));}
    return list[list.length-1].angOff||0;
  }
  // sp 翼張開、fl 拍動（+ 上舉）、sw 前後擺（+ 往前）、lift 後腿抬起；索引 0 左 1 右
  function pose(o,t,st,air){
    const idle=.28+Math.sin(t*1.4)*.025;
    const P={yaw:Math.sin(t*1.1)*.08,reach:1,jaw:.035,glow:0,sp:[idle,idle],fl:[0,0],sw:[0,0],lift:[0,0],spin:0,dip:1,tail:0,lunge:0};
    const wings=(s,f,w)=>{P.sp=[s,s];P.fl=[f,f];P.sw=[w||0,w||0];};
    const inst=o.inst;
    if(Math.hypot(o.vx||0,o.vy||0)>30&&!air&&!(inst&&inst.dash)){ // 翼肢與後腿交替撐地爬行
      const ph=Math.sin(t*7);P.sw=[ph*.14,-ph*.14];P.lift=[Math.max(0,-ph)*.5,Math.max(0,ph)*.5];P.yaw+=ph*.05;P.dip=1+Math.abs(ph)*.012;
    }
    if(air)wings(.95,Math.sin(t*7)*.6,0);
    if(st==='stun'||st==='stagger'||st==='knockdown'){wings(.5,0,-.25);P.reach=.82;P.jaw=.12;P.dip=.95;P.yaw=Math.sin(t*2.2)*.3;}
    if(st==='transition'){ // 憎恨未熄：菌絲顫抖、雙翼慢慢撐開、昂首
      const q=cl((o.stateT||0)/((o.def.phase2&&o.def.phase2.roarAt)||1.8));
      wings(.3+.6*ease(q),Math.sin(t*19)*.05*q,-.15);P.reach=.8+.35*ease(q);P.jaw=.05+.2*q;P.glow=q;P.dip=.95+.08*q;
    }
    if(!inst)return P;
    const I=info(inst),T=inst.t,id=inst.skill.id,p=R.skillPace(inst,{hit:1}),a=p.a||{},w=ease(p.wind/.82),s=cl((p.wind-.82)/.18);
    const bite=()=>{ // 脖子後縮張口 → 朝判定方向猛伸、闔顎
      P.yaw=U.clamp(a.angOff||0,-1,1)*1.2;
      if(p.snap>0){P.reach=1.2+.1*p.snap;P.jaw=.03;P.lunge=.1*p.snap;}else{P.reach=1-.22*w+.5*s;P.jaw=.04+.2*w*(1-s);}
    };
    if(id==='rot_stomp'){ // 翼肢撐起前半身 → 整個砸下
      if(p.snap>0){wings(.6,-.6*p.snap,.2);P.dip=1-.07*p.snap;P.jaw=.1*p.snap;}
      else{wings(.3+.4*w,.7*w*(1-s),-.2*w);P.dip=1+.06*w*(1-s);P.reach=1-.12*w;P.lift=[.5*w*(1-s),.5*w*(1-s)];}
    }else if(id==='double_bite')bite();
    else if(id==='wing_sweep'){ // 右翼向後拉滿 → 貼地往前掃
      if(p.snap>0){P.sp[1]=1;P.sw[1]=.9*p.snap;P.fl[1]=-.4*p.snap;P.spin=.12*p.snap;}
      else{P.sp[1]=.3+.7*w;P.sw[1]=-.8*w+1.7*s;P.fl[1]=.5*w*(1-s);P.spin=-.14*w+.26*s;P.yaw=-.2*w;}
    }else if(id==='tail_whip'){
      if(p.i===0&&I.hits[0]){ // 原地迴身一整圈，尾巴甩直
        const q=ease(T/(I.hits[0].at+.2));P.spin=TAU*q;P.tail=-1.5*Math.sin(q*Math.PI);wings(.25,0,-.2);P.yaw=-.3*Math.sin(q*Math.PI);
      }else bite();
    }else if(id==='rotting_charge'){
      const d=I.dash[0];
      if(inst.dash){wings(.4,Math.sin(t*15)*.15,-.5);P.reach=1.2;P.jaw=.16;P.lunge=.15;P.yaw=0;} // 壓低身子往前撞
      else if(d&&T<d.at){const c=ease(T/d.at);wings(.3+.2*c,0,.25*c);P.reach=1-.25*c;P.dip=1-.04*c;P.jaw=.05+.1*c;P.glow=.4*c;P.yaw=0;}
    }else if(id==='dive_bomb'&&I.hide[0]&&T<I.hide[0].at){wings(.7,-.5,-.2);P.dip=.93;} // 起飛前一蹲
    // 洩出腐霧：撐開雙翼、低頭，每一波霧浪身體往下一沉
    if(I.fog.length){
      const f0=I.fog[0].at,f1=I.fog[I.fog.length-1].at+.35,pre=Math.min(1.4,f0);
      if(T>=f0-pre&&T<f1){
        if(T<f0){const c=ease((T-f0+pre)/pre);if(!air)wings(.3+.5*c,.5*c,-.1*c);P.reach=1-.2*c;P.jaw=.05+.12*c;P.glow=c;P.dip=1+.04*c;P.yaw=0;}
        else{let pu=0;for(const h of I.fog)if(T>=h.at)pu=Math.max(pu,1-(T-h.at)/.35);
          if(!air)wings(.85,-.5*pu,.1);P.reach=.85;P.jaw=.16;P.glow=1;P.dip=1-.05*pu;P.yaw=Math.sin(t*6)*.12;}
      }
    }
    // 吐息：蓄氣後縮 → 噴出，頭跟著每一口的角度掃過去
    if(I.breath.length){
      const b0=I.breath[0].at,b1=I.breath[I.breath.length-1].at+.25,pre=Math.min(.9,b0);
      if(T>=b0-pre&&T<=b1+.5){
        const ang=breathAng(I.breath,T);
        if(T<b0){const c=ease((T-b0+pre)/pre);P.reach=1-.22*c;P.jaw=.05+.1*c;P.glow=.6*c;P.yaw=ang*.8*c;P.spin+=ang*.2*c;if(!air)wings(.4,0,-.1);}
        else{const f=T<=b1?1:1-ease((T-b1)/.5);P.reach=1+.12*f;P.jaw=.035+.14*f;P.glow=f;P.yaw=(ang*.8+Math.sin(t*21)*.02)*f;P.spin+=ang*.2*f;if(!air)wings(.42,0,-.12);}
      }
    }
    for(const h of I.ring)if(T>=h.at-.3&&T<h.at+.3){const q=cl((T-h.at+.3)/.3),d=cl((T-h.at)/.3);wings(.9,T<h.at?.6*q:-.6*(1-d),0);P.dip=T<h.at?1+.04*q:1-.05*(1-d);} // 外擴霧浪：雙翼一拍
    const L=I.land.filter(l=>T>=l.at&&T<l.at+.6).pop();
    if(L){const q=ease((T-L.at)/.6);wings(1-.7*q,-.6*(1-q),.1);P.dip=.9+.1*q;P.jaw=.18*(1-q);P.yaw=0;P.spin=0;} // 落地緩衝
    return P;
  }
  function dragon(g,o,t,r,P){
    const p2=o.phase===2;
    g.save();g.rotate(P.spin);g.translate(P.lunge*r,0);g.scale(P.dip,P.dip);
    // 長尾：有節的灰黑肉體，灰白菌絲貼著尾背，遠端自然收細。
    let px=-r*.8,py=0;const calm=1-Math.min(1,Math.abs(P.tail));
    for(let i=0;i<17;i++){
      const u=i/16,nx=-r*(.8+2.8*u),ny=Math.sin(t*1.3-u*2)*r*u*.4*calm+P.tail*r*u*u;
      g.strokeStyle=i%2?GREY:DARK;g.lineWidth=r*(.28*(1-u)+.035);g.lineCap='round';g.beginPath();g.moveTo(px,py);g.lineTo(nx,ny);g.stroke();
      if(i%2===0)branch(g,nx,ny,-Math.PI*.8,r*.15*(1-u)+r*.04,Math.max(.7,r*.012));px=nx;py=ny;
    }
    // 只有兩隻後腿；前方的爪屬於翅膀。
    for(const s of [-1,1]){
      const lift=P.lift[s<0?0:1],x=-r*.6+lift*r*.2;
      g.fillStyle=DARK;g.beginPath();g.ellipse(x,s*r*.59,r*(.37+lift*.05),r*(.2+lift*.03),-s*.3,0,TAU);g.fill();
      for(let j=0;j<3;j++){g.strokeStyle='#c6bda3';g.lineWidth=r*.025;g.beginPath();g.moveTo(x+r*.22,s*r*(.5+j*.08));g.lineTo(x+r*.46,s*r*(.51+j*.09));g.stroke();}
    }
    for(const s of [-1,1]){const i=s<0?0:1;g.save();g.translate(r*.25,s*r*.3);g.scale(1,s);g.rotate(-.9*(1-P.sp[i])-P.sw[i]);g.scale(1+P.fl[i]*.06,(.4+.6*P.sp[i])*(1-Math.abs(P.fl[i])*.25));wing(g,r);g.restore();}
    torso(g,r,p2?2:1);
    if(p2){g.save();g.globalAlpha=.3+.16*Math.sin(t*4);g.fillStyle='#c15845';g.beginPath();g.ellipse(-r*.1,0,r*.76,r*.34,0,0,TAU);g.fill();g.restore();}
    if(P.glow>.02){g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.3*P.glow*(.8+.2*Math.sin(t*9));g.fillStyle='#c15845';g.beginPath();g.ellipse(r*.35,0,r*.45,r*.26,0,0,TAU);g.fill();g.restore();} // 胸口腐光
    // 分節長頸的白色菌絲隨頭部擺動。
    g.save();g.translate(r*.65,0);
    for(let i=0;i<4;i++){g.rotate(P.yaw/4);g.strokeStyle=GREY;g.lineWidth=r*(.34-i*.035);g.beginPath();g.moveTo(0,0);g.lineTo(r*.27*P.reach,0);g.stroke();for(const s of [-1,1])branch(g,r*.08,s*r*.08,s*1.9,r*.23,r*.017);g.translate(r*.25*P.reach,0);}
    head(g,r,P.jaw);
    if(P.glow>.02){g.fillStyle='rgba(201,91,66,'+(.3*P.glow).toFixed(3)+')';g.beginPath();g.ellipse(r*.45,0,r*.32,r*(.05+P.jaw*.5),0,0,TAU);g.fill();}
    g.restore();
    // 輕薄孢子環境演出，不影響狀態或亂數。
    for(let i=0;i<(p2?18:9);i++){const a0=i*2.4,ph=(t*.32+i*.17)%1;g.fillStyle=R.hexA(IVORY,(1-ph)*.55);g.beginPath();g.arc(Math.cos(a0)*r*(.6+ph),Math.sin(a0)*r*.9-ph*r*.45,Math.max(.7,r*.013),0,TAU);g.fill();}
    g.restore();
  }
  R.defineBossStyle('ekzykes',{
    body(g,o,t,k){
      const e=elev(o.inst),h=e*k.r*.6,P=pose(o,t,k.st,e>.3);
      g.save();
      if(h>1){g.fillStyle='rgba(35,20,16,0.28)';g.beginPath();g.ellipse(0,0,k.r*1.6,k.r*.9,0,0,TAU);g.fill();g.translate(-Math.sin(o.face||0)*h,-Math.cos(o.face||0)*h);}
      dragon(g,o,t,k.r,P);g.restore();
    },
    hidden(g,b,t){
      const inst=b.inst;if(!inst)return;const land=inst.v.actions.find(a=>a.do==='land'&&a.at>inst.t),hide=inst.v.actions.filter(a=>a.do==='hide'&&a.at<=inst.t).pop();
      const mark=(land&&inst.marks[land.mark])||b.enemy||b,p=land&&hide?U.clamp((inst.t-hide.at)/(land.at-hide.at),0,1):.5;
      const x=U.lerp(b.x,mark.x,p),y=U.lerp(b.y,mark.y,p),h=Math.sin(p*Math.PI)*b.r*1.45,P=pose(b,t,'skill',true);
      P.spin=P.yaw=0;if(p>.75){const q=(p-.75)/.25;P.sp=[.95-.5*q,.95-.5*q];P.fl=[-.3,-.3];P.jaw=.15;} // 最後收翼急墜
      g.save();g.fillStyle='rgba(35,20,16,0.35)';g.beginPath();g.ellipse(x,y,b.r*1.8,b.r,0,0,TAU);g.fill();g.translate(x,y-h);g.rotate(b.face);dragon(g,b,t,b.r,P);g.restore();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
