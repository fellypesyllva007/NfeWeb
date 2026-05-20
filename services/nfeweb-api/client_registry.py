#!/usr/bin/env python3
"""Cadastro local de clientes/emitentes para o laboratório multi-cliente.

Nesta fase o cadastro fica em JSON local, fora do repositório em produção.
Futuro: substituir por banco de dados + cofre de segredos.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


class ClientRegistryError(RuntimeError):
    pass


def env(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


class ClientRegistry:
    def __init__(self, path: str | None = None) -> None:
        self.path = Path(path or env("NFE_CLIENTES_CONFIG", "/etc/nfeweb/clientes.json")).expanduser()

    def load_all(self) -> list[dict[str, Any]]:
        if not self.path.exists():
            raise ClientRegistryError(f"Cadastro de clientes não encontrado: {self.path}")

        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ClientRegistryError(f"Cadastro de clientes JSON inválido: {exc}") from exc

        clientes = raw.get("clientes") if isinstance(raw, dict) else None
        if not isinstance(clientes, list):
            raise ClientRegistryError("Cadastro precisa ter a chave 'clientes' como lista")
        return clientes

    def get(self, cliente_id: str) -> dict[str, Any]:
        if not cliente_id:
            raise ClientRegistryError("cliente_id não informado")

        for cliente in self.load_all():
            if str(cliente.get("cliente_id")) == str(cliente_id):
                if not bool(cliente.get("ativo", True)):
                    raise ClientRegistryError(f"Cliente inativo: {cliente_id}")
                return cliente

        raise ClientRegistryError(f"Cliente não encontrado: {cliente_id}")

    @staticmethod
    def public_view(cliente: dict[str, Any]) -> dict[str, Any]:
        return {
            "cliente_id": cliente.get("cliente_id"),
            "razao_social": cliente.get("razao_social"),
            "cnpj": cliente.get("cnpj"),
            "uf": cliente.get("uf"),
            "ambiente": cliente.get("ambiente"),
            "serie_nfe": cliente.get("serie_nfe"),
            "proximo_numero_nfe": cliente.get("proximo_numero_nfe"),
            "certificado": {
                "pfx_path": cliente.get("pfx_path"),
                "senha_configurada": bool(cliente.get("pfx_password")),
            },
            "ativo": bool(cliente.get("ativo", True)),
        }

    def list_public(self) -> list[dict[str, Any]]:
        return [self.public_view(cliente) for cliente in self.load_all()]
