// Reklamlar (AdMob). Tarayıcıda gerçek reklam yok: ödüllü reklam kısa bir "test reklamı" ekranıyla taklit edilir.
// Kimlikler app.config.json → admob. Google test kimlikleriyle gerçek para kazanılmaz.
// Kurallar: ödüllü reklam yalnızca oyuncu isteyince; geçiş reklamı seyrek (en az 4 dk arayla, 3. bölümden sonra, açılıştan 2 dk sonra).
(function(){
  const cfg=window.ADS_CFG||{};
  const cap=window.Capacitor;const native=!!(cap&&cap.isNativePlatform&&cap.isNativePlatform());
  const A=native&&cap.Plugins&&cap.Plugins.AdMob;
  const test=!cfg.appId||cfg.appId.startsWith('ca-app-pub-3940256099942544');
  const INTER_GAP=240e3,START_GRACE=120e3,t0=Date.now();
  let canAds=false,rewardReady=false,interReady=false,lastInter=0,privacyRequired=false,busy=false;
  const opts=id=>({adId:id,isTesting:test});
  async function loadReward(){if(!A||!canAds||!cfg.rewarded)return;try{await A.prepareRewardVideoAd(opts(cfg.rewarded));rewardReady=true;}catch(e){rewardReady=false;setTimeout(loadReward,60e3);}}
  async function loadInter(){if(!A||!canAds||!cfg.interstitial)return;try{await A.prepareInterstitial(opts(cfg.interstitial));interReady=true;}catch(e){interReady=false;setTimeout(loadInter,90e3);}}
  async function init(){
    if(!A)return;
    try{await A.initialize({initializeForTesting:test,maxAdContentRating:'ParentalGuidance'});}catch(e){return;}
    try{let ci=await A.requestConsentInfo();
      if(!ci.canRequestAds&&ci.isConsentFormAvailable)ci=await A.showConsentForm();
      canAds=!!ci.canRequestAds;privacyRequired=ci.privacyOptionsRequirementStatus==='REQUIRED';
    }catch(e){canAds=true;} // izin mesajı AdMob'da tanımlı değilse SDK yine de reklam isteyebilir
    loadReward();loadInter();
  }
  // Tarayıcı için taklit ödüllü reklam
  function fakeReward(){return new Promise(res=>{const d=document.createElement('div');
    d.style.cssText='position:fixed;inset:0;z-index:99;background:#111;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font:600 16px Barlow,sans-serif';
    d.innerHTML='<b style="font:700 22px Chakra Petch,sans-serif">TEST AD</b><span>2</span>';document.body.appendChild(d);
    let n=2;const iv=setInterval(()=>{n--;d.lastChild.textContent=n;if(n<=0){clearInterval(iv);d.remove();res(true);}},700);});}
  window.ADS={
    get native(){return !!A;},
    get privacyRequired(){return privacyRequired;},
    rewardAvailable(){return A?(canAds&&rewardReady):true;},
    async showReward(){
      if(busy)return false;
      if(!A)return fakeReward();
      if(!rewardReady)return false;busy=true;rewardReady=false;let earned=false;const hs=[];
      try{
        const done=new Promise(res=>{
          A.addListener('onRewardedVideoAdReward',()=>{earned=true;}).then(h=>hs.push(h));
          A.addListener('onRewardedVideoAdDismissed',()=>res()).then(h=>hs.push(h));
          A.addListener('onRewardedVideoAdFailedToShow',()=>res()).then(h=>hs.push(h));
          setTimeout(res,120e3);});
        A.showRewardVideoAd().then(()=>{earned=true;}).catch(()=>{});
        await done;
      }catch(e){}
      hs.forEach(h=>{try{h.remove();}catch(e){}});busy=false;lastInter=Date.now(); // ödüllü reklamdan hemen sonra geçiş reklamı gösterme
      loadReward();return earned;},
    // progress: geçilmiş macera bölümü sayısı
    async maybeInterstitial(progress){
      if(!A||!canAds||!interReady||busy)return false;const now=Date.now();
      if((progress||0)<3||now-t0<START_GRACE||now-lastInter<INTER_GAP)return false;
      busy=true;interReady=false;lastInter=now;
      try{await A.showInterstitial();}catch(e){}
      busy=false;loadInter();return true;},
    showPrivacy(){if(A)try{A.showPrivacyOptionsForm();}catch(e){}}
  };
  init();
})();
