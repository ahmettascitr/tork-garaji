// Dil: Türkçe kaynak metin, İngilizce çeviri. Telefon Türkçe ise Türkçe, değilse İngilizce.
// Yeni metin eklerken: kodda t('Türkçe metin {0}', değer) kullan ve buraya İngilizcesini ekle.
(function(){
  let lang=null;try{lang=localStorage.getItem('tgLang');}catch(e){}
  if(lang!=='tr'&&lang!=='en')lang=((navigator.languages&&navigator.languages[0])||navigator.language||'en').toLowerCase().startsWith('tr')?'tr':'en';
  const EN={
  // genel
  'Fizik motoru yüklenemedi.':'Physics engine failed to load.','Garaj hazırlanıyor…':'Preparing the garage…',
  'Deneme {0}':'Try {0}','■ Durdur':'■ Stop','YAVAŞ ÇEKİM · GEÇMEK İÇİN DOKUN':'SLOW MOTION · TAP TO SKIP',
  'Dişli':'Gear','Süspansiyon':'Suspension','Temizle':'Clear','İpucu':'Hint','TEST ET':'TEST','Harita':'Map','Kapat':'Close',
  // parçalar
  'Kiriş':'Beam','Teker':'Wheel','Büyük teker':'Big wheel','Ağırlık':'Weight','Menteşe':'Hinge','Küçük teker':'Small wheel','Dev teker':'Giant wheel',
  'Tampon':'Bumper','Yumurta':'Egg','Kısa kiriş':'Short beam','Dikme':'Post','YENİ':'NEW',
  '50 cm çaplı teker. Engelin üstüne daha kolay çıkar ama daha ağırdır.':'A 50 cm wheel. Climbs obstacles more easily but is heavier.',
  '0,5 kg. Ağırlık merkezini istediğin yere taşır.':'0.5 kg. Moves the centre of mass where you want it.',
  'İki kiriş grubunu döner şekilde bağlar. Araç ortadan bükülebilir.':'Joins two beam groups with a pivot. The car can bend in the middle.',
  'Hafif ve küçük. Yere yakın durur.':'Light and small. Keeps the car low.',
  'Çok büyük ve ağır. Motor zorlanır ama her şeyin üstünden geçmeye çalışır.':'Huge and heavy. The motor struggles, but it tries to roll over everything.',
  'Yaylı darbe tamponu. 20 cm geri çekilerek çarpmayı yumuşatır.':'Spring bumper. Compresses 20 cm to soften a crash.',
  'Güç dişlisi':'Power gear','Hız dişlisi':'Speed gear','Yumuşak süspansiyon':'Soft suspension',
  '1:7 oran. Çok güçlü ama yavaş.':'1:7 ratio. Very strong but slow.','1:1 oran. Çok hızlı ama zayıf.':'1:1 ratio. Very fast but weak.',
  'Tekerler engellere göre aşağı yukarı esner.':'Wheels flex up and down over obstacles.',
  'Hız':'Speed','Denge':'Balance','Güç':'Power','Sert':'Stiff','Yumuşak':'Soft',
  // editör
  'Tahtanın dışında':'Outside the board','Bu kare dolu':'This spot is taken','Menteşenin üstüne parça takılamaz':'Nothing can go on a hinge',
  'Teker bir kirişe takılmalı':'A wheel must sit on a beam','Bu parça bir kirişe takılmalı':'This part must sit on a beam',
  'Bu kirişte zaten bir parça var':'This beam already holds a part','En fazla {0} teker':'At most {0} wheels','Tekerler iç içe geçiyor':'Wheels overlap',
  'İLERİ →':'FORWARD →','Silmek için tahtanın dışına bırak':'Drop outside the board to delete','Parçaları sürükle · Tekere dokun: motor aç/kapa':'Drag parts · Tap a wheel: motor on/off',
  'Bırak: sil':'Release: delete','Motorlu teker':'Powered wheel','Serbest teker (motorsuz)':'Free wheel (no motor)','Parça silindi':'Part removed',
  'Parçayı yukarı, tahtaya sürükle':'Drag the part up onto the board','{0} kg · teker {1}/{2}':'{0} kg · wheels {1}/{2}',' · maliyet {0}':' · cost {0}',
  // kurallar (core.js)
  'Önce bir kiriş yerleştir.':'Place a beam first.','Bazı parçalar araca bağlı değil.':'Some parts are not connected to the car.',
  'En fazla {0} teker takılabilir.':'You can fit at most {0} wheels.','Araçta hiç teker yok.':'The car has no wheels.',
  'Bir menteşe en fazla iki parçayı bağlar.':'A hinge joins at most two parts.','Menteşe bir kirişe bağlı olmalı.':'A hinge must connect to a beam.',
  'Teker, tampon ve yumurta bir kirişin üstüne takılır.':'Wheels, bumpers and eggs go on a beam.','Tekerler iç içe geçiyor. Aralarını aç.':'Wheels overlap. Space them out.',
  'En az bir motorlu teker gerekli.':'You need at least one powered wheel.',
  'Bu testte yumurtayı araca yerleştirmelisin.':'Put the egg on your car for this test.','Tasarımda henüz açılmamış bir parça var.':'Your design uses a part you have not unlocked.',
  'Tasarımda henüz açılmamış bir teker var.':'Your design uses a wheel you have not unlocked.',
  // garaj bilgi satırı
  'Kütle':'Mass','Motor':'Motors','Tepe hız':'Top speed','motor kapalı':'motor off','Son deneme:':'Last try:','Maliyet':'Cost',
  '{0}% yol · tepe hız {1} m/s':'{0}% of the way · top speed {1} m/s',' · en sert darbe {0} g (sınır {1} g)':' · hardest hit {0} g (limit {1} g)',' · {0} teker koptu':' · {0} wheel(s) broke off',
  // ipucu
  'Bir teker, kendi yarıçapından yüksek bir basamağa tek başına çıkamaz. Ya tekeri büyüt ya da basamağa yaslanıp aracı yukarı itebilecek birden çok motorlu teker kullan.':'A wheel cannot climb a step taller than its own radius on its own. Use a bigger wheel, or several powered wheels that can push the car up the step.',
  'Yokuşta iki şey tükenir: tutunma ve motor gücü. Tekerlerden duman çıkıyorsa tutunma yetmiyor, motor kızarıyorsa güç yetmiyor. Araç şaha kalkıyorsa ağırlık fazla geride.':'On a slope two things run out: grip and motor power. Smoking wheels mean not enough grip, a glowing motor means not enough power. If the car rears up, the weight is too far back.',
  'Boşluğu ya boşluktan uzun bir araçla köprü gibi geçersin ya da üstünden uçacak kadar hızla. Karşı kenara çarpan teker büyükse daha kolay tırmanır.':'Cross a gap either with a car longer than the gap, like a bridge, or fast enough to fly over it. A big wheel hitting the far edge climbs it more easily.',
  'Yumurtayı kıran şey hız değil, ani duruş. Darbeyi uzun bir mesafeye yayan her şey işe yarar: esneyen bir şasi, tampon ya da yumuşak süspansiyon.':'Speed does not break the egg; a sudden stop does. Anything that spreads the impact over a longer distance helps: a flexible chassis, a bumper or soft suspension.',
  'Köprü sen üstüne çıkınca çöküyor. Ya boşluktan uzun bir araç lazım ya da çöken zemin düşmeden geçecek kadar hız.':'The bridge collapses once you are on it. You need a car longer than the gap, or enough speed to cross before it falls.',
  'Yokuş buz tutmuş, tekerler tutunamıyor. Yokuşa tırmanmaya çalışma, altından hızla gel ve momentumla çık.':'The slope is icy and wheels cannot grip. Do not crawl up: arrive fast and ride your momentum.',
  'Yola bir blok düşüyor ve önüne basamak oluyor. Araç onun üstüne tırmanabilmeli ya da blok düşmeden altından geçebilmeli.':'A block drops onto the road and becomes a step. Your car must climb it or get past before it lands.',
  'Geçide girerken tavan iniyor. Araç alçak olmalı ama çıkışta küçük bir basamak da var.':'The ceiling drops as you enter. Stay low, but there is also a small step at the exit.',
  'Bayrağa varınca bayrak kaçıyor ve arkasında bir yokuş var. Yolculuk uzun: gücü ve süreyi ona göre planla.':'When you reach the flag it runs away, and there is a slope behind it. The trip is long: plan power and time for it.',
  'Çöken köprü, düşen blok ve kaçan bayrak aynı parkurda. Hepsine dayanan tek bir araç lazım.':'Collapsing bridge, falling block and runaway flag on one course. You need a single car that survives them all.',
  'Yol düz görünüyor ama sona doğru yerden bir şey çıkabilir. Aracın gövdesi yere çok yakınsa takılır.':'The road looks flat, but something may pop out of the ground near the end. A car that sits too low gets caught.',
  'Tahterevalli senin ağırlığınla devrilir. Bitiş göründüğü yerde olmayabilir; arkasında yerden yükselen bir basamak var.':'The seesaw tips under your weight. The finish may not be where it seems; a step rises out of the ground behind it.',
  'Tümsekler aracı zıplatır ve ters çevirebilir. Uzun şasi ya da esneyen süspansiyon işe yarar. Sonda zemin çöker, durma.':'The bumps bounce the car and can flip it. A long chassis or flexible suspension helps. The floor collapses at the end, so keep moving.',
  'Köprü sallanır ve ağır araçla kopar. Köprüden sonra yerden bir basamak yükselir.':'The bridge swings and snaps under a heavy car. After the bridge a step rises from the ground.',
  'Kutular itilebilir. Onları devirecek güç ya da üstlerinden geçecek teker gerekir. Kutulardan sonra yukarıdan bir şey düşer.':'The boxes can be pushed. You need the power to topple them or wheels to roll over them. After the boxes something falls from above.',
  'Boşluğu atlamak için hız gerekir. Karşıya çarparken ön tarafın yere gömülmemesi için dengeyi düşün. Bayraktan sonra bir yokuş daha var.':'Jumping the gap takes speed. Think about balance so the nose does not dig in on landing. There is another slope after the flag.',
  'Platform boşluğun üstünde gidip gelir. Doğru anda bin ve karşıya geçince inen tavanın altından geçecek kadar alçak kal.':'The platform shuttles over the gap. Board at the right moment, then stay low enough for the dropping ceiling on the other side.',
  'Yokuşun tepesinden variller yuvarlanır. Onları ezip geçecek büyük tekerler ya da üstlerinden aşacak güç gerekir.':'Barrels roll down from the top of the slope. You need big wheels to crush through or the power to climb over them.',
  'Maden tavanı alçak. Araç tavanın altından geçmeli ama çıkıştaki basamağa da tırmanabilmeli.':'The mine roof is low. The car must fit underneath, yet still climb the step at the exit.',
  'Dikenler tekerleri koparır. Dikenler yükselmeden üstlerinden uçacak hız lazım.':'Spikes rip wheels off. You need enough speed to fly over before they rise.',
  'İki tahterevalli arka arkaya. İkincisine binerken birincisinin ucuna takılmamak için aracın boyu önemli. Sonda yine bir sürpriz var.':'Two seesaws in a row. Car length matters so you do not snag on the first one while boarding the second. Another surprise waits at the end.',
  'Basamak, kutular, boşluk ve düşen blok. Güçlü ve boşluktan uzun bir araç düşün.':'A step, boxes, a gap and a falling block. Think of a strong car longer than the gap.',
  'Bu köprü çürük: yavaş ve ağır giden düşer. Hafif ve hızlı ol, sonra inen tavana dikkat.':'This bridge is rotten: slow and heavy cars fall. Be light and fast, then watch the dropping ceiling.',
  'Uçurum geniş. Rampadan olabildiğince hızlı çık. İnişten sonra zemin çöker, durma.':'The cliff is wide. Leave the ramp as fast as you can. The floor collapses after the landing, so keep moving.',
  'Her şey bir arada: tahterevalli, köprü, kutular, dikenler, platform ve kaçan bayrak. Her engeli tek tek düşün, sonra hepsine dayanan aracı kur.':'Everything at once: seesaw, bridge, boxes, spikes, platform and a runaway flag. Think through each obstacle, then build one car that beats them all.',
  '{0} başarısız deneme sonra açılır':'Unlocks after {0} more failed tries','Bu testi geçen bir araç: {0}':'A car that passes this test: {0}',
  'Doğrulanmış bir çözümü garaja yükleyebilirsin. Kendi tasarımın saklanır, istediğinde geri dönersin.':'You can load a verified solution into the garage. Your own design is kept, so you can go back to it any time.',
  'Çözümü garaja yükle':'Load solution into garage','Bu test için önce şu parçayı açman gerekiyor: {0}.':'First you need to unlock: {0}.',
  '1 · YÖN':'1 · DIRECTION','2 · TASARIM':'2 · DESIGN','3 · ÇÖZÜM':'3 · SOLUTION','Kendi tasarımıma dön':'Back to my design',
  '▶ Reklam izle, hemen aç':'▶ Watch an ad to unlock now','Reklam şu an hazır değil. Biraz sonra tekrar dene.':'No ad is ready right now. Try again in a moment.',
  'Macera {0}. bölüm':'Adventure level {0}',
  // tasarım tarifi
  '{0} cm uzunluğunda şasi':'{0} cm chassis','motorlu':'powered','serbest':'free','küçük':'small','orta':'medium','büyük':'big','dev':'giant',
  '{0} {1} {2} teker':'{0} {1} {2} wheel(s)','{0} ağırlık ({1})':'{0} weight(s) ({1})','arkada':'rear','önde':'front','ortada':'middle',
  '{0} menteşe':'{0} hinge(s)','tampon':'bumper','{0} dişlisi':'{0} gear','{0} süspansiyon':'{0} suspension','sert':'stiff','yumuşak':'soft',
  // akış
  'TAKILDI':'STUCK','DÜŞTÜ':'FELL','YUMURTA KIRILDI':'EGG BROKE','SÜRE DOLDU':'TIME UP','DURDURULDU':'STOPPED','OLMADI':'FAILED','GEÇTİ!':'CLEARED!',
  'Aracını kur, parkurda dene, geliştir. Her bölümde bir sürpriz var.':'Build your car, test it on the course, improve it. Every level hides a surprise.',
  'MACERA':'ADVENTURE','ANTRENMAN':'TRAINING','Tek engelli testler':'Single-obstacle tests','Tekrar oyna':'Play again','Sıradaki bölüm':'Next level',
  'Basamak 10 cm’i geç':'Clear Step 10 cm','Rampa 15°’yi geç':'Clear Ramp 15°','Basamak 20 cm’i geç':'Clear Step 20 cm',
  'Macera · {0}. bölüm':'Adventure · Level {0}','{0} · {1}. basamak':'{0} · stage {1}','Tuzak {0}':'Trap {0}',
  '★ Bitir':'★ Finish','★ {0} sn':'★ {0} s','★ maliyet {0}':'★ cost {0}',
  '{0} geçildi':'{0} cleared','{0}. denemede, {1} saniyede.':'Try {0}, {1} seconds.','YENİ PARÇA: {0}':'NEW PART: {0}','YENİ TEST: {0}':'NEW TEST: {0}',
  'Haritada açıldı.':'Unlocked on the map.','Sıradaki: {0} ▶':'Next: {0} ▶','Garaja dön':'Back to garage',
  '{0}. denemede geçtin.':'Cleared on try {0}.',' Daha hızlı bir araç süre yıldızını getirir.':' A faster car earns the time star.',
  ' Daha az parça maliyet yıldızını getirir.':' A cheaper car earns the cost star.',' Kusursuz!':' Perfect!',
  'MACERA TAMAM!':'ADVENTURE COMPLETE!','Tüm bölümleri geçtin. Eksik yıldızların peşine düşebilirsin.':'You cleared every level. Now go after the missing stars.',
  'Sıradaki bölüm ▶':'Next level ▶','Yıldız için tekrar':'Retry for stars','Gizlilik ayarları':'Privacy settings','Dil':'Language',
  // bölüm adları
  'İlk sürüş':'First drive','Tahterevalli':'Seesaw','Kasisli yol':'Bumpy road','Sallanan köprü':'Swinging bridge','Kutu duvarı':'Box wall',
  'Atlama rampası':'Jump ramp','Asansör':'Elevator','Varil yağmuru':'Barrel rain','Alçak maden':'Low mine','Dikenli yol':'Spike road',
  'Çifte tahterevalli':'Double seesaw','Şantiye':'Construction site','Çürük köprü':'Rotten bridge','Uçurum':'The cliff','Büyük sefer':'Grand expedition',
  'Basamak':'Step','Rampa':'Ramp','Boşluk':'Gap','Yumurta düşüşü':'Egg drop','Tuzaklı parkur':'Trap course',
  'Çöken köprü':'Collapsing bridge','Buzlu yokuş':'Icy slope','Düşen blok':'Falling block','İnen tavan':'Crushing ceiling','Kaçan bayrak':'Runaway flag','Hepsi bir arada':'All in one',
  };
  const PAT=[[/^En fazla (\d+) teker takılabilir\.$/,'En fazla {0} teker takılabilir.']];
  function t(s,...a){let r=s;if(lang==='en'){if(EN[s]!=null)r=EN[s];else{for(const [re,k] of PAT){const m=s.match(re);if(m){r=EN[k];a=m.slice(1);break;}}}}
    return a.length?r.replace(/\{(\d)\}/g,(_,i)=>a[+i]):r;}
  window.LANG=lang;window.t=t;window.DECSEP=lang==='tr'?',':'.';
  window.setLang=l=>{try{localStorage.setItem('tgLang',l);}catch(e){}location.reload();};
  window.__EN=EN;
  document.documentElement.lang=lang;
  const ld=document.getElementById('loading');if(ld)ld.textContent=t(ld.textContent.trim());
})();
