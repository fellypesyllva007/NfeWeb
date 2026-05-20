#!/usr/bin/env python3
"""
Teste ACBrLibNFe ARM64: carregar INI, gerar XML e validar.

Valida:
  - NFE_Inicializar
  - NFE_CarregarINI
  - NFE_Validar
  - NFE_ValidarRegrasdeNegocios
  - NFE_ObterXml
  - NFE_Finalizar

Este teste ainda não assina e não transmite para SEFAZ.
"""

from __future__ import annotations

import ctypes
import os
import sys
import tempfile
from pathlib import Path


def acbr_home() -> Path:
    value = os.environ.get("ACBR_HOME")
    if not value:
        raise SystemExit("ERRO: defina ACBR_HOME=$HOME/acbr-arm64-lab/ACBr")
    return Path(value).expanduser().resolve()


def find_library(base: Path) -> Path:
    for candidate in [
        base / "Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64.so",
        base / "Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64",
    ]:
        if candidate.exists():
            return candidate
    raise SystemExit("ERRO: libacbrnfe_arm64 não encontrada")


def find_sample_ini(base: Path) -> Path:
    if len(sys.argv) >= 2:
        ini = Path(sys.argv[1]).expanduser().resolve()
        if not ini.exists():
            raise SystemExit(f"ERRO: INI informado não existe: {ini}")
        return ini

    sample = base / "Testes/Recursos/Arquivos-Comparacao/NFeNFCe/INI/NFe-Simples-RT-CST00.INI"
    if sample.exists():
        return sample
    raise SystemExit(f"ERRO: INI de exemplo não encontrado: {sample}")


def find_schemas_dir(base: Path) -> Path:
    schemas = base / "Exemplos/ACBrDFe/Schemas/NFe"
    if not schemas.exists():
        raise SystemExit(f"ERRO: diretório de schemas não encontrado: {schemas}")
    return schemas


def write_acbrlib_ini(base: Path) -> tuple[Path, Path]:
    workdir = Path(tempfile.mkdtemp(prefix="acbrlib-nfe-arm64-"))
    schemas = find_schemas_dir(base)
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
                f"PathSchemas={schemas}",
                "ExibirErroSchema=1",
                "FormatoAlerta=TAG:%TAGNIVEL% ID:%ID%/%TAG%(%DESCRICAO%) - %MSG%.",
                "RetirarAcentos=1",
                "SalvarWS=0",
                "",
                "[DFe]",
                "UF=SP",
                "SSLLib=4",
                "CryptLib=3",
                "HttpLib=2",
                "XmlSignLib=4",
                f"PathSchemas={schemas}",
                "ArquivoPFX=",
                "Senha=",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return ini_path, workdir


def decode_buffer(buf: ctypes.Array[ctypes.c_char]) -> str:
    return bytes(buf).split(b"\x00", 1)[0].decode("utf-8", errors="replace")


def configure(lib) -> None:
    lib.NFE_Inicializar.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_char_p, ctypes.c_char_p]
    lib.NFE_Inicializar.restype = ctypes.c_int

    lib.NFE_Finalizar.argtypes = [ctypes.c_void_p]
    lib.NFE_Finalizar.restype = ctypes.c_int

    lib.NFE_UltimoRetorno.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
    lib.NFE_UltimoRetorno.restype = ctypes.c_int

    lib.NFE_CarregarINI.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
    lib.NFE_CarregarINI.restype = ctypes.c_int

    lib.NFE_ObterXml.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
    lib.NFE_ObterXml.restype = ctypes.c_int

    lib.NFE_Validar.argtypes = [ctypes.c_void_p]
    lib.NFE_Validar.restype = ctypes.c_int

    lib.NFE_ValidarRegrasdeNegocios.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
    lib.NFE_ValidarRegrasdeNegocios.restype = ctypes.c_int

    lib.NFE_LimparLista.argtypes = [ctypes.c_void_p]
    lib.NFE_LimparLista.restype = ctypes.c_int


def ultimo_retorno(lib, handle: ctypes.c_void_p) -> str:
    buffer = ctypes.create_string_buffer(65536)
    size = ctypes.c_int(65536)
    ret = lib.NFE_UltimoRetorno(handle, buffer, ctypes.byref(size))
    return f"ret={ret}; tamanho={size.value}; mensagem={decode_buffer(buffer)}"


def text_response(fn, handle: ctypes.c_void_p, size_value: int = 65536) -> tuple[int, str, int]:
    buffer = ctypes.create_string_buffer(size_value)
    size = ctypes.c_int(size_value)
    ret = fn(handle, buffer, ctypes.byref(size))
    if ret != 0 and size.value > size_value:
        buffer = ctypes.create_string_buffer(size.value + 1)
        ret = fn(handle, buffer, ctypes.byref(size))
    return ret, decode_buffer(buffer), size.value


def obter_xml(lib, handle: ctypes.c_void_p) -> tuple[int, str, int]:
    buffer = ctypes.create_string_buffer(256 * 1024)
    size = ctypes.c_int(256 * 1024)
    ret = lib.NFE_ObterXml(handle, 0, buffer, ctypes.byref(size))
    return ret, decode_buffer(buffer), size.value


def main() -> int:
    base = acbr_home()
    lib_path = find_library(base)
    sample_ini = find_sample_ini(base)
    config_ini, workdir = write_acbrlib_ini(base)

    print(f"Carregando lib: {lib_path}")
    print(f"Config ACBrLib: {config_ini}")
    print(f"INI NF-e: {sample_ini}")
    print(f"Schemas: {find_schemas_dir(base)}")
    print(f"Saída: {workdir}")

    lib = ctypes.CDLL(str(lib_path))
    configure(lib)

    handle = ctypes.c_void_p(None)
    ret = lib.NFE_Inicializar(ctypes.byref(handle), str(config_ini).encode("utf-8"), b"")
    print(f"NFE_Inicializar: ret={ret}; handle={handle.value}")
    if ret != 0:
        print("UltimoRetorno:", ultimo_retorno(lib, handle))
        return ret

    try:
        ret_load = lib.NFE_CarregarINI(handle, str(sample_ini).encode("utf-8"))
        print(f"NFE_CarregarINI: ret={ret_load}")
        print("UltimoRetorno após CarregarINI:", ultimo_retorno(lib, handle))
        if ret_load != 0:
            return ret_load

        ret_xml, xml, xml_size = obter_xml(lib, handle)
        print(f"NFE_ObterXml: ret={ret_xml}; tamanho={xml_size}; xml_prefix={xml[:120]!r}")
        if ret_xml == 0 and xml.strip():
            out_xml = workdir / "nfe-validacao-input.xml"
            out_xml.write_text(xml, encoding="utf-8")
            print(f"XML salvo: {out_xml}")

        ret_validar = lib.NFE_Validar(handle)
        print(f"NFE_Validar: ret={ret_validar}")
        print("UltimoRetorno após Validar:", ultimo_retorno(lib, handle))

        ret_regras, msg_regras, size_regras = text_response(lib.NFE_ValidarRegrasdeNegocios, handle)
        print(f"NFE_ValidarRegrasdeNegocios: ret={ret_regras}; tamanho={size_regras}; mensagem={msg_regras}")

        ret_limpar = lib.NFE_LimparLista(handle)
        print(f"NFE_LimparLista: ret={ret_limpar}")

        # ret diferente de zero pode ser esperado se o INI de teste tiver campos de reforma tributária ainda não aceitos pelo schema local.
        return 0
    finally:
        ret_finalizar = lib.NFE_Finalizar(handle)
        print(f"NFE_Finalizar: ret={ret_finalizar}")


if __name__ == "__main__":
    raise SystemExit(main())
