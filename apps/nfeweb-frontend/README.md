# NfeWeb Frontend MVP

Frontend inicial do ERP fiscal multiempresa da NfeWeb.

## Stack

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Axios
- Lucide React
- CSS próprio clean e responsivo

## Escopo implementado

- Login administrador mockado
- Login empresa mockado
- Layout administrativo multiempresa
- Layout ERP da empresa
- Cadastro local de empresas/tenants
- Dashboard administrativo
- Dashboard da empresa
- Status fiscal consumindo `/api/health`, `/api/acbr/info` e `/api/db/status`
- Emitentes fiscais consumindo `/api/emitentes`
- Certificado digital, com regra de não expor senha/PFX no frontend
- Configuração fiscal inicial
- NF-e laboratório consumindo operações fiscais atuais
- Placeholders para clientes, produtos, vendas e histórico fiscal

## Rodar em desenvolvimento

```bash
cd apps/nfeweb-frontend
npm install
npm run dev
```

O Vite sobe em `0.0.0.0:5173` e faz proxy de `/api` para `http://127.0.0.1:3333`.

## Build de produção

```bash
cd apps/nfeweb-frontend
npm install
npm run build
```

A saída será gerada em:

```text
dist/
```

## Deploy inicial no Oracle Cloud Ubuntu 22.04 ARM64

Sugestão:

```bash
cd /home/ubuntu/NfeWeb/apps/nfeweb-frontend
npm install
npm run build
sudo mkdir -p /var/www/nfeweb-frontend
sudo rsync -av --delete dist/ /var/www/nfeweb-frontend/
```

O Nginx deve servir `/var/www/nfeweb-frontend` para o frontend e encaminhar `/api/` para `127.0.0.1:3333`.

## Login mockado

Administrador:

```text
/admin/login
admin@nfeweb.local
123456
```

Empresa:

```text
/login
empresa@nfeweb.local
123456
```

A autenticação real ainda deve ser implementada no backend com sessão segura, preferencialmente cookie `HttpOnly`, `Secure` e `SameSite`.

## Observações fiscais

O frontend não deve:

- Exibir senha de certificado digital.
- Manipular PFX diretamente no fluxo comum.
- Chamar ACBrLibNFe diretamente.
- Fazer cálculo fiscal oficial sem validação no backend.

O frontend pode:

- Dar prévia visual de totais.
- Validar campos obrigatórios.
- Guiar a emissão.
- Chamar a NfeWeb API.
- Exibir retornos, rejeições e logs.
