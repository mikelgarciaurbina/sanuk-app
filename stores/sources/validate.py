from pathlib import Path
from PIL import Image, ImageStat
import json, hashlib, datetime
root=Path(__file__).resolve().parents[1]
expected={
 'apple/iphone':(1206,2622,8),
 'apple/iphone-duo-outer':(1398,2034,8),
 'apple/iphone-duo-inner':(2853,2007,8),
 'apple/ipad-13':(2048,2732,8),
 'google-play/phone':(1080,1920,8),
 'google-play/tablet-7':(1080,1920,4),
 'google-play/tablet-10':(1440,2560,4)}
checks=[]
for folder,(w,h,n) in expected.items():
    files=sorted((root/folder).glob('*.png'))
    checks.append({'check':'count','folder':folder,'expected':n,'actual':len(files),'pass':len(files)==n})
    for f in files:
        im=Image.open(f)
        checks.append({'check':'screenshot','file':str(f.relative_to(root)),'size':im.size,'mode':im.mode,'bytes':f.stat().st_size,'pass':im.size==(w,h) and im.mode=='RGB' and max(ImageStat.Stat(im.resize((100,100))).var)>50})
for f,(w,h,mode) in {'apple/creative/header.png':(3840,1646,'RGB'),'apple/creative/search-results.png':(3840,2560,'RGB'),'google-play/feature-graphic.png':(1024,500,'RGB'),'brand/app-icon-ios-1024.png':(1024,1024,'RGB'),'brand/app-icon-google-512.png':(512,512,'RGBA')}.items():
    im=Image.open(root/f)
    checks.append({'check':'artwork','file':f,'size':im.size,'mode':im.mode,'bytes':(root/f).stat().st_size,'pass':im.size==(w,h) and im.mode==mode and ('google-512' not in f or (root/f).stat().st_size<=1024*1024)})
textchecks=json.loads((root/'checks/text-limits.json').read_text())
checks.extend({'check':'metadata','field':k,**v} for k,v in textchecks.items())
manifest=[]
for f in sorted((root/'sources/raw').glob('*/manifest.json')):manifest.extend(json.loads(f.read_text()))
checks.append({'check':'capture-count','expected':48,'actual':len(manifest),'pass':len(manifest)==48})
for item in manifest:
    f=root/item['file']
    checks.append({'check':'capture-provenance','file':item['file'],'pass':f.exists() and hashlib.sha256(f.read_bytes()).hexdigest()==item['sha256']})
    if f.exists():
        variance=max(ImageStat.Stat(Image.open(f).convert('RGB').resize((100,100))).var)
        checks.append({'check':'raw-screen-content','file':item['file'],'variance':round(variance,1),'pass':variance>50})
counts={folder:len(list((root/folder).glob('*.png'))) for folder in expected}
report={'version':'1.0.0','verifiedAt':datetime.datetime.now().isoformat(timespec='seconds'),'passed':all(c['pass'] for c in checks),'screenshots':sum(counts.values()),'counts':counts,'checks':checks,'scope':'File formats, dimensions, metadata limits and provenance. Release binaries and live URLs are separate pre-submission checks.'}
(root/'checks/validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
(root/'sources/capture-manifest.json').write_text(json.dumps({'capturedAt':'2026-11-16','appVersion':'1.0.0','appGitCommit':'fba1f38','workingTreeChanges':['Privacy and support links in Pasaporte','Opaque RGB app icon'],'progress':'Local demonstration fixture; no real learner data','ios':'Native simulator app with current JavaScript; separate QA bundle identifier','android':'Native UI in official Expo Go 58.0.5 on Android API 35 emulator; production AAB not built by this workflow','duo':'Closed outer display 1 and fully open inner display 3 selected in Device Hub; inner uses native landscape orientation','captures':manifest},ensure_ascii=False,indent=2))
(root/'checks/SHA256SUMS.txt').write_text(''.join(f'{hashlib.sha256(f.read_bytes()).hexdigest()}  {f.relative_to(root)}\n' for f in sorted(root.rglob('*')) if f.is_file() and f.name!='SHA256SUMS.txt' and not {'releases','__pycache__'}.intersection(f.relative_to(root).parts)))
print(json.dumps({'passed':report['passed'],'screenshots':report['screenshots'],'counts':counts},ensure_ascii=False))
assert report['passed'],'Revisar checks/validation.json'
