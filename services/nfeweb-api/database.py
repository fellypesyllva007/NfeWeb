#!/usr/bin/env python3
"""Utilitários SQLite da NfeWeb API."""

from __future__ import annotations

import os
import sqlite3
import uuid
from pathlib import Path
from typing import Any


DEFAULT_DB_PATH = "/var/lib/nfeweb/nfeweb.sqlite3"


class DatabaseError(RuntimeError):
    pass


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


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {key: row[key] for key in row.keys()}


def resolve_secret(secret_ref: str | None) -> str:
    if not secret_ref:
        return ""
    if secret_ref.startswith("env:"):
        return env(secret_ref.split(":", 1)[1], "")
    if secret_ref == "env-or-local-lab-secret":
        return env("NFE_PFX_PASSWORD", "")
    raise DatabaseError(f"Tipo de segredo não suportado: {secret_ref}")


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
        (emitter_id, tenant_id, "92390477000149", "RAZAO SOCIAL - LAB ACBr", "FANTASIA", "SP", "1", "active"),
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
            "env:NFE_PFX_PASSWORD",
            1,
        ),
    )

    conn.execute(
        """
        UPDATE fiscal_certificates
           SET password_secret_ref = 'env:NFE_PFX_PASSWORD'
         WHERE id = ?
           AND password_secret_ref = 'env-or-local-lab-secret'
        """,
        (cert_id,),
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


def db_status() -> dict[str, Any]:
    path = db_path()
    with connect(path) as conn:
        migration = conn.execute(
            "SELECT version, name, applied_at FROM schema_migrations ORDER BY version DESC LIMIT 1"
        ).fetchone()
        return {
            "db_path": str(path),
            "exists": path.exists(),
            "size_bytes": path.stat().st_size if path.exists() else 0,
            "latest_migration": row_to_dict(migration) if migration else None,
            "stats": stats(conn),
        }


def list_emitters() -> list[dict[str, Any]]:
    with connect(db_path()) as conn:
        rows = conn.execute(
            """
            SELECT
                e.id,
                e.tenant_id,
                t.nome AS tenant_nome,
                t.slug AS tenant_slug,
                e.cnpj,
                e.razao_social,
                e.nome_fantasia,
                e.uf,
                e.ambiente,
                e.status,
                cfg.modelo,
                cfg.serie,
                seq.proximo_numero,
                cert.pfx_path AS certificado_pfx_path,
                cert.is_active AS certificado_ativo
            FROM fiscal_emitters e
            JOIN tenants t ON t.id = e.tenant_id
            LEFT JOIN fiscal_configs cfg ON cfg.emitter_id = e.id AND cfg.is_active = 1
            LEFT JOIN fiscal_sequences seq ON seq.emitter_id = e.id
                AND seq.modelo = cfg.modelo
                AND seq.serie = cfg.serie
                AND seq.ambiente = cfg.ambiente
            LEFT JOIN fiscal_certificates cert ON cert.emitter_id = e.id AND cert.is_active = 1
            ORDER BY t.nome, e.razao_social
            """
        ).fetchall()
        return [row_to_dict(row) for row in rows]


def get_emitter_context(emitter_id: str, modelo: str = "55") -> dict[str, Any]:
    if not emitter_id:
        raise DatabaseError("emitter_id é obrigatório")

    with connect(db_path()) as conn:
        row = conn.execute(
            """
            SELECT
                e.id AS emitter_id,
                e.tenant_id,
                t.nome AS tenant_nome,
                t.slug AS tenant_slug,
                e.cnpj,
                e.razao_social,
                e.nome_fantasia,
                e.uf AS emitter_uf,
                e.ambiente AS emitter_ambiente,
                e.status AS emitter_status,
                cfg.id AS config_id,
                cfg.modelo,
                cfg.serie,
                cfg.ambiente AS config_ambiente,
                cfg.uf AS config_uf,
                cfg.path_schemas,
                cfg.path_salvar,
                seq.id AS sequence_id,
                seq.proximo_numero,
                cert.id AS certificate_id,
                cert.pfx_path,
                cert.password_secret_ref,
                cert.is_active AS certificate_active
            FROM fiscal_emitters e
            JOIN tenants t ON t.id = e.tenant_id
            LEFT JOIN fiscal_configs cfg ON cfg.emitter_id = e.id
                AND cfg.modelo = ?
                AND cfg.is_active = 1
            LEFT JOIN fiscal_sequences seq ON seq.emitter_id = e.id
                AND seq.modelo = cfg.modelo
                AND seq.serie = cfg.serie
                AND seq.ambiente = cfg.ambiente
            LEFT JOIN fiscal_certificates cert ON cert.emitter_id = e.id
                AND cert.is_active = 1
            WHERE e.id = ?
              AND e.status = 'active'
            LIMIT 1
            """,
            (modelo, emitter_id),
        ).fetchone()

    if row is None:
        raise DatabaseError(f"Emitente ativo não encontrado: {emitter_id}")

    data = row_to_dict(row)
    if not data.get("config_id"):
        raise DatabaseError(f"Configuração fiscal ativa não encontrada para emitente {emitter_id} modelo {modelo}")
    if not data.get("certificate_id"):
        raise DatabaseError(f"Certificado ativo não encontrado para emitente {emitter_id}")

    data["pfx_password"] = resolve_secret(data.get("password_secret_ref"))
    return data


def public_emitter_context(ctx: dict[str, Any]) -> dict[str, Any]:
    return {
        "tenant_id": ctx.get("tenant_id"),
        "tenant_nome": ctx.get("tenant_nome"),
        "tenant_slug": ctx.get("tenant_slug"),
        "emitter_id": ctx.get("emitter_id"),
        "cnpj": ctx.get("cnpj"),
        "razao_social": ctx.get("razao_social"),
        "nome_fantasia": ctx.get("nome_fantasia"),
        "uf": ctx.get("config_uf") or ctx.get("emitter_uf"),
        "ambiente": ctx.get("config_ambiente") or ctx.get("emitter_ambiente"),
        "modelo": ctx.get("modelo"),
        "serie": ctx.get("serie"),
        "proximo_numero": ctx.get("proximo_numero"),
        "config_id": ctx.get("config_id"),
        "sequence_id": ctx.get("sequence_id"),
        "certificado": {
            "certificate_id": ctx.get("certificate_id"),
            "pfx_path": ctx.get("pfx_path"),
            "senha_configurada": bool(ctx.get("pfx_password")),
        },
    }
