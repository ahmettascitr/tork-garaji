const C=require('../src/core.js');const K=C.key;
function rnd(a){return a[Math.floor(Math.random()*a.length)];}
function ri(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function gen(p){const cells={};const y=2;
  for(let x=0;x<p.L;x++)cells[K(x,y)]={base:'beam'};
  if(p.top)for(let x=p.topA;x<=p.topB;x++)cells[K(x,y+1)]={base:'beam'};
  const hs=[];if(p.hinge===1)hs.push(Math.floor(p.L/2));if(p.hinge===2){hs.push(Math.floor(p.L/3));hs.push(Math.floor(2*p.L/3));}
  hs.forEach(h=>{cells[K(h,y)]={base:'hinge'};delete cells[K(h,y+1)];});
  const Rb=C.WHEEL_R[Math.min(3,p.size+(p.sizes==='same'?0:1))];let kk=p.k;while(kk>2&&((p.L-1)/(kk-1))*C.CELL<2*Rb)kk--;
  const pos=[];for(let i=0;i<kk;i++){pos.push(Math.round(i*(p.L-1)/Math.max(1,kk-1)));}
  pos.forEach((x,i)=>{let xx=x;if(cells[K(xx,y)].base==='hinge')xx=Math.max(0,xx-1);
    const size=p.sizes==='same'?p.size:(i===pos.length-1?Math.min(3,p.size+1):p.size);
    const motor=p.motor==='all'||(p.motor==='rear'&&i<Math.ceil(p.k/2))||(p.motor==='front'&&i>=Math.floor(p.k/2));
    cells[K(xx,y)].over={t:'wheel',size,motor};});
  (p.weights||[]).forEach(x=>{const c=cells[K(x,y)];if(c&&c.base==='beam'&&!c.over)c.base='weight';else if(c&&c.base==='beam'){c.base='weight';}});
  if(p.bumper&&!cells[K(p.L-1,y)].over)cells[K(p.L-1,y)].over={t:'bumper'};
  if(p.egg){const ex=Math.floor(p.L/2)+(p.hinge?1:0);cells[K(ex,y+1)]={base:'beam',over:{t:'egg'}};}
  return {cells,gear:p.gear,susp:p.susp};}
function randP(opts){opts=opts||{};const L=ri(3,17);const p={L,k:ri(2,Math.min(5,L)),size:ri(0,opts.maxSize??3),sizes:rnd(['same','same','frontBig']),motor:rnd(['all','all','rear','front']),
  gear:ri(0,2),susp:rnd(['hard','soft']),hinge:L>=6?rnd([0,0,1,2]):0,top:Math.random()<.3,weights:[],bumper:Math.random()<.3,egg:!!opts.egg};
  p.topA=ri(0,L-1);p.topB=ri(p.topA,L-1);const nw=rnd([0,0,1,2,3]);for(let i=0;i<nw;i++)p.weights.push(rnd([0,1,L-1,L-2,Math.floor(L/2)]).valueOf());return p;}
module.exports={gen,randP};
