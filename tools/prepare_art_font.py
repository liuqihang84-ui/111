#!/usr/bin/env python3
"""Extract the complete Simplified Chinese Noto face, preserving OFL notices.

This prepares a font, not an image. No glyph subsetting or outline editing occurs.
Dependency: fontTools. Source defaults to the installed Debian noto-cjk package.
"""
from pathlib import Path
import argparse
import hashlib
import json

from fontTools.ttLib import TTFont


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source", type=Path,
        default=Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    )
    arguments = parser.parse_args()
    project = Path(__file__).resolve().parent.parent
    destination = project / "assets/fonts/lumenfall-ui-full.otf"
    font = TTFont(arguments.source, fontNumber=2, recalcTimestamp=False)
    original_name = font["name"].getDebugName(6)
    if original_name != "NotoSansCJKsc-Regular":
        raise ValueError(f"Expected SC face at index 2, found {original_name!r}")
    names = {
        1: "Lumenfall UI Full", 2: "Regular",
        3: "Lumenfall UI Full Regular; complete Noto CJK SC derived face",
        4: "Lumenfall UI Full Regular", 6: "LumenfallUIFull-Regular",
        16: "Lumenfall UI Full", 17: "Regular", 18: "Lumenfall UI Full Regular",
    }
    for record in font["name"].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    for identifier, name in names.items():
        font["name"].setName(name, identifier, 3, 1, 0x409)
    cff = font["CFF "].cff
    cff.fontNames[0] = "LumenfallUIFull-Regular"
    cff.topDictIndex[0].FamilyName = "Lumenfall UI Full"
    cff.topDictIndex[0].FullName = "Lumenfall UI Full Regular"
    if "DSIG" in font:
        del font["DSIG"]
    destination.parent.mkdir(parents=True, exist_ok=True)
    font.save(destination)
    cmap = font.getBestCmap()
    missing = set()
    for folder in (project / "scripts", project / "docs"):
        for file in folder.rglob("*"):
            if file.suffix not in (".gd", ".md"):
                continue
            for character in file.read_text(encoding="utf-8"):
                if 0x4E00 <= ord(character) <= 0x9FFF and ord(character) not in cmap:
                    missing.add(character)
    provenance = {
        "source": str(arguments.source),
        "upstream": "https://github.com/notofonts/noto-cjk",
        "face_index": 2,
        "source_postscript_name": original_name,
        "source_sha256": hashlib.sha256(arguments.source.read_bytes()).hexdigest(),
        "output_sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "output": "assets/fonts/lumenfall-ui-full.otf",
        "license": "SIL Open Font License 1.1",
        "modification": "Extracted complete SC face; renamed font name and CFF metadata; no glyph subsetting or outline editing",
        "unicode_codepoints": len(cmap),
        "missing_han_in_current_sources": "".join(sorted(missing)),
    }
    destination.with_suffix(".provenance.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
    print(f"Font prepared: {len(cmap)} codepoints; {len(missing)} missing Han characters")
    if missing:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
