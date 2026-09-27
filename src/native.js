// Android'e özel davranışlar. Tarayıcıda hiçbir şey yapmaz.
(function(){
  const cap=window.Capacitor;if(!cap||!cap.isNativePlatform||!cap.isNativePlatform())return;
  const P=cap.Plugins||{};
  try{P.StatusBar&&P.StatusBar.hide();}catch(e){}
  // Geri tuşu: açık pencereyi kapat → garajdan haritaya → haritadayken uygulamadan çık
  if(P.App)P.App.addListener('backButton',()=>{
    const g=window.__pg;const modal=document.getElementById('modal');
    if(modal&&!modal.hidden){modal.hidden=true;return;}
    if(g&&g.phase==='run'){document.getElementById('btnStop').click();return;}
    if(g&&g.phase!=='map'){g.showMap();return;}
    P.App.exitApp();
  });
})();
