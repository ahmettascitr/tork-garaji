// Bir aracın bir bölümdeki yolculuğunu yazdırır. node tools/trace.js <bölüm-no> <tasarım-adı>
const pl=require('planck');const C=require('../src/core.js');const art=require('./art.js');
const D={starter:art(['BBBBBBBB'],['b......b'],1),long3:art(['BBBBBBBBBBBB'],['b....b.....b'],1),
 bigpow:art(['BBBBBBBBBBBB','BBBBBBBBBBBB'],['............','c....c.....c'],2,'soft'),speed:art(['BBBBBBBBBBBB'],['b....b.....b'],0),
 low2:art(['BBBBBBBBBB'],['c........c'],2),lowspeed:art(['BBBBBBBBBBBB'],['b....b.....b'],0),speed2:art(['BBBBBBBBBBBBBB'],['c.....c......c'],0),xl:art(['BBBBBBBBBBBBBBBBBB','BBBBBBBBBBBBBBBBBB'],['..................','d.......d........d'],1)};
const i=+process.argv[2]-1, d=D[process.argv[3]];const lv=C.campaignLevel(i);const S=C.createSim(pl,lv,d);
const g=lv.geo;console.log('flag',g.flagX,'traps',JSON.stringify(g.traps.map(t=>({type:t.type,x:t.x??t.x0??t.cx}))));
for(let k=0;k<60*lv.time&&S.status==='run';k++){S.step();if(k%30==0){const c=S.centroid();process.stdout.write(`${(k/60).toFixed(1)}:${c.x.toFixed(2)},${c.y.toFixed(2)}  `);}}
console.log('\n',S.status,S.reason,'best',S.best.toFixed(2));
