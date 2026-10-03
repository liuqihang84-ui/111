#!/usr/bin/env bash
# Reproduce the pinned Godot tooling. Existing verified files are reused.
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
runtime_dir="${LUMENFALL_RUNTIME_DIR:-/workspace/.godot-environment}"
export XDG_CACHE_HOME="$runtime_dir/cache"
export XDG_DATA_HOME="$runtime_dir/data"
export XDG_CONFIG_HOME="$runtime_dir/config"
mkdir -p "$XDG_CACHE_HOME" "$XDG_DATA_HOME" "$XDG_CONFIG_HOME" "$runtime_dir/downloads" "$runtime_dir/bin"
for dependency in curl python3 rg; do
  command -v "$dependency" >/dev/null || { echo "Missing required tool: $dependency" >&2; exit 1; }
done

download_verified() {
  local filename="$1" expected="$2" target="$runtime_dir/downloads/$1"
  if [[ ! -f "$target" ]] || ! printf '%s  %s\n' "$expected" "$target" | sha512sum --check --status; then
    curl --fail --location --retry 3 --silent --show-error \
      "https://github.com/godotengine/godot-builds/releases/download/4.6.3-stable/$filename" \
      --output "$target.part"
    printf '%s  %s\n' "$expected" "$target.part" | sha512sum --check --status
    mv -- "$target.part" "$target"
  fi
}

godot_bin="${GODOT_BIN:-godot}"
if ! command -v "$godot_bin" >/dev/null || [[ "$("$godot_bin" --headless --version 2>/dev/null)" != 4.6.3.* ]]; then
  godot_zip=Godot_v4.6.3-stable_linux.x86_64.zip
  download_verified "$godot_zip" a035258da32b77f966a5376f9fa29c30a6adde826a85ba918e1605bd1fc9823eba7d85f1dd5e748956bd2ba72827c0025ffa11bb82aec91128c407a2e723c99c
  python3 - "$runtime_dir/downloads/$godot_zip" "$runtime_dir/bin/godot" <<'PY'
import pathlib, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as archive:
    data = archive.read('Godot_v4.6.3-stable_linux.x86_64')
path = pathlib.Path(sys.argv[2])
path.write_bytes(data)
path.chmod(0o755)
PY
  godot_bin="$runtime_dir/bin/godot"
fi
"$godot_bin" --headless --version

templates_dir="$XDG_DATA_HOME/godot/export_templates/4.6.3.stable"
if ! python3 "$project_dir/tools/verify_templates.py" "$templates_dir"; then
  templates_zip=Godot_v4.6.3-stable_export_templates.tpz
  download_verified "$templates_zip" da606b61c10157844f8300172df374472665f95015495cb1a7cd132c40ede404faa96cc1016a4b9662db9909ddea69632c4948b2cd11163438dad4808881fb68
  python3 - "$runtime_dir/downloads/$templates_zip" "$templates_dir" <<'PY'
import pathlib, sys, zipfile
root = pathlib.Path(sys.argv[2])
root.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(sys.argv[1]) as archive:
    for name in ('version.txt', 'linux_debug.x86_64', 'linux_release.x86_64', 'windows_debug_x86_64.exe', 'windows_release_x86_64.exe'):
        path = root / name
        path.write_bytes(archive.read('templates/' + name))
        if name.startswith('linux_'):
            path.chmod(0o755)
PY
  python3 "$project_dir/tools/verify_templates.py" "$templates_dir"
fi
export GODOT_BIN="$godot_bin"
bash "$project_dir/tools/dev.sh" import
echo 'Godot 4.6.3 and Linux/Windows export templates are ready.'
