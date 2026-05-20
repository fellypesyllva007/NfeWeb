#!/usr/bin/env python3
"""
Teste ACBrLibNFe ARM64 sem certificado.

Valida:
  - NFE_Inicializar
  - NFE_ConfigGravarValor
  - NFE_ConfigLerValor
  - NFE_GerarChave
  - NFE_Finalizar

Este teste ainda nao transmite para SEFAZ e nao usa certificado.
"""

from __future__ import annotations

import ctypes
import os
import sys
import tempfile
from pathlib import Path


def find_library() -> Path:
    if len(sys.argv) >= 2:
        return Path(sys.argv[1]).expanduser().resolve()

    acbr_home = os.environ.get("ACBR_HOME")
    if not acbr_home:
        raise SystemExit("ERRO: informe a .so ou defina ACBR_HOME")

    base = Path(acbr_home).expanduser().resolve()
    for candidate in [
        base / "Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64.so",
        base / "Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64",
    ]:
        if candidate.exists():
            return candidate

    raise SystemExit("ERRO: libacbrnfe_arm64 nao encontrada")


def write_minimal_ini() -> Path:
    workdir = Path(tempfile.mkdtemp(prefix="acbrlib-nfe-arm64-"))
    ini_path = workdir / "acbrlib.ini"
    ini_path.write_text(
        "\n".join(
            [
                "[Principal]",
                "TipoResposta=2",
                "CodificacaoResposta=0",
                "LogNivel=4",
                f"LogPath={workdir}",
                "",
                "[NFe]",
                "Ambiente=1",
                "FormaEmissao=0",
                "SalvarGer=1",
                f"PathSalvar={workdir}",
                "",
                "[DFe]",
                "UF=SP",
                "SSLLib=4",
                "CryptLib=3",
                "HttpLib=2",
                "XmlSignLib=4",
                "ArquivoPFX=",
                "Senha=",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return ini_path


def decode_buffer(buf: ctypes.Array[ctypes.c_char]) -> str:
    return bytes(buf).split(b"\x00", 1)[0].decode("utf-8", errors="replace")


def configure(lib) -> None:
    lib.NFE_Inicializar.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_char_p, ctypes.c_char_p]
    lib.NFE_Inicializar.restype = ctypes.c_int

    lib.NFE_Finalizar.argtypes = [ctypes.c_void_p]
    lib.NFE_Finalizar.restype = ctypes.c_int

    lib.NFE_ConfigGravarValor.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p]
    lib.NFE_ConfigGravarValor.restype = ctypes.c_int

    lib.NFE_ConfigLerValor.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
    lib.NFE_ConfigLerValor.restype = ctypes.c_int

    lib.NFE_GerarChave.argtypes = [
        ctypes.c_void_p,  # handle
        ctypes.c_int,    # ACodigoUF
        ctypes.c_int,    # ACodigoNumerico
        ctypes.c_int,    # AModelo
        ctypes.c_int,    # ASerie
        ctypes.c_int,    # ANumero
        ctypes.c_int,    # ATpEmi
        ctypes.c_char_p, # AEmissao
        ctypes.c_char_p, # ACNPJCPF
        ctypes.c_char_p, # resposta
        ctypes.POINTER(ctypes.c_int),
    ]
    lib.NFE_GerarChave.restype = ctypes.c_int

    lib.NFE_UltimoRetorno.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
    lib.NFE_UltimoRetorno.restype = ctypes.c_int


def ultimo_retorno(lib, handle: ctypes.c_void_p) -> str:
    buffer = ctypes.create_string_buffer(8192)
    size = ctypes.c_int(8192)
    ret = lib.NFE_UltimoRetorno(handle, buffer, ctypes.byref(size))
    return f"ret={ret}; tamanho={size.value}; mensagem={decode_buffer(buffer)}"


def ler_config(lib, handle: ctypes.c_void_p, sessao: str, chave: str) -> tuple[int, str, int]:
    buffer = ctypes.create_string_buffer(4096)
    size = ctypes.c_int(4096)
    ret = lib.NFE_ConfigLerValor(
        handle,
        sessao.encode("utf-8"),
        chave.encode("utf-8"),
        buffer,
        ctypes.byref(size),
    )
    return ret, decode_buffer(buffer), size.value


def gerar_chave(lib, handle: ctypes.c_void_p) -> tuple[int, str, int]:
    buffer = ctypes.create_string_buffer(4096)
    size = ctypes.c_int(4096)

    # Exemplo ficticio em homologacao: SP, modelo 55, serie 1, numero 123.
    # CNPJ precisa ter 14 digitos. Data em formato dd/mm/yyyy para ACBr.
    ret = lib.NFE_GerarChave(
        handle,
        35,                 # cUF SP
        12345678,           # cNF
        55,                 # modelo NF-e
        1,                  # serie
        123,                # numero
        1,                  # tpEmis normal
        b"20/05/2026",      # emissao
        b"12345678000195",  # CNPJ ficticio
        buffer,
        ctypes.byref(size),
    )
    return ret, decode_buffer(buffer), size.value


def main() -> int:
    lib_path = find_library()
    ini_path = write_minimal_ini()

    print(f"Carregando: {lib_path}")
    print(f"INI teste: {ini_path}")

    lib = ctypes.CDLL(str(lib_path))
    configure(lib)

    handle = ctypes.c_void_p(None)
    ret = lib.NFE_Inicializar(ctypes.byref(handle), str(ini_path).encode("utf-8"), b"")
    print(f"NFE_Inicializar: ret={ret}; handle={handle.value}")
    if ret != 0:
        print("UltimoRetorno:", ultimo_retorno(lib, handle))
        return ret

    try:
        tests = [
            ("Principal", "TipoResposta", "2"),
            ("DFe", "UF", "SP"),
            ("DFe", "SSLLib", "4"),
            ("DFe", "CryptLib", "3"),
            ("DFe", "HttpLib", "2"),
            ("DFe", "XmlSignLib", "4"),
            ("NFe", "Ambiente", "1"),
        ]

        for sessao, chave, valor in tests:
            ret_cfg = lib.NFE_ConfigGravarValor(handle, sessao.encode(), chave.encode(), valor.encode())
            ret_read, read_value, read_size = ler_config(lib, handle, sessao, chave)
            print(f"Config {sessao}.{chave}: gravar={ret_cfg}; ler={ret_read}; tamanho={read_size}; valor={read_value}")

        ret_chave, chave_nfe, size_chave = gerar_chave(lib, handle)
        print(f"NFE_GerarChave: ret={ret_chave}; tamanho={size_chave}; valor={chave_nfe}")
        print("UltimoRetorno:", ultimo_retorno(lib, handle))
    finally:
        ret_finalizar = lib.NFE_Finalizar(handle)
        print(f"NFE_Finalizar: ret={ret_finalizar}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
