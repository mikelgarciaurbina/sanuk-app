"""Captura la app nativa con un progreso de demostración. Requiere Simulator."""
import argparse, subprocess, json, time, hashlib
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--device',required=True);p.add_argument('--group',required=True);p.add_argument('--display',default='1');p.add_argument('--only',default='')
a=p.parse_args();root=Path(__file__).resolve().parents[1]
bundle='app.sanuk.reminderqa'
def sim(*args,check=True):
    return subprocess.run(['xcrun','simctl',*args],capture_output=True,text=True,check=check).stdout.strip()
scenes=[('01-camino','/(tabs)','camino'),('02-feria','/(tabs)/feria','feria'),('03-tonos','/juego/tonos','tonos'),('04-mercado','/juego/mercado','mercado'),('05-traza','/juego/traza','traza'),('06-cena','/juego/cena','cena'),('07-carta','/carta','carta'),('08-diario','/diario','diario')]
sim('status_bar',a.device,'override','--time','9:41','--dataNetwork','wifi','--wifiMode','active','--wifiBars','3','--batteryState','charged','--batteryLevel','100')
container=Path(sim('get_app_container',a.device,bundle,'data'))
doc=container/'Documents';doc.mkdir(exist_ok=True)
out=root/'sources'/'raw'/a.group;out.mkdir(parents=True,exist_ok=True)
manifest=json.loads((out/'manifest.json').read_text()) if (out/'manifest.json').exists() else []
for name,route,scene in scenes:
    if a.only and a.only not in name:continue
    sim('terminate',a.device,bundle,check=False)
    (doc/'store-capture.json').write_text(json.dumps({'route':route,'scene':scene}))
    sim('launch',a.device,bundle)
    time.sleep(26 if scene=='camino' else 12)
    dest=out/(name+'.png')
    sim('io',a.device,'screenshot','--display='+a.display,str(dest))
    manifest=[m for m in manifest if m['file']!=str(dest.relative_to(root))]
    manifest.append({'file':str(dest.relative_to(root)),'deviceUDID':a.device,'display':a.display,'route':route,'scene':scene,'source':'Native iOS Simulator; current app JavaScript in an isolated capture binary; seeded local progress','sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
    print(a.group,name,flush=True)
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
