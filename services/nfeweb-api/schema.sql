-- NfeWeb / ERPWeb fiscal core schema
-- SQLite inicial para laboratório e MVP.
-- Futuro: migrar para PostgreSQL mantendo a mesma modelagem lógica.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tenant representa uma empresa/conta dentro do ERPWeb.
-- Um tenant pode ter usuários, emitentes fiscais, clientes, produtos, vendas etc.
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Usuários que futuramente farão login no ERPWeb.
-- Senha não é guardada em texto puro; usar password_hash quando implementarmos autenticação.
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    password_hash TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Relação N:N usuário <-> tenant.
-- Permite usuário acessar uma ou mais empresas do ERPWeb.
CREATE TABLE IF NOT EXISTS tenant_users (
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, user_id)
);

-- Emitente fiscal: empresa/CNPJ que emite NF-e/NFC-e.
-- Normalmente ligado ao tenant principal, mas pode haver mais de um emitente por tenant.
CREATE TABLE IF NOT EXISTS fiscal_emitters (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cnpj TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    uf TEXT NOT NULL,
    inscricao_estadual TEXT,
    inscricao_municipal TEXT,
    regime_tributario TEXT,
    ambiente TEXT NOT NULL DEFAULT '1', -- 1=produção, 2=homologação conforme ACBrLib/SEFAZ
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, cnpj)
);

-- Certificados A1 por emitente.
-- No MVP guardamos caminho do PFX e referência de senha.
-- Produção: senha deve ir para cofre/secret manager, não para coluna aberta.
CREATE TABLE IF NOT EXISTS fiscal_certificates (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    emitter_id TEXT NOT NULL REFERENCES fiscal_emitters(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'A1',
    pfx_path TEXT NOT NULL,
    password_secret_ref TEXT,
    subject TEXT,
    issuer TEXT,
    serial_number TEXT,
    valid_from TEXT,
    valid_until TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fiscal_certificates_emitter_active
ON fiscal_certificates(emitter_id, is_active);

-- Configuração fiscal por emitente/modelo.
CREATE TABLE IF NOT EXISTS fiscal_configs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    emitter_id TEXT NOT NULL REFERENCES fiscal_emitters(id) ON DELETE CASCADE,
    modelo TEXT NOT NULL DEFAULT '55', -- 55 NF-e, 65 NFC-e
    serie INTEGER NOT NULL DEFAULT 1,
    ambiente TEXT NOT NULL DEFAULT '1',
    uf TEXT NOT NULL,
    path_schemas TEXT,
    path_salvar TEXT,
    acbr_options_json TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (emitter_id, modelo, serie, ambiente)
);

-- Controle de numeração por emitente/modelo/série/ambiente.
-- Deve ser atualizado com transação para evitar duplicidade.
CREATE TABLE IF NOT EXISTS fiscal_sequences (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    emitter_id TEXT NOT NULL REFERENCES fiscal_emitters(id) ON DELETE CASCADE,
    modelo TEXT NOT NULL DEFAULT '55',
    serie INTEGER NOT NULL,
    ambiente TEXT NOT NULL,
    proximo_numero INTEGER NOT NULL DEFAULT 1,
    ultimo_numero_emitido INTEGER,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (emitter_id, modelo, serie, ambiente)
);

-- Referências para entidades do ERPWeb.
-- O módulo fiscal não precisa duplicar cadastro de cliente/produto/venda agora.
-- Guardamos IDs externos para integração futura.
CREATE TABLE IF NOT EXISTS erp_references (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- customer, product, sale, invoice_order, etc.
    external_id TEXT NOT NULL,
    display_name TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, entity_type, external_id)
);

-- Documento fiscal emitido/gerado.
CREATE TABLE IF NOT EXISTS fiscal_documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    emitter_id TEXT NOT NULL REFERENCES fiscal_emitters(id) ON DELETE CASCADE,
    modelo TEXT NOT NULL DEFAULT '55',
    serie INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    ambiente TEXT NOT NULL,
    chave_acesso TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    erp_sale_ref_id TEXT REFERENCES erp_references(id) ON DELETE SET NULL,
    destinatario_doc TEXT,
    destinatario_nome TEXT,
    valor_total REAL,
    xml_gerado_path TEXT,
    xml_assinado_path TEXT,
    xml_autorizado_path TEXT,
    danfe_pdf_path TEXT,
    protocolo_autorizacao TEXT,
    recibo TEXT,
    motivo_rejeicao TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (emitter_id, modelo, serie, numero, ambiente),
    UNIQUE (chave_acesso)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_documents_tenant_status
ON fiscal_documents(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_fiscal_documents_emitter_numero
ON fiscal_documents(emitter_id, modelo, serie, numero, ambiente);

-- Guarda snapshots de XML e outros artefatos sem obrigar tudo ficar em BLOB.
-- Preferência: salvar arquivo em disco/object storage e guardar hash/caminho.
CREATE TABLE IF NOT EXISTS fiscal_document_artifacts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES fiscal_documents(id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL, -- xml_gerado, xml_assinado, xml_autorizado, danfe_pdf, request, response
    file_path TEXT,
    sha256 TEXT,
    content_type TEXT,
    size_bytes INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fiscal_document_artifacts_document
ON fiscal_document_artifacts(document_id, artifact_type);

-- Retornos/rejeições/eventos de SEFAZ ou validação local.
CREATE TABLE IF NOT EXISTS fiscal_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id TEXT REFERENCES fiscal_documents(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- validar_regras, assinar, enviar, retorno_sefaz, rejeicao, cancelamento, inutilizacao
    status TEXT NOT NULL,
    code TEXT,
    message TEXT,
    protocol TEXT,
    request_path TEXT,
    response_path TEXT,
    payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fiscal_events_document
ON fiscal_events(document_id, created_at);

CREATE INDEX IF NOT EXISTS idx_fiscal_events_tenant_type
ON fiscal_events(tenant_id, event_type, created_at);

-- Inutilizações de numeração.
CREATE TABLE IF NOT EXISTS fiscal_number_voids (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    emitter_id TEXT NOT NULL REFERENCES fiscal_emitters(id) ON DELETE CASCADE,
    modelo TEXT NOT NULL DEFAULT '55',
    serie INTEGER NOT NULL,
    ambiente TEXT NOT NULL,
    numero_inicial INTEGER NOT NULL,
    numero_final INTEGER NOT NULL,
    justificativa TEXT NOT NULL,
    protocolo TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    xml_path TEXT,
    response_path TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Log fiscal/auditoria interna do módulo.
CREATE TABLE IF NOT EXISTS fiscal_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
    emitter_id TEXT REFERENCES fiscal_emitters(id) ON DELETE SET NULL,
    document_id TEXT REFERENCES fiscal_documents(id) ON DELETE SET NULL,
    level TEXT NOT NULL DEFAULT 'info',
    source TEXT NOT NULL DEFAULT 'nfeweb-api',
    action TEXT NOT NULL,
    message TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fiscal_logs_tenant_created
ON fiscal_logs(tenant_id, created_at);

-- Seed de migração inicial.
INSERT OR IGNORE INTO schema_migrations(version, name)
VALUES (1, 'initial_fiscal_core_schema');
