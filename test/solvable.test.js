// Her bölümün en az bir doğrulanmış çözümü gerçekten geçiyor mu?
// Oyunun fiziği ya da bölümleri değişince bu test yakalar. Başarısızsa: npm run solutions
const pl=require('planck');const C=require('../src/core.js');const fs=require('fs');const path=require('path');
const quick=process.argv.includes('--quick');
const src=fs.readFileSync(path.join(__dirname,'../src/solpack.js'),'utf8');const window={};eval(src);const SP=window.SOLPACK;
function dec(e){const cells={};e.c.split(' ').forEach(t=>{const m=t.match(/^(\d+)\.(\d+)([BKH])(.?)$/);const c={base:{B:'beam',K:'weight',H:'hinge'}[m[3]]};const o=m[4];
  if(o){if('abcd'.includes(o))c.over={t:'wheel',size:'abcd'.indexOf(o),motor:true};else if('ABCD'.includes(o))c.over={t:'wheel',size:'ABCD'.indexOf(o),motor:false};else if(o==='p')c.over={t:'bumper'};else if(o==='e')c.over={t:'egg'};}
  cells[m[1]+','+m[2]]=c;});return {cells,gear:e.g,susp:e.s?'soft':'hard'};}
let fail=0,n=0;
C.LADDERS.forEach((L,li)=>L.rungs.forEach((v,ri)=>{const key=L.id+':'+ri;const list=SP[key]||[];n++;
  if(!list.length){console.log('✗',key,'çözüm yok');fail++;return;}
  const tryList=quick?list.slice(0,1):list;let ok=0;
  for(const s of tryList){const d=dec(s.e);const A=C.analyze(Object.assign({},d,{noMotorOk:true}));if(!A.ok)continue;
    const r=C.runHeadless(pl,C.levelFor(li,ri),d);if(r.status==='win')ok++;}
  const name=C.levelFor(li,ri).name;
  if(!ok){console.log('✗',key.padEnd(8),name,'— kayıtlı çözümlerin hiçbiri artık geçmiyor');fail++;}
  else console.log('✓',key.padEnd(8),name,ok+'/'+tryList.length);}));
// Başlangıç aracı ilk bölümü geçebilmeli
const starter={cells:{},gear:1,susp:'hard'};for(let x=5;x<13;x++)starter.cells[x+',1']={base:'beam'};
starter.cells['5,1'].over={t:'wheel',size:1,motor:true};starter.cells['12,1'].over={t:'wheel',size:1,motor:true};
const r0=C.runHeadless(pl,C.levelFor(0,0),starter);if(r0.status!=='win'){console.log('✗ başlangıç aracı ilk bölümü geçemiyor');fail++;}else console.log('✓ başlangıç aracı ilk bölümü geçiyor');
console.log(fail?`\n${fail} sorun / ${n} bölüm`:`\nTüm ${n} bölüm çözülebilir.`);process.exit(fail?1:0);
