// app.config.json → Android projesi. Her derlemeden önce çalışır, tekrar çalıştırmak güvenlidir.
//  - uygulama adı ve paket kimliği
//  - versionCode (VERSION_CODE ortam değişkeni, CI'da derleme numarası) ve versionName
//  - imzalama (ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD)
//  - sadece dikey ekran
//  - uygulama adı dile göre: varsayılan İngilizce (appNameEn), Türkçe telefonda appName
//  - AdMob uygulama kimliği (admob.appId; yoksa Google test kimliği)
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');const cfg=JSON.parse(fs.readFileSync(path.join(root,'app.config.json'),'utf8'));
const A=p=>path.join(root,'android',p);const rw=(p,fn)=>{const f=A(p);fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')));};
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,"\\'");
// capacitor.config.json
const capf=path.join(root,'capacitor.config.json');const cap=JSON.parse(fs.readFileSync(capf,'utf8'));
cap.appId=cfg.appId;cap.appName=cfg.appName;fs.writeFileSync(capf,JSON.stringify(cap,null,2)+'\n');
// strings.xml
const nameEn=cfg.appNameEn||cfg.appName;const admobId=(cfg.admob&&cfg.admob.appId)||'ca-app-pub-3940256099942544~3347511713';
rw('app/src/main/res/values/strings.xml',s=>{s=s
  .replace(/(<string name="app_name">)[^<]*/,'$1'+esc(nameEn))
  .replace(/(<string name="title_activity_main">)[^<]*/,'$1'+esc(nameEn))
  .replace(/(<string name="package_name">)[^<]*/,'$1'+cfg.appId)
  .replace(/(<string name="custom_url_scheme">)[^<]*/,'$1'+cfg.appId);
  if(s.includes('name="admob_app_id"'))s=s.replace(/(<string name="admob_app_id">)[^<]*/,'$1'+admobId);
  else s=s.replace('</resources>','    <string name="admob_app_id">'+admobId+'</string>\n</resources>');
  return s;});
fs.mkdirSync(A('app/src/main/res/values-tr'),{recursive:true});
fs.writeFileSync(A('app/src/main/res/values-tr/strings.xml'),'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">'+esc(cfg.appName)+'</string>\n    <string name="title_activity_main">'+esc(cfg.appName)+'</string>\n</resources>\n');
// build.gradle
const vc=parseInt(process.env.VERSION_CODE||'1',10);
rw('app/build.gradle',s=>{
  s=s.replace(/applicationId "[^"]*"/,`applicationId "${cfg.appId}"`)
     .replace(/versionCode \d+/,`versionCode ${vc}`)
     .replace(/versionName "[^"]*"/,`versionName "${cfg.versionName}"`);
  if(!s.includes('signingConfigs')){
    s=s.replace(/\n    buildTypes \{/,`
    signingConfigs {
        release {
            if (System.getenv("ANDROID_KEYSTORE_PATH")) {
                storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }
    buildTypes {`);
    s=s.replace(/release \{\n            minifyEnabled false/,`release {
            if (System.getenv("ANDROID_KEYSTORE_PATH")) { signingConfig signingConfigs.release } else { signingConfig signingConfigs.debug }
            minifyEnabled false`);
  }
  return s;});
// portrait only + AdMob meta-data
rw('app/src/main/AndroidManifest.xml',s=>{s=s.includes('screenOrientation')?s:s.replace('android:name=".MainActivity"','android:name=".MainActivity"\n            android:screenOrientation="portrait"');
  if(!s.includes('com.google.android.gms.ads.APPLICATION_ID'))s=s.replace(/(<application[^>]*>)/,'$1\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id"/>');
  return s;});
console.log(`Android: ${cfg.appName} (${cfg.appId}) v${cfg.versionName} (${vc})`);
