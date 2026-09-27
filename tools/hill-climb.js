// Tek bir bölüm için çözüm arar (tepe tırmanma). Kullanım: node tools/hill-climb.js <merdiven-sırası> <basamak-sırası> [adım]
const pl=require('planck');const C=require('../src/core.js');const {gen,randP}=require('./gen.js');
const li=+process.argv[2],ri=+process.argv[3],iters=+process.argv[4]||300;const lv=C.levelFor(li,ri);const egg=!!C.LADDERS[li].crash;
function score(p){const r=C.runHeadless(pl,lv,gen(p));if(r.status==='invalid')return -1e9;if(r.status==='win')return 1000-r.t;return r.best+(egg&&r.reason==='egg'?-(r.peakG/100):0);}
function mut(p){p=JSON.parse(JSON.stringify(p));const k=Math.floor(Math.random()*10);
 const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
 if(k==0)p.L=Math.max(3,Math.min(18,p.L+ri(-2,2)));if(k==1)p.k=Math.max(2,Math.min(Math.min(6,p.L),p.k+ri(-1,1)));if(k==2)p.size=ri(0,3);
 if(k==3)p.motor=['all','rear','front'][ri(0,2)];if(k==4)p.gear=ri(0,2);if(k==5)p.susp=p.susp=='soft'?'hard':'soft';
 if(k==6)p.hinge=p.L>=6?ri(0,2):0;if(k==7){p.top=!p.top;p.topA=ri(0,p.L-1);p.topB=ri(p.topA,p.L-1);}
 if(k==8)p.weights=[...Array(ri(0,3))].map(()=>[0,1,p.L-1,p.L-2,Math.floor(p.L/2)][ri(0,4)]);if(k==9){p.bumper=!p.bumper;p.sizes=p.sizes=='same'?'frontBig':'same';}
 p.k=Math.min(p.k,p.L);if(p.topB>=p.L)p.topB=p.L-1;if(p.topA>p.topB)p.topA=p.topB;return p;}
let best=null,bs=-1e9;const seeds=[];
let seedList=[];try{seedList=JSON.parse(require('fs').readFileSync(`${__dirname}/data/w3_${C.LADDERS[li].id}_${ri-1}.json`));}catch(e){}
for(const p of seedList.slice(0,25)){const s=score(p);if(s>bs){bs=s;best=p;}}
for(let i=0;i<30;i++){const p=randP({egg});const s=score(p);if(s>bs){bs=s;best=p;}}
let wins=[];for(let i=0;i<iters;i++){const c=mut(best);const s=score(c);if(s>=bs){bs=s;best=c;}if(s>500)wins.push(c);if(wins.length>=3)break;}
if(bs>500&&!wins.length)wins.push(best);
console.log(lv.name,'best',bs.toFixed(2),JSON.stringify(best));
require('fs').writeFileSync(`${__dirname}/data/hc_${li}_${ri}.json`,JSON.stringify({bs,best,wins}));
