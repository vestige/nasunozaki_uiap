#!/usr/bin/env python3
"""Package the Arduino sketch for download from the static site."""

from pathlib import Path
import hashlib
import json
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "firmware" / "workshop-runtime"
DESTINATION = ROOT / "web" / "public" / "workshop-runtime.zip"
PUBLIC = ROOT / "web" / "public"


def main() -> None:
    build_info = json.loads((SOURCE / "build-info.json").read_text())
    for name, key in (("workshop-runtime.ino", "source_sha256"), ("workshop-runtime.bin", "binary_sha256")):
        actual = hashlib.sha256((SOURCE / name).read_bytes()).hexdigest()
        if actual != build_info[key]:
            raise ValueError(f"{name} does not match build-info.json; rebuild the runtime")
    (PUBLIC / "workshop-runtime.bin").write_bytes((SOURCE / "workshop-runtime.bin").read_bytes())
    (PUBLIC / "workshop-runtime.json").write_text(json.dumps(build_info, ensure_ascii=False, indent=2) + "\n")
    with ZipFile(DESTINATION, "w") as archive:
        files = (
            (SOURCE / "README.md", "workshop-runtime/README.md"),
            (SOURCE / "workshop-runtime.ino", "workshop-runtime/workshop-runtime.ino"),
            (SOURCE / "workshop-runtime.bin", "workshop-runtime/workshop-runtime.bin"),
            (SOURCE / "build-info.json", "workshop-runtime/build-info.json"),
        )
        for source, name in files:
            entry = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = ZIP_DEFLATED
            entry.external_attr = 0o644 << 16
            archive.writestr(entry, source.read_bytes())
    print(DESTINATION)


if __name__ == "__main__":
    main()
