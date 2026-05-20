#!/usr/bin/env python3
"""
NfeWeb API mínima.

Objetivo inicial:
  - Subir HTTP local em 127.0.0.1:3333
  - Responder GET /health
  - Servir como base do futuro fiscal-service que chamará a ACBrLibNFe ARM64

Sem dependências externas neste primeiro marco.
"""

from __future__ import annotations

import json
import os
import platform
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


SERVICE_NAME = "nfeweb-api"


def env(name: str, default: str) -> str:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class NfeWebHandler(BaseHTTPRequestHandler):
    server_version = "NfeWebAPI/0.1"

    def do_GET(self) -> None:  # noqa: N802 - nome exigido por BaseHTTPRequestHandler
        if self.path in ("/health", "/api/health"):
            json_response(
                self,
                200,
                {
                    "status": "ok",
                    "service": SERVICE_NAME,
                    "version": "0.1.0",
                    "arch": platform.machine(),
                    "python": platform.python_version(),
                },
            )
            return

        if self.path in ("/", "/api", "/api/"):
            json_response(
                self,
                200,
                {
                    "service": SERVICE_NAME,
                    "message": "NfeWeb API ativa",
                    "health": "/health",
                },
            )
            return

        json_response(
            self,
            404,
            {
                "status": "not_found",
                "service": SERVICE_NAME,
                "path": self.path,
            },
        )

    def log_message(self, fmt: str, *args: Any) -> None:
        # Mantém logs no stdout/stderr para o journalctl capturar via systemd.
        print(f"{self.address_string()} - {fmt % args}", flush=True)


def main() -> int:
    host = env("HOST", "127.0.0.1")
    port = int(env("PORT", "3333"))

    httpd = ThreadingHTTPServer((host, port), NfeWebHandler)
    print(f"{SERVICE_NAME} escutando em http://{host}:{port}", flush=True)
    httpd.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
