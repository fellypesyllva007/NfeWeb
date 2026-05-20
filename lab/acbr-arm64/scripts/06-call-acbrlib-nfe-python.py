#!/usr/bin/env python3
"""
Smoke test de chamada real da ACBrLibNFe ARM64 via Python ctypes.

Testa:
  - dlopen da libacbrnfe_arm64.so
  - NFE_Inicializar
  - NFE_Nome
  - NFE_Versao
  - NFE_OpenSSLInfo
  - NFE_Finalizar

Uso:
  export ACBR_HOME=$HOME/acbr-arm64-lab/ACBr
  python3 lab/acbr-arm64/scripts/06-call-acbrlib-nfe-python.py

Ou:
  python3 lab/acbr-arm64/scripts/06-call-acbrlib-nfe-python.py /caminho/libacbrnfe_arm64.so
"""

from __future__ import annotations

import ctypes
import os
import sys
from pathlib import Path


def find_library() -> Path:
    if len(sys.argv) >= 2:
        return Path(sys.argv[1]).expanduser().resolve()

    acbr_home = os.environ.get("ACBR_HOME")
    if not acbr_home:
        raise SystemExit("ERRO: informe o caminho da .so ou defina ACBR_HOME")

    base = Path(acbr_home).expanduser().resolve()
    candidates = [
        base / "Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64.so",
        base / "Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    raise SystemExit("ERRO: nao encontrei libacbrnfe_arm64 automaticamente")


def decode_buffer(buf: ctypes.Array[ctypes.c_char]) -> str:
    return bytes(buf).split(b"\x00", 1)[0].decode("utf-8", errors="replace")


def call_text_function(fn, handle: ctypes.c_size_t, size: int = 4096) -> tuple[int, str, int]:
    buffer = ctypes.create_string_buffer(size)
    buffer_size = ctypes.c_long(size)
    ret = fn(handle.value, buffer, ctypes.byref(buffer_size))
    return ret, decode_buffer(buffer), buffer_size.value


def ultimo_retorno(lib, handle: ctypes.c_size_t) -> str:
    try:
        buffer = ctypes.create_string_buffer(4096)
        buffer_size = ctypes.c_long(4096)
        ret = lib.NFE_UltimoRetorno(handle.value, buffer, ctypes.byref(buffer_size))
        return f"ret={ret}; mensagem={decode_buffer(buffer)}; tamanho={buffer_size.value}"
    except Exception as exc:  # noqa: BLE001
        return f"nao foi possivel obter UltimoRetorno: {exc}"


def main() -> int:
    lib_path = find_library()
    if not lib_path.exists():
        print(f"ERRO: biblioteca nao encontrada: {lib_path}", file=sys.stderr)
        return 1

    print(f"Carregando: {lib_path}")
    lib = ctypes.CDLL(str(lib_path))

    # Assinaturas conforme headers MT da ACBrLibNFe.
    # int NFE_Inicializar(const uintptr_t* libHandle, const char* eArqConfig, const char* eChaveCrypt);
    lib.NFE_Inicializar.argtypes = [ctypes.POINTER(ctypes.c_size_t), ctypes.c_char_p, ctypes.c_char_p]
    lib.NFE_Inicializar.restype = ctypes.c_int

    # int NFE_Finalizar(const uintptr_t libHandle);
    lib.NFE_Finalizar.argtypes = [ctypes.c_size_t]
    lib.NFE_Finalizar.restype = ctypes.c_int

    # int NFE_Nome(const uintptr_t libHandle, const char* sNome, long* esTamanho);
    lib.NFE_Nome.argtypes = [ctypes.c_size_t, ctypes.c_char_p, ctypes.POINTER(ctypes.c_long)]
    lib.NFE_Nome.restype = ctypes.c_int

    # int NFE_Versao(const uintptr_t libHandle, const char* sVersao, long* esTamanho);
    lib.NFE_Versao.argtypes = [ctypes.c_size_t, ctypes.c_char_p, ctypes.POINTER(ctypes.c_long)]
    lib.NFE_Versao.restype = ctypes.c_int

    # int NFE_UltimoRetorno(const uintptr_t libHandle, char* sMensagem, long* esTamanho);
    lib.NFE_UltimoRetorno.argtypes = [ctypes.c_size_t, ctypes.c_char_p, ctypes.POINTER(ctypes.c_long)]
    lib.NFE_UltimoRetorno.restype = ctypes.c_int

    has_openssl_info = hasattr(lib, "NFE_OpenSSLInfo")
    if has_openssl_info:
        lib.NFE_OpenSSLInfo.argtypes = [ctypes.c_size_t, ctypes.c_char_p, ctypes.POINTER(ctypes.c_long)]
        lib.NFE_OpenSSLInfo.restype = ctypes.c_int

    handle = ctypes.c_size_t(0)

    # Primeiro teste sem arquivo INI. Depois criaremos um teste com acbrlib.ini.
    ret = lib.NFE_Inicializar(ctypes.byref(handle), None, None)
    print(f"NFE_Inicializar: ret={ret}; handle={handle.value}")

    if ret != 0:
        print("UltimoRetorno:", ultimo_retorno(lib, handle))
        return ret

    try:
        ret_nome, nome, tamanho_nome = call_text_function(lib.NFE_Nome, handle)
        print(f"NFE_Nome: ret={ret_nome}; tamanho={tamanho_nome}; valor={nome}")

        ret_versao, versao, tamanho_versao = call_text_function(lib.NFE_Versao, handle)
        print(f"NFE_Versao: ret={ret_versao}; tamanho={tamanho_versao}; valor={versao}")

        if has_openssl_info:
            ret_ssl, ssl_info, tamanho_ssl = call_text_function(lib.NFE_OpenSSLInfo, handle)
            print(f"NFE_OpenSSLInfo: ret={ret_ssl}; tamanho={tamanho_ssl}; valor={ssl_info}")
        else:
            print("NFE_OpenSSLInfo: simbolo nao encontrado")

        print("UltimoRetorno:", ultimo_retorno(lib, handle))
    finally:
        ret_finalizar = lib.NFE_Finalizar(handle.value)
        print(f"NFE_Finalizar: ret={ret_finalizar}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
