#!/usr/bin/env python3
"""Operações NF-e offline da NfeWeb API usando ACBrLibNFe via ctypes."""

from __future__ import annotations

import ctypes
import os
from pathlib import Path
from typing import Any, Callable

from database import DatabaseError, get_emitter_context, public_emitter_context


class NFeOfflineError(RuntimeError):
    pass


def env(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


def decode_buffer(buf: ctypes.Array[ctypes.c_char]) -> str:
    return bytes(buf).split(b"\x00", 1)[0].decode("utf-8", errors="replace")


class NFeOffline:
    def __init__(self) -> None:
        self.acbr_home = env("ACBR_HOME")
        self.lib_path = Path(env("ACBR_NFE_LIB")).expanduser()
        self.log_path = env("NFE_LOG_PATH", "/var/log/nfeweb")
        self.path_salvar = env("NFE_PATH_SALVAR", "/var/lib/nfeweb/notas")
        self.path_schemas = env("NFE_PATH_SCHEMAS")
        self.uf = ""
        self.ambiente = ""
        self.cert_path = ""
        self.cert_password = ""
        self.emitter_context: dict[str, Any] | None = None

    def apply_emitter(self, payload: dict[str, Any]) -> dict[str, Any]:
        emitter_id = str(payload.get("emitter_id") or "").strip()
        modelo = str(payload.get("modelo") or "55").strip()
        if not emitter_id:
            raise NFeOfflineError("emitter_id é obrigatório")

        try:
            ctx = get_emitter_context(emitter_id, modelo)
        except DatabaseError as exc:
            raise NFeOfflineError(str(exc)) from exc

        self.emitter_context = ctx
        self.uf = str(ctx.get("config_uf") or ctx.get("emitter_uf") or "")
        self.ambiente = str(ctx.get("config_ambiente") or ctx.get("emitter_ambiente") or "")
        self.path_schemas = str(ctx.get("path_schemas") or self.path_schemas or "")
        self.path_salvar = str(ctx.get("path_salvar") or self.path_salvar or "/var/lib/nfeweb/notas")
        self.cert_path = str(ctx.get("pfx_path") or "")
        self.cert_password = str(ctx.get("pfx_password") or "")
        return public_emitter_context(ctx)

    def sample_ini(self) -> Path:
        if not self.acbr_home:
            raise NFeOfflineError("ACBR_HOME não configurado")
        return Path(self.acbr_home) / "Testes/Recursos/Arquivos-Comparacao/NFeNFCe/INI/NFe-Simples-RT-CST00.INI"

    def resolve_ini(self, payload: dict[str, Any]) -> Path:
        path = Path(str(payload.get("ini_path") or self.sample_ini())).expanduser().resolve()
        if not path.exists():
            raise NFeOfflineError(f"INI não encontrado: {path}")
        return path

    def write_config(self) -> Path:
        workdir = Path("/tmp/nfeweb-api-acbr")
        workdir.mkdir(parents=True, exist_ok=True)
        Path(self.path_salvar).mkdir(parents=True, exist_ok=True)
        path = workdir / "acbrlib-offline.ini"

        lines = [
            "[Principal]",
            "TipoResposta=2",
            "CodificacaoResposta=0",
            "LogNivel=4",
            f"LogPath={self.log_path}",
            "",
            "[NFe]",
            f"Ambiente={self.ambiente}",
            "FormaEmissao=0",
            "SalvarGer=1",
            f"PathSalvar={self.path_salvar}",
            "ExibirErroSchema=1",
            "RetirarAcentos=1",
            "SalvarWS=0",
        ]
        if self.path_schemas:
            lines.append(f"PathSchemas={self.path_schemas}")
        lines += [
            "",
            "[DFe]",
            f"UF={self.uf}",
            "SSLCryptLib=1",
            "SSLHttpLib=3",
            "SSLXmlSignLib=4",
        ]
        if self.path_schemas:
            lines.append(f"PathSchemas={self.path_schemas}")
        lines.append("")
        path.write_text("\n".join(lines), encoding="utf-8")
        return path

    def load_lib(self) -> ctypes.CDLL:
        if not self.lib_path.exists():
            raise NFeOfflineError(f"Biblioteca não encontrada: {self.lib_path}")
        lib = ctypes.CDLL(str(self.lib_path))
        self.configure(lib)
        return lib

    @staticmethod
    def configure(lib: ctypes.CDLL) -> None:
        lib.NFE_Inicializar.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_char_p, ctypes.c_char_p]
        lib.NFE_Inicializar.restype = ctypes.c_int
        lib.NFE_Finalizar.argtypes = [ctypes.c_void_p]
        lib.NFE_Finalizar.restype = ctypes.c_int
        lib.NFE_UltimoRetorno.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
        lib.NFE_UltimoRetorno.restype = ctypes.c_int
        lib.NFE_ConfigGravarValor.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p]
        lib.NFE_ConfigGravarValor.restype = ctypes.c_int
        lib.NFE_CarregarINI.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
        lib.NFE_CarregarINI.restype = ctypes.c_int
        lib.NFE_ObterXml.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
        lib.NFE_ObterXml.restype = ctypes.c_int
        lib.NFE_Assinar.argtypes = [ctypes.c_void_p]
        lib.NFE_Assinar.restype = ctypes.c_int
        lib.NFE_VerificarAssinatura.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
        lib.NFE_VerificarAssinatura.restype = ctypes.c_int
        lib.NFE_ValidarRegrasdeNegocios.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.POINTER(ctypes.c_int)]
        lib.NFE_ValidarRegrasdeNegocios.restype = ctypes.c_int
        lib.NFE_LimparLista.argtypes = [ctypes.c_void_p]
        lib.NFE_LimparLista.restype = ctypes.c_int

    def text_call(self, fn: Callable[..., int], handle: ctypes.c_void_p, size_value: int = 65536) -> tuple[int, str, int]:
        buf = ctypes.create_string_buffer(size_value)
        size = ctypes.c_int(size_value)
        ret = fn(handle, buf, ctypes.byref(size))
        if ret != 0 and size.value > size_value:
            buf = ctypes.create_string_buffer(size.value + 1)
            ret = fn(handle, buf, ctypes.byref(size))
        return ret, decode_buffer(buf), size.value

    def ultimo(self, lib: ctypes.CDLL, handle: ctypes.c_void_p) -> dict[str, Any]:
        ret, msg, size = self.text_call(lib.NFE_UltimoRetorno, handle)
        return {"ret": ret, "mensagem": msg, "tamanho": size}

    def inicializar(self, lib: ctypes.CDLL) -> tuple[ctypes.c_void_p, Path]:
        config = self.write_config()
        handle = ctypes.c_void_p(None)
        ret = lib.NFE_Inicializar(ctypes.byref(handle), str(config).encode(), b"")
        if ret != 0:
            raise NFeOfflineError(f"NFE_Inicializar falhou: ret={ret}; ultimo={self.ultimo(lib, handle)}")
        return handle, config

    def config(self, lib: ctypes.CDLL, handle: ctypes.c_void_p, secao: str, chave: str, valor: str) -> None:
        ret = lib.NFE_ConfigGravarValor(handle, secao.encode(), chave.encode(), str(valor).encode())
        if ret != 0:
            raise NFeOfflineError(f"Config {secao}.{chave} falhou: ret={ret}; ultimo={self.ultimo(lib, handle)}")

    def config_padrao(self, lib: ctypes.CDLL, handle: ctypes.c_void_p) -> None:
        for secao, chave, valor in [
            ("Principal", "TipoResposta", "2"),
            ("DFe", "UF", self.uf),
            ("DFe", "SSLCryptLib", "1"),
            ("DFe", "SSLHttpLib", "3"),
            ("DFe", "SSLXmlSignLib", "4"),
            ("NFe", "Ambiente", self.ambiente),
            ("NFe", "PathSalvar", self.path_salvar),
        ]:
            self.config(lib, handle, secao, chave, valor)
        if self.path_schemas:
            self.config(lib, handle, "DFe", "PathSchemas", self.path_schemas)
            self.config(lib, handle, "NFe", "PathSchemas", self.path_schemas)

    def carregar_ini(self, lib: ctypes.CDLL, handle: ctypes.c_void_p, ini_path: Path) -> dict[str, Any]:
        ret = lib.NFE_CarregarINI(handle, str(ini_path).encode())
        ultimo = self.ultimo(lib, handle)
        if ret != 0:
            raise NFeOfflineError(f"NFE_CarregarINI falhou: ret={ret}; ultimo={ultimo}")
        return {"ret": ret, "ultimo_retorno": ultimo}

    def obter_xml(self, lib: ctypes.CDLL, handle: ctypes.c_void_p, index: int = 0) -> dict[str, Any]:
        buf_size = 512 * 1024
        buf = ctypes.create_string_buffer(buf_size)
        size = ctypes.c_int(buf_size)
        ret = lib.NFE_ObterXml(handle, index, buf, ctypes.byref(size))
        if ret != 0 and size.value > buf_size:
            buf = ctypes.create_string_buffer(size.value + 1)
            ret = lib.NFE_ObterXml(handle, index, buf, ctypes.byref(size))
        xml = decode_buffer(buf)
        ultimo = self.ultimo(lib, handle)
        if ret != 0:
            raise NFeOfflineError(f"NFE_ObterXml falhou: ret={ret}; ultimo={ultimo}")
        return {"ret": ret, "tamanho": size.value, "xml_prefix": xml[:160], "xml": xml, "ultimo_retorno": ultimo}

    def limpar(self, lib: ctypes.CDLL, handle: ctypes.c_void_p) -> dict[str, Any]:
        ret = lib.NFE_LimparLista(handle)
        ultimo = self.ultimo(lib, handle)
        if ret != 0:
            raise NFeOfflineError(f"NFE_LimparLista falhou: ret={ret}; ultimo={ultimo}")
        return {"ret": ret, "ultimo_retorno": ultimo}

    def executar_carregar_ini(self, payload: dict[str, Any]) -> dict[str, Any]:
        emitente = self.apply_emitter(payload)
        ini_path = self.resolve_ini(payload)
        include_xml = bool(payload.get("include_xml", True))
        index = int(payload.get("index", 0))
        handle = ctypes.c_void_p(None)
        lib = None
        try:
            lib = self.load_lib()
            handle, config_path = self.inicializar(lib)
            self.config_padrao(lib, handle)
            carregar = self.carregar_ini(lib, handle, ini_path)
            xml = self.obter_xml(lib, handle, index)
            limpar = self.limpar(lib, handle)
            if not include_xml:
                xml.pop("xml", None)
            return {"emitente": emitente, "ini_path": str(ini_path), "config_path": str(config_path), "carregar_ini": carregar, "obter_xml": xml, "limpar_lista": limpar}
        finally:
            if lib is not None and handle.value:
                lib.NFE_Finalizar(handle)

    def executar_assinar(self, payload: dict[str, Any]) -> dict[str, Any]:
        emitente = self.apply_emitter(payload)
        ini_path = self.resolve_ini(payload)
        include_xml = bool(payload.get("include_xml", True))
        index = int(payload.get("index", 0))
        pfx = Path(self.cert_path).expanduser().resolve()
        if not pfx.exists():
            raise NFeOfflineError(f"PFX não encontrado: {pfx}")
        handle = ctypes.c_void_p(None)
        lib = None
        try:
            lib = self.load_lib()
            handle, config_path = self.inicializar(lib)
            self.config_padrao(lib, handle)
            self.config(lib, handle, "DFe", "ArquivoPFX", str(pfx))
            self.config(lib, handle, "DFe", "Senha", self.cert_password)
            self.config(lib, handle, "DFe", "VerificarValidade", "0")
            carregar = self.carregar_ini(lib, handle, ini_path)
            ret_assinar = lib.NFE_Assinar(handle)
            ultimo_assinar = self.ultimo(lib, handle)
            if ret_assinar != 0:
                raise NFeOfflineError(f"NFE_Assinar falhou: ret={ret_assinar}; ultimo={ultimo_assinar}")
            ret_ver, msg_ver, size_ver = self.text_call(lib.NFE_VerificarAssinatura, handle)
            if ret_ver != 0:
                raise NFeOfflineError(f"NFE_VerificarAssinatura falhou: ret={ret_ver}; mensagem={msg_ver}")
            xml = self.obter_xml(lib, handle, index)
            xml["contem_signature"] = "<Signature" in xml.get("xml", "")
            limpar = self.limpar(lib, handle)
            if not include_xml:
                xml.pop("xml", None)
            return {"emitente": emitente, "ini_path": str(ini_path), "config_path": str(config_path), "certificado": {"pfx_path": str(pfx), "senha_len": len(self.cert_password)}, "carregar_ini": carregar, "assinar": {"ret": ret_assinar, "ultimo_retorno": ultimo_assinar}, "verificar_assinatura": {"ret": ret_ver, "mensagem": msg_ver, "tamanho": size_ver}, "obter_xml": xml, "limpar_lista": limpar}
        finally:
            if lib is not None and handle.value:
                lib.NFE_Finalizar(handle)

    def executar_validar_regras(self, payload: dict[str, Any]) -> dict[str, Any]:
        emitente = self.apply_emitter(payload)
        ini_path = self.resolve_ini(payload)
        handle = ctypes.c_void_p(None)
        lib = None
        try:
            lib = self.load_lib()
            handle, config_path = self.inicializar(lib)
            self.config_padrao(lib, handle)
            carregar = self.carregar_ini(lib, handle, ini_path)
            ret, mensagem, tamanho = self.text_call(lib.NFE_ValidarRegrasdeNegocios, handle, 65536)
            limpar = self.limpar(lib, handle)
            return {"emitente": emitente, "ini_path": str(ini_path), "config_path": str(config_path), "carregar_ini": carregar, "validar_regras": {"ret": ret, "mensagem": mensagem, "tamanho": tamanho}, "limpar_lista": limpar}
        finally:
            if lib is not None and handle.value:
                lib.NFE_Finalizar(handle)
