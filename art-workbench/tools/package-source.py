#!/usr/bin/env python3
"""Package only retained project source; verify every ZIP entry byte for byte."""
from pathlib import Path
import hashlib
import zipfile

root = Path(__file__).resolve().parent.parent
excluded = {'node_modules', 'dist', 'portable', 'release', 'test-results', 'playwright-report', '.git', '__pycache__'}
files = sorted(path for path in root.rglob('*') if path.is_file()
               and not any(part in excluded for part in path.relative_to(root).parts)
               and not path.name.endswith(('.log', '.tsbuildinfo', '.pyc')))
output = root / 'release' / 'guanwu-art-workbench-source.zip'
output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in files:
        archive.write(path, 'art-workbench/' + path.relative_to(root).as_posix())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert len(archive.namelist()) == len(files)
    for path in files:
        assert archive.read('art-workbench/' + path.relative_to(root).as_posix()) == path.read_bytes()
content = output.read_bytes()
print({'file': output.name, 'sourceFiles': len(files), 'bytes': len(content),
       'sha256': hashlib.sha256(content).hexdigest(), 'crcAndSourceEquality': 'passed'})
