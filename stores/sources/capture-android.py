"""Capturas nativas Android con Expo Go oficial y fixtures locales."""
import argparse, subprocess, json, time, hashlib, shlex, os, shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--group',required=True);p.add_argument('--only',default='');a=p.parse_args()
root=Path(__file__).resolve().parents[1]
sdk=Path(os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT') or Path.home()/'Library/Android/sdk')
adb=os.environ.get('ADB') or shutil.which('adb') or str(sdk/'platform-tools/adb')
project=Path(os.environ.get('SANUK_CAPTURE_PROJECT','/tmp/sanuk-store-capture'))
def run(*args,check=True):return subprocess.run([adb,'-s','emulator-5580',*args],capture_output=True,check=check)
size,density=('1440x2560','240') if a.group=='android-tablet-10' else ('1080x1920','240' if 'tablet' in a.group else '360')
run('shell','wm','size',size);run('shell','wm','density',density)
run('shell','settings','put','system','screen_off_timeout','2147483647')
run('shell','settings','put','global','window_animation_scale','0')
run('shell','settings','put','global','transition_animation_scale','0')
run('shell','settings','put','global','animator_duration_scale','0')
run('shell','cmd','statusbar','collapse',check=False)
run('shell','settings','put','global','sysui_demo_allowed','1')
run('shell','am','broadcast','-a','com.android.systemui.demo','-e','command','clock','-e','hhmm','0941')
run('shell','am','broadcast','-a','com.android.systemui.demo','-e','command','battery','-e','level','100','-e','plugged','false')
run('shell','am','broadcast','-a','com.android.systemui.demo','-e','command','notifications','-e','visible','false')
scenes=[('01-camino','/(tabs)','camino'),('02-feria','/(tabs)/feria','feria'),('03-tonos','/juego/tonos','tonos'),('04-mercado','/juego/mercado','mercado'),('05-traza','/juego/traza','traza'),('06-cena','/juego/cena','cena'),('07-carta','/carta','carta'),('08-diario','/diario','diario')]
if 'tablet' in a.group:scenes=[scenes[i] for i in (0,1,3,6)]
out=root/'sources/raw'/a.group;out.mkdir(parents=True,exist_ok=True)
manifest=json.loads((out/'manifest.json').read_text()) if (out/'manifest.json').exists() else []
for name,route,scene in scenes:
    if a.only and a.only not in name:continue
    run('shell','am','force-stop','host.exp.exponent')
    (project/'capture-config.json').write_text(json.dumps({'route':route,'scene':scene}))
    run('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('exp://127.0.0.1:8081?__expo_disable_onboarding=1&__expo_disable_fab=1&__expo_disable_auto_launch=1'),'host.exp.exponent')
    time.sleep(18)
    foreground=run('shell','dumpsys','activity','activities').stdout.decode(errors='replace')
    if not any('host.exp.exponent' in line for line in foreground.splitlines() if 'topResumedActivity' in line):
        run('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('exp://127.0.0.1:8081?__expo_disable_onboarding=1&__expo_disable_fab=1&__expo_disable_auto_launch=1'),'host.exp.exponent')
        time.sleep(6)
    foreground=run('shell','dumpsys','activity','activities').stdout.decode(errors='replace')
    assert any('host.exp.exponent' in line for line in foreground.splitlines() if 'topResumedActivity' in line),'Sanuk no está en primer plano'
    dest=out/(name+'.png');dest.write_bytes(run('exec-out','screencap','-p').stdout)
    manifest=[m for m in manifest if m['file']!=str(dest.relative_to(root))]
    manifest.append({'file':str(dest.relative_to(root)),'emulator':'Android 15 API 35 arm64 Google APIs','resolution':size,'density':density,'scene':scene,'route':route,'source':'Real native React Native UI in Expo Go 58.0.5; local demonstration progress; no release binary submitted','sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
    print(a.group,name,flush=True)
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
