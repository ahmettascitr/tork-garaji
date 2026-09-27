// Macera bölümü için parça kilidine uyan tepe tırmanma. node tools/campaign-climb.js <bölüm-no> [adım] [tekrar]
const pl=require('planck');const C=require('../src/core.js');const {gen,randP}=require('./gen.js');const needs=require('./needs.js');const fs=require('fs');
const i=+process.argv[2]-1,iters=+process.argv[3]||300,rest=+process.argv[4]||3;const lv=C.campaignLevel(i);const own=C.partsBefore(i);const id=C.CAMPAIGN[i].id;
const ok=d=>needs(d).every(x=>own.has(x));
function score(p){const d=gen(p);if(!ok(d))return -1e9;const r=C.runHeadless(pl,lv,d);if(r.status==='invalid')return -1e9;if(r.status==='win')return 1000-r.t;return r.best;}
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function mut(p){p=JSON.parse(JSON.stringify(p));const n=ri(1,2);for(let j=0;j<n;j++){const k=ri(0,9);
 if(k==0)p.L=Math.max(3,Math.min(18,p.L+ri(-2,2)));if(k==1)p.k=Math.max(2,Math.min(Math.min(6,p.L),p.k+ri(-1,1)));if(k==2)p.size=ri(0,3);
 if(k==3)p.motor=['all','rear','front'][ri(0,2)];if(k==4)p.gear=ri(0,2);if(k==5)p.susp=p.susp=='soft'?'hard':'soft';
 if(k==6)p.hinge=p.L>=6?ri(0,2):0;if(k==7){p.top=!p.top;p.topA=ri(0,p.L-1);p.topB=ri(p.topA,p.L-1);}
 if(k==8)p.weights=[...Array(ri(0,3))].map(()=>[0,1,p.L-1,p.L-2,Math.floor(p.L/2)][ri(0,4)]);if(k==9){p.bumper=!p.bumper;p.sizes=p.sizes=='same'?'frontBig':'same';}}
 if(p.hinge&&p.L<6)p.hinge=0;p.k=Math.min(p.k,p.L);if(p.topB>=p.L)p.topB=p.L-1;if(p.topA>p.topB)p.topA=p.topB;return p;}
const f=`${__dirname}/data/camp_${id}.json`;let old=[];try{old=JSON.parse(fs.readFileSync(f));}catch(e){}
const found=[];
for(let r=0;r<rest;r++){let best=null,bs=-1e9;
 for(let k=0;k<40;k++){let p;do{p=randP({});}while(!ok(gen(p)));const s=score(p);if(s>bs){bs=s;best=p;}}
 for(let k=0;k<iters;k++){const c=mut(best);const s=score(c);if(s>=bs){bs=s;best=c;}if(s>500){const rr=C.runHeadless(pl,lv,gen(c));found.push({p:c,t:+rr.t.toFixed(2),cost:rr.cost});if(found.length>=4)break;}}
 console.log(id,'restart',r,'best',bs.toFixed(2));if(found.length>=4)break;}
fs.writeFileSync(f,JSON.stringify(old.concat(found).slice(-400)));console.log(id,'wins',found.length);
