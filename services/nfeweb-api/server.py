#!/usr/bin/env python3
"""
NfeWeb API mínima.

Marcos implementados:
  - GET /health
  - GET /acbr/info

A integração com a ACBrLibNFe fica encapsulada em fiscal_gateway.py.
"""

from __future__ import annotations

import json
import os
import platform
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from fiscal_gateway import FiscalGateway, FiscalGatewayError


SERVICE_NAME = "nfeweb-api"
SERVICE_VERSION = "0.3.0"


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


def get_acbr_info() -> tuple[int, dict[str, Any]]:
    try:
        acbr = FiscalGateway().info()
        runtime = acbr.pop("runtime", {})
        return 200, {
            "status": "ok",
            "service": SERVICE_NAME,
            "arch": runtime.get("arch", platform.machine()),
            "python": runtime.get("python", platform.python_version()),
            "acbr": acbr,
            "env": {
                "OPENSSL_CONF": runtime.get("OPENSSL_CONF", env("OPENSSL_CONF", "")),
                "OPENSSL_MODULES": runtime.get("OPENSSL_MODULES", env("OPENSSL_MODULES", "")),
                "ACBR_HOME": runtime.get("ACBR_HOME", env("ACBR_HOME", "")),
            },
        }
    except FiscalGatewayError as exc:
        return 500, {
            "status": "error",
            "service": SERVICE_NAME,
            "error": "FiscalGatewayError",
            "message": str(exc),
        }
    except Exception as exc:  # noqa: BLE001 - endpoint diagnóstico deve retornar falha em JSON
        return 500, {
            "status": "error",
            "service": SERVICE_NAME,
            "error": type(exc).__name__,
            "message": str(exc),
        }


class NfeWebHandler(BaseHTTPRequestHandler):
    server_version = "NfeWebAPI/0.3"

    def do_GET(self) -> None:  # noqa: N802 - nome exigido por BaseHTTPRequestHandler
        if self.path in ("/health", "/api/health"):
            json_response(
                self,
                200,
                {
                    "status": "ok",
                    "service": SERVICE_NAME,
                    "version": SERVICE_VERSION,
                    "arch": platform.machine(),
                    "python": platform.python_version(),
                },
            )
            return

        if self.path in ("/acbr/info", "/api/acbr/info"):
            status, payload = get_acbr_info()
            json_response(self, status, payload)
            return

        if self.path in ("/", "/api", "/api/"):
            json_response(
                self,
                200,
                {
                    "service": SERVICE_NAME,
                    "version": SERVICE_VERSION,
                    "message": "NfeWeb API ativa",
                    "health": "/health",
                    "acbr_info": "/acbr/info",
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
