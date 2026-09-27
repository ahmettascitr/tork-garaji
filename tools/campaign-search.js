// Macera bölümlerini rastgele araçlarla dener; kazananları tools/data/camp_<id>.json içine EKLER.
// Kullanım: node tools/campaign-search.js <deneme> [bölüm-no,...]
const pl=require('planck');const C=require('../src/core.js');const {gen,randP}=require('./gen.js');const needs=require('./needs.js');const fs=require('fs');
const N=+process.argv[2]||150;const only=process.argv[3]?process.argv[3].split(',').map(Number):null;
C.CAMPAIGN.forEach((c,i)=>{if(only&&!only.includes(i+1))return;const lv=C.campaignLevel(i);let ok=0,inv=0;const R={};const wins=[];
  const own=C.partsBefore(i);for(let k=0;k<N;k++){let p,d,tries=0;do{p=randP({});d=gen(p);tries++;}while(!needs(d).every(x=>own.has(x))&&tries<200);const r=C.runHeadless(pl,lv,d);if(r.status==='invalid'){inv++;continue;}
    if(r.status==='win'){ok++;wins.push({p,t:+r.t.toFixed(2),cost:r.cost});}else R[r.reason]=(R[r.reason]||0)+1;}
  const f=`${__dirname}/data/camp_${c.id}.json`;let old=[];try{old=JSON.parse(fs.readFileSync(f));}catch(e){}
  const all=old.concat(wins);fs.writeFileSync(f,JSON.stringify(all.slice(-400)));
  const bt=all.length?Math.min(...all.map(w=>w.t)):null,bc=all.length?Math.min(...all.map(w=>w.cost)):null;
  console.log(String(i+1).padStart(2),c.name.padEnd(18),'win',String(ok).padStart(3)+'/'+(N-inv),'best t',bt,'min $',bc,JSON.stringify(R));});
