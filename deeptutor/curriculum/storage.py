"""JSON-based storage for the curriculum module.

Follows the pattern from ``deeptutor/learning/storage.py`` and
``deeptutor/book/storage.py`` — per-user JSON files under the workspace dir.
"""

from __future__ import annotations

import json
from pathlib import Path
import threading
import time
import uuid

from deeptutor.curriculum.models import AcademicStructure, Department, Program, Subject
from deeptutor.services.path_service import get_path_service

_lock = threading.Lock()


def _atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + f".tmp.{uuid.uuid4().hex}")
    try:
        tmp.write_text(text, encoding="utf-8")
        tmp.replace(path)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


class CurriculumStore:
    """Persist academic structure as a single JSON file per user."""

    FILENAME = "structure.json"

    def __init__(self, root: Path | None = None) -> None:
        self._root = root or (get_path_service().get_workspace_dir() / "curriculum")
        self._root.mkdir(parents=True, exist_ok=True)

    @property
    def _path(self) -> Path:
        return self._root / self.FILENAME

    def _empty(self) -> AcademicStructure:
        return AcademicStructure(departments=[], orphanPrograms=[])

    def load(self) -> AcademicStructure:
        path = self._path
        if not path.exists():
            return self._empty()
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return self._empty()
        return AcademicStructure.model_validate(data)

    def save(self, structure: AcademicStructure) -> None:
        with _lock:
            _atomic_write_text(self._path, structure.model_dump_json(indent=2))

    def reset(self) -> None:
        with _lock:
            path = self._path
            if path.exists():
                path.unlink()

    def exists(self) -> bool:
        return self._path.exists()


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def _now() -> float:
    return time.time()


__all__ = ["CurriculumStore", "_new_id", "_now"]
