# Tork Garajı

Lego/Technic tarzı araç mühendisliği oyunu. Oyuncu garajda parçaları sürükleyip bırakarak araç kurar, araç gerçek fizikle basamak, rampa, boşluk, yumurta düşüşü ve tuzaklı parkurlara karşı test edilir.

## Nasıl çalışır

```
Telegram mesajı → n8n (bilgisayarında) → GitHub Actions
  → Claude kodu düzenler → fizik testleri → derleme (APK + AAB)
  → Play Console → Telegram'a APK ve özet
```

| Telegram'da | Ne olur |
|---|---|
| Düz mesaj | Claude isteği uygular, test eder, derler, Play iç test kanalına yükler |
| `/dene <istek>` | Aynısı, Play'e yüklemeden sadece APK gönderir |
| `/apk` | Mevcut sürümün APK'sını gönderir |
| `/yayinla` | Mevcut sürümü Play iç test kanalına yükler |
| `/durum` | Son işlerin durumu |

## Klasörler

- `src/` — oyunun kendisi (HTML/JS, fizik çekirdeği, çözüm paketi)
- `android/` — Capacitor Android projesi
- `.github/workflows/` — `build.yml` (derle + yükle), `ai-edit.yml` (Claude ile düzenle)
- `n8n/` — içe aktarılacak n8n iş akışı
- `tools/` — bölüm çözümlerini arayan araçlar
- `test/` — her bölümün çözülebilir olduğunu kontrol eden test
- `store/` — Play mağaza görselleri

## Komutlar

```
npm ci                 # bağımlılıklar
npm test               # 26 bölümün hepsi çözülebilir mi (≈5 sn)
npm run build:preview  # dist/preview.html — tarayıcıda oynanabilir tek dosya
npm run sync           # www/ + Android projesini güncelle
npm run solutions      # çözüm paketini yeniden üret
python3 tools/make-icons.py   # ikon, açılış ekranı, mağaza görselleri
```

Uygulama adı ve sürüm `app.config.json` içinde. Paket kimliği (`appId`) Play'e ilk yüklemeden sonra değiştirilemez.

Kurulum adımları için kurulum rehberine bak.
