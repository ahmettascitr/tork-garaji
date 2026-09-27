# Tork Garajı — yapay zekâ için çalışma kuralları

Bu depo, Lego/Technic tarzı araç inşa etme oyunudur. Oyuncu ızgaralı bir garajda parçaları sürükleyip bırakarak araç kurar, araç gerçek fizikle (planck.js) engellere karşı test edilir. Oyun HTML/JS'dir ve Capacitor ile Android uygulamasına sarılır.

İstekler oyunun sahibinden Telegram üzerinden gelir. Sahibi yazılımcı değildir: isteği anlaşılır bir sonuca çevir, teknik ayrıntıyı özete koyma.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `src/core.js` | Fizik çekirdeği: parça kuralları (`analyze`), simülasyon (`createSim`), bölümler (`LADDERS`, `TRAPS`, `levelFor`). Tarayıcıda ve node testlerinde aynı dosya çalışır. |
| `src/game.js` | Arayüz: harita, garaj editörü (sürükle-bırak), çizim, ipuçları, parça kilitleri (`UNLOCKS`), kayıt (localStorage). |
| `src/index.html` | Sayfa iskeleti ve CSS. `{{APP_NAME}}` derlemede doldurulur. |
| `src/solpack.js` | Her bölüm için doğrulanmış çözümler. **Elle düzenleme**, `npm run solutions` üretir. İpucu sekmesi buradan beslenir. |
| `src/native.js` | Android geri tuşu, durum çubuğu. |
| `app.config.json` | Uygulama adı, paket kimliği, sürüm adı. |
| `tools/` | Çözüm arama araçları (rastgele arama, tepe tırmanma, elle tasarımlar). |
| `test/solvable.test.js` | Güvenlik kapısı: her bölümün kayıtlı bir çözümü gerçekten geçmeli. |

## Kesin kurallar

1. **Her bölüm çözülebilir kalmalı.** Bitirmeden önce `npm test` çalıştır. Test geçmezse iş akışı değişikliği kaydetmez.
2. Fiziği (`core.js` içindeki sabitler, `analyze`, `createSim`) ya da bir bölümün geometrisini değiştirdiysen: `node tools/random-search.js 200 <merdiven-id>` ile yeni çözümler üret, gerekirse `node tools/hill-climb.js <li> <ri> 400`, sonra `npm run solutions`, sonra `npm test`. Bir bölüm hiç çözülemiyorsa bölümü kolaylaştır; çözümsüz bölüm bırakma.
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
- Merdivenler: Basamak, Rampa, Boşluk, Yumurta düşüşü, Tuzaklı parkur. Parça kilitleri `game.js` içindeki `UNLOCKS` tablosunda.
- İpucu: 2, 4 ve 6 başarısız denemede açılan üç kademe (yön, tasarım tarifi, çözümü yükle).

## Hızlı kontrol

- `npm test` — tüm bölümler (yaklaşık 5 saniye)
- `npm run build:preview` — `dist/preview.html` tek dosyalık oynanabilir sürüm
