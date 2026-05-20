#!/usr/bin/env python3
"""
NfeWeb API mínima.

Marcos implementados:
  - GET /health
  - GET /acbr/info
  - GET /emitentes
  - GET /db/status
  - GET /db/emitentes
  - POST /nfe/gerar-chave
  - POST /nfe/carregar-ini
  - POST /nfe/assinar
  - POST /nfe/validar-regras

A integração com a ACBrLibNFe fica encapsulada em fiscal_gateway.py e nfe_offline.py.
A fonte de configuração fiscal multiempresa é exclusivamente o SQLite.
"""

from __future__ import annotations

import json
import os
import platform
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Callable

from database import db_status, list_emitters
from fiscal_gateway import FiscalGateway, FiscalGatewayError
from nfe_offline import NFeOffline, NFeOfflineError


SERVICE_NAME = "nfeweb-api"
SERVICE_VERSION = "0.8.0"


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


def read_json_body(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    content_length = int(handler.headers.get("Content-Length", "0") or "0")
    if content_length <= 0:
        return {}

    raw = handler.rfile.read(content_length)
    try:
        payload = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON inválido: {exc}") from exc

    if not isinstance(payload, dict):
        raise ValueError("JSON precisa ser um objeto")
    return payload


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
        return 500, {"status": "error", "service": SERVICE_NAME, "error": "FiscalGatewayError", "message": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return 500, {"status": "error", "service": SERVICE_NAME, "error": type(exc).__name__, "message": str(exc)}


def get_db_status() -> tuple[int, dict[str, Any]]:
    try:
        return 200, {"status": "ok", "service": SERVICE_NAME, "database": db_status()}
    except Exception as exc:  # noqa: BLE001
        return 500, {"status": "error", "service": SERVICE_NAME, "error": type(exc).__name__, "message": str(exc)}


def get_db_emitentes() -> tuple[int, dict[str, Any]]:
    try:
        return 200, {"status": "ok", "service": SERVICE_NAME, "emitentes": list_emitters()}
    except Exception as exc:  # noqa: BLE001
        return 500, {"status": "error", "service": SERVICE_NAME, "error": type(exc).__name__, "message": str(exc)}


def post_gerar_chave(payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    try:
        resultado = FiscalGateway().gerar_chave(payload)
        return 200, {"status": "ok", "service": SERVICE_NAME, "operacao": "nfe.gerar_chave", "resultado": resultado}
    except FiscalGatewayError as exc:
        return 400, {"status": "error", "service": SERVICE_NAME, "operacao": "nfe.gerar_chave", "error": "FiscalGatewayError", "message": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return 500, {"status": "error", "service": SERVICE_NAME, "operacao": "nfe.gerar_chave", "error": type(exc).__name__, "message": str(exc)}


def post_nfe_offline(payload: dict[str, Any], operacao: str, fn: Callable[[NFeOffline, dict[str, Any]], dict[str, Any]]) -> tuple[int, dict[str, Any]]:
    try:
        resultado = fn(NFeOffline(), payload)
        return 200, {"status": "ok", "service": SERVICE_NAME, "operacao": operacao, "resultado": resultado}
    except NFeOfflineError as exc:
        return 400, {"status": "error", "service": SERVICE_NAME, "operacao": operacao, "error": "NFeOfflineError", "message": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return 500, {"status": "error", "service": SERVICE_NAME, "operacao": operacao, "error": type(exc).__name__, "message": str(exc)}


class NfeWebHandler(BaseHTTPRequestHandler):
    server_version = "NfeWebAPI/0.8"

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/health", "/api/health"):
            json_response(self, 200, {"status": "ok", "service": SERVICE_NAME, "version": SERVICE_VERSION, "arch": platform.machine(), "python": platform.python_version()})
            return

        if self.path in ("/acbr/info", "/api/acbr/info"):
            status, payload = get_acbr_info()
            json_response(self, status, payload)
            return

        if self.path in ("/db/status", "/api/db/status"):
            status, payload = get_db_status()
            json_response(self, status, payload)
            return

        if self.path in ("/db/emitentes", "/api/db/emitentes", "/emitentes", "/api/emitentes"):
            status, payload = get_db_emitentes()
            json_response(self, status, payload)
            return

        if self.path in ("/clientes", "/api/clientes"):
            json_response(
                self,
                410,
                {
                    "status": "gone",
                    "service": SERVICE_NAME,
                    "message": "A rota /clientes foi removida. Use /api/emitentes; a fonte única agora é o SQLite.",
                },
            )
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
                    "emitentes": "/emitentes",
                    "db_status": "/db/status",
                    "db_emitentes": "/db/emitentes",
                    "nfe_gerar_chave": "/nfe/gerar-chave",
                    "nfe_carregar_ini": "/nfe/carregar-ini",
                    "nfe_assinar": "/nfe/assinar",
                    "nfe_validar_regras": "/nfe/validar-regras",
                    "payload_fiscal_padrao": {"emitter_id": "emit_lab_acbr_sample"},
                },
            )
            return

        json_response(self, 404, {"status": "not_found", "service": SERVICE_NAME, "path": self.path})

    def do_POST(self) -> None:  # noqa: N802
        routes: dict[str, tuple[str, Callable[[NFeOffline, dict[str, Any]], dict[str, Any]]]] = {
            "/nfe/carregar-ini": ("nfe.carregar_ini", lambda svc, payload: svc.executar_carregar_ini(payload)),
            "/api/nfe/carregar-ini": ("nfe.carregar_ini", lambda svc, payload: svc.executar_carregar_ini(payload)),
            "/nfe/assinar": ("nfe.assinar", lambda svc, payload: svc.executar_assinar(payload)),
            "/api/nfe/assinar": ("nfe.assinar", lambda svc, payload: svc.executar_assinar(payload)),
            "/nfe/validar-regras": ("nfe.validar_regras", lambda svc, payload: svc.executar_validar_regras(payload)),
            "/api/nfe/validar-regras": ("nfe.validar_regras", lambda svc, payload: svc.executar_validar_regras(payload)),
        }

        try:
            payload = read_json_body(self)
        except ValueError as exc:
            json_response(self, 400, {"status": "error", "service": SERVICE_NAME, "error": "invalid_json", "message": str(exc)})
            return

        if self.path in ("/nfe/gerar-chave", "/api/nfe/gerar-chave"):
            status, response_payload = post_gerar_chave(payload)
            json_response(self, status, response_payload)
            return

        if self.path in routes:
            operacao, fn = routes[self.path]
            status, response_payload = post_nfe_offline(payload, operacao, fn)
            json_response(self, status, response_payload)
            return

        json_response(self, 404, {"status": "not_found", "service": SERVICE_NAME, "path": self.path})

    def log_message(self, fmt: str, *args: Any) -> None:
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
