"""Fingerprints from the officially SHA-512 verified 4.6.3 template archive."""
from pathlib import Path
import hashlib
import sys

EXPECTED = {
    "version.txt": "4855bd38072b77c73c45739cf6a6787d7df790a368b0a437102f352650e6186b",
    "linux_debug.x86_64": "729766fae804184c58ab5e9819ac42f81c6d5337588c3cd7ff66bb52c57cf986",
    "linux_release.x86_64": "2c78919325d7f29fa7607287c7c1eeac367ea4c94e7b8b6f5f4c6b20492f73d0",
    "windows_debug_x86_64.exe": "1207fd8d65c15c0cea7cfbaa6f082772430444a3f6d8e3d589b964e1d21a7379",
    "windows_release_x86_64.exe": "91724f15024a3a545e28ccd83134403d31ce2323a38e51c95e4dfa282f732ab6",
}


def main() -> int:
    root = Path(sys.argv[1])
    for name, expected in EXPECTED.items():
        path = root / name
        if not path.is_file():
            print(f"Missing export template: {name}")
            return 1
        with path.open("rb") as stream:
            actual = hashlib.file_digest(stream, "sha256").hexdigest()
        if actual != expected:
            print(f"Export template verification failed: {name}", file=sys.stderr)
            return 1
    print("Five pinned export template files verified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
