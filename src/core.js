// ===== Oyun fizik çekirdeği (tarayıcı + node testleri) =====
var CORE = (function(){
const CELL=0.1, COLS=18, ROWS=8, DT=1/60, MAX_WHEELS=6;
const WHEEL_R=[0.08,0.13,0.2,0.28];           // S M L XL
const WHEEL_NAME=['Küçük','Orta','Büyük','Dev'];
const GEARS=[{name:'Hız',ratio:1},{name:'Denge',ratio:3},{name:'Güç',ratio:7}];
const W_MOTOR=40, T_MOTOR=0.35;               // rad/s and Nm at 1:1, per motor
const M_BEAM=0.08, M_WEIGHT=0.5, M_HINGE=0.06, M_MOTOR=0.12, WHEEL_DENS=3;
const BREAK_F=(typeof process!=="undefined"&&process.env.BF?+process.env.BF:450);                            // N — wheel axle snaps above this
const BUMP_TR=0.2, BUMP_K=260, BUMP_FR=25;

const key=(x,y)=>x+','+y;
const unkey=k=>k.split(',').map(Number);
const isStruct=c=>c&&(c.base==='beam'||c.base==='weight');

// ---------- design analysis ----------
function analyze(d){
  const cells=d.cells, keys=Object.keys(cells).filter(k=>cells[k]&&cells[k].base);
  const res={ok:false,msg:'',comps:[],hinges:[],mass:0,motors:0,wheels:0,cellComp:{}};
  if(!keys.length){res.msg='Önce bir kiriş yerleştir.';return res;}
  // union-find structural cells
  const par={};const f=k=>par[k]===k?k:(par[k]=f(par[k]));
  keys.forEach(k=>{if(isStruct(cells[k]))par[k]=k;});
  keys.forEach(k=>{if(!isStruct(cells[k]))return;const [x,y]=unkey(k);
    [[1,0],[0,1]].forEach(([dx,dy])=>{const n=key(x+dx,y+dy);if(isStruct(cells[n])){const a=f(k),b=f(n);if(a!==b)par[a]=b;}});});
  // hinges
  const hingeEdges=[];
  for(const k of keys){if(cells[k].base!=='hinge')continue;const [x,y]=unkey(k);
    const roots=[...new Set([[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>key(x+dx,y+dy)).filter(n=>isStruct(cells[n])).map(f))];
    if(roots.length===0){res.msg='Menteşe bir kirişe bağlı olmalı.';return res;}
    if(roots.length>2){res.msg='Bir menteşe en fazla iki parçayı bağlar.';return res;}
    if(roots.length===1){par[k]=roots[0];} else {par[k]=k;hingeEdges.push({k,a:roots[0],b:roots[1]});}
  }
  // components
  const compMap={};keys.forEach(k=>{if(cells[k].base==='hinge'&&par[k]===k&&hingeEdges.find(h=>h.k===k))return;const r=f(k);(compMap[r]=compMap[r]||[]).push(k);});
  // hinge cell fixture goes to comp a
  hingeEdges.forEach(h=>{compMap[h.a].push(h.k);});
  const roots=Object.keys(compMap);
  // connectivity through hinge edges
  const adj={};roots.forEach(r=>adj[r]=[]);hingeEdges.forEach(h=>{adj[h.a].push(h.b);adj[h.b].push(h.a);});
  const seen=new Set([roots[0]]);const st=[roots[0]];while(st.length){const r=st.pop();adj[r].forEach(n=>{if(!seen.has(n)){seen.add(n);st.push(n);}});}
  if(seen.size!==roots.length){res.msg='Bazı parçalar araca bağlı değil.';return res;}
  // overlays
  let eggs=0;
  for(const k of Object.keys(cells)){const c=cells[k];if(!c||!c.over)continue;
    if(!isStruct(c)){res.msg='Teker, tampon ve yumurta bir kirişin üstüne takılır.';return res;}
    if(c.over.t==='wheel'){res.wheels++;if(c.over.motor)res.motors++;res.mass+=WHEEL_DENS*Math.PI*WHEEL_R[c.over.size]**2+(c.over.motor?M_MOTOR:0);}
    if(c.over.t==='egg')eggs++;
    if(c.over.t==='bumper')res.mass+=0.15;
  }
  keys.forEach(k=>{const b=cells[k].base;res.mass+=b==='weight'?M_WEIGHT:b==='hinge'?M_HINGE:M_BEAM;});
  res.comps=roots.map(r=>compMap[r]);
  res.comps.forEach((c,i)=>c.forEach(k=>res.cellComp[k]=i));
  res.hinges=hingeEdges.map(h=>({k:h.k,a:roots.indexOf(h.a),b:roots.indexOf(h.b)}));
  res.eggs=eggs;
  if(!res.wheels){res.msg='Araçta hiç teker yok.';return res;}
  { const ws=[];Object.keys(cells).forEach(k=>{const c=cells[k];if(c&&c.over&&c.over.t==='wheel'){const [x,y]=unkey(k);ws.push({x,y,r:WHEEL_R[c.over.size]});}});
    if(ws.length>MAX_WHEELS){res.msg='En fazla '+MAX_WHEELS+' teker takılabilir.';return res;}
    for(let i=0;i<ws.length;i++)for(let j=i+1;j<ws.length;j++){const d=Math.hypot(ws[i].x-ws[j].x,ws[i].y-ws[j].y)*CELL;
      if(d<ws[i].r+ws[j].r-0.005){res.msg='Tekerler iç içe geçiyor. Aralarını aç.';res.overlap=[i,j];return res;}} }
  if(!res.motors&&!d.noMotorOk){res.msg='En az bir motorlu teker gerekli.';}
  res.ok=!res.msg;
  return res;
}

// ---------- maliyet (3. yıldız için bütçe) ----------
const COST={beam:1,weight:2,hinge:2,bumper:3,egg:0,wheel:[2,3,4,5],motor:2};
function costOf(d){let c=0;Object.values(d.cells||{}).forEach(q=>{if(!q)return;if(q.base)c+=COST[q.base]||0;
  if(q.over){if(q.over.t==='wheel'){c+=COST.wheel[q.over.size];if(q.over.motor)c+=COST.motor;}else c+=COST[q.over.t]||0;}});return c;}

// ---------- level geometry ----------
function track(h0){
  h0=h0||0; let cur=[[-10,h0],[0,h0]]; let x=0,y=h0; const chains=[]; const fric=[]; const extra={}; const traps=[];
  const close=(f)=>{chains.push(cur);fric.push(f??1);};
  const T={
    flat(d){x+=d;cur.push([x,y]);return T;},
    step(h){cur.push([x,y+h]);y+=h;return T;},
    slope(deg,dy){const dx=Math.abs(dy)/Math.tan(deg*Math.PI/180);x+=dx;y+=dy;cur.push([x,y]);return T;},
    gap(w,depth){cur.push([x,y-(depth||4)]);close();x+=w;cur=[[x,y-(depth||4)],[x,y]];return T;},
    wall(h){cur.push([x,y+h]);cur.push([x+0.3,y+h]);extra.wallX=x;x+=0.3;return T;},
    ice(deg,dy){close();const x0=x,y0=y;const dx=deg?Math.abs(dy)/Math.tan(deg*Math.PI/180):dy;x+=dx;y+=deg?dy:0;cur=[[x0,y0],[x,y]];close(0.04);traps.push({type:'ice',x0,x1:x,y0,y1:y});cur=[[x,y]];return T;},
    slab(w){cur.push([x,y-4]);close();traps.push({type:'slab',x0:x,x1:x+w,y});x+=w;cur=[[x,y-4],[x,y]];return T;},
    drop(ahead,w,h){traps.push({type:'drop',x:x+ahead,w,h,y,trig:x});return T;},
    ceiling(len,clear,lead){traps.push({type:'ceil',x0:x,x1:x+len,y,clear,trig:x-(lead||1.2)});return T;},
    fakeFlag(){traps.push({type:'flag',x0:x});return T;},
    // --- hareketli / etkileşimli engeller (macera) ---
    seesaw(len,h){traps.push({type:'seesaw',cx:x+len/2,cy:y+h,len,h});x+=len;cur.push([x,y]);return T;},
    bridge(w,n,strength){cur.push([x,y-4]);close();traps.push({type:'bridge',x0:x,x1:x+w,y,n:n||Math.max(4,Math.round(w/0.25)),strength:strength||260});x+=w;cur=[[x,y-4],[x,y]];return T;},
    platform(w,period,pw){cur.push([x,y-4]);close();traps.push({type:'platform',x0:x,x1:x+w,y,pw:pw||0.9,period:period||5});x+=w;cur=[[x,y-4],[x,y]];return T;},
    boxes(cols,rows,s,dens){s=s||0.22;traps.push({type:'boxes',x,y,cols,rows,s,dens:dens||6});x+=cols*s+0.4;cur.push([x,y]);return T;},
    barrels(n,r,lead){traps.push({type:'barrels',x,y,n,r:r||0.14,trig:x-(lead||2.2)});return T;},
    roof(len,clear){traps.push({type:'roof',x0:x,x1:x+len,y,clear});return T;},
    // --- sinsi tuzaklar (Level Devil tarzı) ---
    riseStep(w,h,lead){traps.push({type:'rise',x0:x,x1:x+w,y,h,trig:x-(lead||0.8)});x+=w;cur.push([x,y]);return T;},
    spikes(w,lead,speed){traps.push({type:'spikes',x0:x,x1:x+w,y,trig:x-(lead||0.6),speed:speed||1.2});x+=w;cur.push([x,y]);return T;},
    end(flag){if(flag)extra.flagX=x;x+=8;cur.push([x,y]);cur.push([x,y+6]);close();
      const ff=traps.find(t=>t.type==='flag');if(ff){ff.x1=extra.flagX;}
      return {chains,fric,traps,flagX:ff?ff.x0:extra.flagX,wallX:extra.wallX,endY:y,startY:h0};}
  };
  return T;
}
function smoothDrop(h){ // crash ramp from height h down to 0
  const T=track(h);const s=[[3,.004],[6,.012],[10,.04],[16,.12],[26,.6],[16,.14],[8,.07],[3,.014]];
  s.forEach(([d,f])=>T.slope(d,-h*f));return T.flat(4).wall(1.5).end(false);
}

// ---------- simulation ----------
function createSim(pl, level, d){
  const A=analyze(Object.assign({},d,{noMotorOk:!!level.motorOff}));
  if(!A.ok)return null;
  const world=new pl.World({gravity:pl.Vec2(0,-10)});
  level.geo.chains.forEach((pts,i)=>{if(pts.length<2)return;const g=world.createBody();g.createFixture(pl.Chain(pts.map(p=>pl.Vec2(p[0],p[1])),false),{friction:(level.geo.fric||[])[i]??1.0});});
  const trapObjs=(level.geo.traps||[]).map(t=>{const o={t,fired:false};
    if(t.type==='slab'){o.body=world.createBody({type:'static',position:pl.Vec2((t.x0+t.x1)/2,t.y-0.08)});o.hw=(t.x1-t.x0)/2-0.005;o.hh=0.08;o.body.createFixture(pl.Box(o.hw,o.hh),{density:30,friction:1});}
    if(t.type==='drop'){o.body=world.createBody({type:'static',position:pl.Vec2(t.x,t.y+3.2)});o.hw=t.w/2;o.hh=t.h/2;o.body.createFixture(pl.Box(o.hw,o.hh),{density:400,friction:1});}
    if(t.type==='ceil'){o.hw=(t.x1-t.x0)/2;o.hh=0.9;o.ty=t.y+t.clear+o.hh;o.body=world.createBody({type:'kinematic',position:pl.Vec2((t.x0+t.x1)/2,o.ty+1.6)});o.body.createFixture(pl.Box(o.hw,o.hh),{friction:0.6});}
    if(t.type==='rise'){o.hw=(t.x1-t.x0)/2;o.hh=0.6;o.ty=t.y+t.h-o.hh;o.body=world.createBody({type:'kinematic',position:pl.Vec2((t.x0+t.x1)/2,t.y-o.hh-0.002)});o.body.createFixture(pl.Box(o.hw,o.hh),{friction:1});}
    if(t.type==='spikes'){const n=Math.max(2,Math.round((t.x1-t.x0)/0.1));const sw=(t.x1-t.x0)/n;o.body=world.createBody({type:'kinematic',position:pl.Vec2(t.x0,t.y-0.13)});
      for(let i=0;i<n;i++)o.body.createFixture(pl.Polygon([pl.Vec2(i*sw,0),pl.Vec2((i+1)*sw,0),pl.Vec2((i+0.5)*sw,0.12)]),{friction:0.8});o.ty=t.y-0.005;o.spike=true;}
    if(t.type==='roof'){o.hw=(t.x1-t.x0)/2;o.hh=1.2;o.body=world.createBody({type:'static',position:pl.Vec2((t.x0+t.x1)/2,t.y+t.clear+o.hh)});o.body.createFixture(pl.Box(o.hw,o.hh),{friction:0.6});}
    if(t.type==='seesaw'){o.hw=t.len/2;o.hh=0.04;const piv=world.createBody({type:'static',position:pl.Vec2(t.cx,t.cy)});
      const a0=Math.asin(Math.min(0.95,(t.h+0.04)/(t.len/2))); // sol ucu yerde başlar
      o.body=world.createBody({type:'dynamic',position:pl.Vec2(t.cx,t.cy),angle:a0});o.body.createFixture(pl.Box(o.hw,o.hh),{density:25,friction:1});
      world.createJoint(pl.RevoluteJoint({},piv,o.body,pl.Vec2(t.cx,t.cy)));o.pivot=[t.cx,t.cy];}
    if(t.type==='bridge'){const n=t.n,w=(t.x1-t.x0)/n;o.planks=[];o.joints=[];let prev=null;const g=world.createBody();
      for(let i=0;i<n;i++){const b=world.createBody({type:'dynamic',position:pl.Vec2(t.x0+w*(i+0.5),t.y-0.03)});b.createFixture(pl.Box(w/2-0.004,0.03),{density:20,friction:1});o.planks.push(b);
        o.joints.push(world.createJoint(pl.RevoluteJoint({},prev||g,b,pl.Vec2(t.x0+w*i,t.y-0.03))));prev=b;}
      o.joints.push(world.createJoint(pl.RevoluteJoint({},prev,g,pl.Vec2(t.x1,t.y-0.03))));o.pw=w;}
    if(t.type==='platform'){o.hw=t.pw/2;o.hh=0.05;o.body=world.createBody({type:'kinematic',position:pl.Vec2(t.x0+o.hw+0.02,t.y-o.hh)});o.body.createFixture(pl.Box(o.hw,o.hh),{friction:1});
      o.xa=t.x0+o.hw+0.02;o.xb=t.x1-o.hw-0.02;}
    if(t.type==='boxes'){o.list=[];for(let c=0;c<t.cols;c++)for(let r=0;r<t.rows;r++){const b=world.createBody({type:'dynamic',position:pl.Vec2(t.x+t.s*(c+0.5),t.y+t.s*(r+0.5))});
      b.createFixture(pl.Box(t.s/2-0.003,t.s/2-0.003),{density:t.dens,friction:0.7});o.list.push(b);}}
    if(t.type==='barrels'){o.list=[];for(let i=0;i<t.n;i++){const b=world.createBody({type:'static',position:pl.Vec2(t.x+i*(t.r*2.2),t.y+t.r+0.01)});
      b.createFixture(pl.Circle(t.r),{density:8,friction:0.8});o.list.push(b);}}
    return o;});
  const propBodies=[];trapObjs.forEach(o=>{if(o.body&&o.t.type!=='roof'){o.fi=propBodies.length;propBodies.push(o.body);}(o.planks||[]).forEach(b=>{b.fi=propBodies.length;propBodies.push(b);});(o.list||[]).forEach(b=>{b.fi=propBodies.length;propBodies.push(b);});});
  const cells=d.cells;
  // spawn offset: lowest point on ground, front at startX
  let minY=1e9,maxX=-1e9;
  Object.keys(cells).forEach(k=>{const c=cells[k];if(!c||!c.base)return;const [x,y]=unkey(k);
    minY=Math.min(minY,y*CELL-CELL/2);maxX=Math.max(maxX,x*CELL+CELL/2);
    if(c.over&&c.over.t==='wheel'){const r=WHEEL_R[c.over.size];minY=Math.min(minY,y*CELL-r);maxX=Math.max(maxX,x*CELL+r);}
    if(c.over&&c.over.t==='bumper')maxX=Math.max(maxX,x*CELL+CELL/2+BUMP_TR+0.06);});
  const gy=level.geo.startY||0;
  const ox=(level.frontX??0.3)-maxX, oy=gy+0.01-minY;
  const W=(x,y)=>pl.Vec2(ox+x*CELL,oy+y*CELL);
  const ratio=GEARS[d.gear??1].ratio;
  const comps=A.comps.map((list,ci)=>{
    // body origin at comp centroid for nicer rotation
    let cx=0,cy=0;list.forEach(k=>{const [x,y]=unkey(k);cx+=x;cy+=y;});cx/=list.length;cy/=list.length;
    const body=world.createBody({type:'dynamic',position:W(cx,cy)});
    list.forEach(k=>{const [x,y]=unkey(k);const c=cells[k];const lp=pl.Vec2((x-cx)*CELL,(y-cy)*CELL);
      if(c.base==='hinge')body.createFixture(pl.Circle(lp,0.045),{density:M_HINGE/(Math.PI*0.045*0.045),friction:0.6,filterGroupIndex:-1});
      else body.createFixture(pl.Box(CELL/2,CELL/2,lp,0),{density:(c.base==='weight'?M_WEIGHT:M_BEAM)/(CELL*CELL),friction:0.6,filterGroupIndex:-1});
    });
    return {body,cells:list,cx,cy,n:list.length};
  });
  A.hinges.forEach(h=>{const [x,y]=unkey(h.k);world.createJoint(pl.RevoluteJoint({},comps[h.a].body,comps[h.b].body,W(x,y)));});
  const wheels=[],bumpers=[];let eggComp=null,eggLocal=null;
  Object.keys(cells).forEach(k=>{const c=cells[k];if(!c||!c.over)return;const [x,y]=unkey(k);const comp=comps[A.cellComp[k]];
    if(c.over.t==='wheel'){const r=WHEEL_R[c.over.size];
      const wb=world.createBody({type:'dynamic',position:W(x,y)});
      wb.createFixture(pl.Circle(r),{density:WHEEL_DENS,friction:1.0,filterGroupIndex:-1});
      if(c.over.motor){comp.body.createFixture(pl.Box(0.035,0.035,pl.Vec2((x-comp.cx)*CELL,(y-comp.cy)*CELL),0),{density:M_MOTOR/0.0049,filterGroupIndex:-1,isSensor:true});}
      const soft=d.susp==='soft';
      const j=world.createJoint(pl.WheelJoint({frequencyHz:soft?3.5:9,dampingRatio:soft?0.45:0.8},comp.body,wb,wb.getPosition(),pl.Vec2(0,1)));
      if(c.over.motor&&!level.motorOff){j.enableMotor(true);j.setMotorSpeed(-W_MOTOR/ratio);j.setMaxMotorTorque(T_MOTOR*ratio);}
      wheels.push({body:wb,r,joint:j,motor:!!c.over.motor,maxT:T_MOTOR*ratio,target:W_MOTOR/ratio,comp,cell:[x,y],broken:false,strain:0,slip:0});
    }
    if(c.over.t==='bumper'){
      const bb=world.createBody({type:'dynamic',position:W(x+0.5+(BUMP_TR+0.03)/CELL,y)});
      bb.createFixture(pl.Box(0.03,0.07),{density:0.15/0.0084,friction:0.5,filterGroupIndex:-1});
      const pj=world.createJoint(pl.PrismaticJoint({enableMotor:true,motorSpeed:0,maxMotorForce:BUMP_FR,enableLimit:true,lowerTranslation:-BUMP_TR,upperTranslation:0},comp.body,bb,bb.getPosition(),pl.Vec2(1,0)));
      bumpers.push({body:bb,joint:pj,comp,anchor:pl.Vec2((x+0.5-comp.cx)*CELL,(y-comp.cy)*CELL)});
    }
    if(c.over.t==='egg'){eggComp=comp;eggLocal=pl.Vec2((x-comp.cx)*CELL,(y-comp.cy)*CELL+0.07);}
  });
  if(level.v0){world.getBodyList&&(()=>{for(let b=world.getBodyList();b;b=b.getNext())if(b.isDynamic())b.setLinearVelocity(pl.Vec2(level.v0,0));})();}
  const main=comps.slice().sort((a,b)=>b.n-a.n)[0];
  const bodies=[];comps.forEach(c=>bodies.push(c.body));wheels.forEach(w=>bodies.push(w.body));bumpers.forEach(b=>bodies.push(b.body));
  const propStart=bodies.length;propBodies.forEach(b=>bodies.push(b));
  const total=comps.reduce((s,c)=>s+c.n,0);
  const S={world,comps,wheels,bumpers,main,bodies,eggComp,eggLocal,A,
    traps:trapObjs,propStart,cost:costOf(d),flagX:level.geo.flagX,t:0,best:-99,bestT:0,status:'run',reason:null,frames:[],events:[],vh:[],peakG:0,lastG:0,eggBroken:false,impactT:null,topSpeed:0};
  S.centroid=function(){let x=0,y=0;comps.forEach(c=>{const p=c.body.getPosition();x+=p.x*c.n;y+=p.y*c.n;});return {x:x/total,y:y/total};};
  S.front=function(){let m=-1e9;comps.forEach(c=>{c.cells.forEach(k=>{const [x,y]=unkey(k);const p=c.body.getWorldPoint(pl.Vec2((x-c.cx)*CELL+CELL/2,(y-c.cy)*CELL));if(p.x>m)m=p.x;});});
    wheels.forEach(w=>{if(!w.broken){const p=w.body.getPosition();m=Math.max(m,p.x+w.r);}});bumpers.forEach(b=>{m=Math.max(m,b.body.getPosition().x+0.03);});return m;};
  S.record=function(){const f=new Float32Array(bodies.length*3);bodies.forEach((b,i)=>{const p=b.getPosition();f[i*3]=p.x;f[i*3+1]=p.y;f[i*3+2]=b.getAngle();});S.frames.push(f);};
  S.record();
  S.step=function(){
    if(S.status!=='run')return;
    bumpers.forEach(b=>{const x=b.joint.getJointTranslation();const f=-BUMP_K*x;const a=b.comp.body.getAngle();const fx=Math.cos(a)*f,fy=Math.sin(a)*f;
      b.body.applyForceToCenter(pl.Vec2(fx,fy),true);b.comp.body.applyForceToCenter(pl.Vec2(-fx,-fy),true);});
    world.step(DT,8,3);S.t+=DT;
    // wheel telemetry + breakage
    wheels.forEach(w=>{if(w.broken)return;
      const rf=w.joint.getReactionForce(1/DT);const F=Math.hypot(rf.x,rf.y);
      w.maxF=Math.max(w.maxF||0,S.t>0.3?F:0);const avg=w.favg??F;w.favg=avg*0.9+F*0.1;if(F>BREAK_F&&F>avg*3&&S.t>0.3){world.destroyJoint(w.joint);w.broken=true;S.events.push({t:S.t,type:'break',x:w.body.getPosition().x,y:w.body.getPosition().y});return;}
      const om=w.body.getAngularVelocity(),v=w.body.getLinearVelocity();
      let touching=false;for(let ce=w.body.getContactList();ce;ce=ce.next){if(ce.contact.isTouching()&&!ce.other.isDynamic()){touching=true;break;}}
      w.touch=touching;
      w.slip=touching?Math.abs(-om*w.r-Math.hypot(v.x,v.y)*Math.sign(v.x||1)):0;
      if(w.motor&&!level.motorOff){const tq=Math.abs(w.joint.getMotorTorque(1/DT));w.strain=(tq>=w.maxT*0.97&&Math.abs(om)<w.target*0.35)?Math.min(1,w.strain+0.05):Math.max(0,w.strain-0.04);}
    });
    const c=S.centroid();
    if(trapObjs.length){const fr=S.front();trapObjs.forEach(o=>{const t=o.t;
      if(t.type==='slab'&&!o.fired&&fr>t.x0+0.25){o.fired=true;o.body.setDynamic();o.body.setAngularVelocity(-0.4);S.events.push({t:S.t,type:'trap',x:t.x0,y:t.y});}
      if(t.type==='drop'&&!o.fired&&fr>t.trig){o.fired=true;o.body.setDynamic();S.events.push({t:S.t,type:'trap',x:t.x,y:t.y+2});}
      if(t.type==='ceil'){if(!o.fired&&fr>t.trig){o.fired=true;o.body.setLinearVelocity(pl.Vec2(0,-4));S.events.push({t:S.t,type:'trap',x:t.x0,y:t.y+1});}
        if(o.fired&&o.body.getPosition().y<=o.ty){o.body.setLinearVelocity(pl.Vec2(0,0));o.body.setPosition(pl.Vec2(o.body.getPosition().x,o.ty));}}
      if(t.type==='flag'&&!o.fired&&c.x>t.x0-0.9){o.fired=true;S.flagX=t.x1;S.events.push({t:S.t,type:'trap',x:t.x0,y:t.y||0});}
      if(t.type==='ice'&&!o.fired&&fr>t.x0){o.fired=true;}
      if(t.type==='rise'){if(!o.fired&&fr>t.trig){o.fired=true;o.body.setLinearVelocity(pl.Vec2(0,2.2));S.events.push({t:S.t,type:'trap',x:(t.x0+t.x1)/2,y:t.y});}
        if(o.fired&&o.body.getPosition().y>=o.ty){o.body.setLinearVelocity(pl.Vec2(0,0));o.body.setPosition(pl.Vec2(o.body.getPosition().x,o.ty));}}
      if(t.type==='spikes'){if(!o.fired&&fr>t.trig){o.fired=true;o.body.setLinearVelocity(pl.Vec2(0,t.speed));S.events.push({t:S.t,type:'trap',x:(t.x0+t.x1)/2,y:t.y});}
        if(o.fired&&o.body.getPosition().y>=o.ty){o.body.setLinearVelocity(pl.Vec2(0,0));o.body.setPosition(pl.Vec2(o.body.getPosition().x,o.ty));}
        if(o.fired)wheels.forEach(w=>{if(w.broken)return;for(let ce=w.body.getContactList();ce;ce=ce.next){if(ce.other===o.body&&ce.contact.isTouching()){world.destroyJoint(w.joint);w.broken=true;S.events.push({t:S.t,type:'break',x:w.body.getPosition().x,y:w.body.getPosition().y});break;}}});}
      if(t.type==='platform'){const ph=(S.t%t.period)/t.period;const k=0.5-0.5*Math.cos(ph*2*Math.PI);const tx=o.xa+(o.xb-o.xa)*k;
        const vx=(tx-o.body.getPosition().x)/DT;o.body.setLinearVelocity(pl.Vec2(vx,0));}
      if(t.type==='barrels'&&!o.fired&&fr>t.trig){o.fired=true;o.list.forEach(b=>{b.setDynamic();b.setAngularVelocity(3);b.setLinearVelocity(pl.Vec2(-1.2,0));});S.events.push({t:S.t,type:'trap',x:t.x,y:t.y+0.3});}
      if(t.type==='bridge'&&o.joints){for(let i=0;i<o.joints.length;i++){const j=o.joints[i];if(!j)continue;const F=j.getReactionForce(1/DT).length();
        if(F>t.strength&&S.t>0.3){world.destroyJoint(j);o.joints[i]=null;if(!o.fired){o.fired=true;S.events.push({t:S.t,type:'break',x:t.x0+o.pw*i,y:t.y});}}}}
    });}
    // g-force on egg component
    if(eggComp){const v=eggComp.body.getLinearVelocity();S.vh.push([v.x,v.y]);if(S.vh.length>3)S.vh.shift();
      if(S.vh.length===3){const o=S.vh[0];const g=Math.hypot(v.x-o[0],v.y-o[1])/(2*DT);S.lastG=g;if(S.t>0.3&&g>S.peakG)S.peakG=g;
        if(level.egg&&S.t>0.3&&g>level.egg){S.eggBroken=true;S.status='fail';S.reason='egg';}}}
    else{const v=main.body.getLinearVelocity();S.vh.push([v.x,v.y]);if(S.vh.length>3)S.vh.shift();if(S.vh.length===3){const o=S.vh[0];S.lastG=Math.hypot(v.x-o[0],v.y-o[1])/(2*DT);}}
    const sp=main.body.getLinearVelocity().length();if(sp>S.topSpeed)S.topSpeed=sp;
    S.record();
    if(S.status!=='run')return;
    if(c.x>S.best+0.03){S.best=c.x;S.bestT=S.t;}
    if(c.y<(level.geo.startY||0)-2.5&&c.y<-2.5){S.status='fail';S.reason='fall';return;}
    if(S.flagX!=null&&c.x>=S.flagX){S.status='win';return;}
    if(level.crash){const fr=S.front();if(S.impactT==null&&fr>level.geo.wallX-0.05)S.impactT=S.t;
      if(S.impactT!=null&&S.t-S.impactT>1.2){S.status='win';return;}}
    if(S.t-S.bestT>(level.crash?6:3)){S.status='fail';S.reason='stuck';return;}
    if(S.t>level.time){S.status='fail';S.reason='time';return;}
  };
  return S;
}
function runHeadless(pl,level,d){const S=createSim(pl,level,d);if(!S)return {status:'invalid'};const n=Math.ceil((level.time+1)/DT);
  for(let i=0;i<n&&S.status==='run';i++)S.step();S.frames=null;return {status:S.status,reason:S.reason,t:S.t,cost:S.cost,best:S.best,peakG:S.peakG,broken:S.wheels.filter(w=>w.broken).length};}

// ---------- ladders ----------
const LADDERS=[
  {id:'step',name:'Basamak',unit:'cm',rungs:[10,20,30],time:20,
    geo:v=>track().flat(3.5).step(v/100).flat(2.5).end(true)},
  {id:'ramp',name:'Rampa',unit:'°',rungs:[15,20,25,30,35,40,45],time:25,
    geo:v=>track().flat(2.5).slope(v,1.3).flat(2.5).end(true)},
  {id:'gap',name:'Boşluk',unit:'cm',rungs:[40,70,100,130],time:20,
    geo:v=>track().flat(3.5).gap(v/100).flat(2.5).end(true)},
  {id:'egg',name:'Yumurta düşüşü',unit:'m',rungs:[0.8,1.4,2.0,2.8],time:15,crash:true,
    geo:v=>smoothDrop(v)},
];
const TRAPS=[
  {name:'Çöken köprü',time:20,geo:()=>track().flat(3).slab(0.8).flat(2.5).end(true)},
  {name:'Buzlu yokuş',time:25,geo:()=>track().flat(3.5).ice(14,0.6).flat(2).end(true)},
  {name:'Düşen blok',time:25,geo:()=>track().flat(3).drop(1.4,0.7,0.32).flat(3.5).end(true)},
  {name:'İnen tavan',time:25,geo:()=>track().flat(2).ceiling(1.6,0.36,1.3).flat(2.6).step(0.1).flat(2.5).end(true)},
  {name:'Kaçan bayrak',time:30,geo:()=>track().flat(4).fakeFlag().flat(1.2).slope(28,0.9).flat(2).end(true)},
  {name:'Hepsi bir arada',time:35,geo:()=>track().flat(2.5).slab(0.7).flat(1.5).drop(1.2,0.6,0.28).flat(2.8).fakeFlag().flat(1).slope(22,0.6).flat(1.8).end(true)},
];
LADDERS.push({id:'trap',name:'Tuzaklı parkur',unit:'',rungs:TRAPS.map((_,i)=>i+1),time:25,trap:true});
// ---------- macera: birleşik, hareketli parkurlar ----------
// goals: time = 2. yıldız için süre (sn), cost = 3. yıldız için bütçe (⚙). Değerler tools/campaign-search.js ile ayarlanır.
const CAMPAIGN=[
  {id:'c01',name:'İlk sürüş',time:20,goals:{time:5.5,cost:15},geo:()=>track().flat(2.5).slope(12,0.12).flat(1.5).riseStep(0.3,0.06,0.9).flat(2).end(true)},
  {id:'c02',name:'Tahterevalli',time:25,goals:{time:5.5,cost:17},geo:()=>track().flat(2).seesaw(2.4,0.5).flat(1.2).fakeFlag().flat(0.6).riseStep(0.5,0.2,0.7).flat(1.5).end(true)},
  {id:'c03',name:'Kasisli yol',time:25,goals:{time:5.5,cost:17},geo:()=>track().flat(1.8).slope(22,0.3).slope(22,-0.3).flat(0.7).slope(28,0.35).slope(28,-0.35).flat(0.5).slab(0.9).flat(2).end(true)},
  {id:'c04',name:'Sallanan köprü',time:25,goals:{time:5,cost:20},geo:()=>track().flat(2.5).bridge(1.8,8,240).flat(1).riseStep(0.5,0.2,1.0).flat(2).end(true)},
  {id:'c05',name:'Kutu duvarı',time:30,goals:{time:8,cost:38},geo:()=>track().flat(2.5).boxes(2,3,0.22,4).flat(0.8).drop(1.0,0.6,0.25).flat(2.5).end(true)},
  {id:'c06',name:'Atlama rampası',time:25,goals:{time:6,cost:25},geo:()=>track().flat(3).slope(18,0.35).gap(1.0).step(-0.35).flat(1.5).fakeFlag().flat(0.8).slope(25,0.5).flat(1.5).end(true)},
  {id:'c07',name:'Asansör',time:35,goals:{time:11.5,cost:22},geo:()=>track().flat(2.5).platform(2.2,5,0.9).flat(0.5).ceiling(1.4,0.4,1.2).flat(2.2).end(true)},
  {id:'c08',name:'Varil yağmuru',time:30,goals:{time:5,cost:23},geo:()=>track().flat(2).slope(14,0.6).flat(0.3).barrels(3,0.13,2.4).flat(1.2).slab(0.6).flat(2).end(true)},
  {id:'c09',name:'Alçak maden',time:30,goals:{time:5,cost:30},geo:()=>track().flat(2).roof(2.0,0.44).flat(2.0).flat(0.9).step(0.18).flat(2.5).end(true)},
  {id:'c10',name:'Dikenli yol',time:25,goals:{time:3.5,cost:30},geo:()=>track().flat(3.2).slope(22,0.22).step(-0.22).spikes(0.6,1.0,0.6).flat(1.2).riseStep(0.4,0.16,0.8).flat(2).end(true)},
  {id:'c11',name:'Çifte tahterevalli',time:35,goals:{time:8,cost:23},geo:()=>track().flat(2).seesaw(2.2,0.45).flat(0.6).seesaw(2.2,0.45).flat(0.8).fakeFlag().flat(0.6).riseStep(0.5,0.24,0.7).flat(1.5).end(true)},
  {id:'c12',name:'Şantiye',time:40,goals:{time:14,cost:39},geo:()=>track().flat(2).step(0.25).flat(1.5).boxes(2,2,0.22,4).flat(0.6).gap(0.8).flat(1).drop(0.9,0.5,0.22).flat(2).end(true)},
  {id:'c13',name:'Çürük köprü',time:35,goals:{time:4,cost:13},geo:()=>track().flat(2.5).bridge(2.2,10,190).flat(0.6).ceiling(1.4,0.42,1.0).flat(2).end(true)},
  {id:'c14',name:'Uçurum',time:30,goals:{time:4,cost:16},geo:()=>track().flat(3.5).slope(20,0.5).gap(1.5).step(-0.5).flat(0.8).slab(0.6).flat(2).end(true)},
  {id:'c15',name:'Büyük sefer',time:50,goals:{time:21,cost:33},geo:()=>track().flat(2).seesaw(2.2,0.3).flat(0.8).bridge(1.6,7,220).flat(1.2).boxes(2,2,0.22,4).flat(0.5).slope(22,0.22).step(-0.22).spikes(0.5,1.0,0.6).flat(0.8).platform(1.8,5,0.9).flat(1).fakeFlag().flat(0.8).step(0.2).flat(1.5).end(true)},
];
// Her bölümü geçince açılan parça. Bir bölüm, sadece kendisinden önce açılmış parçalarla çözülebilmeli (test bunu kontrol eder).
const CAMPAIGN_UNLOCK={c01:'wheel2',c02:'gear2',c03:'soft',c04:'weight',c05:'wheel3',c06:'hinge',c07:'gear0',c08:'wheel0',c09:'bumper'};
function partsBefore(i){const set=new Set();for(let k=0;k<i;k++){const u=CAMPAIGN_UNLOCK[CAMPAIGN[k].id];if(u)set.add(u);}return set;}
function campaignLevel(i){const c=CAMPAIGN[i];return {geo:c.geo(),time:c.time,name:c.name,id:c.id,goals:c.goals||null,campaign:true};}

function levelFor(li,ri){const L=LADDERS[li],v=L.rungs[ri];
  if(L.trap){const T=TRAPS[ri];return {geo:T.geo(),time:T.time,name:'Tuzak '+(ri+1),trapName:T.name};}
  const lv={geo:L.geo(v),time:L.time,name:L.name+' '+(L.unit==='m'?String(v).replace('.',',')+' m':v+(L.unit==='°'?'°':' '+L.unit))};
  if(L.crash){lv.crash=true;lv.motorOff=true;lv.egg=80;lv.v0=1.8;lv.frontX=-0.1;lv.needEgg=true;}
  return lv;}

return {CAMPAIGN,CAMPAIGN_UNLOCK,partsBefore,campaignLevel,COST,costOf,MAX_WHEELS,TRAPS,CELL,COLS,ROWS,DT,WHEEL_R,WHEEL_NAME,GEARS,W_MOTOR,T_MOTOR,BUMP_TR,key,unkey,analyze,createSim,runHeadless,track,LADDERS,levelFor};
})();
if(typeof module!=='undefined')module.exports=CORE;
