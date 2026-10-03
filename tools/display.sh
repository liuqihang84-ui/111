#!/usr/bin/env bash
# Source this script to prepare the cloud machine's optional virtual display.
set -euo pipefail
lumenfall_project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
lumenfall_runtime_dir="${LUMENFALL_RUNTIME_DIR:-/workspace/.godot-environment}"
mkdir -p "$lumenfall_runtime_dir/tools"
if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
  export DISPLAY="${LUMENFALL_DISPLAY:-:93}"
  export LIBGL_ALWAYS_SOFTWARE=1
  export LUMENFALL_VIRTUAL_DISPLAY=1
  if ! xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
    nohup /usr/lib/xorg/Xorg "$DISPLAY" \
      -config "$lumenfall_project_dir/tools/xorg-dummy.conf" \
      -logfile "$lumenfall_runtime_dir/tools/xorg-dummy.log" \
      -nolisten tcp -noreset \
      >"$lumenfall_runtime_dir/tools/xorg-console.log" 2>&1 &
    echo "$!" >"$lumenfall_runtime_dir/tools/xorg.pid"
    for lumenfall_attempt in {1..50}; do
      if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then break; fi
      sleep 0.1
    done
    if ! xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
      echo "Virtual display failed; see $lumenfall_runtime_dir/tools/xorg-console.log" >&2
      return 1 2>/dev/null || exit 1
    fi
  fi
fi
echo "Graphical display prepared: ${DISPLAY:-Wayland}" >&2
