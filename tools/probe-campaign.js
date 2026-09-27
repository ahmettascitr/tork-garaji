const pl=require('planck');const C=require('../src/core.js');const art=require('./art.js');
const D={
 starter: art(['BBBBBBBB'],['b......b'],1),
 long3: art(['BBBBBBBBBBBB'],['b....b.....b'],1),
 bigpow: art(['BBBBBBBBBBBB','BBBBBBBBBBBB'],['............','c....c.....c'],2,'soft'),
 speed: art(['BBBBBBBBBBBB'],['b....b.....b'],0),
 xl: art(['BBBBBBBBBBBBBBBBBB','BBBBBBBBBBBBBBBBBB'],['..................','d.......d........d'],1),
};
for(let i=0;i<C.CAMPAIGN.length;i++){const lv=C.campaignLevel(i);const row=[];
 for(const [n,d] of Object.entries(D)){const r=C.runHeadless(pl,lv,d);row.push(n+':'+(r.status==='win'?'OK '+r.t.toFixed(1)+'s':r.reason)+' $'+r.cost);}
 console.log(String(i+1).padStart(2),lv.name.padEnd(18),row.join(' | '));}
