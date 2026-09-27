(function(){
const $=id=>document.getElementById(id);
if(typeof planck==='undefined'){$('loading').textContent='Fizik motoru yüklenemedi.';return;}
$('loading').hidden=true;
const C=CORE, pl=planck, K=C.key, CELL=C.CELL;

// ---------- parts & unlocks ----------
const TOOLS=[
  {id:'beam',name:'Kiriş',start:true},
  {id:'wheel1',name:'Teker',start:true,size:1},
  {id:'wheel2',name:'Büyük teker',size:2,desc:'50 cm çaplı teker. Engelin üstüne daha kolay çıkar ama daha ağırdır.'},
  {id:'weight',name:'Ağırlık',desc:'0,5 kg. Ağırlık merkezini istediğin yere taşır.'},
  {id:'hinge',name:'Menteşe',desc:'İki kiriş grubunu döner şekilde bağlar. Araç ortadan bükülebilir.'},
  {id:'wheel0',name:'Küçük teker',size:0,desc:'Hafif ve küçük. Yere yakın durur.'},
  {id:'wheel3',name:'Dev teker',size:3,desc:'Çok büyük ve ağır. Motor zorlanır ama her şeyin üstünden geçmeye çalışır.'},
  {id:'bumper',name:'Tampon',desc:'Yaylı darbe tamponu. 20 cm geri çekilerek çarpmayı yumuşatır.'},
  {id:'egg',name:'Yumurta',egg:true},
  ];
const EXTRA={gear2:{name:'Güç dişlisi',desc:'1:7 oran. Çok güçlü ama yavaş.'},gear0:{name:'Hız dişlisi',desc:'1:1 oran. Çok hızlı ama zayıf.'},soft:{name:'Yumuşak süspansiyon',desc:'Tekerler engellere göre aşağı yukarı esner.'}};
// unlock table: completing ladder rung -> item
const UNLOCKS={'step:0':'wheel2','ramp:0':'gear2','step:1':'soft','ramp:1':'weight','gap:0':'wheel3','ramp:2':'hinge','step:2':'wheel0','egg:0':'bumper','gap:1':'gear0'};
const LADDER_REQ={step:null,ramp:null,gap:'step:0',egg:'ramp:0',trap:'step:1'};
const LADDER_REQ_TXT={gap:'Basamak 10 cm’i geç',egg:'Rampa 15°’yi geç',trap:'Basamak 20 cm’i geç'};

let prog={done:{},design:null,seenNew:{}};
try{const p=JSON.parse(localStorage.getItem('paletGaraji3')||'null');if(p&&p.done)prog=Object.assign(prog,p);}catch(e){}
const save=()=>{try{localStorage.setItem('paletGaraji3',JSON.stringify(prog));}catch(e){}};
const isDone=k=>!!prog.done[k];
function owned(id){if(TOOLS.find(t=>t.id===id&&t.start))return true;return Object.entries(UNLOCKS).some(([k,v])=>v===id&&isDone(k))||Object.entries(C.CAMPAIGN_UNLOCK).some(([k,v])=>v===id&&isDone('camp:'+k));}
const campKey=i=>'camp:'+C.CAMPAIGN[i].id;
const campOpen=i=>i===0||isDone(campKey(i-1));
const starsOf=i=>{const m=(prog.stars||{})[C.CAMPAIGN[i].id]||0;return (m&1)+((m>>1)&1)+((m>>2)&1);};
const fmtN=(v,d)=>String(d!=null?(+v).toFixed(d):v).replace('.',',');
const gearOwned=g=>g===1||(g===2&&owned('gear2'))||(g===0&&owned('gear0'));

// default design: simple car
function defaultDesign(){return {pieces:[{t:'beam',x:5,y:1,len:4,v:false},{t:'beam',x:9,y:1,len:4,v:false},{t:'wheel',x:5,y:1,size:1,motor:true},{t:'wheel',x:12,y:1,size:1,motor:true}],gear:1,susp:'hard'};}
let design=prog.design&&(prog.design.pieces||prog.design.cells)?prog.design:defaultDesign();
if(!design.cells)design.cells={};
function saveDesign(){prog.design=design;save();}

// ---------- state ----------
let mode='camp',ci=0,li=0,ri=0,level=null,tries=0,phase='map',phaseT=0,sim=null,prevSim=null,tool='beam',motorOn=true;
let parts=[],shake=0,replay=null,autoRun=false,lastTele=null;

// ---------- canvas ----------
const cv=$('cv');let ctx=cv.getContext('2d');let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*DPR;cv.height=H*DPR;}
window.addEventListener('resize',()=>{resize();if(phase==='garage')layoutEditor();});resize();
const cam={x:0,y:0,s:80,ay:.58};
const scaleRun=()=>Math.min(W/3.7,H/4.2);

// ---------- drawing primitives (meters, y up) ----------
function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
function drawBase(c,x,y,nb){ // nb: neighbor struct test fn
  const h=CELL/2;
  if(c.base==='beam'){ctx.fillStyle='#f2c014';ctx.fillRect(x-h-0.001,y-h-0.001,CELL+0.002,CELL+0.002);
    ctx.fillStyle='#d6a70b';ctx.fillRect(x-h,y-h,CELL,0.018);
    ctx.fillStyle='rgba(0,0,0,.42)';ctx.beginPath();ctx.arc(x,y+0.004,0.021,0,7);ctx.fill();}
  else if(c.base==='weight'){ctx.fillStyle='#394046';ctx.fillRect(x-h-0.001,y-h-0.001,CELL+0.002,CELL+0.002);
    ctx.fillStyle='#f2c014';ctx.fillRect(x-h+0.015,y-0.008,CELL-0.03,0.016);ctx.fillStyle='#262b30';ctx.fillRect(x-h,y-h,CELL,0.015);}
  else if(c.base==='hinge'){ctx.fillStyle='#f2c014';
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{if(nb&&nb(dx,dy))ctx.fillRect(x+(dx?dx*0.025-0.025:-0.025),y+(dy?dy*0.025-0.025:-0.025),dx?0.05:0.05,dy?0.05:0.05);});
    ctx.fillStyle='#8a939b';ctx.beginPath();ctx.arc(x,y,0.045,0,7);ctx.fill();ctx.fillStyle='#394046';ctx.beginPath();ctx.arc(x,y,0.018,0,7);ctx.fill();}
}
function drawWheelAt(x,y,a,r,motor,strain){
  ctx.save();ctx.translate(x,y);ctx.rotate(a);
  ctx.fillStyle='#23272c';ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
  ctx.strokeStyle='#14171a';ctx.lineWidth=r*0.16;ctx.setLineDash([r*0.2,r*0.15]);ctx.beginPath();ctx.arc(0,0,r*0.9,0,7);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#a0a7ae';ctx.beginPath();ctx.arc(0,0,r*0.58,0,7);ctx.fill();
  ctx.fillStyle='#7a828a';for(let k=0;k<6;k++){const q=k*Math.PI/3;ctx.beginPath();ctx.arc(Math.cos(q)*r*0.36,Math.sin(q)*r*0.36,r*0.08,0,7);ctx.fill();}
  let hub=motor?'#e0561b':'#6b737b';
  if(motor&&strain>0.05){const s=Math.min(1,strain);hub='rgb('+Math.round(224+31*s)+','+Math.round(86-40*s)+','+Math.round(27)+')';
    ctx.fillStyle='rgba(255,60,20,'+(0.35*s)+')';ctx.beginPath();ctx.arc(0,0,r*0.5,0,7);ctx.fill();}
  ctx.fillStyle=hub;ctx.beginPath();ctx.arc(0,0,Math.max(r*0.2,0.022),0,7);ctx.fill();
  ctx.restore();
}
function drawEgg(x,y,broken){
  if(!broken){ctx.fillStyle='#fbf3e3';ctx.beginPath();ctx.ellipse(x,y+0.035,0.045,0.06,0,0,7);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=0.006;ctx.stroke();}
  else{ctx.fillStyle='#fbf3e3';ctx.beginPath();ctx.ellipse(x,y+0.01,0.07,0.018,0,0,7);ctx.fill();ctx.fillStyle='#f5a91a';ctx.beginPath();ctx.arc(x,y+0.015,0.024,0,7);ctx.fill();}
}
function drawBumperPad(x,y){ctx.fillStyle='#e0561b';rr(x-0.03,y-0.07,0.06,0.14,0.015);ctx.fill();ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x-0.03,y-0.07,0.012,0.14);}
function drawSpring(ax,ay,bx,by){ctx.strokeStyle='#8a939b';ctx.lineWidth=0.012;ctx.beginPath();const n=8;
  for(let k=0;k<=n;k++){const t=k/n;const px=ax+(bx-ax)*t,py=ay+(by-ay)*t;const o=(k>0&&k<n)?(k%2?0.03:-0.03):0;const dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy)||1;
    const qx=px-dy/L*o,qy=py+dx/L*o;k?ctx.lineTo(qx,qy):ctx.moveTo(qx,qy);}ctx.stroke();}

// design (editor) drawing at grid positions, meters
function drawDesign(d,opts){
  const cells=d.cells;const st=k=>{const c=cells[k];return c&&c.base&&c.base!=='hinge';};
  // bumper springs first
  Object.keys(cells).forEach(k=>{const c=cells[k];if(!c||!c.over||c.over.t!=='bumper')return;const [x,y]=C.unkey(k);
    drawSpring(x*CELL+CELL/2,y*CELL,x*CELL+CELL/2+C.BUMP_TR,y*CELL);drawBumperPad(x*CELL+CELL/2+C.BUMP_TR+0.03,y*CELL);});
  Object.keys(cells).forEach(k=>{const c=cells[k];if(!c||!c.base)return;const [x,y]=C.unkey(k);
    drawBase(c,x*CELL,y*CELL,(dx,dy)=>st(K(x+dx,y+dy)));});
  Object.keys(cells).forEach(k=>{const c=cells[k];if(!c||!c.over)return;const [x,y]=C.unkey(k);
    if(c.over.t==='wheel')drawWheelAt(x*CELL,y*CELL,0,C.WHEEL_R[c.over.size],c.over.motor,0);
    if(c.over.t==='egg')drawEgg(x*CELL,y*CELL+0.02,false);});
}

// sim drawing via transform source
function tfLive(b){const p=b.getPosition();return [p.x,p.y,b.getAngle()];}
function drawSim(S,frame,alpha){
  if(!S)return;const tf=frame?(i=>[frame[i*3],frame[i*3+1],frame[i*3+2]]):(i=>tfLive(S.bodies[i]));
  ctx.globalAlpha=alpha??1;
  const nC=S.comps.length,nW=S.wheels.length;
  const cells=S._cells;
  // bumpers + springs
  S.bumpers.forEach((b,bi)=>{const t=tf(nC+nW+bi);const ci=S.comps.indexOf(b.comp);const ct=tf(ci);
    const ax=ct[0]+Math.cos(ct[2])*b.anchor.x-Math.sin(ct[2])*b.anchor.y, ay=ct[1]+Math.sin(ct[2])*b.anchor.x+Math.cos(ct[2])*b.anchor.y;
    const bx=t[0]-Math.cos(t[2])*0.03, by=t[1]-Math.sin(t[2])*0.03;drawSpring(ax,ay,bx,by);
    ctx.save();ctx.translate(t[0],t[1]);ctx.rotate(t[2]);drawBumperPad(0,0);ctx.restore();});
  // suspension struts
  S.wheels.forEach((w,wi)=>{if(w.broken&&!frame)return;const t=tf(nC+wi);const ci=S.comps.indexOf(w.comp);const ct=tf(ci);
    const lx=(w.cell[0]-w.comp.cx)*CELL;const ax=ct[0]+Math.cos(ct[2])*lx, ay=ct[1]+Math.sin(ct[2])*lx;
    const d=Math.hypot(t[0]-ax,t[1]-ay);if(d<0.25){ctx.strokeStyle='#5d656d';ctx.lineWidth=0.03;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(t[0],t[1]);ctx.stroke();}});
  // comps
  S.comps.forEach((c,ci)=>{const t=tf(ci);ctx.save();ctx.translate(t[0],t[1]);ctx.rotate(t[2]);
    const st=k=>{const q=cells[k];return q&&q.base&&q.base!=='hinge';};
    c.cells.forEach(k=>{const [x,y]=C.unkey(k);drawBase(cells[k],(x-c.cx)*CELL,(y-c.cy)*CELL,(dx,dy)=>st(K(x+dx,y+dy))&&S.A.cellComp[K(x+dx,y+dy)]!==undefined);});
    if(S.eggComp===c){drawEgg(S.eggLocal.x,S.eggLocal.y-0.05,S.eggBroken);}
    ctx.restore();});
  S.wheels.forEach((w,wi)=>{const t=tf(nC+wi);drawWheelAt(t[0],t[1],t[2],w.r,w.motor,frame?0:w.strain);});
  ctx.globalAlpha=1;
}

// ---------- world ----------
function groundAt(x){let best=-99;for(const ch of level.geo.chains){for(let i=1;i<ch.length;i++){const a=ch[i-1],b=ch[i];
  if(a[0]!==b[0]&&x>=Math.min(a[0],b[0])&&x<=Math.max(a[0],b[0])){const y=a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);if(y>best)best=y;}}}return best<-50?0:best;}
function endX(){return level.geo.flagX!=null?level.geo.flagX:level.geo.wallX;}
function drawWorld(){
  drawTraps(true);
  level.geo.chains.forEach(ch=>{ctx.beginPath();ctx.moveTo(ch[0][0],-30);ch.forEach(p=>ctx.lineTo(p[0],p[1]));ctx.lineTo(ch[ch.length-1][0],-30);ctx.closePath();
    const g=ctx.createLinearGradient(0,2,0,-3);g.addColorStop(0,'#c6ccd2');g.addColorStop(1,'#8f98a1');ctx.fillStyle=g;ctx.fill();
    ctx.beginPath();ch.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle='#f3f4f5';ctx.lineWidth=0.03;ctx.stroke();});
  // ruler marks at obstacle
  if(level.geo.wallX!=null){const x=level.geo.wallX,y0=groundAt(x-0.05);ctx.save();ctx.beginPath();ctx.rect(x,y0,0.3,1.5);ctx.clip();
    for(let k=-2;k<12;k++){ctx.fillStyle=k%2?'#1d2125':'#f2c014';ctx.beginPath();ctx.moveTo(x,y0+k*0.18);ctx.lineTo(x+0.3,y0+k*0.18+0.3);ctx.lineTo(x+0.3,y0+k*0.18+0.39);ctx.lineTo(x,y0+k*0.18+0.09);ctx.fill();}ctx.restore();}
  drawTraps(false);
  if(level.geo.flagX!=null){const fx=flagVis,fy=groundAt(fx+0.05);ctx.fillStyle='#2b3035';ctx.fillRect(fx,fy,0.035,1.1);
    for(let r=0;r<3;r++)for(let c=0;c<5;c++){ctx.fillStyle=(r+c)%2?'#1d2125':'#fff';ctx.fillRect(fx+0.035+c*0.08,fy+1.1-(r+1)*0.09,0.08,0.09);}}
}
let flagVis=0;
let curFrame=null;
function ptf(b){if(curFrame&&b.fi!=null&&sim){const i=(sim.propStart+b.fi)*3;if(i+2<curFrame.length)return [curFrame[i],curFrame[i+1],curFrame[i+2]];}const p=b.getPosition();return [p.x,p.y,b.getAngle()];}
function shapePath(f){const sh=f.getShape();ctx.beginPath();if(sh.getType()==='circle'){const c=sh.m_p;ctx.arc(c.x,c.y,sh.m_radius,0,7);}else{sh.m_vertices.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();}}
function withBody(b,fn){const t=ptf(b);ctx.save();ctx.translate(t[0],t[1]);ctx.rotate(t[2]);fn();ctx.restore();}
function hazard(x0,y0,w,h,s){ctx.save();ctx.beginPath();ctx.rect(x0,y0,w,h);ctx.clip();for(let x=x0-h-s;x<x0+w;x+=s*2){ctx.fillStyle='#f2c014';ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x+s,y0);ctx.lineTo(x+s+h,y0+h);ctx.lineTo(x+h,y0+h);ctx.fill();}ctx.restore();}
function groundFill(){const g=ctx.createLinearGradient(0,2,0,-3);g.addColorStop(0,'#c6ccd2');g.addColorStop(1,'#8f98a1');return g;}
function drawTraps(under){const S=sim;if(!S||!S.traps)return;
  S.traps.forEach(o=>{const t=o.t;
    if(under){
      if(t.type==='rise')withBody(o.body,()=>{ctx.fillStyle='#bcc3c9';ctx.fillRect(-o.hw,-o.hh,o.hw*2,o.hh*2);ctx.fillStyle='#f3f4f5';ctx.fillRect(-o.hw,o.hh-0.015,o.hw*2,0.015);
        if(o.fired){ctx.strokeStyle='rgba(60,66,72,.5)';ctx.lineWidth=0.008;ctx.strokeRect(-o.hw,-o.hh,o.hw*2,o.hh*2);}});
      if(t.type==='spikes')withBody(o.body,()=>{let f=o.body.getFixtureList();while(f){shapePath(f);ctx.fillStyle='#8a939b';ctx.fill();ctx.strokeStyle='#4a5158';ctx.lineWidth=0.006;ctx.stroke();f=f.getNext();}});
      return;}
    if(t.type==='ice'&&o.fired){ctx.strokeStyle='rgba(120,200,255,.95)';ctx.lineWidth=0.05;ctx.beginPath();ctx.moveTo(t.x0,t.y0+0.01);ctx.lineTo(t.x1,t.y1+0.01);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=0.012;for(let x=t.x0+0.1;x<t.x1;x+=0.25){const f=(x-t.x0)/(t.x1-t.x0),y=t.y0+(t.y1-t.y0)*f;ctx.beginPath();ctx.moveTo(x,y+0.02);ctx.lineTo(x+0.06,y+0.03);ctx.stroke();}}
    if(t.type==='roof'){const y0=t.y+t.clear;ctx.fillStyle='#4a5158';ctx.fillRect(t.x0,y0,t.x1-t.x0,8);hazard(t.x0,y0,t.x1-t.x0,0.06,0.07);
      ctx.fillStyle='#5d656d';for(let x=t.x0+0.25;x<t.x1-0.1;x+=0.5)ctx.fillRect(x,y0+0.06,0.05,8);}
    if(t.type==='seesaw'){const [px,py]=o.pivot;ctx.fillStyle='#5d656d';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-0.13,py-t.h);ctx.lineTo(px+0.13,py-t.h);ctx.closePath();ctx.fill();
      withBody(o.body,()=>{ctx.fillStyle='#b07a3c';ctx.fillRect(-o.hw,-o.hh,o.hw*2,o.hh*2);ctx.fillStyle='#8c5e2a';for(let x=-o.hw+0.2;x<o.hw;x+=0.3)ctx.fillRect(x,-o.hh,0.012,o.hh*2);});
      ctx.fillStyle='#e0561b';ctx.beginPath();ctx.arc(px,py,0.03,0,7);ctx.fill();}
    if(t.type==='bridge'){ctx.strokeStyle='#6b4a22';ctx.lineWidth=0.012;
      o.planks.forEach(b=>withBody(b,()=>{let f=b.getFixtureList();shapePath(f);ctx.fillStyle='#b07a3c';ctx.fill();ctx.stroke();}));}
    if(t.type==='platform')withBody(o.body,()=>{ctx.fillStyle='#394046';ctx.fillRect(-o.hw,-o.hh,o.hw*2,o.hh*2);hazard(-o.hw,o.hh-0.035,o.hw*2,0.035,0.05);});
    if(t.type==='boxes')o.list.forEach(b=>withBody(b,()=>{const h=t.s/2-0.003;ctx.fillStyle='#c98f4a';ctx.fillRect(-h,-h,h*2,h*2);ctx.strokeStyle='#8c5e2a';ctx.lineWidth=0.014;ctx.strokeRect(-h+0.007,-h+0.007,h*2-0.014,h*2-0.014);
      ctx.beginPath();ctx.moveTo(-h,-h);ctx.lineTo(h,h);ctx.moveTo(-h,h);ctx.lineTo(h,-h);ctx.stroke();}));
    if(t.type==='barrels')o.list.forEach(b=>withBody(b,()=>{const r=t.r;ctx.fillStyle='#c23b2e';ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.strokeStyle='#7d241c';ctx.lineWidth=0.014;ctx.beginPath();ctx.arc(0,0,r*0.65,0,7);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(r,0);ctx.stroke();ctx.fillStyle='#f2c014';ctx.beginPath();ctx.arc(0,0,r*0.2,0,7);ctx.fill();}));
    if(o.body&&(t.type==='slab'||t.type==='drop'||t.type==='ceil'))withBody(o.body,()=>{
      if(t.type==='slab'){const g=ctx.createLinearGradient(0,o.hh,0,-o.hh);g.addColorStop(0,'#c6ccd2');g.addColorStop(1,'#a9b0b7');ctx.fillStyle=g;ctx.fillRect(-o.hw,-o.hh,o.hw*2,o.hh*2);
        ctx.fillStyle='#f3f4f5';ctx.fillRect(-o.hw,o.hh-0.015,o.hw*2,0.015);
        if(o.fired){ctx.strokeStyle='#4a5158';ctx.lineWidth=0.012;ctx.beginPath();ctx.moveTo(-o.hw*0.2,o.hh);ctx.lineTo(0,0);ctx.lineTo(o.hw*0.3,-o.hh);ctx.stroke();}}
      else if(t.type==='drop'){ctx.fillStyle='#5d656d';ctx.fillRect(-o.hw,-o.hh,o.hw*2,o.hh*2);hazard(-o.hw,-o.hh,o.hw*2,0.06,0.06);}
      else if(t.type==='ceil'){ctx.fillStyle='#4a5158';ctx.fillRect(-o.hw,-o.hh,o.hw*2,o.hh*2);hazard(-o.hw,-o.hh,o.hw*2,0.07,0.07);}});
  });}
function bg(){ctx.setTransform(DPR,0,0,DPR,0,0);const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#f4f5f6');g.addColorStop(1,'#dde1e4');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(0,0,0,.035)';ctx.lineWidth=1;const off=((-cam.x*cam.s*.3)%60+60)%60;for(let x=off;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}}
function worldTf(){const sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.translate(W/2+sx,H*cam.ay+sy);ctx.scale(cam.s,-cam.s);ctx.translate(-cam.x,-cam.y);}

// ---------- particles ----------
function puff(x,y,type,n){for(let i=0;i<n;i++){const P={x,y,vx:(Math.random()-.5)*(type==='spark'?4:0.8),vy:Math.random()*(type==='spark'?3:0.8),life:1,type,r:type==='smoke'?0.03+Math.random()*0.03:0.012};parts.push(P);}}
function drawParts(dt){parts.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.type!=='smoke')p.vy-=6*dt;else{p.r+=dt*0.08;}p.life-=dt*(p.type==='smoke'?0.9:1.4);});
  parts=parts.filter(p=>p.life>0);parts.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life)*(p.type==='smoke'?0.5:1);
    ctx.fillStyle=p.type==='smoke'?'#9ba3ab':p.type==='yolk'?'#f5b41a':p.type==='confetti'?p.c:'#ffb020';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();});ctx.globalAlpha=1;}

// ---------- editor (drag & drop pieces) ----------
// piece: {t:'beam',x,y,len,v}  {t:'wheel',x,y,size,motor}  {t:'weight'|'hinge'|'bumper'|'egg',x,y}
function pieceCells(p){if(p.t!=='beam')return [[p.x,p.y]];const out=[];for(let i=0;i<p.len;i++)out.push(p.v?[p.x,p.y+i]:[p.x+i,p.y]);return out;}
function compile(pieces){const cells={};
  pieces.forEach(p=>{if(p.t==='beam')pieceCells(p).forEach(([x,y])=>{const k=K(x,y);cells[k]=cells[k]||{};if(!cells[k].base||cells[k].base==='beam')cells[k].base='beam';});});
  pieces.forEach(p=>{if(p.t==='weight'||p.t==='hinge'){const k=K(p.x,p.y);cells[k]=cells[k]||{};cells[k].base=p.t;}});
  pieces.forEach(p=>{if(p.t==='wheel'||p.t==='bumper'||p.t==='egg'){const k=K(p.x,p.y);cells[k]=cells[k]||{};
    cells[k].over=p.t==='wheel'?{t:'wheel',size:p.size,motor:!!p.motor}:{t:p.t};}});
  return cells;}
function cellsToPieces(cells){const P=[];const used=new Set();
  const keys=Object.keys(cells).filter(k=>cells[k]&&cells[k].base==='beam').map(C.unkey).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
  keys.forEach(([x,y])=>{if(used.has(K(x,y)))return;let len=0;while(cells[K(x+len,y)]&&cells[K(x+len,y)].base==='beam'&&!used.has(K(x+len,y))){used.add(K(x+len,y));len++;}P.push({t:'beam',x,y,len,v:false});});
  Object.entries(cells).forEach(([k,c])=>{if(!c)return;const [x,y]=C.unkey(k);if(c.base==='weight'||c.base==='hinge')P.push({t:c.base,x,y});
    if(c.over){if(c.over.t==='wheel')P.push({t:'wheel',x,y,size:c.over.size,motor:!!c.over.motor});else P.push({t:c.over.t,x,y});}});
  return P;}
function setPieces(p){design.pieces=p;design.cells=compile(p);saveDesign();refreshGarage();}
if(!design.pieces)design.pieces=cellsToPieces(design.cells||{});
design.cells=compile(design.pieces);

// palette catalogue
const CATALOG=[
  {id:'beam4',own:'beam',name:'Kiriş',make:()=>({t:'beam',len:4,v:false})},
  {id:'beam2',own:'beam',name:'Kısa kiriş',make:()=>({t:'beam',len:2,v:false})},
  {id:'post2',own:'beam',name:'Dikme',make:()=>({t:'beam',len:2,v:true})},
  {id:'wheel1',own:'wheel1',name:'Teker',make:()=>({t:'wheel',size:1,motor:true})},
  {id:'wheel0',own:'wheel0',name:'Küçük teker',make:()=>({t:'wheel',size:0,motor:true})},
  {id:'wheel2',own:'wheel2',name:'Büyük teker',make:()=>({t:'wheel',size:2,motor:true})},
  {id:'wheel3',own:'wheel3',name:'Dev teker',make:()=>({t:'wheel',size:3,motor:true})},
  {id:'weight',own:'weight',name:'Ağırlık',make:()=>({t:'weight'})},
  {id:'hinge',own:'hinge',name:'Menteşe',make:()=>({t:'hinge'})},
  {id:'bumper',own:'bumper',name:'Tampon',make:()=>({t:'bumper'})},
  {id:'egg',own:'egg',name:'Yumurta',make:()=>({t:'egg'})},
];

let grid={x0:0,y0:0,cp:20};
function layoutEditor(){const gh=$('garage').getBoundingClientRect().height;const availH=H-gh-96;
  const cp=Math.floor(Math.min((W-16)/C.COLS,availH/(C.ROWS+1.2)));grid.cp=Math.max(12,cp);
  grid.x0=Math.round((W-grid.cp*C.COLS)/2);grid.y0=Math.round(64+(availH-grid.cp*C.ROWS)/2+grid.cp*0.4);}
function editorTf(){ctx.setTransform(DPR,0,0,DPR,0,0);const s=grid.cp/CELL;ctx.translate(grid.x0+grid.cp/2,grid.y0+grid.cp*(C.ROWS-0.5));ctx.scale(s,-s);}
function toScreen(x,y){return [grid.x0+(x+.5)*grid.cp,grid.y0+(C.ROWS-1-y+.5)*grid.cp];}

let drag=null; // {piece, gx, gy, sx, sy, ok, msg, from:'palette'|'board', grab:[dx,dy], moved}
let flash=null; // {msg,t}

// placement check for a single piece against the rest
function checkPlace(rest,p){
  const cs=pieceCells(p);
  for(const [x,y] of cs)if(x<0||y<0||x>=C.COLS||y>=C.ROWS)return 'Tahtanın dışında';
  const cells=compile(rest);
  if(p.t==='beam'){for(const [x,y] of cs){const c=cells[K(x,y)];if(c&&c.base&&c.base!=='beam')return 'Bu kare dolu';}return null;}
  if(p.t==='weight'||p.t==='hinge'){const c=cells[K(p.x,p.y)];if(c&&c.over&&p.t==='hinge')return 'Menteşenin üstüne parça takılamaz';if(c&&c.base&&c.base!=='beam')return 'Bu kare dolu';return null;}
  // overlays need a structural cell
  const c=cells[K(p.x,p.y)];
  if(!c||!c.base||c.base==='hinge')return (p.t==='wheel'?'Teker':'Bu parça')+' bir kirişe takılmalı';
  if(c.over)return 'Bu kirişte zaten bir parça var';
  if(p.t==='wheel'){const ws=rest.filter(q=>q.t==='wheel');if(ws.length>=C.MAX_WHEELS)return 'En fazla '+C.MAX_WHEELS+' teker';
    const r=C.WHEEL_R[p.size];for(const q of ws){const d=Math.hypot(q.x-p.x,q.y-p.y)*CELL;if(d<r+C.WHEEL_R[q.size]-0.005)return 'Tekerler iç içe geçiyor';}}
  return null;}

function drawPiece(p,alpha){ctx.globalAlpha=alpha;
  if(p.t==='beam'){pieceCells(p).forEach(([x,y])=>drawBase({base:'beam'},x*CELL,y*CELL));}
  else if(p.t==='weight'||p.t==='hinge')drawBase({base:p.t},p.x*CELL,p.y*CELL,()=>true);
  else if(p.t==='wheel')drawWheelAt(p.x*CELL,p.y*CELL,0,C.WHEEL_R[p.size],p.motor,0);
  else if(p.t==='bumper'){drawSpring(p.x*CELL+CELL/2,p.y*CELL,p.x*CELL+CELL/2+C.BUMP_TR,p.y*CELL);drawBumperPad(p.x*CELL+CELL/2+C.BUMP_TR+0.03,p.y*CELL);}
  else if(p.t==='egg')drawEgg(p.x*CELL,p.y*CELL+0.02,false);
  ctx.globalAlpha=1;}

function drawEditor(){
  bg();ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle='rgba(28,32,36,.06)';rr(grid.x0-6,grid.y0-6,grid.cp*C.COLS+12,grid.cp*C.ROWS+12,10);ctx.fill();
  for(let x=0;x<C.COLS;x++)for(let y=0;y<C.ROWS;y++){ctx.fillStyle='rgba(28,32,36,.16)';ctx.beginPath();ctx.arc(grid.x0+(x+.5)*grid.cp,grid.y0+(y+.5)*grid.cp,Math.max(1.2,grid.cp*0.07),0,7);ctx.fill();}
  ctx.fillStyle='#5b646d';ctx.font='600 12px Barlow, sans-serif';ctx.textAlign='right';ctx.fillText('İLERİ →',grid.x0+grid.cp*C.COLS,grid.y0-10);
  ctx.textAlign='left';const A=C.analyze(design);const nw=design.pieces.filter(p=>p.t==='wheel').length;
  let head=(A.mass||0).toFixed(1).replace('.',',')+' kg · teker '+nw+'/'+C.MAX_WHEELS;if(level&&level.goals){const cst=C.costOf(design);head+=' · maliyet '+cst;ctx.fillText(head,grid.x0,grid.y0-10);if(cst<=level.goals.cost){ctx.fillStyle='#b98f06';ctx.fillText(' ★',grid.x0+ctx.measureText(head).width,grid.y0-10);}}else ctx.fillText(head,grid.x0,grid.y0-10);
  // hint line under board
  ctx.textAlign='center';ctx.fillStyle='#7a838c';ctx.font='500 12px Barlow, sans-serif';
  ctx.fillText(drag?'Silmek için tahtanın dışına bırak':'Parçaları sürükle · Tekere dokun: motor aç/kapa',W/2,grid.y0+grid.cp*C.ROWS+22);
  editorTf();drawDesign(design);
  if(drag&&drag.gx!=null){
    const p=Object.assign({},drag.piece,{x:drag.gx,y:drag.gy});
    // red rings on the wheels that block
    if(!drag.ok&&p.t==='wheel'&&drag.msg==='Tekerler iç içe geçiyor'){design.pieces.forEach(q=>{if(q.t!=='wheel')return;const d=Math.hypot(q.x-p.x,q.y-p.y)*CELL;if(d<C.WHEEL_R[p.size]+C.WHEEL_R[q.size]-0.005){ctx.strokeStyle='#e2473a';ctx.lineWidth=0.012;ctx.beginPath();ctx.arc(q.x*CELL,q.y*CELL,C.WHEEL_R[q.size]+0.01,0,7);ctx.stroke();}});}
    drawPiece(p,drag.inBoard?0.8:0.35);
    // outline
    ctx.strokeStyle=drag.inBoard?(drag.ok?'#2fae66':'#e2473a'):'#e2473a';ctx.lineWidth=0.012;
    if(p.t==='wheel'){ctx.beginPath();ctx.arc(p.x*CELL,p.y*CELL,C.WHEEL_R[p.size]+0.012,0,7);ctx.stroke();}
    else pieceCells(p).forEach(([x,y])=>ctx.strokeRect(x*CELL-CELL/2,y*CELL-CELL/2,CELL,CELL));
    ctx.setTransform(DPR,0,0,DPR,0,0);
    const msg=!drag.inBoard?(drag.from==='board'?'Bırak: sil':''):(drag.ok?'':drag.msg);
    if(msg){ctx.font='700 13px Barlow, sans-serif';const tw=ctx.measureText(msg).width+20;const [sx,sy]=[drag.sx,drag.sy-(drag.touch?70:36)];
      ctx.fillStyle='rgba(226,71,58,.95)';rr(sx-tw/2,sy-14,tw,26,13);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(msg,sx,sy+4);}
  }
  if(flash&&performance.now()-flash.t<1400){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.font='700 13px Barlow, sans-serif';const tw=ctx.measureText(flash.msg).width+20;
    ctx.fillStyle='rgba(28,32,36,.9)';rr(W/2-tw/2,grid.y0-44,tw,26,13);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(flash.msg,W/2,grid.y0-26);}
}

// pointer → grid (float)
function gridPos(px,py){return [(px-grid.x0)/grid.cp-0.5,(C.ROWS-1)-((py-grid.y0)/grid.cp-0.5)];}
function updateDrag(px,py){if(!drag)return;drag.sx=px;drag.sy=py;const off=drag.touch?48:0;
  const [fx,fy]=gridPos(px,py-off);const gx=Math.round(fx-drag.grab[0]),gy=Math.round(fy-drag.grab[1]);
  drag.gx=gx;drag.gy=gy;const p=Object.assign({},drag.piece,{x:gx,y:gy});
  const inB=fx>-1.5&&fx<C.COLS+0.5&&fy>-1.5&&fy<C.ROWS+0.5;drag.inBoard=inB;
  const m=inB?checkPlace(design.pieces,p):'x';drag.ok=!m;drag.msg=m;}
function hitPiece(fx,fy){
  const ps=design.pieces;let best=-1,bd=1e9;
  ps.forEach((p,i)=>{if(p.t!=='wheel')return;const d=Math.hypot(p.x-fx,p.y-fy);if(d*CELL<=C.WHEEL_R[p.size]&&d<bd){bd=d;best=i;}});
  if(best>=0)return best;
  const cx=Math.round(fx),cy=Math.round(fy);
  for(const tt of ['egg','bumper','weight','hinge','beam']){const i=ps.findIndex(p=>p.t===tt&&pieceCells(p).some(([x,y])=>x===cx&&y===cy));if(i>=0)return i;}
  // bumper pad sticks out to the right
  const bi=ps.findIndex(p=>p.t==='bumper'&&fx>p.x+0.4&&fx<p.x+0.5+(C.BUMP_TR+0.06)/CELL&&Math.abs(fy-p.y)<0.8);return bi;}
let press=null;
cv.addEventListener('pointerdown',e=>{if(phase==='replay'){endReplay();return;}if(phase!=='garage')return;
  const [fx,fy]=gridPos(e.offsetX,e.offsetY);const i=hitPiece(fx,fy);if(i<0)return;
  press={i,x:e.offsetX,y:e.offsetY,fx,fy,touch:e.pointerType!=='mouse',id:e.pointerId};cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointermove',e=>{
  if(drag&&drag.from==='board'){updateDrag(e.offsetX,e.offsetY);return;}
  if(press&&Math.hypot(e.offsetX-press.x,e.offsetY-press.y)>8){const p=design.pieces[press.i];
    const rest=design.pieces.filter((_,j)=>j!==press.i);design.pieces=rest;design.cells=compile(rest);
    drag={piece:p,from:'board',orig:p,grab:[press.fx-p.x,press.fy-p.y+(press.touch?48/grid.cp:0)],touch:press.touch};press=null;updateDrag(e.offsetX,e.offsetY);}});
cv.addEventListener('pointerup',e=>{
  if(press){const p=design.pieces[press.i];if(p.t==='wheel'){p.motor=!p.motor;flash={msg:p.motor?'Motorlu teker':'Serbest teker (motorsuz)',t:performance.now()};setPieces(design.pieces);}press=null;return;}
  if(drag&&drag.from==='board')finishDrag();});
cv.addEventListener('pointercancel',()=>{press=null;if(drag){if(drag.orig)design.pieces.push(drag.orig);setPieces(design.pieces);drag=null;}});
function finishDrag(){const d=drag;drag=null;
  if(d.inBoard&&d.ok){const p=Object.assign({},d.piece,{x:d.gx,y:d.gy});design.pieces.push(p);if(p.t==='egg')design.pieces=design.pieces.filter(q=>q===p||q.t!=='egg');}
  else if(d.inBoard&&!d.ok&&d.orig){design.pieces.push(d.orig);flash={msg:d.msg,t:performance.now()};}
  else if(d.inBoard&&!d.ok){flash={msg:d.msg,t:performance.now()};}
  else if(!d.inBoard&&d.from==='board'){flash={msg:'Parça silindi',t:performance.now()};}
  // a beam removed can leave wheels floating: keep them, validity will explain
  setPieces(design.pieces);}

// palette drag: start when finger moves up (horizontal swipe keeps scrolling)
function startPaletteDrag(item,e){const p=item.make();drag={piece:p,from:'palette',grab:[p.t==='beam'&&!p.v?(p.len-1)/2:0,p.t==='beam'&&p.v?(p.len-1)/2:0],touch:e.pointerType!=='mouse'};
  const r=cv.getBoundingClientRect();updateDrag(e.clientX-r.left,e.clientY-r.top);}
window.addEventListener('pointermove',e=>{if(drag&&drag.from==='palette'){const r=cv.getBoundingClientRect();updateDrag(e.clientX-r.left,e.clientY-r.top);e.preventDefault();}},{passive:false});
window.addEventListener('pointerup',()=>{if(drag&&drag.from==='palette')finishDrag();});

// tool icons
function iconFor(id,canvas){const c=canvas.getContext('2d');const w=canvas.width=80,h=canvas.height=60;c.clearRect(0,0,w,h);
  window.__ctx=ctx;ctxSwap(c);c.setTransform(1,0,0,1,0,0);c.translate(w/2,h/2);c.scale(200,-200);
  if(id==='beam4'){c.scale(.8,.8);[-1.5,-.5,.5,1.5].forEach(i=>drawBase({base:'beam'},i*CELL,0));}
  else if(id==='beam2'||id==='beam'){[-.5,.5].forEach(i=>drawBase({base:'beam'},i*CELL,0));}
  else if(id==='post2'){[-.5,.5].forEach(i=>drawBase({base:'beam'},0,i*CELL));}
  else if(id==='weight'){drawBase({base:'weight'},0,0);}
  else if(id==='hinge'){drawBase({base:'beam'},-CELL,0);drawBase({base:'hinge'},0,0,(dx)=>dx!==0);drawBase({base:'beam'},CELL,0);}
  else if(id.startsWith('wheel')){const s=+id.slice(5);const r=C.WHEEL_R[s];const sc=Math.min(1,0.13/r);c.scale(sc,sc);drawWheelAt(0,0,0,r,true,0);}
  else if(id==='bumper'){drawBase({base:'beam'},-0.1,0);drawSpring(-0.05,0,0.07,0);drawBumperPad(0.1,0);}
  else if(id==='egg'){drawEgg(0,-0.05,false);}
  else if(id==='gear2'||id==='gear0'){c.fillStyle='#a0a7ae';c.beginPath();for(let k=0;k<16;k++){const a=k*Math.PI/8,r=k%2?0.09:0.11;k?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r);}c.fill();c.fillStyle='#e0561b';c.beginPath();c.arc(0,0,0.035,0,7);c.fill();}
  else if(id==='soft'){drawBase({base:'beam'},0,0.06);drawSpring(0,0.02,0,-0.06);drawWheelAt(0,-0.08,0,0.05,false,0);}
  ctxSwap(window.__ctx);}
function ctxSwap(n){ctx=n;}

function renderPalette(){
  const P=$('palette');P.innerHTML='';
  CATALOG.forEach(it=>{if(it.id==='egg'&&!(level&&level.needEgg))return;if(it.id!=='egg'&&it.own!=='beam'&&!owned(it.own))return;
    const b=document.createElement('button');b.className='tool';b.type='button';
    const cvs=document.createElement('canvas');b.appendChild(cvs);const sp=document.createElement('span');sp.textContent=it.name;b.appendChild(sp);
    if(mode==='camp'&&it.id!=='egg'){const pc=it.make();const cst=pc.t==='beam'?pc.len*C.COST.beam:pc.t==='wheel'?C.COST.wheel[pc.size]+C.COST.motor:C.COST[pc.t]||0;const q=document.createElement('em');q.className='cost';q.textContent=cst;b.appendChild(q);}
    const t=TOOLS.find(q=>q.id===it.own);if(t&&!t.start&&!t.egg&&!prog.seenNew[it.own]){const n=document.createElement('i');n.className='new';n.textContent='YENİ';b.appendChild(n);}
    let st=null;
    b.addEventListener('pointerdown',e=>{st={x:e.clientX,y:e.clientY,e};prog.seenNew[it.own]=1;save();});
    b.addEventListener('pointermove',e=>{if(!st||drag)return;const dx=e.clientX-st.x,dy=e.clientY-st.y;
      if((dy<-10&&Math.abs(dy)>Math.abs(dx))||(e.pointerType==='mouse'&&Math.hypot(dx,dy)>6)){try{b.releasePointerCapture(e.pointerId);}catch(_){}startPaletteDrag(it,e);st=null;}});
    b.addEventListener('pointerup',()=>{if(st&&!drag){flash={msg:'Parçayı yukarı, tahtaya sürükle',t:performance.now()};}st=null;});
    b.addEventListener('pointercancel',()=>{st=null;});
    P.appendChild(b);iconFor(it.id,cvs);});
}

function renderSettings(){
  const sg=$('segGear');sg.innerHTML='';C.GEARS.forEach((g,i)=>{if(!gearOwned(i))return;const b=document.createElement('button');b.textContent=g.name;b.setAttribute('aria-pressed',design.gear===i?'true':'false');
    b.onclick=()=>{design.gear=i;saveDesign();refreshGarage();};sg.appendChild(b);});
  if(!gearOwned(design.gear))design.gear=1;
  const ss=$('segSusp');ss.innerHTML='';[['hard','Sert'],['soft','Yumuşak']].forEach(([v,t])=>{if(v==='soft'&&!owned('soft'))return;const b=document.createElement('button');b.textContent=t;b.setAttribute('aria-pressed',(design.susp||'hard')===v?'true':'false');
    b.onclick=()=>{design.susp=v;saveDesign();refreshGarage();};ss.appendChild(b);});
  if(design.susp==='soft'&&!owned('soft'))design.susp='hard';
}
function validity(){const A=C.analyze(Object.assign({},design,{noMotorOk:!!(level&&level.motorOff)}));
  if(!A.ok)return A.msg;if(level&&level.needEgg&&!A.eggs)return 'Bu testte yumurtayı araca yerleştirmelisin.';
  // locked parts in design (e.g. after reset)
  for(const c of Object.values(design.cells)){if(!c)continue;if(c.base&&c.base!=='beam'&&!owned(c.base))return 'Tasarımda henüz açılmamış bir parça var.';
    if(c.over&&c.over.t==='wheel'&&!owned('wheel'+c.over.size))return 'Tasarımda henüz açılmamış bir teker var.';if(c.over&&c.over.t==='bumper'&&!owned('bumper'))return 'Tasarımda henüz açılmamış bir parça var.';}
  return null;}
function refreshGarage(){renderSettings();const v=validity();$('warn').hidden=!v;$('warn').textContent=v||'';$('btnGo').disabled=!!v;
  const A=C.analyze(Object.assign({},design,{noMotorOk:true}));const g=C.GEARS[design.gear].ratio;
  let vmax=0;Object.values(design.cells).forEach(c=>{if(c&&c.over&&c.over.t==='wheel'&&c.over.motor)vmax=Math.max(vmax,C.W_MOTOR/g*C.WHEEL_R[c.over.size]);});
  let h='<span>Kütle <b>'+A.mass.toFixed(1).replace('.',',')+' kg</b></span><span>Motor <b>'+A.motors+'</b></span><span>Tepe hız <b>'+(level&&level.motorOff?'motor kapalı':vmax.toFixed(1).replace('.',',')+' m/s')+'</b></span>';
  if(level&&level.goals){const cst=C.costOf(design);h+='<span>Maliyet <b'+(cst<=level.goals.cost?' style="color:var(--yellow)"':'')+'>'+cst+'</b> / ★ '+level.goals.cost+'</span>';}
  if(lastTele)h+='<span style="flex-basis:100%">Son deneme: <b>'+lastTele+'</b></span>';
  $('tele').innerHTML=h;updateHintDot();}
$('btnClear').onclick=()=>{setPieces([]);};


// ---------- hints ----------
const SOLPACK=(window.SOLPACK||null);
const TIER_AT=[2,4,6];
const HINT1={
  step:'Bir teker, kendi yarıçapından yüksek bir basamağa tek başına çıkamaz. Ya tekeri büyüt ya da basamağa yaslanıp aracı yukarı itebilecek birden çok motorlu teker kullan.',
  ramp:'Yokuşta iki şey tükenir: tutunma ve motor gücü. Tekerlerden duman çıkıyorsa tutunma yetmiyor, motor kızarıyorsa güç yetmiyor. Araç şaha kalkıyorsa ağırlık fazla geride.',
  gap:'Boşluğu ya boşluktan uzun bir araçla köprü gibi geçersin ya da üstünden uçacak kadar hızla. Karşı kenara çarpan teker büyükse daha kolay tırmanır.',
  egg:'Yumurtayı kıran şey hız değil, ani duruş. Darbeyi uzun bir mesafeye yayan her şey işe yarar: esneyen bir şasi, tampon ya da yumuşak süspansiyon.'};
const TRAP_HINT=[
  'Köprü sen üstüne çıkınca çöküyor. Ya boşluktan uzun bir araç lazım ya da çöken zemin düşmeden geçecek kadar hız.',
  'Yokuş buz tutmuş, tekerler tutunamıyor. Yokuşa tırmanmaya çalışma, altından hızla gel ve momentumla çık.',
  'Yola bir blok düşüyor ve önüne basamak oluyor. Araç onun üstüne tırmanabilmeli ya da blok düşmeden altından geçebilmeli.',
  'Geçide girerken tavan iniyor. Araç alçak olmalı ama çıkışta küçük bir basamak da var.',
  'Bayrağa varınca bayrak kaçıyor ve arkasında bir yokuş var. Yolculuk uzun: gücü ve süreyi ona göre planla.',
  'Çöken köprü, düşen blok ve kaçan bayrak aynı parkurda. Hepsine dayanan tek bir araç lazım.'];
const CAMP_HINT=[
  'Yol düz görünüyor ama sona doğru yerden bir şey çıkabilir. Aracın gövdesi yere çok yakınsa takılır.',
  'Tahterevalli senin ağırlığınla devrilir. Bitiş göründüğü yerde olmayabilir; arkasında yerden yükselen bir basamak var.',
  'Tümsekler aracı zıplatır ve ters çevirebilir. Uzun şasi ya da esneyen süspansiyon işe yarar. Sonda zemin çöker, durma.',
  'Köprü sallanır ve ağır araçla kopar. Köprüden sonra yerden bir basamak yükselir.',
  'Kutular itilebilir. Onları devirecek güç ya da üstlerinden geçecek teker gerekir. Kutulardan sonra yukarıdan bir şey düşer.',
  'Boşluğu atlamak için hız gerekir. Karşıya çarparken ön tarafın yere gömülmemesi için dengeyi düşün. Bayraktan sonra bir yokuş daha var.',
  'Platform boşluğun üstünde gidip gelir. Doğru anda bin ve karşıya geçince inen tavanın altından geçecek kadar alçak kal.',
  'Yokuşun tepesinden variller yuvarlanır. Onları ezip geçecek büyük tekerler ya da üstlerinden aşacak güç gerekir.',
  'Maden tavanı alçak. Araç tavanın altından geçmeli ama çıkıştaki basamağa da tırmanabilmeli.',
  'Dikenler tekerleri koparır. Dikenler yükselmeden üstlerinden uçacak hız lazım.',
  'İki tahterevalli arka arkaya. İkincisine binerken birincisinin ucuna takılmamak için aracın boyu önemli. Sonda yine bir sürpriz var.',
  'Basamak, kutular, boşluk ve düşen blok. Güçlü ve boşluktan uzun bir araç düşün.',
  'Bu köprü çürük: yavaş ve ağır giden düşer. Hafif ve hızlı ol, sonra inen tavana dikkat.',
  'Uçurum geniş. Rampadan olabildiğince hızlı çık. İnişten sonra zemin çöker, durma.',
  'Her şey bir arada: tahterevalli, köprü, kutular, dikenler, platform ve kaçan bayrak. Her engeli tek tek düşün, sonra hepsine dayanan aracı kur.'];
const PART_NAME={wheel0:'Küçük teker',wheel2:'Büyük teker',wheel3:'Dev teker',weight:'Ağırlık',hinge:'Menteşe',bumper:'Tampon',gear0:'Hız dişlisi',gear2:'Güç dişlisi',soft:'Yumuşak süspansiyon'};
function decodeSol(e){const cells={};e.c.split(' ').forEach(tok=>{const m=tok.match(/^(\d+)\.(\d+)([BKH])(.?)$/);if(!m)return;const c={base:{B:'beam',K:'weight',H:'hinge'}[m[3]]};const o=m[4];
  if(o){if('abcd'.includes(o))c.over={t:'wheel',size:'abcd'.indexOf(o),motor:true};else if('ABCD'.includes(o))c.over={t:'wheel',size:'ABCD'.indexOf(o),motor:false};else if(o==='p')c.over={t:'bumper'};else if(o==='e')c.over={t:'egg'};}
  cells[m[1]+','+m[2]]=c;});
  const xs=Object.keys(cells).map(k=>+k.split(',')[0]);const sh=Math.floor((C.COLS-(Math.max(...xs)-Math.min(...xs)+1))/2)-Math.min(...xs);
  const out={};Object.entries(cells).forEach(([k,c])=>{const [x,y]=k.split(',').map(Number);out[(x+sh)+','+y]=c;});return {cells:out,gear:e.g,susp:e.s?'soft':'hard'};}
function rungKey(){return mode==='camp'?campKey(ci):C.LADDERS[li].id+':'+ri;}
function pickSolution(){const list=(SOLPACK&&SOLPACK[rungKey()])||[];for(const s of list)if(s.n.every(owned))return {sol:s};return {missing:list.length?list.reduce((a,s)=>s.n.filter(n=>!owned(n)).length<a.length?s.n.filter(n=>!owned(n)):a,list[0].n.filter(n=>!owned(n))):[]};}
function whereUnlock(p){const cu=Object.keys(C.CAMPAIGN_UNLOCK).find(k=>C.CAMPAIGN_UNLOCK[k]===p);if(cu){const i=C.CAMPAIGN.findIndex(c=>c.id===cu);return 'Macera '+(i+1)+'. bölüm';}const k=Object.keys(UNLOCKS).find(k=>UNLOCKS[k]===p);if(!k)return '';const [id,r]=k.split(':');const L=C.LADDERS.find(l=>l.id===id);return L.name+' '+fmtRung(L,L.rungs[+r],+r);}
function describe(d){const cells=d.cells;const xs=Object.keys(cells).map(k=>+k.split(',')[0]);const x0=Math.min(...xs),x1=Math.max(...xs);const span=(x1-x0+1)*10;
  const wh={};let w=[];Object.entries(cells).forEach(([k,c])=>{if(c.over&&c.over.t==='wheel'){const key=(c.over.motor?'motorlu ':'serbest ')+['küçük','orta','büyük','dev'][c.over.size];wh[key]=(wh[key]||0)+1;}if(c.base==='weight')w.push(+k.split(',')[0]);});
  const parts=[span+' cm uzunluğunda şasi'];Object.entries(wh).forEach(([k,n])=>parts.push(n+' '+k+' teker'));
  if(w.length){const mid=(x0+x1)/2;const pos=w.map(x=>x<mid-1.5?'arkada':x>mid+1.5?'önde':'ortada');const u=[...new Set(pos)];parts.push(w.length+' ağırlık ('+u.join(', ')+')');}
  const hn=Object.values(cells).filter(c=>c.base==='hinge').length;if(hn)parts.push(hn+' menteşe');
  if(Object.values(cells).some(c=>c.over&&c.over.t==='bumper'))parts.push('tampon');
  parts.push(C.GEARS[d.gear].name+' dişlisi');parts.push((d.susp==='soft'?'yumuşak':'sert')+' süspansiyon');
  return parts.join(', ')+'.';}
function hintTiers(){const f=(prog.fails||{})[rungKey()]||0;return TIER_AT.filter(n=>f>=n).length;}
function updateHintDot(){const k=rungKey();const seen=(prog.hintSeen||{})[k]||0;$('hintDot').hidden=!(hintTiers()>seen);}
function showHints(){
  const k=rungKey();const f=(prog.fails||{})[k]||0;const L=mode==='camp'?{}:C.LADDERS[li];prog.hintSeen=prog.hintSeen||{};prog.hintSeen[k]=hintTiers();save();updateHintDot();
  const t1=mode==='camp'?CAMP_HINT[ci]:L.trap?TRAP_HINT[ri]:HINT1[L.id];const P=pickSolution();
  const tier=(i,title,body)=>{const open=f>=TIER_AT[i];return '<div class="tier'+(open?'':' locked')+'"><b>'+title+'</b>'+(open?body:'<small>'+(TIER_AT[i]-f)+' başarısız deneme sonra açılır</small>')+'</div>';};
  let b2,b3;
  if(P.sol){const d=decodeSol(P.sol.e);b2='<p>Bu testi geçen bir araç: '+describe(d)+'</p>';b3='<p>Doğrulanmış bir çözümü garaja yükleyebilirsin. Kendi tasarımın saklanır, istediğinde geri dönersin.</p><button class="btn primary" id="hLoad">Çözümü garaja yükle</button>';}
  else{const m=P.missing.map(p=>'<b style="color:var(--bink);letter-spacing:0;font-family:Barlow">'+PART_NAME[p]+'</b> ('+whereUnlock(p)+')').join(', ');b2=b3='<p>Bu test için önce şu parçayı açman gerekiyor: '+m+'.</p>';}
  let h='<h3>İpucu</h3>'+tier(0,'1 · YÖN',"<p>"+t1+"</p>")+tier(1,'2 · TASARIM',b2)+tier(2,'3 · ÇÖZÜM',b3);
  if(prog.backup)h+='<button class="btn" id="hBack">Kendi tasarımıma dön</button>';
  h+='<div class="btnrow"><button class="btn" id="hClose">Kapat</button></div>';
  $('card').innerHTML=h;$('modal').hidden=false;
  $('hClose').onclick=()=>{$('modal').hidden=true;};
  const hl=$('hLoad');if(hl)hl.onclick=()=>{prog.backup=JSON.parse(JSON.stringify(design));design=decodeSol(P.sol.e);design.pieces=cellsToPieces(design.cells);saveDesign();$('modal').hidden=true;refreshGarage();};
  const hb=$('hBack');if(hb)hb.onclick=()=>{design=prog.backup;prog.backup=null;saveDesign();$('modal').hidden=true;refreshGarage();};
}
$('btnHint').onclick=showHints;

// ---------- flow ----------
const REASON={stuck:'TAKILDI',fall:'DÜŞTÜ',egg:'YUMURTA KIRILDI',time:'SÜRE DOLDU',stop:'DURDURULDU'};
function ladderOpen(id){const r=LADDER_REQ[id];return !r||isDone(r);}
function nextRung(id){const L=C.LADDERS.find(l=>l.id===id);for(let i=0;i<L.rungs.length;i++)if(!isDone(id+':'+i))return i;return L.rungs.length-1;}
function fmtRung(L,v,j){if(L.trap)return isDone('trap:'+(v-1))?C.TRAPS[v-1].name:'?';return L.unit==='m'?String(v).replace('.',',')+' m':L.unit==='°'?v+'°':v+' cm';}
function showMap(){
  phase='map';closeGarage();$('hud').hidden=true;$('timer').hidden=true;$('btnStop').hidden=true;$('modal').hidden=true;$('intro').hidden=true;
  const M=$('map');const N=C.CAMPAIGN.length;let tot=0;for(let i=0;i<N;i++)tot+=starsOf(i);
  let nx=0;while(nx<N-1&&isDone(campKey(nx)))nx++;if(isDone(campKey(nx))){const k=[...Array(N).keys()].find(i=>starsOf(i)<3);if(k!=null)nx=k;}
  let h='<h1>'+(window.APP_NAME||'Tork Garajı')+'</h1><p class="sub">Aracını kur, parkurda dene, geliştir. Her bölümde bir sürpriz var.</p>';
  h+='<div class="sect"><b>MACERA</b><span>'+tot+' / '+(N*3)+' ★</span></div>';
  h+='<button class="cont" id="mCont"><small>'+(isDone(campKey(nx))?'Tekrar oyna':'Sıradaki bölüm')+'</small><b>'+(nx+1)+'. '+C.CAMPAIGN[nx].name+'</b><span>▶</span></button>';
  h+='<div class="camp">';
  C.CAMPAIGN.forEach((c,i)=>{const open=campOpen(i),d=isDone(campKey(i)),st=starsOf(i);
    h+='<button class="lv'+(d?' done':'')+(i===nx&&!d?' next':'')+'" data-c="'+i+'"'+(open?'':' disabled')+' aria-label="'+(i+1)+'. '+c.name+'"><b>'+(open?i+1:'🔒')+'</b><span>'+(d?'★'.repeat(st)+'<i>'+'★'.repeat(3-st)+'</i>':'&nbsp;')+'</span></button>';});
  h+='</div>';
  h+='<div class="sect"><b>ANTRENMAN</b><span>Tek engelli testler</span></div>';
  C.LADDERS.forEach((L,i)=>{const open=ladderOpen(L.id);const nd=L.rungs.filter((_,j)=>isDone(L.id+':'+j)).length;
    h+='<button class="ladder" data-l="'+i+'"'+(open?'':' disabled')+'><div class="lhead"><b>'+L.name+'</b><span>'+(open?nd+' / '+L.rungs.length:'🔒 '+LADDER_REQ_TXT[L.id])+'</span></div><div class="rungs">';
    const nr=nextRung(L.id);L.rungs.forEach((v,j)=>{const d=isDone(L.id+':'+j);h+='<div class="rung'+(d?' done':(open&&j===nr?' next':''))+'"'+(L.trap?' style="font-size:10px;text-align:center;line-height:1.1;padding:0 2px"':'')+'>'+fmtRung(L,v)+'</div>';});
    h+='</div></button>';});
  M.innerHTML=h;M.hidden=false;
  $('mCont').onclick=()=>startCamp(nx,false);
  M.querySelectorAll('.lv').forEach(b=>b.onclick=()=>startCamp(+b.dataset.c,false));
  M.querySelectorAll('.ladder').forEach(b=>b.onclick=()=>{const i=+b.dataset.l;startRung(i,nextRung(C.LADDERS[i].id),false);});
}
$('btnMap').onclick=()=>{if(phase==='run')return;showMap();};

function startRung(i,j,run){
  mode='ladder';li=i;ri=j;level=C.levelFor(i,j);flagVis=level.geo.flagX||0;tries=0;lastTele=null;prevSim=null;parts=[];
  $('map').hidden=true;$('modal').hidden=true;$('hud').hidden=false;$('banner').hidden=true;
  $('hName').textContent=level.name;$('hTries').textContent='Deneme 0';
  closeGarage();previewSim();
  phase='intro';phaseT=0;autoRun=run;
  $('introN').textContent=C.LADDERS[i].name+' · '+(j+1)+'. basamak';$('introG').innerHTML='';$('introT').textContent=C.LADDERS[i].trap?(isDone('trap:'+j)?C.TRAPS[j].name:'Tuzak '+(j+1)):fmtRung(C.LADDERS[i],C.LADDERS[i].rungs[j]);$('intro').hidden=false;
  cam.x=endX()+0.5;cam.y=groundAt(endX())+0.5;cam.s=scaleRun();cam.ay=.55;
}
function previewSim(){let d=design;if(validity()){const dd=defaultDesign();d={cells:compile(dd.pieces),gear:1,susp:'hard'};}sim=C.createSim(pl,level,d);if(sim)sim._cells=d.cells;}
function goalsHtml(g,res){if(!g)return '';const t='<span class="g on">★ Bitir</span>';
  const a=res?res.t<=g.time:null,b=res?res.cost<=g.cost:null;const cls=v=>v==null?'g':v?'g on':'g off';
  return t+'<span class="'+cls(a)+'">★ '+fmtN(g.time)+' sn'+(res?' <small>('+fmtN(res.t,1)+')</small>':'')+'</span><span class="'+cls(b)+'">★ maliyet '+g.cost+(res?' <small>('+res.cost+')</small>':'')+'</span>';}
function startCamp(i,run){
  mode='camp';ci=i;const c=C.CAMPAIGN[i];level=C.campaignLevel(i);flagVis=level.geo.flagX||0;tries=0;lastTele=null;prevSim=null;parts=[];
  $('map').hidden=true;$('modal').hidden=true;$('hud').hidden=false;$('banner').hidden=true;
  $('hName').textContent=(i+1)+'. '+c.name;$('hTries').textContent='Deneme 0';
  closeGarage();previewSim();
  phase='intro';phaseT=0;autoRun=run;
  $('introN').textContent='Macera · '+(i+1)+'. bölüm';$('introT').textContent=c.name;$('introG').innerHTML=goalsHtml(level.goals);$('intro').hidden=false;
  cam.x=endX()+0.5;cam.y=groundAt(endX())+0.5;cam.s=scaleRun();cam.ay=.55;
}
function openGarage(){phase='garage';$('garage').classList.remove('closed');$('btnStop').hidden=true;$('timer').hidden=true;$('intro').hidden=true;renderPalette();refreshGarage();
  requestAnimationFrame(layoutEditor);}
function closeGarage(){$('garage').classList.add('closed');}
function beginRun(){
  if(phase!=='garage'&&phase!=='intro')return;
  if(validity()){openGarage();return;}
  tries++;$('hTries').textContent='Deneme '+tries;closeGarage();
  const d=JSON.parse(JSON.stringify(design));sim=C.createSim(pl,level,d);sim._cells=d.cells;sim._x0=sim.centroid().x;parts=[];flagVis=level.geo.flagX||0;
  phase='run';phaseT=0;$('btnStop').hidden=false;$('timer').hidden=false;$('intro').hidden=true;
}
$('btnGo').onclick=beginRun;
$('btnStop').onclick=()=>{if(phase==='run'){sim.status='fail';sim.reason='stop';onFail();}};

function teleText(S){const lg=level.geo;const goal=lg.flagX!=null?lg.flagX:lg.wallX;const start=S._x0??0;
  const prog=Math.max(0,Math.min(1,(S.best-start)/(goal-start)));
  let t=Math.round(prog*100)+'% yol · tepe hız '+S.topSpeed.toFixed(1).replace('.',',')+' m/s';
  if(level.egg)t+=' · en sert darbe '+(S.peakG/10).toFixed(1).replace('.',',')+' g (sınır '+(level.egg/10).toFixed(0)+' g)';
  const br=S.wheels.filter(w=>w.broken).length;if(br)t+=' · '+br+' teker koptu';return t;}
function onFail(){
  {const k=rungKey();prog.fails=prog.fails||{};prog.fails[k]=(prog.fails[k]||0)+1;save();}
  phase='fail';phaseT=0;$('btnStop').hidden=true;lastTele=teleText(sim);
  if(sim.reason==='egg'&&sim.eggComp){const p=sim.eggComp.body.getWorldPoint(sim.eggLocal);for(let k=0;k<24;k++)parts.push({x:p.x,y:p.y,vx:(Math.random()-.5)*3,vy:Math.random()*3,life:1,type:'yolk',r:0.018});shake=10;}
  const b=$('banner');b.className='banner';b.textContent=REASON[sim.reason]||'OLMADI';b.hidden=false;
  setTimeout(()=>{if(phase!=='fail')return;b.hidden=true;startReplay();},1100);
}
function startReplay(){
  const n=sim.frames.length;const from=Math.max(0,n-110);if(n-from<30){endReplay();return;}
  replay={i:from,end:n,speed:0.4};phase='replay';$('replayTag').hidden=false;$('timer').hidden=true;
}
function endReplay(){if(phase!=='replay')return;replay=null;$('replayTag').hidden=true;prevSim=sim;openGarage();}
function onWin(){
  if(mode==='camp')return onWinCamp();
  phase='win';$('btnStop').hidden=true;const key=C.LADDERS[li].id+':'+ri;const first=!isDone(key);prog.done[key]=true;save();
  const b=$('banner');b.className='banner win';b.textContent='GEÇTİ!';b.hidden=false;
  const p=sim.centroid();for(let k=0;k<40;k++)parts.push({x:p.x,y:p.y+0.8,vx:(Math.random()-.5)*4,vy:Math.random()*4,life:1.4,type:'confetti',r:0.02,c:['#f2c014','#e0561b','#1d5aa6','#2fae66'][k%4]});
  const L=C.LADDERS[li];const last=ri===L.rungs.length-1;const un=first&&UNLOCKS[key];
  const opened=first?Object.entries(LADDER_REQ).filter(([id,r])=>r===key).map(([id])=>C.LADDERS.find(l=>l.id===id).name):[];
  setTimeout(()=>{b.hidden=true;
    let h='<h3>'+level.name+' geçildi</h3><p>'+tries+'. denemede, '+sim.t.toFixed(1).replace('.',',')+' saniyede.</p>';
    if(un){const it=TOOLS.find(t=>t.id===un)||EXTRA[un];h+='<div class="unlock"><canvas id="unc"></canvas><div><b>YENİ PARÇA: '+it.name+'</b><span>'+it.desc+'</span></div></div>';}
    opened.forEach(n=>{h+='<div class="unlock"><div><b>YENİ TEST: '+n+'</b><span>Haritada açıldı.</span></div></div>';});
    h+='<div class="btnrow">'+(last?'':'<button class="btn primary" id="mNext">Sıradaki: '+fmtRung(L,L.rungs[ri+1])+' ▶</button>')+'</div><div class="btnrow"><button class="btn" id="mGarage">Garaja dön</button><button class="btn" id="mMap">Harita</button></div>';
    $('card').innerHTML=h;$('modal').hidden=false;if(un)iconFor(un,$('unc'));
    if(!last)$('mNext').onclick=()=>startRung(li,ri+1,true);
    $('mGarage').onclick=()=>{$('modal').hidden=true;prevSim=sim;lastTele=teleText(sim);openGarage();};
    $('mMap').onclick=showMap;
  },1300);
}

function onWinCamp(){
  phase='win';$('btnStop').hidden=true;const c=C.CAMPAIGN[ci];const key=campKey(ci);const first=!isDone(key);prog.done[key]=true;
  const g=level.goals||{time:1e9,cost:1e9};const mask=1|(sim.t<=g.time?2:0)|(sim.cost<=g.cost?4:0);prog.stars=prog.stars||{};const before=prog.stars[c.id]||0;prog.stars[c.id]=before|mask;save();
  const n=(mask&1)+((mask>>1)&1)+((mask>>2)&1);
  const b=$('banner');b.className='banner win';b.textContent='GEÇTİ!';b.hidden=false;
  const p=sim.centroid();for(let k=0;k<40+n*20;k++)parts.push({x:p.x,y:p.y+0.8,vx:(Math.random()-.5)*4,vy:Math.random()*4,life:1.4,type:'confetti',r:0.02,c:['#f2c014','#e0561b','#1d5aa6','#2fae66'][k%4]});
  const un=first&&C.CAMPAIGN_UNLOCK[c.id];const last=ci===C.CAMPAIGN.length-1;
  setTimeout(()=>{b.hidden=true;
    let h='<h3>'+c.name+'</h3><div class="stars">'+[0,1,2].map(k=>'<i class="'+(k<n?'on':'')+'" style="animation-delay:'+(0.15+k*0.25)+'s">★</i>').join('')+'</div>';
    h+='<div class="goals">'+goalsHtml(level.goals,{t:sim.t,cost:sim.cost})+'</div>';
    h+='<p>'+tries+'. denemede geçtin.'+(n<3?(mask&2?'':' Daha hızlı bir araç süre yıldızını getirir.')+(mask&4?'':' Daha az parça maliyet yıldızını getirir.'):' Kusursuz!')+'</p>';
    if(un){const it=TOOLS.find(t=>t.id===un)||EXTRA[un];h+='<div class="unlock"><canvas id="unc"></canvas><div><b>YENİ PARÇA: '+it.name+'</b><span>'+it.desc+'</span></div></div>';}
    if(last&&first)h+='<div class="unlock"><div><b>MACERA TAMAM!</b><span>Tüm bölümleri geçtin. Eksik yıldızların peşine düşebilirsin.</span></div></div>';
    h+='<div class="btnrow">'+(last?'':'<button class="btn primary" id="mNext">Sıradaki bölüm ▶</button>')+'</div><div class="btnrow"><button class="btn" id="mGarage">Yıldız için tekrar</button><button class="btn" id="mMap">Harita</button></div>';
    $('card').innerHTML=h;$('modal').hidden=false;if(un)iconFor(un,$('unc'));
    if(!last)$('mNext').onclick=()=>startCamp(ci+1,false);
    $('mGarage').onclick=()=>{$('modal').hidden=true;prevSim=sim;lastTele=teleText(sim);openGarage();};
    $('mMap').onclick=showMap;
  },1300);
}

// ---------- loop ----------
let acc=0,last=performance.now();
function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}
function effects(S){
  S.wheels.forEach(w=>{if(w.broken)return;const p=w.body.getPosition();
    if(w.touch&&w.slip>0.8&&Math.random()<0.5)puff(p.x,p.y-w.r*0.9,'smoke',1);
    if(w.motor&&w.strain>0.7&&Math.random()<0.25)puff(p.x,p.y,'spark',1);});
  while(S._ev<(S.events.length)){const e=S.events[S._ev++];if(e.type==='trap'){puff(e.x,e.y,'smoke',14);shake=9;}else{puff(e.x,e.y,'spark',16);shake=12;}}
  if(S.lastG>350)shake=Math.min(14,Math.max(shake,S.lastG/60));
}
function frame(now){
  const dt=Math.min(0.1,(now-last)/1000);last=now;phaseT+=dt;shake*=0.88;
  if(phase==='map'){bg();requestAnimationFrame(frame);return;}
  if(phase==='garage'){drawEditor();requestAnimationFrame(frame);return;}
  let S=sim, stepIdx=S?S.frames.length-1:0;
  if(phase==='run'){acc+=dt;S._ev=S._ev||0;
    while(acc>=C.DT&&phase==='run'){S.step();acc-=C.DT;effects(S);
      if(S.status==='win')onWin();else if(S.status==='fail')onFail();}
    $('timer').innerHTML=S.t.toFixed(1).replace('.',',')+' <small>/ '+level.time+' s'+(level.goals?(S.t<=level.goals.time?' · <span style="color:#b98f06">★ '+fmtN(level.goals.time)+'</span>':' · ★ '+fmtN(level.goals.time)):'')+'</small>';stepIdx=S.frames.length-1;
  }else if(phase==='fail'||phase==='win'){acc+=dt;while(acc>=C.DT){S.world.step(C.DT,8,3);acc-=C.DT;}}
  else acc=0;
  // camera
  let target;
  if(phase==='replay'){replay.i=Math.min(replay.end-1,replay.i+replay.speed*dt*60);if(replay.i>=replay.end-1)endReplay();}
  if(phase==='intro'){
    const k=Math.min(1,Math.max(0,(phaseT-(autoRun?0.3:0.9))/(autoRun?0.9:1.5)));const e=ease(k);const sx=S?S.centroid().x+1:0;const ex=endX();
    cam.x=ex+(sx-ex)*e;cam.y=groundAt(cam.x)+0.5;cam.s=scaleRun();cam.ay=.55;
    if(phaseT>(autoRun?1.4:2.6)){$('intro').hidden=true;if(autoRun)beginRun();else openGarage();}
  }else if(S&&phase!=='garage'){
    let c;if(phase==='replay'){const f=S.frames[Math.floor(replay.i)];c={x:f[0],y:f[1]};}else c=S.centroid();
    const tx=c.x+0.9,ty=c.y+0.35;const k=1-Math.pow(0.02,dt);cam.x+=(tx-cam.x)*k;cam.y+=(ty-cam.y)*k;cam.s+=(scaleRun()*(phase==='replay'?1.25:1)-cam.s)*k;cam.ay+=(.58-cam.ay)*k;
  }
  if(phase==='garage'){requestAnimationFrame(frame);return;}
  {const tgt=(sim&&sim.flagX!=null)?sim.flagX:level.geo.flagX;if(tgt!=null){if(!flagVis||phase==='intro'&&!sim)flagVis=tgt;flagVis+=(tgt-flagVis)*Math.min(1,dt*3);}}
  curFrame=phase==='replay'&&S?S.frames[Math.floor(replay.i)]:null;
  bg();worldTf();drawWorld();
  if(phase==='run'&&prevSim&&prevSim.frames.length){const f=prevSim.frames[Math.min(stepIdx,prevSim.frames.length-1)];drawSim(prevSim,f,0.22);}
  if(phase==='replay')drawSim(S,S.frames[Math.floor(replay.i)]);else drawSim(S);
  drawParts(phase==='replay'?dt*0.3:dt);
  if(phase==='replay'){ctx.setTransform(DPR,0,0,DPR,0,0);const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.7);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.28)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  requestAnimationFrame(frame);
}
window.__pg={get phase(){return phase},get sim(){return sim},get level(){return level},beginRun,startRung,startCamp,showMap,design:()=>design,setDesign:d=>{design=d;design.pieces=d.pieces||cellsToPieces(d.cells);design.cells=compile(design.pieces);saveDesign();}};
showMap();requestAnimationFrame(frame);
})();
