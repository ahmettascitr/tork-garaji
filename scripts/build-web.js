// src/ → www/ (Android için) ya da tek dosyalık dist/preview.html (--single)
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');const cfg=JSON.parse(fs.readFileSync(path.join(root,'app.config.json'),'utf8'));
const single=process.argv.includes('--single');
const nm=p=>path.join(root,'node_modules',p);
const FONTS=[['Barlow','barlow',[400,500,600,700]],['Chakra Petch','chakra-petch',[500,600,700]]];
const RANGES={'latin':'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  'latin-ext':'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'};
function fontCss(inline){let css='';const files=[];
  FONTS.forEach(([fam,pkg,ws])=>ws.forEach(w=>Object.keys(RANGES).forEach(sub=>{const f=`${pkg}-${sub}-${w}-normal.woff2`;const src=nm(`@fontsource/${pkg}/files/${f}`);
    const url=inline?'data:font/woff2;base64,'+fs.readFileSync(src).toString('base64'):'fonts/'+f;files.push([src,f]);
    css+=`@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(${url}) format('woff2');unicode-range:${RANGES[sub]};}\n`;})));
  return {css,files};}
const rd=f=>fs.readFileSync(path.join(root,'src',f),'utf8');
const T='ca-app-pub-3940256099942544';const ad=Object.assign({appId:T+'~3347511713',rewarded:T+'/5224354917',interstitial:T+'/1033173712'},cfg.admob||{});
let html=rd('index.html').split('{{APP_NAME_EN}}').join(cfg.appNameEn||cfg.appName).split('{{APP_NAME}}').join(cfg.appName)
  .split('{{ADS_CFG}}').join(JSON.stringify({appId:ad.appId,rewarded:ad.rewarded,interstitial:ad.interstitial}));
const planck=fs.readFileSync(nm('planck/dist/planck.min.js'),'utf8').split('//# sourceMappingURL')[0];
if(single){
  const {css}=fontCss(true);
  const inl=(tag,body)=>html=html.replace(tag,()=>'<script>\n'+body.replace(/<\/script/g,'<\\/script')+'\n</script>');
  html=html.replace('<link rel="stylesheet" href="fonts.css">',()=>'<style>\n'+css+'</style>');
  inl('<script src="planck.min.js"></script>',planck);
  inl('<script src="i18n.js"></script>',rd('i18n.js'));
  ['core.js','solpack.js','ads.js','game.js','native.js'].forEach(f=>inl(`<script src="${f}"></script>`,rd(f)));
  fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.writeFileSync(path.join(root,'dist/preview.html'),html);
  console.log('dist/preview.html',(html.length/1024).toFixed(0)+' KB');
}else{
  const out=path.join(root,'www');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,'fonts'),{recursive:true});
  const {css,files}=fontCss(false);files.forEach(([s,f])=>fs.copyFileSync(s,path.join(out,'fonts',f)));
  fs.writeFileSync(path.join(out,'fonts.css'),css);fs.writeFileSync(path.join(out,'index.html'),html);
  fs.writeFileSync(path.join(out,'planck.min.js'),planck);
  ['i18n.js','core.js','solpack.js','ads.js','game.js','native.js'].forEach(f=>fs.copyFileSync(path.join(root,'src',f),path.join(out,f)));
  console.log('www/ hazır');
}
