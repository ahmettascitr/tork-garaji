# Tork Garajı — yapay zekâ için çalışma kuralları

Bu depo, Lego/Technic tarzı araç inşa etme oyunudur. Oyuncu ızgaralı bir garajda parçaları sürükleyip bırakarak araç kurar, araç gerçek fizikle (planck.js) engellere karşı test edilir. Oyun HTML/JS'dir ve Capacitor ile Android uygulamasına sarılır.

İstekler oyunun sahibinden Telegram üzerinden gelir. Sahibi yazılımcı değildir: isteği anlaşılır bir sonuca çevir, teknik ayrıntıyı özete koyma.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `src/core.js` | Fizik çekirdeği: parça kuralları (`analyze`), maliyet (`COST`, `costOf`), simülasyon (`createSim`), macera bölümleri (`CAMPAIGN`, `CAMPAIGN_UNLOCK`, `campaignLevel`), antrenman bölümleri (`LADDERS`, `TRAPS`, `levelFor`). Tarayıcıda ve node testlerinde aynı dosya çalışır. |
| `src/game.js` | Arayüz: harita (Macera + Antrenman), garaj editörü (sürükle-bırak), engel çizimi, yıldızlar, ipuçları (`CAMP_HINT`, `HINT1`, `TRAP_HINT`), antrenman parça kilitleri (`UNLOCKS`), kayıt (localStorage). |
| `src/index.html` | Sayfa iskeleti ve CSS. `{{APP_NAME}}` derlemede doldurulur. |
| `src/solpack.js` | Her bölüm için doğrulanmış çözümler. **Elle düzenleme**, `npm run solutions` üretir. İpucu sekmesi buradan beslenir. |
| `src/native.js` | Android geri tuşu, durum çubuğu. |
| `app.config.json` | Uygulama adı, paket kimliği, sürüm adı. |
| `tools/` | Çözüm arama araçları (rastgele arama, tepe tırmanma, elle tasarımlar). |
| `test/solvable.test.js` | Güvenlik kapısı: her bölümün kayıtlı bir çözümü gerçekten geçmeli. |

## Kesin kurallar

1. **Her bölüm çözülebilir kalmalı.** Bitirmeden önce `npm test` çalıştır. Test geçmezse iş akışı değişikliği kaydetmez.
2. Fiziği (`core.js` içindeki sabitler, `analyze`, `createSim`) ya da bir bölümün geometrisini değiştirdiysen yeni çözümler üret, sonra `npm run solutions`, sonra `npm test`. Bir bölüm hiç çözülemiyorsa bölümü kolaylaştır; çözümsüz bölüm bırakma.
   - Antrenman: `node tools/random-search.js 200 <merdiven-id>`, gerekirse `node tools/hill-climb.js <li> <ri> 400`.
   - Macera: `node tools/campaign-search.js 150 <bölüm-no>` (o bölüme kadar açılan parçalarla rastgele arar), gerekirse `node tools/campaign-climb.js <bölüm-no> 300 5`. Geometriyi değiştirdiğin bölümün eski `tools/data/camp_<id>.json` dosyasını önce sil.
   - Macera yıldız hedefleri (`goals:{time,cost}`) bulunan en iyi çözümlerden gelir: `npm run solutions` sonrası `tools/data/camp_goals.json` içindeki en iyi süre ×1,3 ve en düşük maliyet +%15 civarı. Test, her hedefe kayıtlı bir çözümle ulaşılabildiğini kontrol eder.
   - Zorluk eğrisi: 1. bölümü başlangıç aracı geçmeli; 2–4 rastgele araçların yaklaşık %10–25'i, 5–8 %3–10'u, 9–14 %1–5'i geçmeli; 15 en az bir çözüm.
3. Yeni bölüm eklerken: önce çözülebilir olduğunu araçlarla kanıtla, sonra ekle.
4. Oyun internetsiz çalışmalı. Dış CDN, dış font, analiz aracı, reklam SDK'sı ekleme.
5. Arayüz metinleri Türkçe, kısa ve sade. İpucu metinleri çözümü doğrudan söylemez; kademeli yönlendirir.
6. Telefon dikey ekranı önceliklidir (yaklaşık 360–430 px genişlik). Dokunmatik hedefler en az 40 px.
7. `localStorage` anahtarı `paletGaraji3`. Yapısını değiştirirsen eski kayıtları dönüştür; oyuncunun ilerlemesi kaybolmasın.
8. `android/` klasöründe yalnızca gerçekten gerekiyorsa değişiklik yap. Ad, paket kimliği ve sürüm `app.config.json` + `scripts/patch-android.js` üzerinden yönetilir.
9. Uygulama adını değiştirme isteği gelirse sadece `app.config.json` içindeki `appName` alanını değiştir. `appId` (paket kimliği) Play'e ilk yüklemeden sonra değiştirilemez; asla değiştirme.
10. Git commit yapma, iş akışı yapar.
11. "Son değişikliği geri al" gibi isteklerde `git log` ile ilgili commit'i bul ve `git revert --no-commit <sha>` kullan; sonra `npm test`.

## Oyun kavramları (kısa)

- Izgara 18×8 hücre, hücre 10 cm. Parçalar: kiriş (4'lü, 2'li, dikme), teker (küçük/orta/büyük/dev, motorlu ya da serbest), ağırlık, menteşe, tampon, yumurta.
- Kurallar `analyze()` içinde: tekerler iç içe geçemez, en fazla 6 teker, teker/tampon/yumurta bir kirişe takılır, her şey bağlı olmalı.
- Ana mod **Macera**: 15 bölüm (`CAMPAIGN`), sırayla açılır. Her bölüm birden çok engel ve en az bir sinsi tuzak içerir. Parçalar `CAMPAIGN_UNLOCK` ile açılır; bir bölüm yalnızca kendinden önce açılan parçalarla çözülebilir olmalı.
- Hareketli engeller: `seesaw` tahterevalli, `bridge` kopabilen köprü, `platform` gidip gelen platform, `boxes` itilebilir kutular, `barrels` yuvarlanan variller, `roof` alçak tavan. Tuzaklar: `riseStep` yerden çıkan basamak, `spikes` teker koparan dikenler, `slab` çöken zemin, `drop` düşen blok, `ceiling` inen tavan, `fakeFlag` kaçan bayrak.
- Yıldızlar: bitir, süre hedefi, maliyet hedefi (parça maliyeti `COST`). Kayıtta `prog.stars[id]` bit maskesi (1 bitir, 2 süre, 4 maliyet).
- **Antrenman** merdivenleri: Basamak, Rampa, Boşluk, Yumurta düşüşü, Tuzaklı parkur. Parça kilitleri `game.js` içindeki `UNLOCKS` tablosunda; parça iki moddan hangisinde açılırsa açılsın sahip olunur.
- İpucu: 2, 4 ve 6 başarısız denemede açılan üç kademe (yön, tasarım tarifi, çözümü yükle).

## Hızlı kontrol

- `npm test` — tüm bölümler, antrenman + macera + yıldız hedefleri (yaklaşık 7 saniye)
- `npm run build:preview` — `dist/preview.html` tek dosyalık oynanabilir sürüm
