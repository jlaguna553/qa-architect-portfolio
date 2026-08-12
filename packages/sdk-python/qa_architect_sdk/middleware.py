"""ASGI middleware for passive telemetry capture."""
from __future__ import annotations

import json
import time
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any, Callable

import httpx
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from .storage import TraceStorage

SENSITIVE_HEADERS = frozenset({"authorization", "cookie", "x-api-key", "x-auth-token"})


class QaArchitectMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: Any,
        *,
        project_root: str | None = None,
        server_endpoint: str = "http://localhost:9000",
        write_to_file: bool = True,
        send_to_server: bool = True,
        capture_request_body: bool = True,
        capture_response_body: bool = True,
    ) -> None:
        super().__init__(app)
        self._storage = TraceStorage(project_root)
        self._endpoint = server_endpoint
        self._write_to_file = write_to_file
        self._send_to_server = send_to_server
        self._capture_request_body = capture_request_body
        self._capture_response_body = capture_response_body
        self._http_client = httpx.AsyncClient(timeout=1.0)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        trace_id = str(uuid.uuid4())
        start_time = time.monotonic()

        request_body: Any = None
        if self._capture_request_body:
            try:
                raw = await request.body()
                content_type = request.headers.get("content-type", "")
                if "application/json" in content_type and raw:
                    request_body = json.loads(raw)
                elif raw:
                    request_body = raw.decode("utf-8", errors="replace")
            except Exception:
                pass

        request_headers = self._sanitize_headers(dict(request.headers))

        exception_info: dict[str, Any] | None = None
        response: Response | None = None

        try:
            response = await call_next(request)
        except Exception as exc:
            exception_info = {
                "class": type(exc).__name__,
                "message": str(exc),
                "file": "",
                "line": 0,
                "stack_trace": traceback.format_tb(exc.__traceback__),
            }
            response = Response(
                content=json.dumps({"error": str(exc)}),
                status_code=500,
                media_type="application/json",
            )

        response_body: Any = None
        status_code = response.status_code

        if self._capture_response_body:
            try:
                body_bytes = b""
                async for chunk in response.body_iterator:  # type: ignore[attr-defined]
                    body_bytes += chunk if isinstance(chunk, bytes) else chunk.encode()

                content_type = response.headers.get("content-type", "")
                if "application/json" in content_type and body_bytes:
                    response_body = json.loads(body_bytes)

                response = Response(
                    content=body_bytes,
                    status_code=status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type,
                )
            except Exception:
                pass

        route_path = request.scope.get("path", str(request.url.path))
        route_name = request.scope.get("route", {})
        if hasattr(route_name, "path"):
            route_path = route_name.path  # type: ignore[union-attr]

        trace: dict[str, Any] = {
            "trace_id": trace_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": "http",
            "request": {
                "url": str(request.url),
                "method": request.method,
                "headers": request_headers,
                "body": request_body,
            },
            "response": {
                "status": status_code,
                "body": response_body,
            },
            "context": {
                "route": route_path,
                "duration_ms": round((time.monotonic() - start_time) * 1000),
                "exception": exception_info,
            },
        }

        if self._write_to_file:
            self._storage.save_trace(trace)

        if self._send_to_server:
            await self._send_trace(trace)

        return response

    async def _send_trace(self, trace: dict[str, Any]) -> None:
        try:
            await self._http_client.post(
                f"{self._endpoint}/api/traces",
                json=trace,
                timeout=1.0,
            )
        except Exception:
            pass

    @staticmethod
    def _sanitize_headers(headers: dict[str, str]) -> dict[str, str]:
        return {
            k: "[REDACTED]" if k.lower() in SENSITIVE_HEADERS else v
            for k, v in headers.items()
        }
