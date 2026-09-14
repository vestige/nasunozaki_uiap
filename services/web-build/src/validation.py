import re
from dataclasses import dataclass
from typing import Any


MAX_REQUEST_BYTES = 64 * 1024
MAX_SOURCE_BYTES = 64 * 1024
MAX_FILE_BYTES = 32 * 1024
MAX_FILES = 10
ALLOWED_EXTENSIONS = {".ino", ".c", ".cpp", ".h", ".hpp"}
FILE_NAME = re.compile(r"^[A-Za-z0-9_.-]+$")
INCLUDE = re.compile(r'^\s*#\s*include\s*[<"]([^>"]+)[>"]', re.MULTILINE)
ALLOWED_LIBRARY_PREFIXES = {
    "Arduino.h",
    "WebHID.h",
}


class RequestValidationError(ValueError):
    pass


@dataclass(frozen=True)
class SourceFile:
    name: str
    content: str


@dataclass(frozen=True)
class BuildProject:
    name: str
    files: tuple[SourceFile, ...]


def validate_request(payload: Any, request_bytes: int) -> BuildProject:
    if request_bytes > MAX_REQUEST_BYTES:
        raise RequestValidationError("requestは64 KiB以下にしてください。")
    if not isinstance(payload, dict) or payload.get("requestVersion") != 1:
        raise RequestValidationError("requestVersion 1のJSONが必要です。")

    project = payload.get("project")
    if not isinstance(project, dict):
        raise RequestValidationError("projectが必要です。")
    name = project.get("name")
    if not isinstance(name, str) or not FILE_NAME.fullmatch(name):
        raise RequestValidationError("project名に使用できない文字があります。")

    raw_files = project.get("files")
    if not isinstance(raw_files, list) or not 1 <= len(raw_files) <= MAX_FILES:
        raise RequestValidationError("filesは1〜10個にしてください。")

    files: list[SourceFile] = []
    names: set[str] = set()
    source_bytes = 0
    ino_count = 0
    for raw_file in raw_files:
        if not isinstance(raw_file, dict):
            raise RequestValidationError("fileの形式が不正です。")
        file_name = raw_file.get("name")
        content = raw_file.get("content")
        if not isinstance(file_name, str) or not FILE_NAME.fullmatch(file_name):
            raise RequestValidationError("file名に使用できない文字があります。")
        if file_name in names:
            raise RequestValidationError("同じfile名を複数指定できません。")
        extension = _extension(file_name)
        if extension not in ALLOWED_EXTENSIONS:
            raise RequestValidationError(f"{extension or '拡張子なし'}は使用できません。")
        if not isinstance(content, str):
            raise RequestValidationError("fileのcontentは文字列で指定してください。")
        encoded_size = len(content.encode("utf-8"))
        if encoded_size > MAX_FILE_BYTES:
            raise RequestValidationError("1 fileは32 KiB以下にしてください。")
        _validate_includes(content, {item["name"] for item in raw_files if isinstance(item, dict) and isinstance(item.get("name"), str)})
        source_bytes += encoded_size
        ino_count += int(extension == ".ino")
        names.add(file_name)
        files.append(SourceFile(file_name, content))

    if source_bytes > MAX_SOURCE_BYTES:
        raise RequestValidationError("source全体は64 KiB以下にしてください。")
    if ino_count != 1:
        raise RequestValidationError("MVPでは.ino fileを1つ指定してください。")
    return BuildProject(name=name, files=tuple(files))


def _extension(file_name: str) -> str:
    dot = file_name.rfind(".")
    return file_name[dot:].lower() if dot >= 0 else ""


def _validate_includes(content: str, project_files: set[str]) -> None:
    for include in INCLUDE.findall(content):
        if include in ALLOWED_LIBRARY_PREFIXES or include in project_files:
            continue
        raise RequestValidationError(f"library '{include}'はまだ使用できません。")
