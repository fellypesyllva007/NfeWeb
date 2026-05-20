# Ambientes ACBrLib vs SEFAZ NF-e

Data: 2026-05-20
Contexto: ACBrLibNFe em Linux ARM64, NfeWeb API, NF-e modelo 55

## Objetivo

Este documento registra a diferença entre o valor de ambiente usado na configuração da ACBrLib e o valor `tpAmb` usado no XML/retornos da SEFAZ.

Essa distinção é crítica porque já causou uma falha real de inicialização quando foi usado `Ambiente=2` diretamente na ACBrLib.

## Convenção da ACBrLib

A ACBrLib segue o enum Pascal:

```pascal
TpcnTipoAmbiente = (taProducao, taHomologacao)
```

Como enums Pascal sem valor explícito iniciam em zero:

```text
taProducao    = 0
taHomologacao = 1
```

Portanto, na configuração da ACBrLib:

```text
Ambiente=0 -> Produção
Ambiente=1 -> Homologação
```

## Evidência local no código ACBr

Comando executado no ambiente:

```bash
export ACBR_HOME="$HOME/acbr-arm64-lab/ACBr"

grep -R "TpcnTipoAmbiente" -n "$ACBR_HOME" | head -20

grep -R "taProducao.*taHomologacao\|taHomologacao.*taProducao" -n "$ACBR_HOME" | head -20
```

Trechos encontrados:

```text
ACBrMDFe/Delphi/Frm_ACBrMDFe.pas:
// TpcnTipoAmbiente = (taProducao, taHomologacao)

ACBrMDFe/Lazarus/Frm_ACBrMDFe.pas:
// TpcnTipoAmbiente = (taProducao, taHomologacao)

Projetos/ACBrLib/Demos/C#/NFe/Demo/ACBrLib.NFe.Demo/FrmMain.cs:
ACBrNFe.Config.Ambiente = rdbHomologacao.Checked ? TipoAmbiente.taHomologacao : TipoAmbiente.taProducao;
```

## Convenção da SEFAZ/XML NF-e

No XML NF-e e nos retornos da SEFAZ, o campo equivalente é `tpAmb`.

Convenção fiscal:

```text
tpAmb=1 -> Produção
tpAmb=2 -> Homologação
```

## Mapeamento correto

| Contexto | Produção | Homologação |
|---|---:|---:|
| ACBrLib `Ambiente` | 0 | 1 |
| XML/SEFAZ `tpAmb` | 1 | 2 |

## Erro observado com valor incorreto

Quando o endpoint `POST /api/nfe/status-servico` tentou forçar homologação usando:

```ini
[NFe]
Ambiente=2
```

A ACBrLib falhou ainda na inicialização:

```text
NFE_Inicializar falhou: ret=-3
UltimoRetorno: ret=-1; mensagem=''; tamanho=65536
```

Conclusão:

```text
Ambiente=2 é inválido para a configuração ACBrLib.
```

## Correção aplicada

O endpoint `POST /api/nfe/status-servico` deve forçar homologação usando:

```text
Ambiente ACBrLib = 1
```

E pode expor no retorno da API:

```json
{
  "ambiente_acbrlib": "1",
  "ambiente_nome": "homologacao",
  "tpAmb_sefaz_equivalente": "2"
}
```

## Resultado após correção

Com `Ambiente ACBrLib=1`, a ACBrLib inicializou corretamente e chegou à URL oficial de homologação da SEFAZ SP:

```text
https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx
```

O retorno foi:

```text
status_servico.ret: -10
Erro HTTP: 403
403 - Forbidden: Access is denied.
```

Isso confirma que o problema posterior não era mais enum de ambiente, mas autorização/certificado para acesso ao webservice oficial.

## Regra para o projeto

Sempre que persistirmos ambiente para uso pela ACBrLib, usar:

```text
0 = produção
1 = homologação
```

Sempre que exibirmos ou gerarmos dado fiscal XML/SEFAZ, lembrar que:

```text
1 = produção
2 = homologação
```

A API deve deixar claro, quando necessário, qual convenção está sendo retornada.