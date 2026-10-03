"""Subset and rename the already downloaded, verified OFL font for this site."""
from pathlib import Path
import hashlib
import json
import shutil
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path('/tmp/guanwu-research/noto-serif.ttf')
EXPECTED = '050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED
font = TTFont(SOURCE)
font = instantiateVariableFont(font, {'wght': 400}, inplace=True)
names = {1: 'Guanwu Serif', 2: 'Regular', 3: 'Guanwu Serif Regular 0.1', 4: 'Guanwu Serif Regular', 6: 'GuanwuSerif-Regular', 16: 'Guanwu Serif', 17: 'Regular'}
for name in font['name'].names:
    if name.nameID in names:
        name.string = names[name.nameID].encode(name.getEncoding())
text = ''.join(chr(c) for c in range(32, 127)) + '观物美有其来处研究制作检验项目册，。；：！？（）《》“”‘’—·→×℃…年月日分钟游戏应用'
for folder in ['src', 'docs']:
    for path in (ROOT / folder).rglob('*'):
        if path.suffix in ['.ts', '.tsx', '.md', '.css']:
            text += path.read_text()
options = subset.Options()
options.name_IDs = ['*']
options.name_legacy = True
options.name_languages = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
output = ROOT / 'src/assets/guanwu-serif.woff2'
font.flavor = 'woff2'
font.save(output)
shutil.copy2('/tmp/guanwu-research/noto-license.txt', ROOT / 'src/assets/FONT-LICENSE.txt')
(ROOT / 'src/assets/font-provenance.json').write_text(json.dumps({
    'family': 'Guanwu Serif', 'source_family': 'Noto Serif SC', 'source_url': 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf',
    'source_sha256': EXPECTED, 'license': 'SIL OFL 1.1', 'modifications': 'Instantiate wght=400, subset to project text and rename family.',
    'output_sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'output_bytes': output.stat().st_size,
}, indent=2) + '\n')
print(f'{output.name}: {output.stat().st_size:,} bytes; original verified, derivative renamed, OFL retained.')
