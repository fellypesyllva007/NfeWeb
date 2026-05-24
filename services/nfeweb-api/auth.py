#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from http.cookies import SimpleCookie
from typing import Any

from database import connect, db_path, row_to_dict

COOKIE = "nfeweb_session"
ITERATIONS = 260000
TTL_HOURS = 12


class AuthError(RuntimeError):
    pass


def env(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


def now() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(value: datetime) -> str:
    return value.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def from_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def make_password_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(ITERATIONS, base64.b64encode(salt).decode(), base64.b64encode(digest).decode())


def check_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        scheme, iterations, salt_raw, digest_raw = stored.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_raw)
        expected = base64.b64decode(digest_raw)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
        return hmac.compare_digest(expected, actual)
    except Exception:
        return False


def digest_session(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def setup_auth() -> None:
    with connect(db_path()) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS auth_sessions(
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                session_hash TEXT NOT NULL UNIQUE,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_auth_sessions_hash ON auth_sessions(session_hash)")
        seed = [
            ("user_admin_local", env("NFEWEB_ADMIN_EMAIL", "admin@nfeweb.local"), "Administrador NfeWeb", env("NFEWEB_ADMIN_PASSWORD", "123456"), "platform_admin"),
            ("user_empresa_lab", env("NFEWEB_COMPANY_EMAIL", "empresa@nfeweb.local"), "Usuário Empresa Lab", env("NFEWEB_COMPANY_PASSWORD", "123456"), "owner"),
        ]
        for user_id, email, nome, password, role in seed:
            email = email.lower().strip()
            row = conn.execute("SELECT id, password_hash FROM users WHERE email = ?", (email,)).fetchone()
            if row is None:
                conn.execute("INSERT INTO users(id,email,nome,password_hash,status) VALUES(?,?,?,?, 'active')", (user_id, email, nome, make_password_hash(password)))
                linked_user_id = user_id
            else:
                linked_user_id = row["id"]
                if not row["password_hash"]:
                    conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (make_password_hash(password), linked_user_id))
            conn.execute("INSERT OR IGNORE INTO tenant_users(tenant_id,user_id,role) VALUES('tenant_lab',?,?)", (linked_user_id, role))
        conn.commit()


def public_user(conn: Any, user_id: str) -> dict[str, Any]:
    user = conn.execute("SELECT id,email,nome,status,last_login_at FROM users WHERE id = ?", (user_id,)).fetchone()
    if user is None:
        raise AuthError("Usuário não encontrado")
    tenants = conn.execute("""
        SELECT t.id,t.nome,t.slug,t.status,tu.role
        FROM tenant_users tu JOIN tenants t ON t.id = tu.tenant_id
        WHERE tu.user_id = ? ORDER BY t.nome
    """, (user_id,)).fetchall()
    data = row_to_dict(user)
    data["tenants"] = [row_to_dict(row) for row in tenants]
    data["roles"] = [row["role"] for row in tenants]
    data["is_platform_admin"] = "platform_admin" in data["roles"]
    return data


def login(email: str, password: str, kind: str) -> dict[str, Any]:
    setup_auth()
    email = email.lower().strip()
    if not email or not password:
        raise AuthError("E-mail e senha são obrigatórios")
    with connect(db_path()) as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ? AND status = 'active'", (email,)).fetchone()
        if user is None or not check_password(password, user["password_hash"]):
            raise AuthError("Credenciais inválidas")
        data = public_user(conn, user["id"])
        if kind == "admin" and not data["is_platform_admin"]:
            raise AuthError("Usuário sem permissão de administrador")
        if kind == "company" and not data["tenants"]:
            raise AuthError("Usuário não vinculado a uma empresa")
        session = secrets.token_urlsafe(48)
        expires_at = to_iso(now() + timedelta(hours=TTL_HOURS))
        conn.execute("INSERT INTO auth_sessions(id,user_id,session_hash,expires_at) VALUES(?,?,?,?)", ("sess_" + secrets.token_hex(12), user["id"], digest_session(session), expires_at))
        conn.execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", (user["id"],))
        conn.commit()
        return {"session": session, "expires_at": expires_at, "user": public_user(conn, user["id"])}


def make_cookie(session: str) -> str:
    return f"{COOKIE}={session}; Path=/; HttpOnly; SameSite=Lax; Max-Age={TTL_HOURS * 3600}"


def clear_cookie() -> str:
    return f"{COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"


def session_from_cookie(header: str | None) -> str:
    if not header:
        return ""
    cookie = SimpleCookie(); cookie.load(header)
    item = cookie.get(COOKIE)
    return item.value if item else ""


def current_user(header: str | None) -> dict[str, Any] | None:
    session = session_from_cookie(header)
    if not session:
        return None
    setup_auth()
    with connect(db_path()) as conn:
        row = conn.execute("SELECT * FROM auth_sessions WHERE session_hash = ?", (digest_session(session),)).fetchone()
        if row is None or from_iso(row["expires_at"]) <= now():
            return None
        return public_user(conn, row["user_id"])


def logout(header: str | None) -> None:
    session = session_from_cookie(header)
    if not session:
        return
    with connect(db_path()) as conn:
        conn.execute("DELETE FROM auth_sessions WHERE session_hash = ?", (digest_session(session),))
        conn.commit()
