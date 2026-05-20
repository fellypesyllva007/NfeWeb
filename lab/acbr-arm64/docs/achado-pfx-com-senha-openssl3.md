# Achado: PFX com senha no ACBrLibNFe ARM64 + OpenSSL 3

Data: 2026-05-20
Ambiente: Oracle Cloud Ampere ARM64, Ubuntu 22.04 arm64
OpenSSL: 3.0.2
ACBrLibNFe: 1.5.0.455

## Resumo final

A ACBrLibNFe ARM64 aceita e usa senha de certificado A1/PFX corretamente.

A assinatura com PFX protegido por senha funcionou quando duas condições foram atendidas:

```text
1. Providers default e legacy do OpenSSL 3 carregados antes da ACBrLibNFe.
2. ArquivoPFX e Senha aplicados em tempo de execução via NFE_ConfigGravarValor.
```

Resultado final validado:

```text
NFE_Assinar: ret=0
NFE_VerificarAssinatura: ret=0
NFE_ObterXml assinado: ret=0
contem_signature=True
```

## Configuração ACBr usada

```text
SSLCryptLib=1
SSLHttpLib=3
SSLXmlSignLib=4
```

Ou seja:

```text
SSLCryptLib = OpenSSL
SSLHttpLib = OpenSSL
SSLXmlSignLib = LibXml2
```

## Configuração dos providers do OpenSSL 3

Antes de carregar a `libacbrnfe_arm64.so`, foi necessário definir:

```bash
export OPENSSL_CONF="/tmp/acbr-arm64-openssl.cnf"
export OPENSSL_MODULES="/usr/lib/aarch64-linux-gnu/ossl-modules"
```

Conteúdo usado em `/tmp/acbr-arm64-openssl.cnf`:

```ini
openssl_conf = openssl_init

[openssl_init]
providers = provider_sect
alg_section = algorithm_sect

[provider_sect]
default = default_sect
legacy = legacy_sect

[default_sect]
activate = 1

[legacy_sect]
activate = 1

[algorithm_sect]
default_properties =
```

## Forma correta de aplicar ArquivoPFX e Senha

O teste bem-sucedido seguiu o padrão dos exemplos oficiais da ACBrLib:

```text
1. NFE_Inicializar com INI base sem ArquivoPFX e sem Senha.
2. NFE_ConfigGravarValor("DFe", "ArquivoPFX", caminho_do_pfx).
3. NFE_ConfigGravarValor("DFe", "Senha", senha_do_pfx).
4. NFE_CarregarINI.
5. NFE_Assinar.
```

Trecho conceitual:

```text
NFE_ConfigGravarValor(handle, "DFe", "SSLCryptLib", "1")
NFE_ConfigGravarValor(handle, "DFe", "SSLHttpLib", "3")
NFE_ConfigGravarValor(handle, "DFe", "SSLXmlSignLib", "4")
NFE_ConfigGravarValor(handle, "DFe", "ArquivoPFX", "/caminho/certificado.pfx")
NFE_ConfigGravarValor(handle, "DFe", "Senha", "1234")
```

## PFX com senha validado

Arquivo:

```text
/home/ubuntu/certificados/nfe-teste-acbr-sample-1234.pfx
```

Senha:

```text
1234
```

OpenSSL CLI validou o arquivo:

```text
MAC: sha256, Iteration 2048
PKCS7 Encrypted data: PBES2, PBKDF2, AES-256-CBC
Shrouded Keybag: PBES2, PBKDF2, AES-256-CBC
```

ACBrLibNFe também leu a senha corretamente:

```text
ConfigGravarValor DFe.Senha: ret=0; valor=<len=4>
Config efetiva DFe.Senha: ret=0; tamanho=4; valor=<len=4>
```

Resultado final:

```text
NFE_Assinar: ret=0
NFE_VerificarAssinatura: ret=0; tamanho=0; mensagem=
NFE_ObterXml assinado: ret=0; tamanho=8471; contem_signature=True
XML assinado salvo: /tmp/acbrlib-nfe-arm64-configvalor-.../nfe-assinada-via-configgravarvalor.xml
NFE_Finalizar: ret=0
```

## Falhas intermediárias observadas

### Falha sem providers OpenSSL 3

Quando o script foi executado sem `OPENSSL_CONF`/`OPENSSL_MODULES` carregando os providers, a assinatura com PFX protegido por senha retornou:

```text
NFE_Assinar: ret=-10
Erro ao ler informações do Certificado.
Provavelmente a senha está errada
error:0308010C:digital envelope routines::unsupported
```

Interpretação:

```text
OpenSSL 3 não tinha providers adequados carregados para processar o PKCS#12 usado no teste.
```

### Falha usando senha somente via INI manual

Antes do teste final, houve falhas ao gravar `Senha=...` diretamente no INI base e inicializar a lib já com esse valor.

O teste final usou o fluxo compatível com os exemplos oficiais:

```text
NFE_Inicializar primeiro;
NFE_ConfigGravarValor depois.
```

Com esse fluxo e providers carregados, a assinatura passou.

## Recomendação para o NfeWeb/fiscal-service

Para o serviço fiscal em Linux ARM64:

```text
1. Exportar OPENSSL_CONF e OPENSSL_MODULES antes do processo carregar a libacbrnfe_arm64.so.
2. Usar SSLCryptLib=1, SSLHttpLib=3, SSLXmlSignLib=4.
3. Inicializar a ACBrLibNFe com INI base sem certificado.
4. Aplicar ArquivoPFX e Senha por NFE_ConfigGravarValor em tempo de execução.
5. Guardar PFX e senha fora do repositório.
6. Em produção, usar certificado A1 ICP-Brasil real e segredo protegido.
```

## Conclusão

A conclusão anterior de que PFX com senha não funcionava foi superada.

Conclusão atual:

```text
ACBrLibNFe ARM64 + OpenSSL 3 + PFX com senha funciona.
```

Desde que:

```text
providers do OpenSSL 3 estejam carregados;
Senha seja aplicada via NFE_ConfigGravarValor;
ArquivoPFX e CNPJ do certificado sejam compatíveis com o XML assinado.
```