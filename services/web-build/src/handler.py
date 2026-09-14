import base64
import json
import logging

from runner import run_build
from validation import RequestValidationError, validate_request


LOGGER = logging.getLogger(__name__)
LOGGER.setLevel(logging.INFO)


def lambda_handler(event, _context):
    try:
        raw_body = event.get("body") or ""
        if event.get("isBase64Encoded"):
            raw_bytes = base64.b64decode(raw_body, validate=True)
            raw_body = raw_bytes.decode("utf-8")
        else:
            raw_bytes = raw_body.encode("utf-8")
        payload = json.loads(raw_body)
        project = validate_request(payload, len(raw_bytes))
    except (RequestValidationError, ValueError, UnicodeError, json.JSONDecodeError) as error:
        return _json_response(400, {
            "responseVersion": 1,
            "status": "rejected",
            "message": str(error),
        })

    LOGGER.info("build started files=%d", len(project.files))
    result = run_build(project)
    LOGGER.info("build finished status=%s durationMs=%d", result["status"], result["durationMs"])
    return _json_response(200, result)


def _json_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"content-type": "application/json; charset=utf-8"},
        "body": json.dumps(body, ensure_ascii=False),
    }
