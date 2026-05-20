#!/usr/bin/env python3
"""
FiscalGateway da NfeWeb API.

Responsabilidade:
  - Encapsular acesso direto à ACBrLibNFe via ctypes.
  - Centralizar inicialização/finalização de handle.
  - Centralizar chamadas de diagnóstico da ACBrLib.

Próximos marcos devem evoluir esta camada para:
  - configurar certificado por cliente;
  - carregar INI/XML;
  - assinar XML;
  - validar regras;
  - comunicar com SEFAZ.
"""

from __future__ import annotations

import ctypes
import os
import platform
from pathlib import Path
from typing import Any, Callable


class FiscalGatewayError(RuntimeError):
    """Erro controlado da camada FiscalGateway."""


class FiscalGateway:
    def __init__(self) -> None:
        self.acbr_home = self._env("ACBR_HOME", "")
        self.lib_path = Path(self._env("ACBR_NFE_LIB", "")).expanduser()
        self.log_path = self._env("NFE_LOG_PATH", "/var/log/nfeweb")

    @staticmethod
    def _env(name: str, default: str) -> str:
        value = os.environ.get(name)
        return value if value not in (None, "") else default

    @staticmethod
    def _decode_buffer(buf: ctypes.Array[ctypes.c_char]) -> str:
        return bytes(buf).split(b"\x00", 1)[0].decode("utf-8", errors="replace")

    def _write_minimal_config(self) -> Path:
        workdir = Path("/tmp/nfeweb-api-acbr")
        workdir.mkdir(parents=True, exist_ok=True)
        config_path = workdir / "acbrlib-info.ini"
        config_path.write_text(
            "\n".join(
                [
                    "[Principal]",
                    "TipoResposta=2",
                    "CodificacaoResposta=0",
                    "LogNivel=4",
                    f"LogPath={self.log_path}",
                    "",
                ]
            ),
            encoding="utf-8",
        )
        return config_path

    @staticmethod
    def _configure_signatures(lib: ctypes.CDLL) -> None:
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

    def _text_call(
        self,
        fn: Callable[..., int],
        handle: ctypes.c_void_p,
        size_value: int = 65536,
    ) -> tuple[int, str, int]:
        buffer = ctypes.create_string_buffer(size_value)
        size = ctypes.c_int(size_value)
        ret = fn(handle, buffer, ctypes.byref(size))
        if ret != 0 and size.value > size_value:
            buffer = ctypes.create_string_buffer(size.value + 1)
            ret = fn(handle, buffer, ctypes.byref(size))
        return ret, self._decode_buffer(buffer), size.value

    def _ultimo_retorno(self, lib: ctypes.CDLL, handle: ctypes.c_void_p) -> dict[str, Any]:
        ret, mensagem, tamanho = self._text_call(lib.NFE_UltimoRetorno, handle)
        return {"ret": ret, "mensagem": mensagem, "tamanho": tamanho}

    def info(self) -> dict[str, Any]:
        if not str(self.lib_path):
            raise FiscalGatewayError("ACBR_NFE_LIB não configurado")

        if not self.lib_path.exists():
            raise FiscalGatewayError(f"ACBR_NFE_LIB não encontrado: {self.lib_path}")

        config_path = self._write_minimal_config()
        handle = ctypes.c_void_p(None)
        lib: ctypes.CDLL | None = None

        try:
            lib = ctypes.CDLL(str(self.lib_path))
            self._configure_signatures(lib)

            ret_init = lib.NFE_Inicializar(ctypes.byref(handle), str(config_path).encode("utf-8"), b"")
            if ret_init != 0:
                raise FiscalGatewayError(
                    f"NFE_Inicializar falhou: ret={ret_init}; ultimo={self._ultimo_retorno(lib, handle)}"
                )

            ret_nome, nome, nome_size = self._text_call(lib.NFE_Nome, handle, 4096)
            ret_versao, versao, versao_size = self._text_call(lib.NFE_Versao, handle, 4096)

            if hasattr(lib, "NFE_OpenSSLInfo"):
                ret_ssl, openssl_info, openssl_size = self._text_call(lib.NFE_OpenSSLInfo, handle, 65536)
                openssl_payload: dict[str, Any] = {
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

            return {
                "lib_path": str(self.lib_path),
                "config_path": str(config_path),
                "nome": {"ret": ret_nome, "valor": nome, "tamanho": nome_size},
                "versao": {"ret": ret_versao, "valor": versao, "tamanho": versao_size},
                "openssl": openssl_payload,
                "runtime": {
                    "arch": platform.machine(),
                    "python": platform.python_version(),
                    "ACBR_HOME": self.acbr_home,
                    "OPENSSL_CONF": self._env("OPENSSL_CONF", ""),
                    "OPENSSL_MODULES": self._env("OPENSSL_MODULES", ""),
                },
            }
        finally:
            if lib is not None and handle.value:
                lib.NFE_Finalizar(handle)
