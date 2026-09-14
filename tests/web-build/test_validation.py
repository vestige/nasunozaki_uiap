import sys
import unittest
from pathlib import Path


SERVICE_SRC = Path(__file__).parents[2] / "services" / "web-build" / "src"
sys.path.insert(0, str(SERVICE_SRC))

from validation import RequestValidationError, validate_request  # noqa: E402


def request(content="void setup() {}\nvoid loop() {}\n", name="main.ino"):
    return {
        "requestVersion": 1,
        "project": {
            "name": "blink",
            "files": [{"name": name, "content": content}],
        },
    }


class ValidationTest(unittest.TestCase):
    def test_accepts_minimum_sketch(self):
        project = validate_request(request(), 80)
        self.assertEqual(project.name, "blink")
        self.assertEqual(project.files[0].name, "main.ino")

    def test_rejects_path_traversal(self):
        with self.assertRaisesRegex(RequestValidationError, "file名"):
            validate_request(request(name="../main.ino"), 80)

    def test_rejects_large_file(self):
        with self.assertRaisesRegex(RequestValidationError, "32 KiB"):
            validate_request(request(content="a" * (32 * 1024 + 1)), 80)

    def test_rejects_unapproved_library(self):
        with self.assertRaisesRegex(RequestValidationError, "まだ使用できません"):
            validate_request(request(content="#include <Servo.h>\nvoid setup(){}\nvoid loop(){}"), 80)


if __name__ == "__main__":
    unittest.main()
