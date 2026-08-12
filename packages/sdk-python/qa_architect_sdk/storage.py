"""Persistence layer for telemetry traces."""
from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any

MAX_TRACES = 500
QA_DIR_NAME = ".qa-architect"


class TraceStorage:
    def __init__(self, project_root: str | None = None) -> None:
        root = Path(project_root or os.getcwd())
        self._qa_dir = root / QA_DIR_NAME
        self._traces_file = self._qa_dir / "traces.json"
        self._screenshots_dir = self._qa_dir / "screenshots"
        self._lock = threading.Lock()

    def save_trace(self, trace: dict[str, Any]) -> None:
        self._qa_dir.mkdir(exist_ok=True)

        with self._lock:
            current: dict[str, Any] = {"traces": []}
            if self._traces_file.exists():
                try:
                    current = json.loads(self._traces_file.read_text(encoding="utf-8"))
                except (json.JSONDecodeError, OSError):
                    pass

            current.setdefault("traces", []).append(trace)

            if len(current["traces"]) > MAX_TRACES:
                current["traces"] = current["traces"][-MAX_TRACES:]

            self._traces_file.write_text(
                json.dumps(current, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )

    def save_screenshot(self, trace_id: str, image_bytes: bytes) -> None:
        self._screenshots_dir.mkdir(parents=True, exist_ok=True)
        path = self._screenshots_dir / f"{trace_id}.webp"
        path.write_bytes(image_bytes)
