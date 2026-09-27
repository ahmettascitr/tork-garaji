// app.config.json → Android projesi. Her derlemeden önce çalışır, tekrar çalıştırmak güvenlidir.
//  - uygulama adı ve paket kimliği
//  - versionCode (VERSION_CODE ortam değişkeni, CI'da derleme numarası) ve versionName
//  - imzalama (ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD)
//  - sadece dikey ekran
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');const cfg=JSON.parse(fs.readFileSync(path.join(root,'app.config.json'),'utf8'));
const A=p=>path.join(root,'android',p);const rw=(p,fn)=>{const f=A(p);fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')));};
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,"\\'");
// capacitor.config.json
const capf=path.join(root,'capacitor.config.json');const cap=JSON.parse(fs.readFileSync(capf,'utf8'));
cap.appId=cfg.appId;cap.appName=cfg.appName;fs.writeFileSync(capf,JSON.stringify(cap,null,2)+'\n');
// strings.xml
rw('app/src/main/res/values/strings.xml',s=>s
  .replace(/(<string name="app_name">)[^<]*/,'$1'+esc(cfg.appName))
  .replace(/(<string name="title_activity_main">)[^<]*/,'$1'+esc(cfg.appName))
  .replace(/(<string name="package_name">)[^<]*/,'$1'+cfg.appId)
  .replace(/(<string name="custom_url_scheme">)[^<]*/,'$1'+cfg.appId));
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
            if (System.getenv("ANDROID_KEYSTORE_PATH")) { signingConfig signingConfigs.release }
            minifyEnabled false`);
  }
  return s;});
// portrait only
rw('app/src/main/AndroidManifest.xml',s=>s.includes('screenOrientation')?s:s.replace('android:name=".MainActivity"','android:name=".MainActivity"\n            android:screenOrientation="portrait"'));
console.log(`Android: ${cfg.appName} (${cfg.appId}) v${cfg.versionName} (${vc})`);
