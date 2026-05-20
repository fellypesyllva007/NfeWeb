# Achado: PFX com senha no ACBrLibNFe ARM64 + OpenSSL 3

Data: 2026-05-20
Ambiente: Oracle Cloud Ampere ARM64, Ubuntu 22.04 arm64
OpenSSL: 3.0.2
ACBrLibNFe: 1.5.0.455

## Resumo

A assinatura XML com ACBrLibNFe ARM64 funcionou usando certificado A1/PFX autoassinado sem senha.

Porém, PFX protegido por senha falhou na rotina de leitura do certificado dentro da ACBrLibNFe, mesmo quando o mesmo PFX foi validado com sucesso pelo `openssl pkcs12` no sistema.

## Configuração ACBr usada

```ini
[DFe]
SSLCryptLib=1
SSLHttpLib=3
SSLXmlSignLib=4
ArquivoPFX=/home/ubuntu/certificados/nfe-teste-acbr-sample-1234.pfx
Senha=1234
VerificarValidade=0
```

Configuração efetiva lida pela ACBrLib:

```text
SSLCryptLib=1
SSLHttpLib=3
SSLXmlSignLib=4
ArquivoPFX=/home/ubuntu/certificados/nfe-teste-acbr-sample-1234.pfx
Senha=<mascarada>
VerificarValidade=0
```

## PFX sem senha

Arquivo:

```text
/home/ubuntu/certificados/nfe-teste-acbr-sample.pfx
```

Senha:

```text
vazia
```

Resultado:

```text
NFE_Assinar: ret=0
NFE_VerificarAssinatura: ret=0
NFE_ObterXml assinado: ret=0
contem_signature=True
```

## PFX com senha 123456

Arquivo:

```text
/home/ubuntu/certificados/nfe-teste-autoassinado-openssl3.pfx
```

Senha:

```text
123456
```

O `openssl pkcs12` leu o arquivo corretamente, mas a ACBrLibNFe retornou:

```text
NFE_Assinar: ret=-10
Erro ao ler informações do Certificado.
Provavelmente a senha está errada
error:11800071:PKCS12 routines::mac verify failure
```

## PFX com senha 1234

Arquivo:

```text
/home/ubuntu/certificados/nfe-teste-acbr-sample-1234.pfx
```

Senha:

```text
1234
```

O `openssl pkcs12` leu o arquivo corretamente, mas a ACBrLibNFe retornou:

```text
NFE_Assinar: ret=-10
Erro ao ler informações do Certificado.
Provavelmente a senha está errada
error:11800071:PKCS12 routines::mac verify failure
```

## Interpretação

O problema não parece estar na geração do PFX nem na senha informada, porque o `openssl pkcs12` consegue abrir o PFX com a senha correta.

O problema parece estar em alguma das camadas abaixo:

```text
ACBrLibNFe ARM64
ACBrOpenSSL / wrapper OpenSSL em FPC
tratamento da senha do PFX
PKCS#12 + OpenSSL 3
```

## Workaround temporário para o lab

Para testes locais de assinatura XML com certificado autoassinado:

```text
usar PFX sem senha
```

Esse workaround não deve ser considerado recomendação de produção.

## Próximos testes sugeridos

1. Testar com certificado A1 ICP-Brasil real com senha.
2. Testar o mesmo PFX com senha em ACBrLibNFe Linux x86_64 para comparar comportamento.
3. Testar ACBrLibNFe ARM64 com OpenSSL 1.1.1, se possível.
4. Testar PFX com `-nomac`.
5. Investigar a rotina de carregamento PKCS#12 no ACBrOpenSSL/FPC.
6. Relatar à comunidade ACBr como possível incompatibilidade específica de PFX com senha em Linux ARM64/OpenSSL 3.
