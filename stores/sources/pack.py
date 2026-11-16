"""Valida el kit y genera su ZIP sin incluir otras copias del archivo."""
from pathlib import Path
import json
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
subprocess.run([sys.executable, str(root/'sources/validate.py')], check=True)
version = json.loads((root/'listing.json').read_text())['version']
out = root/'releases'/f'Sanuk-{version}-App-Store-Google-Play.zip'
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted(root.rglob('*')):
        relative = file.relative_to(root)
        if file.is_file() and not {'releases', '__pycache__'}.intersection(relative.parts) and file.name != '.DS_Store':
            archive.write(file, Path('stores')/relative)
with zipfile.ZipFile(out) as archive:
    assert archive.testzip() is None, 'El ZIP no supera la comprobación de integridad'
print(f'ZIP verificado · {out.relative_to(root.parent)} · {out.stat().st_size/1024/1024:.1f} MiB')
