# AssinaDespesas

Aplicacao demonstrativa para gerenciar funcionarios, registrar despesas com recibos, revisar relatorios e verificar assinaturas digitais. A interface e estativa e pode ser publicada no GitHub Pages; a API Node.js e o MongoDB precisam rodar em um servico separado com HTTPS.

## Funcionalidades

- Login com senhas armazenadas como hashes scrypt, token assinado HMAC e limitacao de tentativas.
- Cadastro, edicao e ativacao de funcionarios com perfis de gerente e colaborador.
- Envio de despesas com recibos PDF, JPG ou PNG de ate 8 MB; verificacao do formato e calculo do hash SHA-256.
- Fluxo de revisao do gerente, assinatura do colaborador e verificacao criptografica pelo gerente.
- Assinatura ECDSA P-256 via Web Crypto. A chave privada e nao exportavel e fica no navegador do colaborador; a API armazena a chave publica.
- Avisos por e-mail opcionais usando Nodemailer e credenciais SMTP fornecidas em tempo de execucao.
- Helmet, limites de entrada, acesso autenticado, Docker Compose e MongoDB.

## Executar localmente

Requisitos: Docker com Compose e Node.js 20+ (para executar sem Docker).

1. Copie `.env.example` para `.env` e defina `JWT_SECRET` e `MONGO_ROOT_PASSWORD` com valores aleatorios fortes. Use uma senha do MongoDB sem caracteres especiais de URL ou codifique-a antes de coloca-la em `MONGO_ROOT_PASSWORD`.
2. Inicie o sistema:

   ```sh
   docker compose up --build
   ```

3. Abra `http://localhost:3000`.

Contas de demonstracao criadas somente quando o banco esta vazio:

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Gerente | `gerente@demo.local` | `Gerente123!` |
| Colaborador | `colaborador@demo.local` | `Colab123!` |

Para rodar o servidor sem Docker, inicie um MongoDB local, instale os pacotes (`npm install`), defina `JWT_SECRET` e `MONGODB_URI`, e execute `npm start`.

## Publicar a interface no GitHub Pages

O workflow `.github/workflows/pages.yml` publica a pasta `public` no Pages ao enviar commits para `main`. No repositorio, configure **Settings → Pages → Build and deployment → GitHub Actions**. O Pages disponibiliza a interface por HTTPS, mas nao executa o servidor Node nem o banco.

Para a interface hospedada funcionar, implante `server.js` e MongoDB em um host de aplicacao, com um dominio HTTPS para a API, e configure:

1. `WEB_ORIGIN` com a origem exata da pagina, por exemplo `https://guigoeduardo.github.io` (sem caminho ou barra final).
2. `MONGODB_URI`, `JWT_SECRET` e credenciais SMTP como secrets do host, nunca no repositorio ou no frontend.
3. `window.APP_API_BASE` em `public/config.js` com a URL HTTPS publica da API, sem barra final; publique o commit depois dessa alteracao.
4. TLS na API por meio do host ou de um proxy reverso com certificado valido. Configure o host para nao aceitar HTTP publico.

O endpoint da API deve aceitar apenas a origem configurada em `WEB_ORIGIN`. A URL do frontend e publica, portanto as contas de demonstracao sao apenas para desenvolvimento local. Remova ou substitua as contas demonstrativas antes de disponibilizar o backend publicamente; nunca use dados reais no ambiente de exemplo.

## Fluxo de assinatura

1. O colaborador cria uma despesa e envia o recibo. A API calcula o hash SHA-256 do arquivo.
2. O gerente revisa o relatorio e o marca como validado.
3. O colaborador gera/vincula sua chave no dispositivo e assina os dados do relatorio com ECDSA.
4. A API verifica a assinatura antes de alterar o estado para assinado. O gerente pode executar a verificacao posteriormente; a tela mostra o resultado e o hash dos dados assinados.

As chaves locais ficam no IndexedDB do mesmo navegador e perfil. Limpar os dados do navegador pode tornar a chave indisponivel; gere uma nova e associe-a antes de novas assinaturas.

## Estrutura

- `public/`: interface responsiva e cliente Web Crypto.
- `server.js`: API, autenticacao, validacao de fluxo, armazenamento e verificacao criptografica.
- `docker-compose.yml`: servicos da aplicacao e do MongoDB autenticado.
- `.github/workflows/pages.yml`: publicacao da interface estatica.

## Limites do prototipo

Este projeto e um demonstrador academico, nao uma plataforma pronta para producao. A assinatura ECDSA prova que a chave privada correspondente assinou os bytes armazenados, e o hash ajuda a detectar alteracoes; a chave criada no navegador nao e uma identidade verificada nem um certificado ICP-Brasil. Isso, isoladamente, nao permite declarar validade juridica, autoria civil ou nao repudio em conformidade com toda a legislacao brasileira. Um uso empresarial real precisa de revisao juridica, gestao segura de identidade e chaves, recuperacao e revogacao, logs protegidos, backups, monitoramento, politicas de retencao, configuracao TLS e avaliacao de privacidade. Nao coloque dados pessoais, documentos ou despesas reais nesta instancia de demonstracao.
