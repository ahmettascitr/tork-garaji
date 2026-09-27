# n8n iş akışı dosyasını üretir: python3 n8n/build-workflow.py  →  n8n/tork-garaji-telegram.json
import json, uuid, os
HERE=os.path.dirname(os.path.abspath(__file__))
U=lambda: str(uuid.uuid4())
A="$('Ayarlar').first().json"
PARSE = r"""
// Telegram mesajlarını komutlara çevirir. Ağ çağrısı yapmaz; işi sonraki düğümler yapar.
const cfg = $('Ayarlar').first().json;
const updates = $input.first().json.result || [];
const HELP = [
  '🔧 Komutlar', '',
  'Düz mesaj → Claude oyunda bu değişikliği yapar, test eder, derler ve Play iç test kanalına yükler.',
  '/dene <istek> → Aynısı ama Play\'e yüklemez, sadece APK gönderir.',
  '/apk → Şu anki sürümün APK\'sını derleyip gönderir.',
  '/yayinla → Şu anki sürümü Play iç test kanalına yükler.',
  '/durum → Son işlerin durumu.', '',
  'Örnek: Basamak merdivenine 60 cm\'lik yeni bir basamak ekle',
].join('\n');
const out = [];
for (const u of updates) {
  const m = u.message;
  if (!m || !m.text) continue;
  if (String(m.chat.id) !== String(cfg.TELEGRAM_CHAT_ID)) continue;   // yalnızca senin sohbetin
  const text = m.text.trim();
  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase().replace(/@.*$/, '');
  const arg = parts.slice(1).join(' ').trim();
  if (cmd === '/start' || cmd === '/yardim' || cmd === '/help') out.push({ action: 'reply', text: HELP });
  else if (cmd === '/apk') out.push({ action: 'dispatch', workflow: 'build.yml', inputs: { track: 'none', notes: 'İstek üzerine derlendi' }, reply: '📦 Derliyorum, APK birkaç dakika içinde gelecek.' });
  else if (cmd === '/yayinla') out.push({ action: 'dispatch', workflow: 'build.yml', inputs: { track: 'internal', notes: '' }, reply: '🚀 Derleyip Play iç test kanalına yüklüyorum.' });
  else if (cmd === '/dene') {
    if (!arg) out.push({ action: 'reply', text: 'Ne değişsin? Örnek: /dene tekerler biraz daha hızlı dönsün' });
    else out.push({ action: 'dispatch', workflow: 'ai-edit.yml', inputs: { prompt: arg, track: 'none' }, reply: '👍 Aldım (deneme, Play\'e yüklenmeyecek).' });
  }
  else if (cmd === '/durum') out.push({ action: 'status' });
  else if (cmd.startsWith('/')) out.push({ action: 'reply', text: 'Bu komutu tanımıyorum.\n\n' + HELP });
  else out.push({ action: 'dispatch', workflow: 'ai-edit.yml', inputs: { prompt: text, track: 'internal' }, reply: '👍 Aldım, sıraya koydum.' });
}
return out.map(json => ({ json }));
"""
DISPATCH_REPLY = r"""
// GitHub'ın cevabını Telegram mesajına çevirir
const src = $('Ne yapılacak?').all(0);
return $input.all().map((it, i) => {
  const sc = it.json.statusCode;
  const ok = sc >= 200 && sc < 300;
  let text = ok ? src[i].json.reply : '❌ GitHub\'a iletemedim (hata ' + sc + ').';
  if (sc === 404) text += '\nDepo adı ya da iş akışı bulunamadı. Ayarlar\'daki GITHUB_REPO doğru mu, dosyalar GitHub\'a yüklendi mi?';
  if (sc === 401 || sc === 403) text += '\nGitHub anahtarı geçersiz ya da "Actions: Read and write" yetkisi yok.';
  if (sc === 422) text += '\nİş akışı bu girdiyi kabul etmedi.';
  return { json: { text } };
});
"""
STATUS_REPLY = r"""
// Son GitHub işlerini okunur bir listeye çevirir
const r = $input.first().json;
if (!(r.statusCode >= 200 && r.statusCode < 300)) return [{ json: { text: '❌ Durumu alamadım (hata ' + r.statusCode + ').' } }];
const runs = (r.body && r.body.workflow_runs) || [];
const icon = x => x.status !== 'completed' ? '⏳' : x.conclusion === 'success' ? '✅' : x.conclusion === 'cancelled' ? '⚪' : '❌';
const when = s => new Date(s).toLocaleString('tr-TR', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const lines = runs.map(x => icon(x) + ' ' + x.name + ' · ' + when(x.created_at) + '\n' + x.html_url);
return [{ json: { text: lines.length ? lines.join('\n\n') : 'Henüz iş yok.' } }];
"""
def http(name,pos,method,url,body=None,gh=False,full=False,onerror=False):
    p={"method":method,"url":url,"options":{}}
    if gh:
        p["sendHeaders"]=True
        p["headerParameters"]={"parameters":[
            {"name":"Authorization","value":"=Bearer {{ "+A+".GITHUB_TOKEN }}"},
            {"name":"Accept","value":"application/vnd.github+json"},
            {"name":"X-GitHub-Api-Version","value":"2022-11-28"}]}
    if body:
        p["sendBody"]=True;p["specifyBody"]="json";p["jsonBody"]=body
    if full: p["options"]={"response":{"response":{"fullResponse":True,"neverError":True}}}
    n={"parameters":p,"id":U(),"name":name,"type":"n8n-nodes-base.httpRequest","typeVersion":4.2,"position":pos}
    if onerror: n["onError"]="continueRegularOutput"
    return n
def code(name,pos,js): return {"parameters":{"jsCode":js.strip()},"id":U(),"name":name,"type":"n8n-nodes-base.code","typeVersion":2,"position":pos}
def cond(value):
    return {"conditions":{"options":{"caseSensitive":True,"leftValue":"","typeValidation":"strict","version":2},
            "conditions":[{"id":U(),"leftValue":"={{ $json.action }}","rightValue":value,"operator":{"type":"string","operation":"equals"}}],
            "combinator":"and"},"renameOutput":True,"outputKey":{"dispatch":"GitHub işi","status":"Durum","reply":"Cevap"}[value]}
TG="={{ "+A+".TELEGRAM_API }}/bot{{ "+A+".TELEGRAM_BOT_TOKEN }}"
GH="={{ "+A+".GITHUB_API }}/repos/{{ "+A+".GITHUB_REPO }}"
nodes=[
 {"parameters":{"rule":{"interval":[{"field":"seconds","secondsInterval":20}]}},"id":U(),"name":"Her 20 saniyede","type":"n8n-nodes-base.scheduleTrigger","typeVersion":1.2,"position":[0,200]},
 {"parameters":{"assignments":{"assignments":[{"id":U(),"name":k,"value":v,"type":"string"} for k,v in [
   ("TELEGRAM_BOT_TOKEN","BURAYA_BOTFATHER_TOKENI"),("TELEGRAM_CHAT_ID","BURAYA_SENIN_CHAT_ID"),
   ("GITHUB_REPO","KULLANICI_ADIN/tork-garaji"),("GITHUB_TOKEN","BURAYA_GITHUB_TOKEN"),
   ("TELEGRAM_API","https://api.telegram.org"),("GITHUB_API","https://api.github.com")]]},"options":{}},
  "id":U(),"name":"Ayarlar","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[220,200]},
 http("Telegram: yeni mesajlar",[440,200],"GET",TG+"/getUpdates?timeout=0"),
 {"parameters":{"conditions":{"options":{"caseSensitive":True,"leftValue":"","typeValidation":"loose","version":2},
   "conditions":[{"id":U(),"leftValue":"={{ ($json.result || []).length }}","rightValue":0,"operator":{"type":"number","operation":"gt"}}],"combinator":"and"},"looseTypeValidation":True,"options":{}},
  "id":U(),"name":"Yeni mesaj var mı?","type":"n8n-nodes-base.if","typeVersion":2.2,"position":[660,200]},
 http("Telegram: okundu say",[900,40],"GET",TG+"/getUpdates?timeout=0&offset={{ $json.result[$json.result.length - 1].update_id + 1 }}"),
 code("Komutları ayır",[900,260],PARSE),
 {"parameters":{"rules":{"values":[cond("dispatch"),cond("status"),cond("reply")]},"options":{}},
  "id":U(),"name":"Ne yapılacak?","type":"n8n-nodes-base.switch","typeVersion":3.2,"position":[1120,260]},
 http("GitHub: iş başlat",[1360,120],"POST",GH+"/actions/workflows/{{ $json.workflow }}/dispatches","={{ JSON.stringify({ ref: 'main', inputs: $json.inputs }) }}",gh=True,full=True),
 code("Cevap: iş",[1580,120],DISPATCH_REPLY),
 http("GitHub: son işler",[1360,300],"GET",GH+"/actions/runs?per_page=6",gh=True,full=True),
 code("Cevap: durum",[1580,300],STATUS_REPLY),
 http("Telegram: gönder",[1820,260],"POST",TG+"/sendMessage","={{ JSON.stringify({ chat_id: "+A+".TELEGRAM_CHAT_ID, text: $json.text, disable_web_page_preview: true }) }}",onerror=True),
 {"parameters":{"content":"## Kurulum\n1. **Ayarlar** düğümünü aç, ilk 4 değeri doldur.\n2. Sağ üstten iş akışını **Active** yap.\n3. Telegram'da botuna `/yardim` yaz.\n\nBilgisayarın ve n8n açık olduğu sürece mesajlar 20 saniye içinde işlenir. Tünel ya da port açmak gerekmez.","height":240,"width":440},
  "id":U(),"name":"Not","type":"n8n-nodes-base.stickyNote","typeVersion":1,"position":[0,-120]},
]
c=lambda a,b,i=0:{"node":b,"type":"main","index":i}
connections={
 "Her 20 saniyede":{"main":[[c(0,"Ayarlar")]]},
 "Ayarlar":{"main":[[c(0,"Telegram: yeni mesajlar")]]},
 "Telegram: yeni mesajlar":{"main":[[c(0,"Yeni mesaj var mı?")]]},
 "Yeni mesaj var mı?":{"main":[[c(0,"Telegram: okundu say"),c(0,"Komutları ayır")],[]]},
 "Komutları ayır":{"main":[[c(0,"Ne yapılacak?")]]},
 "Ne yapılacak?":{"main":[[c(0,"GitHub: iş başlat")],[c(0,"GitHub: son işler")],[c(0,"Telegram: gönder")]]},
 "GitHub: iş başlat":{"main":[[c(0,"Cevap: iş")]]},
 "Cevap: iş":{"main":[[c(0,"Telegram: gönder")]]},
 "GitHub: son işler":{"main":[[c(0,"Cevap: durum")]]},
 "Cevap: durum":{"main":[[c(0,"Telegram: gönder")]]},
}
wf={"name":"Tork Garajı — Telegram komutları","nodes":nodes,"connections":connections,"active":False,
    "settings":{"executionOrder":"v1","saveDataSuccessExecution":"none"},"pinData":{}}
json.dump(wf,open(os.path.join(HERE,'tork-garaji-telegram.json'),'w'),ensure_ascii=False,indent=2)
print('n8n/tork-garaji-telegram.json yazıldı')
