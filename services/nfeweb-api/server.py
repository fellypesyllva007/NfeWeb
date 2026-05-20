#!/usr/bin/env python3
"""
NfeWeb API mínima.

Marcos implementados:
  - GET /health
  - GET /acbr/info

Sem dependências externas neste estágio. A integração com a ACBrLibNFe usa ctypes.
"""

from __future__ import annotations

import ctypes
import json
import os
import platform
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable


SERVICE_NAME = "nfeweb-api"
SERVICE_VERSION = "0.2.0"


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


def decode_buffer(buf: ctypes.Array[ctypes.c_char]) -> str:
    return bytes(buf).split(b"\x00", 1)[0].decode("utf-8", errors="replace")


def write_acbr_info_config() -> Path:
    """Cria um INI mínimo para inicializar a ACBrLibNFe no endpoint de diagnóstico."""
    workdir = Path("/tmp/nfeweb-api-acbr")
    workdir.mkdir(parents=True, exist_ok=True)
    config_path = workdir / "acbrlib-info.ini"
    log_path = env("NFE_LOG_PATH", "/var/log/nfeweb")

    config_path.write_text(
        "\n".join(
            [
                "[Principal]",
                "TipoResposta=2",
                "CodificacaoResposta=0",
                "LogNivel=4",
                f"LogPath={log_path}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return config_path


def configure_acbr_signatures(lib: ctypes.CDLL) -> None:
    lib.NFE_Inicializar.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_char_p, ctypes.c_char_p]
    lib.NFE_Inicializar.restype = ctypes.c_int

    lib.NFE_Finalizar.argtypes = [ctypes.c_void_p]
    lib.NFE_Finalizar.restype = ctypes.c_int

    lib.NFE_UltimoRetorno.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
    lib.NFE_UltimoRetorno.restype = ctypes.c_int

    lib.NFE_Nome.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
    lib.NFE_Nome.restype = ctypes.c_int

    lib.NFE_Versao.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
    lib.NFE_Versao.restype = ctypes.c_int

    if hasattr(lib, "NFE_OpenSSLInfo"):
        lib.NFE_OpenSSLInfo.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
        lib.NFE_OpenSSLInfo.restype = ctypes.c_int


def acbr_text_call(fn: Callable[..., int], handle: ctypes.c_void_p, size_value: int = 65536) -> tuple[int, str, int]:
    buffer = ctypes.create_string_buffer(size_value)
    size = ctypes.c_int(size_value)
    ret = fn(handle, buffer, ctypes.byref(size))
    if ret != 0 and size.value > size_value:
        buffer = ctypes.create_string_buffer(size.value + 1)
        ret = fn(handle, buffer, ctypes.byref(size))
    return ret, decode_buffer(buffer), size.value


def get_ultimo_retorno(lib: ctypes.CDLL, handle: ctypes.c_void_p) -> dict[str, Any]:
    ret, mensagem, tamanho = acbr_text_call(lib.NFE_UltimoRetorno, handle)
    return {"ret": ret, "mensagem": mensagem, "tamanho": tamanho}


def get_acbr_info() -> tuple[int, dict[str, Any]]:
    lib_path = Path(env("ACBR_NFE_LIB", "")).expanduser()
    if not str(lib_path):
        return 500, {
            "status": "error",
            "service": SERVICE_NAME,
            "error": "ACBR_NFE_LIB não configurado",
        }

    if not lib_path.exists():
        return 500, {
            "status": "error",
            "service": SERVICE_NAME,
            "error": "ACBR_NFE_LIB não encontrado",
            "path": str(lib_path),
        }

    config_path = write_acbr_info_config()
    handle = ctypes.c_void_p(None)
    lib: ctypes.CDLL | None = None

    try:
        lib = ctypes.CDLL(str(lib_path))
        configure_acbr_signatures(lib)

        ret_init = lib.NFE_Inicializar(ctypes.byref(handle), str(config_path).encode("utf-8"), b"")
        if ret_init != 0:
            return 500, {
                "status": "error",
                "service": SERVICE_NAME,
                "error": "NFE_Inicializar falhou",
                "ret": ret_init,
                "ultimo_retorno": get_ultimo_retorno(lib, handle),
                "lib_path": str(lib_path),
                "config_path": str(config_path),
            }

        ret_nome, nome, nome_size = acbr_text_call(lib.NFE_Nome, handle, 4096)
        ret_versao, versao, versao_size = acbr_text_call(lib.NFE_Versao, handle, 4096)

        openssl_payload: dict[str, Any]
        if hasattr(lib, "NFE_OpenSSLInfo"):
            ret_ssl, openssl_info, openssl_size = acbr_text_call(lib.NFE_OpenSSLInfo, handle, 65536)
            openssl_payload = {
                "ret": ret_ssl,
                "info": openssl_info,
                "tamanho": openssl_size,
            }
        else:
            openssl_payload = {
                "ret": None,
                "info": None,
                "error": "NFE_OpenSSLInfo não exportado pela biblioteca",
            }

        return 200, {
            "status": "ok",
            "service": SERVICE_NAME,
            "arch": platform.machine(),
            "python": platform.python_version(),
            "acbr": {
                "lib_path": str(lib_path),
                "config_path": str(config_path),
                "nome": {"ret": ret_nome, "valor": nome, "tamanho": nome_size},
                "versao": {"ret": ret_versao, "valor": versao, "tamanho": versao_size},
                "openssl": openssl_payload,
            },
            "env": {
                "OPENSSL_CONF": env("OPENSSL_CONF", ""),
                "OPENSSL_MODULES": env("OPENSSL_MODULES", ""),
                "ACBR_HOME": env("ACBR_HOME", ""),
            },
        }
    except Exception as exc:  # noqa: BLE001 - endpoint diagnóstico deve retornar falha em JSON
        return 500, {
            "status": "error",
            "service": SERVICE_NAME,
            "error": type(exc).__name__,
            "message": str(exc),
            "lib_path": str(lib_path),
            "config_path": str(config_path),
        }
    finally:
        if lib is not None and handle.value:
            try:
                lib.NFE_Finalizar(handle)
            except Exception as exc:  # noqa: BLE001
                print(f"Erro ao finalizar ACBrLibNFe: {exc}", flush=True)


class NfeWebHandler(BaseHTTPRequestHandler):
    server_version = "NfeWebAPI/0.2"

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
