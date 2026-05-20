# Deploy base NfeWeb API no Ubuntu 22.04 ARM64 com Nginx

Este roteiro prepara o servidor para hospedar a futura API do NfeWeb atrás do Nginx.

Arquitetura:

```text
Internet
  -> Nginx :80/:443
  -> 127.0.0.1:3333
  -> NfeWeb API / fiscal-service
  -> libacbrnfe_arm64.so
```

## 1. Instalar pacotes base

```bash
sudo apt update
sudo apt install -y nginx curl ca-certificates ufw
```

## 2. Criar diretórios operacionais

```bash
sudo mkdir -p /etc/nfeweb/certs
sudo mkdir -p /var/lib/nfeweb/notas
sudo mkdir -p /var/log/nfeweb

sudo chown -R ubuntu:ubuntu /var/lib/nfeweb /var/log/nfeweb
sudo chmod 750 /etc/nfeweb
sudo chmod 700 /etc/nfeweb/certs
```

## 3. Instalar configuração OpenSSL para ACBrLib

A ACBrLibNFe em Ubuntu 22.04 usa OpenSSL 3. Para PFX com senha, os providers precisam estar disponíveis antes do processo carregar a biblioteca.

```bash
sudo cp deploy/systemd/openssl-acbr.cnf /etc/nfeweb/openssl-acbr.cnf
sudo chown root:root /etc/nfeweb/openssl-acbr.cnf
sudo chmod 644 /etc/nfeweb/openssl-acbr.cnf
```

## 4. Instalar arquivo de ambiente

```bash
sudo cp deploy/systemd/nfeweb-api.env.example /etc/nfeweb/nfeweb-api.env
sudo nano /etc/nfeweb/nfeweb-api.env
```

Ajustar principalmente:

```text
ACBR_HOME
ACBR_NFE_LIB
OPENSSL_CONF
OPENSSL_MODULES
NFE_PFX_PATH
NFE_PFX_PASSWORD
NFE_UF
NFE_AMBIENTE
NFE_PATH_SCHEMAS
NFE_PATH_SALVAR
NFE_LOG_PATH
```

Permissões:

```bash
sudo chown root:root /etc/nfeweb/nfeweb-api.env
sudo chmod 600 /etc/nfeweb/nfeweb-api.env
```

## 5. Certificado A1

Copiar o certificado para:

```text
/etc/nfeweb/certs/certificado-a1.pfx
```

Permissões recomendadas:

```bash
sudo chown root:ubuntu /etc/nfeweb/certs/certificado-a1.pfx
sudo chmod 640 /etc/nfeweb/certs/certificado-a1.pfx
```

No lab, foi validado que PFX com senha funciona quando:

```text
OPENSSL_CONF e OPENSSL_MODULES são definidos antes de carregar a lib;
ArquivoPFX e Senha são aplicados via NFE_ConfigGravarValor em tempo de execução.
```

## 6. Instalar Nginx reverse proxy

```bash
sudo cp deploy/nginx/nfeweb-api.conf /etc/nginx/sites-available/nfeweb-api.conf
sudo ln -sf /etc/nginx/sites-available/nfeweb-api.conf /etc/nginx/sites-enabled/nfeweb-api.conf

# opcional: remover default
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx
```

## 7. Instalar systemd service

```bash
sudo cp deploy/systemd/nfeweb-api.service /etc/systemd/system/nfeweb-api.service
sudo systemctl daemon-reload
sudo systemctl enable nfeweb-api
sudo systemctl start nfeweb-api
```

Enquanto o backend real não existir, o `ExecStart` atual é apenas placeholder e mantém o serviço vivo.

Quando a API real for criada, editar:

```bash
sudo systemctl edit --full nfeweb-api
```

E trocar o `ExecStart` para o comando real do backend.

Exemplos:

```ini
ExecStart=/usr/bin/node dist/server.js
```

ou:

```ini
ExecStart=/home/ubuntu/NfeWeb/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 3333
```

Depois:

```bash
sudo systemctl daemon-reload
sudo systemctl restart nfeweb-api
```

## 8. Firewall

Oracle Cloud também tem regras de Security List/NSG. No Ubuntu, liberar Nginx:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

## 9. Verificações

Nginx:

```bash
sudo nginx -t
systemctl status nginx --no-pager
curl -i http://127.0.0.1/
```

API local:

```bash
curl -i http://127.0.0.1:3333/health
```

API via Nginx:

```bash
curl -i http://127.0.0.1/health
curl -i http://127.0.0.1/api/health
```

Logs:

```bash
journalctl -u nfeweb-api -f
sudo tail -f /var/log/nginx/nfeweb-api.access.log
sudo tail -f /var/log/nginx/nfeweb-api.error.log
```

## 10. Próximo passo

Criar a API real/fiscal-service escutando em:

```text
127.0.0.1:3333
```

Endpoints iniciais sugeridos:

```text
GET  /health
GET  /acbr/info
POST /nfe/gerar-chave
POST /nfe/carregar-ini
POST /nfe/assinar
POST /nfe/obter-xml
```
