// Bir tasarımın hangi açılabilir parçalara ihtiyaç duyduğunu listeler (orta teker, kiriş, denge dişlisi, sert süspansiyon başlangıçta açık).
module.exports=function needs(d){const n=new Set();Object.values(d.cells).forEach(c=>{if(!c)return;if(c.base==='weight')n.add('weight');if(c.base==='hinge')n.add('hinge');
  if(c.over&&c.over.t==='wheel'&&c.over.size!==1)n.add('wheel'+c.over.size);if(c.over&&c.over.t==='bumper')n.add('bumper');});
  if(d.gear===0)n.add('gear0');if(d.gear===2)n.add('gear2');if(d.susp==='soft')n.add('soft');return [...n];};
