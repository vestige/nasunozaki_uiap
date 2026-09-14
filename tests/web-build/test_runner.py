import sys
import unittest
from pathlib import Path


SERVICE_SRC = Path(__file__).parents[2] / "services" / "web-build" / "src"
sys.path.insert(0, str(SERVICE_SRC))

from runner import parse_diagnostics, parse_usage  # noqa: E402


class RunnerParsingTest(unittest.TestCase):
    def test_parses_flash_and_ram_usage(self):
        usage = parse_usage(
            "Sketch uses 4976 bytes (30%) of program storage space. Maximum is 16384 bytes.\n"
            "Global variables use 172 bytes (8%) of dynamic memory, leaving 1876 bytes for local variables. Maximum is 2048 bytes."
        )
        self.assertEqual(usage.flashBytes, 4976)
        self.assertEqual(usage.ramLimitBytes, 2048)

    def test_parses_structured_compiler_error(self):
        diagnostics = parse_diagnostics(
            "<build>/sketch/main.ino:4:7: error: expected ';' before '}' token"
        )
        self.assertEqual(diagnostics, [{
            "severity": "error",
            "message": "expected ';' before '}' token",
            "file": "main.ino",
            "line": 4,
            "column": 7,
        }])


if __name__ == "__main__":
    unittest.main()
