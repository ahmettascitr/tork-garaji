const pl=require('planck');const C=require('../src/core.js');const {gen}=require('./gen.js');const fs=require('fs');
function enc(d){return {g:d.gear,s:d.susp==='soft'?1:0,c:Object.entries(d.cells).map(([k,c])=>{const [x,y]=k.split(',');let t=x+'.'+y+(c.base==='beam'?'B':c.base==='weight'?'K':'H');
  if(c.over){if(c.over.t==='wheel')t+=(c.over.motor?'abcd':'ABCD')[c.over.size];if(c.over.t==='bumper')t+='p';if(c.over.t==='egg')t+='e';}return t;}).join(' ')};}
function needs(d){const n=new Set();Object.values(d.cells).forEach(c=>{if(c.base==='weight')n.add('weight');if(c.base==='hinge')n.add('hinge');
  if(c.over&&c.over.t==='wheel'&&c.over.size!==1)n.add('wheel'+c.over.size);if(c.over&&c.over.t==='bumper')n.add('bumper');});
  if(d.gear===0)n.add('gear0');if(d.gear===2)n.add('gear2');if(d.susp==='soft')n.add('soft');return [...n];}
const out={};
C.LADDERS.forEach((L,li)=>L.rungs.forEach((v,ri)=>{let cands=[];
  for(let j=ri;j<L.rungs.length;j++){try{cands=cands.concat(JSON.parse(fs.readFileSync(`${__dirname}/data/w3_${L.id}_${j}.json`)));}catch(e){}
    try{const h=JSON.parse(fs.readFileSync(`${__dirname}/data/hc_${li}_${j}.json`));if(h.bs>500)cands=cands.concat(h.wins.length?h.wins:[h.best]);}catch(e){}}
  // prefer fewer parts: sort candidates by needs count
  cands=cands.map(p=>{const d=gen(p);return {p,d,n:needs(d)};});
  try{const hs=JSON.parse(fs.readFileSync(__dirname+'/data/hand_sol.json'))[L.id+':'+ri]||[];hs.forEach(d=>cands.push({d,n:needs(d)}));}catch(e){}
  cands=cands.filter(c=>C.analyze(Object.assign({},c.d,{noMotorOk:true})).ok).sort((a,b)=>a.n.length-b.n.length);
  const wins=[];const seen=new Set();let tested=0;
  for(const c of cands){const key=c.n.sort().join('|');if(seen.has(key))continue;if(tested>80)break;tested++;
    const r=C.runHeadless(pl,C.levelFor(li,ri),c.d);if(r.status==='win'){wins.push({n:c.n,e:enc(c.d)});seen.add(key);if(wins.length>=5)break;}}
  out[L.id+':'+ri]=wins;console.log(L.id+':'+ri,wins.length,wins.map(w=>w.n.join('+')||'temel').join(' | '));}));
// Macera: parça kilidine uyan çözümler; en hızlı ve en ucuz olan mutlaka dahil (yıldız hedefleri bunlarla kanıtlanır).
const goals={};
C.CAMPAIGN.forEach((c,i)=>{let cands=[];try{cands=JSON.parse(fs.readFileSync(`${__dirname}/data/camp_${c.id}.json`));}catch(e){}
  const own=C.partsBefore(i);const lv=C.campaignLevel(i);const ver=[];const seenE=new Set();
  for(const w of cands){const d=gen(w.p);const n=needs(d);if(!n.every(x=>own.has(x)))continue;const e=enc(d);const k=JSON.stringify(e);if(seenE.has(k))continue;seenE.add(k);
    const r=C.runHeadless(pl,lv,d);if(r.status==='win')ver.push({n,e,t:+r.t.toFixed(2),cost:r.cost});}
  if(!ver.length){out['camp:'+c.id]=[];console.log('camp',c.id,'ÇÖZÜM YOK');return;}
  const pick=[];const add=v=>{if(v&&!pick.includes(v))pick.push(v);};
  add([...ver].sort((a,b)=>a.n.length-b.n.length||a.cost-b.cost)[0]);add([...ver].sort((a,b)=>a.t-b.t)[0]);add([...ver].sort((a,b)=>a.cost-b.cost||a.t-b.t)[0]);
  for(const v of [...ver].sort((a,b)=>a.n.length-b.n.length)){if(pick.length>=5)break;add(v);}
  out['camp:'+c.id]=pick;goals[c.id]={bestT:Math.min(...ver.map(v=>v.t)),minCost:Math.min(...ver.map(v=>v.cost)),n:ver.length};
  console.log('camp',c.id,ver.length,'doğrulandı; en iyi süre',goals[c.id].bestT,'en düşük maliyet',goals[c.id].minCost);});
fs.writeFileSync(__dirname+'/data/camp_goals.json',JSON.stringify(goals,null,1));
fs.writeFileSync(__dirname+'/../src/solpack.js','// Doğrulanmış çözümler — tools/solpack.js üretir, elle düzenleme.\nwindow.SOLPACK='+JSON.stringify(out)+';\n');console.log('bytes',JSON.stringify(out).length);
