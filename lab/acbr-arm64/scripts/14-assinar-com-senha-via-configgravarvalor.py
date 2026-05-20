#!/usr/bin/env python3
"""
Teste ACBrLibNFe ARM64: assinatura com PFX com senha configurada via NFE_ConfigGravarValor.

Objetivo:
  Reproduzir o padrão dos exemplos oficiais da ACBrLibNFe:
    1. Inicializar a lib com um INI base sem ArquivoPFX/Senha.
    2. Configurar DFe.ArquivoPFX via NFE_ConfigGravarValor.
    3. Configurar DFe.Senha via NFE_ConfigGravarValor.
    4. Carregar NF-e.
    5. Assinar.

Requer:
  ACBR_HOME=$HOME/acbr-arm64-lab/ACBr
  NFE_PFX_PATH=/caminho/certificado.pfx
  NFE_PFX_PASSWORD=senha

Este teste não transmite para SEFAZ.
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


def env_value(name: str, allow_empty: bool = False) -> str:
    if name not in os.environ:
        raise SystemExit(f"ERRO: defina a variável de ambiente {name}")
    value = os.environ.get(name, "")
    if not allow_empty and not value:
        raise SystemExit(f"ERRO: variável {name} está vazia")
    return value


def find_library(base: Path) -> Path:
    candidates = [
        base / "Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64.so",
        base / "Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise SystemExit("ERRO: libacbrnfe_arm64 não encontrada")


def find_sample_ini(base: Path) -> Path:
    if len(sys.argv) >= 2:
        sample = Path(sys.argv[1]).expanduser().resolve()
        if not sample.exists():
            raise SystemExit(f"ERRO: INI informado não existe: {sample}")
        return sample

    sample = base / "Testes/Recursos/Arquivos-Comparacao/NFeNFCe/INI/NFe-Simples-RT-CST00.INI"
    if sample.exists():
        return sample
    raise SystemExit(f"ERRO: INI de exemplo não encontrado: {sample}")


def find_schemas_dir(base: Path) -> Path:
    schemas = base / "Exemplos/ACBrDFe/Schemas/NFe"
    if not schemas.exists():
        raise SystemExit(f"ERRO: diretório de schemas não encontrado: {schemas}")
    return schemas


def write_base_ini(base: Path) -> tuple[Path, Path]:
    """INI base propositalmente sem ArquivoPFX e sem Senha."""
    workdir = Path(tempfile.mkdtemp(prefix="acbrlib-nfe-arm64-configvalor-"))
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
                "RetirarAcentos=1",
                "SalvarWS=0",
                "",
                "[DFe]",
                "UF=SP",
                "SSLCryptLib=1",
                "SSLHttpLib=3",
                "SSLXmlSignLib=4",
                f"PathSchemas={schemas}",
                "VerificarValidade=0",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return ini_path, workdir


def decode_buffer(buf: ctypes.Array[ctypes.c_char]) -> str:
    return bytes(buf).split(b"\x00", 1)[0].decode("utf-8", errors="replace")


def configure_signatures(lib) -> None:
    lib.NFE_Inicializar.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_char_p, ctypes.c_char_p]
    lib.NFE_Inicializar.restype = ctypes.c_int

    lib.NFE_Finalizar.argtypes = [ctypes.c_void_p]
    lib.NFE_Finalizar.restype = ctypes.c_int

    lib.NFE_ConfigGravarValor.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p]
    lib.NFE_ConfigGravarValor.restype = ctypes.c_int

    lib.NFE_ConfigLerValor.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
    lib.NFE_ConfigLerValor.restype = ctypes.c_int

    lib.NFE_ConfigGravar.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
    lib.NFE_ConfigGravar.restype = ctypes.c_int

    lib.NFE_UltimoRetorno.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
    lib.NFE_UltimoRetorno.restype = ctypes.c_int

    lib.NFE_CarregarINI.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
    lib.NFE_CarregarINI.restype = ctypes.c_int

    lib.NFE_Assinar.argtypes = [ctypes.c_void_p]
    lib.NFE_Assinar.restype = ctypes.c_int

    lib.NFE_VerificarAssinatura.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
    lib.NFE_VerificarAssinatura.restype = ctypes.c_int

    lib.NFE_ObterXml.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
    lib.NFE_ObterXml.restype = ctypes.c_int

    lib.NFE_LimparLista.argtypes = [ctypes.c_void_p]
    lib.NFE_LimparLista.restype = ctypes.c_int


def text_response(fn, handle: ctypes.c_void_p, size_value: int = 65536) -> tuple[int, str, int]:
    buffer = ctypes.create_string_buffer(size_value)
    size = ctypes.c_int(size_value)
    ret = fn(handle, buffer, ctypes.byref(size))
    if ret != 0 and size.value > size_value:
        buffer = ctypes.create_string_buffer(size.value + 1)
        ret = fn(handle, buffer, ctypes.byref(size))
    return ret, decode_buffer(buffer), size.value


def ultimo_retorno(lib, handle: ctypes.c_void_p) -> str:
    ret, msg, size = text_response(lib.NFE_UltimoRetorno, handle)
    return f"ret={ret}; tamanho={size}; mensagem={msg}"


def gravar_valor(lib, handle: ctypes.c_void_p, secao: str, chave: str, valor: str) -> int:
    return lib.NFE_ConfigGravarValor(
        handle,
        secao.encode("utf-8"),
        chave.encode("utf-8"),
        valor.encode("utf-8"),
    )


def ler_valor(lib, handle: ctypes.c_void_p, secao: str, chave: str) -> tuple[int, str, int]:
    buffer = ctypes.create_string_buffer(4096)
    size = ctypes.c_int(4096)
    ret = lib.NFE_ConfigLerValor(handle, secao.encode(), chave.encode(), buffer, ctypes.byref(size))
    return ret, decode_buffer(buffer), size.value


def print_config(lib, handle: ctypes.c_void_p, chave: str, mask: bool = False) -> None:
    ret, valor, size = ler_valor(lib, handle, "DFe", chave)
    if mask:
        shown = f"<len={len(valor)}>" if valor else "<vazio>"
    else:
        shown = valor
    print(f"Config efetiva DFe.{chave}: ret={ret}; tamanho={size}; valor={shown}")


def obter_xml(lib, handle: ctypes.c_void_p) -> tuple[int, str, int]:
    buffer = ctypes.create_string_buffer(512 * 1024)
    size = ctypes.c_int(512 * 1024)
    ret = lib.NFE_ObterXml(handle, 0, buffer, ctypes.byref(size))
    return ret, decode_buffer(buffer), size.value


def main() -> int:
    base = acbr_home()
    pfx_path = Path(env_value("NFE_PFX_PATH")).expanduser().resolve()
    pfx_password = env_value("NFE_PFX_PASSWORD", allow_empty=True)

    if not pfx_path.exists():
        raise SystemExit(f"ERRO: PFX não encontrado: {pfx_path}")

    lib_path = find_library(base)
    sample_ini = find_sample_ini(base)
    config_ini, workdir = write_base_ini(base)

    print(f"Lib: {lib_path}")
    print(f"INI base sem senha: {config_ini}")
    print(f"INI NF-e: {sample_ini}")
    print(f"PFX: {pfx_path}")
    print(f"Senha informada: <len={len(pfx_password)}>")
    print(f"Saída: {workdir}")

    lib = ctypes.CDLL(str(lib_path))
    configure_signatures(lib)

    handle = ctypes.c_void_p(None)
    ret = lib.NFE_Inicializar(ctypes.byref(handle), str(config_ini).encode("utf-8"), b"")
    print(f"NFE_Inicializar: ret={ret}; handle={handle.value}")
    if ret != 0:
        print("UltimoRetorno:", ultimo_retorno(lib, handle))
        return ret

    try:
        print("\n== Aplicando configurações via NFE_ConfigGravarValor ==")
        configs = [
            ("DFe", "SSLCryptLib", "1"),
            ("DFe", "SSLHttpLib", "3"),
            ("DFe", "SSLXmlSignLib", "4"),
            ("DFe", "VerificarValidade", "0"),
            ("DFe", "ArquivoPFX", str(pfx_path)),
            ("DFe", "Senha", pfx_password),
        ]
        for secao, chave, valor in configs:
            ret_cfg = gravar_valor(lib, handle, secao, chave, valor)
            printable = f"<len={len(valor)}>" if chave == "Senha" else valor
            print(f"ConfigGravarValor {secao}.{chave}: ret={ret_cfg}; valor={printable}")
            if ret_cfg != 0:
                print("UltimoRetorno:", ultimo_retorno(lib, handle))
                return ret_cfg

        print("\n== Configuração efetiva lida da ACBrLib ==")
        for key in ["SSLCryptLib", "SSLHttpLib", "SSLXmlSignLib", "VerificarValidade", "ArquivoPFX", "Senha"]:
            print_config(lib, handle, key, mask=(key == "Senha"))

        # Persistir em INI temporário apenas para depuração. A assinatura usa a configuração já aplicada na lib.
        ret_save = lib.NFE_ConfigGravar(handle, str(config_ini).encode("utf-8"))
        print(f"NFE_ConfigGravar: ret={ret_save}; arquivo={config_ini}")

        ret_load = lib.NFE_CarregarINI(handle, str(sample_ini).encode("utf-8"))
        print(f"NFE_CarregarINI: ret={ret_load}")
        print("UltimoRetorno após CarregarINI:", ultimo_retorno(lib, handle))
        if ret_load != 0:
            return ret_load

        ret_assinar = lib.NFE_Assinar(handle)
        print(f"NFE_Assinar: ret={ret_assinar}")
        print("UltimoRetorno após Assinar:", ultimo_retorno(lib, handle))
        if ret_assinar != 0:
            return ret_assinar

        ret_verificar, msg_verificar, size_verificar = text_response(lib.NFE_VerificarAssinatura, handle)
        print(f"NFE_VerificarAssinatura: ret={ret_verificar}; tamanho={size_verificar}; mensagem={msg_verificar}")

        ret_xml, xml, xml_size = obter_xml(lib, handle)
        print(f"NFE_ObterXml assinado: ret={ret_xml}; tamanho={xml_size}; contem_signature={'<Signature' in xml}")
        if ret_xml == 0 and xml.strip():
            out_xml = workdir / "nfe-assinada-via-configgravarvalor.xml"
            out_xml.write_text(xml, encoding="utf-8")
            print(f"XML assinado salvo: {out_xml}")

        ret_limpar = lib.NFE_LimparLista(handle)
        print(f"NFE_LimparLista: ret={ret_limpar}")
        return 0 if ret_xml == 0 and "<Signature" in xml else 2
    finally:
        ret_finalizar = lib.NFE_Finalizar(handle)
        print(f"NFE_Finalizar: ret={ret_finalizar}")


if __name__ == "__main__":
    raise SystemExit(main())
