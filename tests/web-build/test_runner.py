import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


SERVICE_SRC = Path(__file__).parents[2] / "services" / "web-build" / "src"
sys.path.insert(0, str(SERVICE_SRC))

from runner import parse_diagnostics, parse_usage, run_build  # noqa: E402
from validation import BuildProject, SourceFile  # noqa: E402


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

    @patch("runner.subprocess.run")
    def test_uses_primary_ino_name_as_sketch_directory(self, run):
        run.return_value = SimpleNamespace(
            returncode=0,
            stdout=(
                "Sketch uses 2728 bytes (16%) of program storage space. Maximum is 16384 bytes.\n"
                "Global variables use 156 bytes (7%) of dynamic memory, leaving 1892 bytes for local variables. Maximum is 2048 bytes."
            ),
            stderr="",
        )

        result = run_build(BuildProject("sample", (SourceFile("blink.ino", "void setup() {}"),)))

        command = run.call_args.args[0]
        self.assertEqual(Path(command[-1]).name, "blink")
        self.assertEqual(result["status"], "success")
        self.assertNotIn("AWS_ACCESS_KEY_ID", run.call_args.kwargs["env"])


if __name__ == "__main__":
    unittest.main()
