#!/usr/bin/env python3
"""Package a standalone journal source tree and verify the exact ZIP bytes."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent.parent
excluded = {
    'node_modules', 'dist', 'portable', 'release', 'test-results',
    'playwright-report', '.git', '__pycache__', '.cache', '.pytest_cache',
}
root_names = {
    '.gitignore', 'README.md', 'index.html', 'package.json',
    'package-lock.json', 'tsconfig.json', 'vite.config.ts',
    'playwright.config.ts',
}
source_directories = ('src', 'docs', 'tools', 'tests')
required = {
    'README.md', 'package.json', 'package-lock.json', 'index.html',
    'tsconfig.json', 'vite.config.ts', 'src/main.tsx', 'src/App.tsx',
    'src/assets/guanwu-serif.woff2', 'src/assets/FONT-LICENSE.txt',
    'docs/ART-SOURCES.md', 'docs/NOTICES.txt', 'docs/START.md',
    'tools/build-portable.mjs', 'tools/package-source.py', 'tools/serve.sh',
}

paths = [root / name for name in root_names if (root / name).is_file()]
for directory_name in source_directories:
    directory = root / directory_name
    if not directory.is_dir():
        raise SystemExit(f'Missing source directory: {directory_name}')
    paths.extend(directory.rglob('*'))

files = []
for path in paths:
    relative = path.relative_to(root)
    if any(part in excluded for part in relative.parts):
        continue
    if path.is_symlink():
        raise SystemExit(f'Source package cannot include symlinks: {relative}')
    if not path.is_file() or path.name.endswith(('.log', '.tsbuildinfo', '.pyc')):
        continue
    files.append(path)
files = sorted(set(files), key=lambda path: path.relative_to(root).as_posix())
relative_names = {path.relative_to(root).as_posix() for path in files}
missing = required - relative_names
if missing:
    raise SystemExit('Missing required source files: ' + ', '.join(sorted(missing)))

members = {
    'journal/' + path.relative_to(root).as_posix(): path.read_bytes()
    for path in files
}
output = root / 'release' / 'yiri-journal-source.zip'
output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in members.items():
        archive.writestr(name, data)
with zipfile.ZipFile(output) as archive:
    if archive.namelist() != list(members):
        raise SystemExit('Source ZIP members differ from the expected file list.')
    bad_member = archive.testzip()
    if bad_member:
        raise SystemExit('Source ZIP CRC verification failed: ' + bad_member)
    for name, data in members.items():
        if archive.read(name) != data:
            raise SystemExit('Source ZIP bytes differ from source: ' + name)

content = output.read_bytes()
metadata = json.loads((root / 'package.json').read_text())
manifest = {
    'name': metadata['name'],
    'version': metadata['version'],
    'file': output.name,
    'sourceFiles': len(members),
    'bytes': len(content),
    'sha256': hashlib.sha256(content).hexdigest(),
    'archiveCrcValidation': 'passed',
    'exactMemberValidation': 'passed',
    'sourceByteEqualityValidation': 'passed',
    'files': [
        {'name': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        for name, data in members.items()
    ],
}
(output.parent / 'source-manifest.json').write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8',
)
print(json.dumps({key: value for key, value in manifest.items() if key != 'files'}, ensure_ascii=False))
