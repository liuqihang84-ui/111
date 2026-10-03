"""Assemble tested standalone builds with controls, notices and SHA-256 hashes."""
from __future__ import annotations

from pathlib import Path
import hashlib
import json
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
BUILDS = ROOT / "builds"
VERSION_MATCH = re.search(r'^config/version="([0-9][0-9a-z.\-]*)"$', (ROOT / "project.godot").read_text(), re.MULTILINE)
if VERSION_MATCH is None:
    raise ValueError("Project version is missing or invalid")
VERSION = VERSION_MATCH.group(1)
NOTICES = {
    "GODOT-LICENSE.txt": ROOT / "docs/licenses/godot-license.txt",
    "GODOT-COPYRIGHT.txt": ROOT / "docs/licenses/godot-copyright.txt",
    "FONT-LICENSE.txt": ROOT / "assets/fonts/LICENSE-Noto.txt",
    "ART-NOTICE.md": ROOT / "docs/licenses/art-licenses.md",
    "AUDIO-NOTICE.md": ROOT / "docs/licenses/audio-licenses.md",
    "ENVIRONMENT-ART-NOTICE.md": ROOT / "assets/environments/README.md",
    "ENVIRONMENT-TEXTURES-NOTICE.md": ROOT / "tools/environment-art-provenance.md",
    "HERO-ART-NOTICE.md": ROOT / "assets/art/characters/lynn_hd/README.md",
}
README = """Lumenfall · 暮光之森 — 全流程开发测试版

Windows：解压整个目录，双击 lumenfall.exe。
Linux：解压整个目录，运行 ./lumenfall.x86_64；需要图形桌面与 OpenGL 3.3 驱动。
游戏数据文件 lumenfall.pck 必须与可执行文件放在同一目录。
独立版无需安装 Godot。存档保存在系统用户数据目录，不在安装目录。

WASD / 方向键：移动；J / 鼠标左键：光刃；空格：翻滚。
E：交互 / 推进对白；L：提灯；Q：光脉冲；F：护罩；H：恢复药。
Tab：日记；M：地图；I：行囊；Esc：暂停 / 返回；Enter：确认。
光脉冲、透镜、回响灯芯和护罩随主线获得。
灯具要提灯点亮；获得透镜后，提灯靠近以看见雾中的隐线。
机关可暂停思考，退出会保留操作状态。已完成机关和奖励永久保存。
篝火恢复生命与灯火、保存旅程，也可更换两枚护符。
商店可购买药品和护符。三档难度可在设置中切换。

包含五章十五张地图、五名Boss、三十个机关、八条支线与完整结局。
这是可从开场游玩至结局的开发测试版。当前主线暂估90–200分钟，
全可选暂估120–250分钟，均非真人实测，仍低于主线五小时以上的目标。
内容需要继续扩充，并以首次玩家实际通关计时验收。
Windows包在Linux环境导出，尚未在Windows设备上实际运行。
Windows开发版未做代码签名，新下载的程序可能显示SmartScreen未识别应用提示。
项目的源代码、运行检查与制作实况见仓库 README 和 docs/production-design.md。
仓库：https://github.com/liuqihang84-ui/111（当前开发文件的远端上传状态见交付说明）。

Please keep the included Godot and font license notices with redistribution.
"""


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def main() -> None:
    manifest = {"version": VERSION, "godot": "4.6.3", "packages": []}
    for platform, executable in [("linux", "lumenfall.x86_64"), ("windows", "lumenfall.exe")]:
        directory = BUILDS / platform
        files = [directory / executable, directory / "lumenfall.pck"]
        for path in [*files, *NOTICES.values()]:
            if not path.is_file() or path.stat().st_size == 0:
                raise FileNotFoundError(f"Missing release input: {path}")
        output = BUILDS / f"lumenfall-{VERSION}-{platform}-x86_64.zip"
        prefix = f"Lumenfall-{platform}"
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            for path in files:
                archive.write(path, f"{prefix}/{path.name}")
            archive.writestr(f"{prefix}/README.txt", README)
            for name, path in NOTICES.items():
                archive.write(path, f"{prefix}/licenses/{name}")
        with zipfile.ZipFile(output) as archive:
            if archive.testzip() is not None:
                raise RuntimeError(f"Archive checksum validation failed: {output}")
        entry = {"platform": platform, "file": output.name, "bytes": output.stat().st_size,
                 "sha256": digest(output), "payload": {path.name: digest(path) for path in files}}
        manifest["packages"].append(entry)
        print(f"Packaged {output.name}: {entry['bytes']:,} bytes; zip CRC checked")
    listing = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT)
    names = sorted({name.decode("utf-8") for name in listing.split(b"\0") if name})
    source = BUILDS / f"lumenfall-{VERSION}-source.zip"
    source_count = 0
    with zipfile.ZipFile(source, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name in names:
            path = ROOT / name
            if path.is_file():
                if not path.resolve().is_relative_to(ROOT):
                    raise ValueError(f"Source path escapes project: {name}")
                archive.write(path, f"Lumenfall-source/{name}")
                source_count += 1
    with zipfile.ZipFile(source) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("Source archive checksum validation failed")
    manifest["packages"].append({"platform": "source", "file": source.name,
        "bytes": source.stat().st_size, "sha256": digest(source), "files": source_count})
    print(f"Packaged {source.name}: {source_count} project files; zip CRC checked")
    (BUILDS / "release-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
