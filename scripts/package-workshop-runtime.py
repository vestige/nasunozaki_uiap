#!/usr/bin/env python3
"""Package the Arduino sketch for download from the static site."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "firmware" / "workshop-runtime"
DESTINATION = ROOT / "web" / "public" / "workshop-runtime.zip"


def main() -> None:
    with ZipFile(DESTINATION, "w") as archive:
        files = (
            (SOURCE / "README.md", "workshop-runtime/README.md"),
            (SOURCE / "workshop-runtime.ino", "workshop-runtime/firmware/workshop-runtime/workshop-runtime.ino"),
            (ROOT / "scripts" / "workshop-runtime.sh", "workshop-runtime/scripts/workshop-runtime.sh"),
        )
        for source, name in files:
            entry = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = ZIP_DEFLATED
            entry.external_attr = (0o755 if name.endswith(".sh") else 0o644) << 16
            archive.writestr(entry, source.read_bytes())
    print(DESTINATION)


if __name__ == "__main__":
    main()
