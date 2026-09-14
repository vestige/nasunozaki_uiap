import os
import re
import subprocess
import tempfile
import time
from dataclasses import asdict, dataclass
from pathlib import Path

from validation import BuildProject


ARDUINO_CLI = os.getenv("ARDUINO_CLI", "arduino-cli")
ARDUINO_CONFIG = os.getenv("ARDUINO_CONFIG", "/etc/arduino-cli/arduino-cli.yaml")
FQBN = "UIAP_HID:ch32v:CH32V003"
BOARD_OPTIONS = "pnum=V14,upload_method=uiapflash,clock=48MHz_HSI,usb=webhid,pwm=default,xserial=none,opt=oslto,dbg=none,rtlib=none"
BUILD_TIMEOUT_SECONDS = 30
USAGE = re.compile(
    r"Sketch uses (?P<flash>\d+) bytes .* Maximum is (?P<flash_limit>\d+) bytes\."
    r".*Global variables use (?P<ram>\d+) bytes .* Maximum is (?P<ram_limit>\d+) bytes\.",
    re.DOTALL,
)
DIAGNOSTIC = re.compile(
    r"^(?P<file>[^:\n]+):(?P<line>\d+):(?P<column>\d+):\s+"
    r"(?P<severity>fatal error|error|warning|note):\s+(?P<message>.+)$",
    re.MULTILINE,
)


@dataclass(frozen=True)
class BuildUsage:
    flashBytes: int
    flashLimitBytes: int
    ramBytes: int
    ramLimitBytes: int


def run_build(project: BuildProject) -> dict:
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="uiap-build-") as temp:
        root = Path(temp)
        sketch = root / "sketch"
        output = root / "output"
        sketch.mkdir(mode=0o700)
        output.mkdir(mode=0o700)
        for source in project.files:
            (sketch / source.name).write_text(source.content, encoding="utf-8")

        command = [
            ARDUINO_CLI,
            "compile",
            "--config-file",
            ARDUINO_CONFIG,
            "--fqbn",
            FQBN,
            "--board-options",
            BOARD_OPTIONS,
            "--clean",
            "--output-dir",
            str(output),
            str(sketch),
        ]
        try:
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=BUILD_TIMEOUT_SECONDS,
                check=False,
                env={"PATH": os.getenv("PATH", "")},
            )
        except subprocess.TimeoutExpired:
            return _response("timeout", started, diagnostics=[{
                "severity": "error",
                "message": "ビルドが30秒以内に完了しませんでした。",
            }])

        log = _sanitize_log(f"{completed.stdout}\n{completed.stderr}", root)
        usage = parse_usage(log)
        diagnostics = parse_diagnostics(log)
        status = "success" if completed.returncode == 0 and usage else "failure"
        if completed.returncode == 0 and usage is None:
            diagnostics.append({
                "severity": "error",
                "message": "ビルド容量を解析できませんでした。",
            })
        return _response(status, started, usage=usage, diagnostics=diagnostics)


def parse_usage(log: str) -> BuildUsage | None:
    match = USAGE.search(log)
    if not match:
        return None
    return BuildUsage(
        flashBytes=int(match.group("flash")),
        flashLimitBytes=int(match.group("flash_limit")),
        ramBytes=int(match.group("ram")),
        ramLimitBytes=int(match.group("ram_limit")),
    )


def parse_diagnostics(log: str) -> list[dict]:
    return [
        {
            "severity": match.group("severity"),
            "message": match.group("message"),
            "file": Path(match.group("file")).name,
            "line": int(match.group("line")),
            "column": int(match.group("column")),
        }
        for match in DIAGNOSTIC.finditer(log)
    ]


def _sanitize_log(log: str, root: Path) -> str:
    return log.replace(str(root), "<build>")


def _response(status: str, started: float, usage=None, diagnostics=None) -> dict:
    return {
        "responseVersion": 1,
        "status": status,
        "toolchain": {
            "core": "UIAPduino HID 1.2.14",
            "compiler": "xpack-riscv-none-elf-gcc 14.2.0-2",
            "profile": "uiapduino-ch32v003-v1",
        },
        "usage": asdict(usage) if usage else None,
        "diagnostics": diagnostics or [],
        "durationMs": round((time.monotonic() - started) * 1000),
    }
