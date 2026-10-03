#!/usr/bin/env python3
"""Exercise the exported Linux executable with real X11 keyboard input.

Only this helper's child process is stopped. Each run gets a fresh XDG profile.
No Godot editor, project path, script or replacement PCK is passed to the game.
"""
import ctypes as C
import ctypes.util
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

from PIL import ImageGrab

ROOT = Path(__file__).resolve().parents[1]
DISPLAY = os.environ.get("DISPLAY", ":93")
OUTPUT = ROOT / "builds"
BINARY = OUTPUT / "linux/lumenfall.x86_64"


class WindowAttributes(C.Structure):
    _fields_ = [("x", C.c_int), ("y", C.c_int), ("width", C.c_int), ("height", C.c_int), ("border_width", C.c_int), ("depth", C.c_int), ("visual", C.c_void_p), ("root", C.c_ulong), ("class_", C.c_int), ("bit_gravity", C.c_int), ("win_gravity", C.c_int), ("backing_store", C.c_int), ("backing_planes", C.c_ulong), ("backing_pixel", C.c_ulong), ("save_under", C.c_int), ("colormap", C.c_ulong), ("map_installed", C.c_int), ("map_state", C.c_int), ("all_event_masks", C.c_long), ("your_event_mask", C.c_long), ("do_not_propagate_mask", C.c_long), ("override_redirect", C.c_int), ("screen", C.c_void_p)]


class X11:
    def __init__(self):
        self.x = C.CDLL(ctypes.util.find_library("X11"))
        self.xt = C.CDLL(ctypes.util.find_library("Xtst"))
        self.x.XOpenDisplay.argtypes = [C.c_char_p]
        self.x.XOpenDisplay.restype = C.c_void_p
        self.x.XDefaultRootWindow.argtypes = [C.c_void_p]
        self.x.XDefaultRootWindow.restype = C.c_ulong
        self.x.XInternAtom.argtypes = [C.c_void_p, C.c_char_p, C.c_int]
        self.x.XInternAtom.restype = C.c_ulong
        self.x.XQueryTree.argtypes = [C.c_void_p, C.c_ulong, C.POINTER(C.c_ulong), C.POINTER(C.c_ulong), C.POINTER(C.POINTER(C.c_ulong)), C.POINTER(C.c_uint)]
        self.x.XGetWindowAttributes.argtypes = [C.c_void_p, C.c_ulong, C.POINTER(WindowAttributes)]
        self.x.XGetWindowProperty.argtypes = [C.c_void_p, C.c_ulong, C.c_ulong, C.c_long, C.c_long, C.c_int, C.c_ulong, C.POINTER(C.c_ulong), C.POINTER(C.c_int), C.POINTER(C.c_ulong), C.POINTER(C.c_ulong), C.POINTER(C.POINTER(C.c_ubyte))]
        self.x.XFree.argtypes = [C.c_void_p]
        self.x.XRaiseWindow.argtypes = [C.c_void_p, C.c_ulong]
        self.x.XSetInputFocus.argtypes = [C.c_void_p, C.c_ulong, C.c_int, C.c_ulong]
        self.x.XStringToKeysym.argtypes = [C.c_char_p]
        self.x.XStringToKeysym.restype = C.c_ulong
        self.x.XKeysymToKeycode.argtypes = [C.c_void_p, C.c_ulong]
        self.x.XKeysymToKeycode.restype = C.c_uint
        self.x.XFlush.argtypes = [C.c_void_p]
        self.x.XCloseDisplay.argtypes = [C.c_void_p]
        self.xt.XTestFakeKeyEvent.argtypes = [C.c_void_p, C.c_uint, C.c_int, C.c_ulong]
        self.xt.XTestFakeMotionEvent.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_int, C.c_ulong]
        self.xt.XTestFakeButtonEvent.argtypes = [C.c_void_p, C.c_uint, C.c_int, C.c_ulong]
        self.d = self.x.XOpenDisplay(DISPLAY.encode())
        if not self.d:
            raise RuntimeError("Cannot open X11 display " + DISPLAY)
        self.root = self.x.XDefaultRootWindow(self.d)
        self.pid_atom = self.x.XInternAtom(self.d, b"_NET_WM_PID", 0)

    def children(self, window):
        root, parent, count = C.c_ulong(), C.c_ulong(), C.c_uint()
        children = C.POINTER(C.c_ulong)()
        if not self.x.XQueryTree(self.d, window, C.byref(root), C.byref(parent), C.byref(children), C.byref(count)):
            return []
        result = [children[i] for i in range(count.value)]
        if children:
            self.x.XFree(children)
        return result

    def pid(self, window):
        kind, count, after, form = C.c_ulong(), C.c_ulong(), C.c_ulong(), C.c_int()
        data = C.POINTER(C.c_ubyte)()
        result = self.x.XGetWindowProperty(self.d, window, self.pid_atom, 0, 1, 0, 0, C.byref(kind), C.byref(form), C.byref(count), C.byref(after), C.byref(data))
        value = None
        if result == 0 and data and count.value and form.value == 32:
            value = C.cast(data, C.POINTER(C.c_ulong))[0]
        if data:
            self.x.XFree(data)
        return value

    def own_window(self, pid):
        queue = self.children(self.root)
        for _ in range(3):
            later = []
            for window in queue:
                if self.pid(window) == pid:
                    attrs = WindowAttributes()
                    if self.x.XGetWindowAttributes(self.d, window, C.byref(attrs)) and attrs.map_state == 2:
                        return window
                later.extend(self.children(window))
            queue = later
        return None

    def focus(self, window):
        self.x.XRaiseWindow(self.d, window)
        self.x.XSetInputFocus(self.d, window, 2, 0)
        self.x.XFlush(self.d)

    def key(self, name, duration=0.07, delay=0.25):
        code = self.x.XKeysymToKeycode(self.d, self.x.XStringToKeysym(name.encode()))
        if not code:
            raise RuntimeError("Unknown X11 key " + name)
        self.xt.XTestFakeKeyEvent(self.d, code, 1, 0)
        self.x.XFlush(self.d)
        time.sleep(duration)
        self.xt.XTestFakeKeyEvent(self.d, code, 0, 0)
        self.x.XFlush(self.d)
        time.sleep(delay)

    def click(self, x, y, delay=0.6):
        self.xt.XTestFakeMotionEvent(self.d, -1, x, y, 0)
        self.x.XFlush(self.d)
        time.sleep(0.1)
        self.xt.XTestFakeButtonEvent(self.d, 1, 1, 0)
        self.x.XFlush(self.d)
        time.sleep(0.08)
        self.xt.XTestFakeButtonEvent(self.d, 1, 0, 0)
        self.x.XFlush(self.d)
        time.sleep(delay)


def main():
    OUTPUT.mkdir(exist_ok=True)
    profile = Path(tempfile.mkdtemp(prefix="lumenfall-native-", dir="/tmp"))
    env = os.environ.copy()
    env["DISPLAY"] = DISPLAY
    for var, subdir in [("XDG_DATA_HOME", "data"), ("XDG_CONFIG_HOME", "config"), ("XDG_CACHE_HOME", "cache"), ("XDG_RUNTIME_DIR", "runtime")]:
        path = profile / subdir
        path.mkdir(mode=0o700)
        env[var] = str(path)
    report = {"binary": str(BINARY), "argv": [str(BINARY)], "cwd": str(profile), "profile": str(profile), "display": DISPLAY, "started_at_utc": datetime.now(timezone.utc).isoformat(), "sha256": {str(path): hashlib.sha256(path.read_bytes()).hexdigest() for path in [BINARY, BINARY.with_suffix(".pck")]}, "checks": [], "screenshots": [], "save_path": None}
    process = None
    x11 = None

    def check(name, condition, evidence=None):
        row = {"name": name, "passed": bool(condition)}
        if evidence is not None:
            row["evidence"] = evidence
        report["checks"].append(row)
        print(json.dumps(row, ensure_ascii=False), flush=True)
        if not condition:
            raise RuntimeError("Native check failed: " + name)

    def capture(name):
        path = OUTPUT / name
        ImageGrab.grab(xdisplay=DISPLAY).save(path)
        report["screenshots"].append(str(path))
        return str(path)

    def read_slot():
        slots = list((profile / "data").rglob("slot_1.json"))
        if not slots:
            return None
        report["save_path"] = str(slots[0])
        return json.loads(slots[0].read_text())

    try:
        with (OUTPUT / "native-gui.log").open("w") as log:
            process = subprocess.Popen([str(BINARY)], cwd=profile, env=env, stdout=log, stderr=subprocess.STDOUT)
            report["pid"] = process.pid
            x11 = X11()
            window = None
            for _ in range(600):
                if process.poll() is not None:
                    break
                window = x11.own_window(process.pid)
                if window:
                    break
                time.sleep(0.1)
            check("native_window_owned_by_child", window is not None and process.poll() is None, {"pid": process.pid, "window": window})
            time.sleep(8.0)
            # Godot sets _NET_WM_PID before mapping the window. Focusing that
            # early causes X11 BadMatch, so allow startup to finish first.
            x11.focus(window)
            time.sleep(0.4)
            capture("native-title.png")
            x11.key("Return", delay=0.7)
            capture("native-slots.png")
            x11.key("Return", delay=1.0)
            for _ in range(12):
                x11.key("e", delay=0.15)
            capture("native-play.png")
            initial = read_slot()
            check("native_new_game_saved_slot_1", initial is not None and initial.get("campaign_version") == 3 and initial.get("map_id") == 0)
            check("native_dialogue_finished", initial["flags"].get("scene:intro:0", False), initial["flags"])
            x11.key("d", duration=1.5, delay=0.25)
            x11.key("Escape", delay=0.5)
            capture("native-pause.png")
            for _ in range(4):
                x11.key("Tab", delay=0.1)
            x11.key("Return", delay=0.6)
            moved = read_slot()
            check("native_keyboard_move_and_pause_save", moved is not None and moved["position"] != initial["position"], {"before": initial["position"], "after": moved.get("position") if moved else None})
            time.sleep(0.8)
            x11.key("Return", delay=0.4)
            paused = read_slot()
            check("native_pause_stops_gameplay_time", paused["elapsed"] == moved["elapsed"] and paused["saved_at"] > moved["saved_at"], {"first": moved["elapsed"], "second": paused["elapsed"], "first_saved_at": moved["saved_at"], "second_saved_at": paused["saved_at"]})
            # The save button remains focused. Two tabs reach Return to title.
            x11.key("Tab", delay=0.1)
            x11.key("Tab", delay=0.1)
            x11.key("Return", delay=0.4)
            x11.key("Tab", delay=0.1)
            x11.key("Return", delay=0.6)
            capture("native-return-title.png")
            capture("native-title.png")
            # Use the actual Continue button, then confirm slot one by keyboard.
            x11.click(640, 400, delay=0.7)
            capture("native-continue-slots.png")
            x11.key("Return", delay=0.7)
            x11.key("d", duration=0.8, delay=0.2)
            x11.key("Escape", delay=0.4)
            for _ in range(4):
                x11.key("Tab", delay=0.1)
            x11.key("Return", delay=0.4)
            reloaded = read_slot()
            check("native_title_continue_load_and_move", reloaded["position"] != moved["position"] and reloaded["elapsed"] > moved["elapsed"], {"saved": moved["position"], "after_continue": reloaded["position"]})
            capture("native-reloaded.png")
            # Finish through the game's actual Exit button. The finally block
            # only terminates this child if UI exit fails or an earlier check fails.
            x11.key("Tab", delay=0.1)
            x11.key("Tab", delay=0.1)
            x11.key("Return", delay=0.4)
            x11.key("Tab", delay=0.1)
            x11.key("Return", delay=0.6)
            x11.click(640, 540, delay=0.1)
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                pass
            check("native_ui_quit_exits_cleanly", process.poll() == 0, {"exit_code": process.poll()})
            report["passed"] = True
    except Exception as exc:
        report["passed"] = False
        report["error"] = str(exc)
        if x11 is not None:
            try:
                capture("native-failure.png")
            except Exception:
                pass
        print(str(exc), flush=True)
    finally:
        if process is not None and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        if process is not None:
            report["child_exit_code"] = process.returncode
        if x11 is not None:
            x11.x.XCloseDisplay(x11.d)
        result = OUTPUT / "native-gui-result.json"
        result.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        print(str(result), flush=True)
    return 0 if report.get("passed") else 1


if __name__ == "__main__":
    raise SystemExit(main())
