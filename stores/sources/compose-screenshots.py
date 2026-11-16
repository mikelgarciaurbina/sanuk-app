"""Compone la campaña con capturas reales, sin alterar la interfaz."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import json, csv, sys
root=Path(__file__).resolve().parents[1]
app=root.parent
fontroot=app/'node_modules/@expo-google-fonts'
def font(size,ui=False):
    return ImageFont.truetype(str(fontroot/('nunito/900Black/Nunito_900Black.ttf' if ui else 'fredoka/700Bold/Fredoka_700Bold.ttf')),size)
scenes=[
 ('01-camino','Tu primera palabra.','Tu próximo viaje.','DESDE CERO, EN ESPAÑOL','Camino de aprendizaje por el norte de Tailandia, con las primeras paradas y lecciones.'),
 ('02-feria','20 maneras','de decir sanuk.','APRENDE JUGANDO','Feria de juegos de Sanuk, con puestos de práctica para aprender tailandés.'),
 ('03-tonos','Cada tono cuenta.','Y se puede jugar.','ESCUCHA Y RECONOCE','Trompa de tonos, juego de escucha y reconocimiento de los tonos del tailandés.'),
 ('04-mercado','Del mercado','a la vida real.','PALABRAS QUE VAS A USAR','Juego del mercado con productos, cantidades y vocabulario en tailandés.'),
 ('05-traza','Una letra más.','Un mundo nuevo.','ESCRITURA PASO A PASO','Actividad para trazar una letra del alfabeto tailandés y reconocer su forma.'),
 ('06-cena','Las palabras','acercan personas.','CONVERSACIONES CON CONTEXTO','Escena ilustrada de una conversación de la historia de Sanuk para practicar tailandés.'),
 ('07-carta','Aprendes palabras.','Descubres una historia.','LA CARTA DE YAI','Carta de Yai que se va entendiendo a medida que se aprenden sus palabras.'),
 ('08-diario','Cada curva','tiene su historia.','TU VIAJE, LECCIÓN A LECCIÓN','Diario de viaje de Sanuk con los momentos de la historia y las palabras aprendidas.')]
groups={
 'iphone':('apple/iphone',1206,2622),
 'iphone-duo-outer':('apple/iphone-duo-outer',1398,2034),
 'iphone-duo-inner':('apple/iphone-duo-inner',2853,2007),
 'ipad-13':('apple/ipad-13',2048,2732),
 'android-phone':('google-play/phone',1080,1920),
 'android-tablet-7':('google-play/tablet-7',1080,1920),
 'android-tablet-10':('google-play/tablet-10',1440,2560)}
bgcolors=['#FFF0D6','#171D3E','#EAF5F0','#FFE6C8','#E9F0FA','#FFF2E5','#F7F1E5','#EDF2F8']
metadata=[]
for group,(out,w,h) in groups.items():
    dest=root/out;dest.mkdir(parents=True,exist_ok=True)
    for i,(scene,line1,line2,eyebrow,alt) in enumerate(scenes):
        src=root/'sources/raw'/group/(scene+'.png')
        if not src.exists():continue
        target=dest/(scene+'.png')
        if '--force' not in sys.argv and target.exists() and target.stat().st_mtime>src.stat().st_mtime and Image.open(target).size==(w,h):
            metadata.append({'file':str(target.relative_to(root)),'width':w,'height':h,'source':str(src.relative_to(root)),'alt':alt})
            continue
        raw=Image.open(src).convert('RGB')
        if 'tablet' in group:
            assert raw.size==(w,h),(group,raw.size)
            raw.save(dest/(scene+'.png'),optimize=True)
        else:
            bg=Image.new('RGB',(w,h),bgcolors[i]);d=ImageDraw.Draw(bg)
            dark=i==1;ink='#FFFFFF' if dark else '#1D2347';muted='#F6C467' if dark else '#90601C'
            # La franja de titular ocupa menos del 20 % en Google Play.
            isplay=group=='android-phone'
            top=int(h*(.195 if isplay else .245))
            margin=int(w*.061)
            d.arc((-w*.5,h*.12,w*1.8,h*1.12),175,325,fill='#303A62' if dark else '#E7D5B6',width=max(2,int(w*.003)))
            d.arc((-w*.9,h*.36,w*1.35,h*1.37),185,320,fill='#303A62' if dark else '#E7D5B6',width=max(2,int(w*.003)))
            # Titulares ajustados al ancho, manteniendo las dos líneas completas.
            fs=int(min(w*(.078 if w/h<.6 else .073),h*.068))
            while max(d.textlength(line1,font=font(fs)),d.textlength(line2,font=font(fs)))>w-2*margin:fs-=1
            if isplay:
                y=int(h*.035)
            else:
                d.text((margin,int(h*.04)),eyebrow,font=font(int(w*.023),True),fill=muted)
                y=int(h*.078)
            d.text((margin,y),line1,font=font(fs),fill=ink)
            d.text((margin,y+int(fs*1.08)),line2,font=font(fs),fill=ink)
            # Se conserva la pantalla completa, con su proporción original.
            maxw=w-2*margin;maxh=h-top-int(h*.036)
            ratio=min(maxw/raw.width,maxh/raw.height)
            nw,nh=round(raw.width*ratio),round(raw.height*ratio)
            x=(w-nw)//2;y=top+(maxh-nh)//2
            shadow=Image.new('RGBA',(w,h));sd=ImageDraw.Draw(shadow)
            radius=int(w*.033)
            sd.rounded_rectangle((x,y+int(w*.014),x+nw,y+nh+int(w*.014)),radius,fill=(20,25,54,55))
            shadow=shadow.filter(ImageFilter.GaussianBlur(w*.021))
            bg=Image.alpha_composite(bg.convert('RGBA'),shadow)
            screen=raw.resize((nw,nh),Image.Resampling.LANCZOS)
            mask=Image.new('L',(nw,nh));ImageDraw.Draw(mask).rounded_rectangle((0,0,nw,nh),radius,fill=255)
            bg.paste(screen,(x,y),mask)
            bg.convert('RGB').save(dest/(scene+'.png'),optimize=True)
        metadata.append({'file':str((dest/(scene+'.png')).relative_to(root)),'width':w,'height':h,'source':str(src.relative_to(root)),'alt':alt})
(root/'checks/screenshot-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
with (root/'google-play/alt-texts.tsv').open('w') as f:
    writer=csv.writer(f,delimiter='\t');writer.writerow(['archivo','texto alternativo'])
    for item in metadata:
        assert len(item['alt'])<=140
        if item['file'].startswith('google-play'):writer.writerow([item['file'],item['alt']])
print('Capturas compuestas',len(metadata))
