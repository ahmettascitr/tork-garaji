// base: B beam, K weight, H hinge, . empty ; over: a-d motor wheel S..XL, A-D free wheel, p bumper, e egg
function art(base,over,gear,susp){const cells={};const H=base.length;
 base.forEach((row,ri)=>{[...row].forEach((ch,x)=>{const y=H-1-ri;if(ch==='.')return;const c={base:ch==='B'?'beam':ch==='K'?'weight':'hinge'};
   const o=over?over[ri][x]:'.';if(o&&o!=='.'){if('abcd'.includes(o))c.over={t:'wheel',size:'abcd'.indexOf(o),motor:true};
     else if('ABCD'.includes(o))c.over={t:'wheel',size:'ABCD'.indexOf(o),motor:false};else if(o==='p')c.over={t:'bumper'};else if(o==='e')c.over={t:'egg'};}
   cells[x+','+y]=c;});});return {cells,gear:gear??1,susp:susp||'hard'};}
module.exports=art;
