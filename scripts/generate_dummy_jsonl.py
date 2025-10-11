import argparse
import json
from pathlib import Path
from typing import Any, Iterable, Mapping

DEFAULT_TEMPLATE = Path("fixtures/templates/normalized_message.json")
DEFAULT_OUTPUT = Path("fixtures/dummy_sessions/2025-01-01/session-0001.jsonl")


def load_template_entries(template_path: Path) -> Iterable[Mapping[str, Any]]:
    if not template_path.exists():
        raise FileNotFoundError(f"Template file not found: {template_path}")
    with template_path.open("r", encoding="utf-8") as fp:
        data = json.load(fp)
    if not isinstance(data, list):
        raise ValueError("Template must be a JSON array of NormalizedMessage objects")
    return data


def to_event(entry: Mapping[str, Any]) -> Mapping[str, Any]:
    raw = entry.get("raw")
    if not isinstance(raw, Mapping):
        raise ValueError("Each template entry must contain a 'raw' object")

    event_type = raw.get("event_type")
    if not event_type:
        raise ValueError("'raw.event_type' is required")

    payload = raw.get("payload")
    event: dict[str, Any] = {
        "timestamp": entry.get("timestamp"),
        "type": event_type,
    }

    # payload は None をそのまま書かず、dict の場合のみ出力する
    if isinstance(payload, Mapping):
        event["payload"] = payload
    elif payload is not None:
        raise ValueError("'raw.payload' must be an object or null")

    return event


def write_events(events: Iterable[Mapping[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as fp:
        for event in events:
            fp.write(json.dumps(event, ensure_ascii=False) + "\n")


def generate(template_path: Path, output_path: Path) -> None:
    entries = load_template_entries(template_path)
    events = [to_event(entry) for entry in entries]
    write_events(events, output_path)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate dummy Codex session JSONL from NormalizedMessage template"
    )
    parser.add_argument(
        "--template",
        type=Path,
        default=DEFAULT_TEMPLATE,
        help=f"Path to NormalizedMessage template JSON (default: {DEFAULT_TEMPLATE})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output JSONL path (default: {DEFAULT_OUTPUT})",
    )
    args = parser.parse_args()
    generate(args.template, args.output)


if __name__ == "__main__":
    main()
