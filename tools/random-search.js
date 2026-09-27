// Rastgele araçlar üretip her bölümde dener; kazananları tools/data/ içine EKLER.
// Kullanım: node tools/random-search.js <deneme-sayısı> [merdiven-id,...]   örn: node tools/random-search.js 200 step,gap
const pl=require('planck');const C=require('../src/core.js');const {gen,randP}=require('./gen.js');
const N=+process.argv[2]||150;const only=process.argv[3];
C.LADDERS.forEach((L,li)=>{if(only&&!only.split(',').includes(L.id))return;L.rungs.forEach((v,ri)=>{const lv=C.levelFor(li,ri);let ok=0,inv=0;const R={};const wins=[];
  for(let i=0;i<N;i++){const p=randP({egg:L.crash});const d=gen(p);const r=C.runHeadless(pl,lv,d);if(r.status==='invalid'){inv++;continue;}if(r.status==='win'){ok++;wins.push(p);}else R[r.reason]=(R[r.reason]||0)+1;}
  console.log(lv.name.padEnd(22),'win',String(ok).padStart(3)+'/'+(N-inv),JSON.stringify(R));
  {const f=`${__dirname}/data/w3_${L.id}_${ri}.json`;let old=[];try{old=JSON.parse(require('fs').readFileSync(f));}catch(e){}
    const seen=new Set(old.map(x=>JSON.stringify(x)));wins.forEach(w=>{if(!seen.has(JSON.stringify(w)))old.push(w);});require('fs').writeFileSync(f,JSON.stringify(old.slice(-400)));}});});
