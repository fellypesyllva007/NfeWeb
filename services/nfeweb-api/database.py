#!/usr/bin/env python3
"""Utilitários SQLite da NfeWeb API."""

from __future__ import annotations

import os
import sqlite3
import uuid
from pathlib import Path
from typing import Any


DEFAULT_DB_PATH = "/var/lib/nfeweb/nfeweb.sqlite3"


def env(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


def db_path() -> Path:
    return Path(env("NFEWEB_DB_PATH", DEFAULT_DB_PATH)).expanduser()


def schema_path() -> Path:
    return Path(__file__).resolve().parent / "schema.sql"


def connect(path: Path | None = None) -> sqlite3.Connection:
    target = path or db_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def apply_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(schema_path().read_text(encoding="utf-8"))
    conn.commit()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:24]}"


def seed_lab(conn: sqlite3.Connection) -> dict[str, Any]:
    tenant_id = "tenant_lab"
    emitter_id = "emit_lab_acbr_sample"
    cert_id = "cert_lab_acbr_sample"
    config_id = "cfg_lab_nfe_55_1"
    seq_id = "seq_lab_nfe_55_1"

    conn.execute(
        """
        INSERT OR IGNORE INTO tenants(id, nome, slug, status)
        VALUES (?, ?, ?, ?)
        """,
        (tenant_id, "Laboratório ACBr", "lab-acbr", "active"),
    )

    conn.execute(
        """
        INSERT OR IGNORE INTO fiscal_emitters(
            id, tenant_id, cnpj, razao_social, nome_fantasia, uf, ambiente, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            emitter_id,
            tenant_id,
            "92390477000149",
            "RAZAO SOCIAL - LAB ACBr",
            "FANTASIA",
            "SP",
            "1",
            "active",
        ),
    )

    conn.execute(
        """
        INSERT OR IGNORE INTO fiscal_certificates(
            id, tenant_id, emitter_id, kind, pfx_path, password_secret_ref, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            cert_id,
            tenant_id,
            emitter_id,
            "A1",
            "/home/ubuntu/certificados/nfe-teste-acbr-sample-1234.pfx",
            "env-or-local-lab-secret",
            1,
        ),
    )

    conn.execute(
        """
        INSERT OR IGNORE INTO fiscal_configs(
            id, tenant_id, emitter_id, modelo, serie, ambiente, uf, path_schemas, path_salvar, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            config_id,
            tenant_id,
            emitter_id,
            "55",
            1,
            "1",
            "SP",
            env("NFE_PATH_SCHEMAS", "/home/ubuntu/acbr-arm64-lab/ACBr/Exemplos/ACBrDFe/Schemas/NFe"),
            env("NFE_PATH_SALVAR", "/var/lib/nfeweb/notas"),
            1,
        ),
    )

    conn.execute(
        """
        INSERT OR IGNORE INTO fiscal_sequences(
            id, tenant_id, emitter_id, modelo, serie, ambiente, proximo_numero, ultimo_numero_emitido
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (seq_id, tenant_id, emitter_id, "55", 1, "1", 1, None),
    )

    conn.commit()
    return {
        "tenant_id": tenant_id,
        "emitter_id": emitter_id,
        "certificate_id": cert_id,
        "config_id": config_id,
        "sequence_id": seq_id,
    }


def stats(conn: sqlite3.Connection) -> dict[str, int]:
    tables = [
        "tenants",
        "users",
        "tenant_users",
        "fiscal_emitters",
        "fiscal_certificates",
        "fiscal_configs",
        "fiscal_sequences",
        "erp_references",
        "fiscal_documents",
        "fiscal_document_artifacts",
        "fiscal_events",
        "fiscal_number_voids",
        "fiscal_logs",
    ]
    result: dict[str, int] = {}
    for table in tables:
        row = conn.execute(f"SELECT COUNT(*) AS total FROM {table}").fetchone()
        result[table] = int(row["total"])
    return result
