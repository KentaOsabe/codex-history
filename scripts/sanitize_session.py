import argparse
import hashlib
import json
from pathlib import Path
from typing import Any, Dict


def _next_counter(counters: Dict[str, int], key: str) -> int:
    counters[key] = counters.get(key, 0) + 1
    return counters[key]


def _sanitize_content_item(item: Any, counters: Dict[str, int]) -> Any:
    if not isinstance(item, dict):
        return item
    result = dict(item)
    content_type = result.get("type", "")

    if "text" in content_type and "text" in result:
        idx = _next_counter(counters, "text")
        result["text"] = f"<dummy-text-{idx}>"

    if "image" in content_type:
        idx = _next_counter(counters, "image")
        result.pop("image_base64", None)
        result["image_url"] = result.get("image_url", f"data:image/png;base64,<redacted-{idx}>")

    return result


def _sanitize_json_structure(data: Any, counters: Dict[str, int]) -> Any:
    if isinstance(data, dict):
        return {k: _sanitize_json_structure(v, counters) for k, v in data.items()}
    if isinstance(data, list):
        return [_sanitize_json_structure(v, counters) for v in data]
    if isinstance(data, str):
        idx = _next_counter(counters, "string")
        return f"<dummy-string-{idx}>"
    return data


def _maybe_sanitize_json_string(value: str, counters: Dict[str, int]) -> str:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return value
    sanitized = _sanitize_json_structure(parsed, counters)
    return json.dumps(sanitized, ensure_ascii=False)


def sanitize_payload(payload: Any, counters: Dict[str, int]) -> Any:
    if isinstance(payload, dict):
        result = {}
        for key, value in payload.items():
            if key == "content" and isinstance(value, list):
                result[key] = [_sanitize_content_item(item, counters) for item in value]
            elif key in {"arguments", "output", "input"} and isinstance(value, str):
                result[key] = _maybe_sanitize_json_string(value, counters)
            elif key == "encrypted_content" and isinstance(value, str):
                digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
                result[key] = f"sha256:{digest}"
            elif isinstance(value, (dict, list)):
                result[key] = sanitize_payload(value, counters)
            else:
                result[key] = value
        return result
    if isinstance(payload, list):
        return [sanitize_payload(item, counters) for item in payload]
    return payload


def sanitize_event(event: Any, counters: Dict[str, int]) -> Any:
    if not isinstance(event, dict):
        return event
    result = dict(event)
    payload = result.get("payload")
    if payload is not None:
        result["payload"] = sanitize_payload(payload, counters)
    return result


def process_file(input_path: Path, output_path: Path) -> None:
    counters: Dict[str, int] = {}
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with input_path.open("r", encoding="utf-8") as src, output_path.open(
        "w", encoding="utf-8"
    ) as dst:
        for line in src:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            sanitized = sanitize_event(event, counters)
            dst.write(json.dumps(sanitized, ensure_ascii=False) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sanitize Codex JSONL session for safe sharing"
    )
    parser.add_argument("input", type=Path, help="Source JSONL path")
    parser.add_argument("output", type=Path, help="Sanitized JSONL path")
    args = parser.parse_args()
    process_file(args.input, args.output)


if __name__ == "__main__":
    main()
