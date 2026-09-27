# İkon, açılış ekranı ve Play mağaza görselleri üretir.  python3 tools/make-icons.py
import json, math, os
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg=json.load(open(os.path.join(ROOT,'app.config.json')))
RES=os.path.join(ROOT,'android/app/src/main/res'); STORE=os.path.join(ROOT,'store'); os.makedirs(STORE,exist_ok=True)
Y=(242,192,20); YD=(185,143,6); INK=(29,33,37); GREY=(160,167,174); OR=(224,86,27); SCENE=(228,231,234); BENCH=(28,32,36)

def vehicle(d,rear,front,r):
    """car with its rear wheel centred at `rear` and front wheel at `front`; r = wheel radius (px)"""
    (x0,y0),(x1,y1)=rear,front; ang=math.atan2(y1-y0,x1-x0); ca,sa=math.cos(ang),math.sin(ang)
    L=math.hypot(x1-x0,y1-y0); h=r*0.62; ext=r*0.35
    P=lambda u,v:(x0+u*ca-v*sa, y0+u*sa+v*ca)
    d.polygon([P(-ext,-h/2),P(L+ext,-h/2),P(L+ext,h/2),P(-ext,h/2)],fill=INK)
    n=max(3,int(L/(r*0.55)))
    for i in range(1,n):
        px,py=P(L*i/n,0); q=r*0.14; d.ellipse([px-q,py-q,px+q,py+q],fill=(70,76,82))
    for px,py in (rear,front):
        for rr,col in ((1.0,INK),(0.63,GREY),(0.23,OR)):
            q=r*rr; d.ellipse([px-q,py-q,px+q,py+q],fill=col)
def step_block(d,x0,y0,x1,y1,col):
    d.rectangle([x0,y0,x1,y1],fill=col)

def foreground(size):
    S=size*4; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    u=S/108  # dp units
    # step block, bottom right, inside safe zone (21..87dp)
    r=6.2*u; floor=80*u; top=66*u; edge=60*u
    d.rectangle([20*u,floor,88*u,88*u],fill=INK); d.rectangle([edge,top,88*u,floor],fill=INK)
    fx=edge+r*0.55; fy=top-math.sqrt(max(0,r*r-(fx-edge)**2)) if fx<edge+r else top-r
    fy=top-r*0.83; rear=(fx-math.sqrt((26*u)**2-(floor-r-fy)**2),floor-r)
    vehicle(d,rear,(fx,fy),r)
    return im.resize((size,size),Image.LANCZOS)
def legacy(size,round_=False):
    S=size*4; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    if round_: d.ellipse([0,0,S-1,S-1],fill=Y)
    else: d.rounded_rectangle([0,0,S-1,S-1],radius=int(S*0.18),fill=Y)
    fg=foreground(S).resize((int(S*1.5),int(S*1.5)),Image.LANCZOS)
    off=int(-S*0.25); layer=Image.new('RGBA',(S,S),(0,0,0,0)); layer.paste(fg,(off,off),fg)
    mask=Image.new('L',(S,S),0); md=ImageDraw.Draw(mask)
    (md.ellipse if round_ else (lambda b,**k: md.rounded_rectangle(b,radius=int(S*0.18),**k)))([0,0,S-1,S-1],fill=255)
    im=Image.alpha_composite(im,Image.composite(layer,Image.new('RGBA',(S,S),(0,0,0,0)),mask))
    return im.resize((size,size),Image.LANCZOS)

DENS={'mdpi':1,'hdpi':1.5,'xhdpi':2,'xxhdpi':3,'xxxhdpi':4}
for k,m in DENS.items():
    dd=os.path.join(RES,'mipmap-'+k)
    foreground(int(108*m)).save(os.path.join(dd,'ic_launcher_foreground.png'))
    legacy(int(48*m)).save(os.path.join(dd,'ic_launcher.png'))
    legacy(int(48*m),True).save(os.path.join(dd,'ic_launcher_round.png'))
open(os.path.join(RES,'values/ic_launcher_background.xml'),'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#F2C014</color>\n</resources>\n')

# text helper: pick font by glyph coverage (fonts are split into latin / latin-ext)
FONTS={}
def fonts(kind,size):
    pair=[('cp.ttf','cp-ext.ttf'),('barlow.ttf','barlow-ext.ttf')][kind]
    out=[]
    for f in pair:
        p=os.path.join(ROOT,'tools/fonts',f); cmap=TTFont(p).getBestCmap()
        out.append((ImageFont.truetype(p,size),cmap))
    return out
def text(d,xy,s,kind,size,fill,anchor='l'):
    fs=fonts(kind,size); x,y=xy
    w=sum(next((f for f,c in fs if ord(ch) in c),fs[0][0]).getlength(ch) for ch in s)
    if anchor=='m': x-=w/2
    for ch in s:
        f=next((f for f,c in fs if ord(ch) in c),fs[0][0]); d.text((x,y),ch,font=f,fill=fill); x+=f.getlength(ch)
    return w

# splash: scene colour + icon in the middle
for folder in os.listdir(RES):
    p=os.path.join(RES,folder,'splash.png')
    if not os.path.exists(p): continue
    w,h=Image.open(p).size; im=Image.new('RGB',(w,h),SCENE)
    ic=legacy(int(min(w,h)*0.28)); im.paste(ic,((w-ic.width)//2,(h-ic.height)//2),ic); im.save(p)

# Play store: 512 icon, 1024x500 feature graphic
legacy(512).convert('RGB').resize((512,512)).save(os.path.join(STORE,'icon-512.png'))
fg=Image.new('RGB',(1024,500),Y); d=ImageDraw.Draw(fg)
floor,top,edge,r=440,350,700,44
d.rectangle([0,floor,1024,500],fill=INK); d.rectangle([edge,top,1024,floor],fill=INK)
fy=top-r*0.83; fx=edge+r*0.55; rear=(fx-math.sqrt(175**2-(floor-r-fy)**2),floor-r)
S=Image.new('RGBA',(1024,500),(0,0,0,0)); vehicle(ImageDraw.Draw(S),rear,(fx,fy),r); fg.paste(S,(0,0),S)
text(d,(56,60),cfg['appName'],0,92,INK)
text(d,(60,178),'Aracını parça parça kur.',1,38,INK)
text(d,(60,226),'Tırmanır mı, düşer mi?',1,38,INK)
fg.save(os.path.join(STORE,'feature-graphic-1024x500.png'))
print('ikonlar, açılış ekranları ve mağaza görselleri hazır')
