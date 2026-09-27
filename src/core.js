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
    return o;});
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
  const total=comps.reduce((s,c)=>s+c.n,0);
  const S={world,comps,wheels,bumpers,main,bodies,eggComp,eggLocal,A,
    traps:trapObjs,flagX:level.geo.flagX,t:0,best:-99,bestT:0,status:'run',reason:null,frames:[],events:[],vh:[],peakG:0,lastG:0,eggBroken:false,impactT:null,topSpeed:0};
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
  for(let i=0;i<n&&S.status==='run';i++)S.step();S.frames=null;return {status:S.status,reason:S.reason,t:S.t,best:S.best,peakG:S.peakG,broken:S.wheels.filter(w=>w.broken).length};}

// ---------- ladders ----------
const LADDERS=[
  {id:'step',name:'Basamak',unit:'cm',rungs:[10,20,30,40,50],time:20,
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
function levelFor(li,ri){const L=LADDERS[li],v=L.rungs[ri];
  if(L.trap){const T=TRAPS[ri];return {geo:T.geo(),time:T.time,name:'Tuzak '+(ri+1),trapName:T.name};}
  const lv={geo:L.geo(v),time:L.time,name:L.name+' '+(L.unit==='m'?String(v).replace('.',',')+' m':v+(L.unit==='°'?'°':' '+L.unit))};
  if(L.crash){lv.crash=true;lv.motorOff=true;lv.egg=80;lv.v0=1.8;lv.frontX=-0.1;lv.needEgg=true;}
  return lv;}

return {MAX_WHEELS,TRAPS,CELL,COLS,ROWS,DT,WHEEL_R,WHEEL_NAME,GEARS,W_MOTOR,T_MOTOR,BUMP_TR,key,unkey,analyze,createSim,runHeadless,track,LADDERS,levelFor};
})();
if(typeof module!=='undefined')module.exports=CORE;
