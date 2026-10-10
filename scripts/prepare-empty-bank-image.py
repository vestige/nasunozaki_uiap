"""Create a test-only full Flash image; never upload or replace release artifacts."""
from pathlib import Path
import hashlib

root = Path(__file__).resolve().parents[1]
source = root / ".build/workshop-runtime/workshop-runtime.ino.bin"
destination = root / ".build/workshop-runtime/empty-banks-test.bin"
firmware = source.read_bytes()
# Pin this destructive-test image to the exact firmware already verified on hardware.
expected = "2a5ba501ce39967fb022a10023b8b322c8c7aec35e8a456b02353b8176313d0f"
if len(firmware) != 12956 or hashlib.sha256(firmware).hexdigest() != expected:
    raise SystemExit("Unexpected firmware: refusing to prepare an erase-test image")
image = firmware + bytes([0xff]) * (16384 - len(firmware))
assert image[:len(firmware)] == firmware
assert image[0x3800:0x4000] == bytes([0xff]) * 2048
destination.write_bytes(image)
print(destination)
print(f"size={len(image)}, sha256={hashlib.sha256(image).hexdigest()}")
