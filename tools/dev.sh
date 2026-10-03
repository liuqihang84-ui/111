#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
runtime_dir="${LUMENFALL_RUNTIME_DIR:-/workspace/.godot-environment}"
export XDG_CACHE_HOME="$runtime_dir/cache"
export XDG_DATA_HOME="$runtime_dir/data"
export XDG_CONFIG_HOME="$runtime_dir/config"
mkdir -p "$XDG_CACHE_HOME" "$XDG_DATA_HOME" "$XDG_CONFIG_HOME" "$project_dir/builds"
touch "$project_dir/builds/.gdignore"
godot_bin="${GODOT_BIN:-godot}"
if [[ -z "${GODOT_BIN:-}" && -x "$runtime_dir/bin/godot" ]]; then
  godot_bin="$runtime_dir/bin/godot"
fi
cd "$project_dir"

run_checked() {
  local log="$project_dir/builds/$1.log"
  shift
  "$godot_bin" "$@" 2>&1 | tee "$log"
  if rg -q 'SCRIPT ERROR:|(^|[[:space:]])ERROR:' "$log"; then
    echo "Godot reported an error; see $log" >&2
    return 1
  fi
}

case "${1:-help}" in
  import) run_checked import --headless --path "$project_dir" --editor --import ;;
  test)
    run_checked campaign-tests --headless --path "$project_dir" --script res://tests/test_campaign.gd
    run_checked progress-tests --headless --path "$project_dir" --script res://tests/test_progress.gd
    if [[ -f tests/test_content.gd ]]; then
      run_checked content-tests --headless --path "$project_dir" --script res://tests/test_content.gd
    fi
    if [[ -f tests/test_puzzles.gd ]]; then
      run_checked puzzle-tests --headless --path "$project_dir" --script res://tests/test_puzzles.gd
    fi
    if [[ -f tests/test_world.gd ]]; then
      run_checked world-tests --headless --path "$project_dir" --script res://tests/test_world.gd
    fi
    run_checked scene-tests --headless --path "$project_dir" --script res://tests/test_scene.gd
    ;;
  build)
    run_checked import --headless --path "$project_dir" --editor --import
    run_checked build --headless --path "$project_dir" --export-pack Linux builds/lumenfall.pck
    test -s builds/lumenfall.pck
    ;;
  release)
    mkdir -p builds/linux builds/windows
    run_checked import --headless --path "$project_dir" --editor --import
    run_checked linux-release --headless --path "$project_dir" --export-release Linux builds/linux/lumenfall.x86_64
    run_checked windows-release --headless --path "$project_dir" --export-release Windows builds/windows/lumenfall.exe
    test -s builds/linux/lumenfall.x86_64
    test -s builds/linux/lumenfall.pck
    test -s builds/windows/lumenfall.exe
    test -s builds/windows/lumenfall.pck
    ;;
  smoke) run_checked smoke --headless --path "$project_dir" --fixed-fps 60 --quit-after 120 ;;
  pack-smoke)
    test -s builds/lumenfall.pck
    run_checked pack-smoke --headless --main-pack "$project_dir/builds/lumenfall.pck" --fixed-fps 60 --quit-after 120
    ;;
  release-smoke)
    test -x builds/linux/lumenfall.x86_64
    test -s builds/linux/lumenfall.pck
    log="$project_dir/builds/release-smoke.log"
    "$project_dir/builds/linux/lumenfall.x86_64" --headless --audio-driver Dummy --fixed-fps 60 --quit-after 120 2>&1 | tee "$log"
    ! rg -q 'SCRIPT ERROR:|(^|[[:space:]])ERROR:' "$log"
    ;;
  release-acceptance)
    test -x builds/linux/lumenfall.x86_64
    test -s builds/linux/lumenfall.pck
    acceptance_dir="$(mktemp -d /tmp/lumenfall-release-check.XXXXXX)"
    trap 'rm -rf -- "$acceptance_dir"' EXIT
    cp "$project_dir/tests/export_acceptance.gd" "$acceptance_dir/acceptance.gd"
    log="$project_dir/builds/release-acceptance.log"
    cd "$acceptance_dir"
    "$godot_bin" --headless --audio-driver Dummy --path "$acceptance_dir" \
      --main-pack "$project_dir/builds/linux/lumenfall.pck" --script "$acceptance_dir/acceptance.gd" 2>&1 | tee "$log"
    ! rg -q 'SCRIPT ERROR:|(^|[[:space:]])ERROR:' "$log"
    rg -q 'ExportAcceptance: 14/14 checks passed' "$log"
    ;;
  capture)
    source "$project_dir/tools/display.sh"
    run_checked title-render --path "$project_dir" --audio-driver Dummy --resolution 1280x720 --script res://tests/capture_scene.gd
    run_checked gameplay-render --path "$project_dir" --audio-driver Dummy --resolution 1280x720 --script res://tests/capture_scene.gd -- --playing
    ;;
  run|editor)
    if [[ "$(uname -s)" == Linux && -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
      source "$project_dir/tools/display.sh"
    fi
    if [[ "$1" == editor ]]; then
      exec "$godot_bin" --editor --path "$project_dir"
    fi
    if [[ "${LUMENFALL_VIRTUAL_DISPLAY:-0}" == 1 ]]; then
      exec "$godot_bin" --path "$project_dir" --audio-driver Dummy
    fi
    exec "$godot_bin" --path "$project_dir"
    ;;
  *) echo 'Usage: bash tools/dev.sh {import|test|build|release|smoke|pack-smoke|release-smoke|release-acceptance|capture|run|editor}' ;;
esac
