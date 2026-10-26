# AssinaDespesas

Demonstrador acadêmico de gestão de despesas com revisão e assinatura digital verificável. A interface usa Next.js 16 com App Router e é exportada como arquivos estáticos para GitHub Pages. A API continua em Node.js/Express e usa MongoDB.

## Funcionalidades

- Login com senhas armazenadas como hashes scrypt, token assinado HMAC e limitação de tentativas.
- Cadastro, edição e ativação de funcionários com perfis de gerente e colaborador.
- Envio de despesas com recibos PDF, JPG ou PNG de até 8 MB; validação do formato e cálculo do hash SHA-256.
- Fluxo de revisão do gerente, assinatura do colaborador e verificação criptográfica pelo gerente.
- Assinatura ECDSA P-256 via Web Crypto. A chave privada não é exportável e fica no navegador do colaborador; a API armazena a chave pública.
- Avisos por e-mail opcionais com Nodemailer e credenciais SMTP fornecidas em tempo de execução.
- Helmet, validacao de entradas, limite de tentativas, Docker com containers separados e MongoDB autenticado.
- Interface montada com Next.js, componentes Material UI e utilitarios Tailwind CSS.

## Executar localmente

Requisitos: Docker com Compose ou Node.js 22+ e pnpm 11.

### Aplicação completa com Docker

1. Copie `.env.example` para `.env` e configure `JWT_SECRET` e `MONGO_ROOT_PASSWORD` com valores aleatórios fortes.
2. Inicie os tres servicos isolados: servidor web Nginx, API Node/Express e MongoDB autenticado:

   ```sh
   docker compose up --build
   ```

3. Abra `http://localhost:3000`.

O Compose local ativa duas contas ficticias para a demonstracao. As senhas padrao estao apenas no `.env.example`; altere-as em `.env` antes de usar fora do computador local.

### Desenvolvimento da interface Next.js

1. Instale as dependências com `pnpm install`.
2. Em um terminal, inicie a API/MongoDB com Docker: `docker compose up mongo`.
3. Inicie a API na porta 3001 e configure `MONGODB_URI` e `JWT_SECRET` no ambiente. No PowerShell, use `$env:PORT=3001; $env:MONGODB_URI='mongodb://localhost:27017'; $env:JWT_SECRET='<segredo-local-com-32-caracteres-ou-mais>'; pnpm start`.
4. Em outro terminal, configure `NEXT_PUBLIC_API_BASE=http://localhost:3001` e execute `pnpm dev`.

Fora de producao, o backend cria contas de demonstracao quando habilitadas. Em producao, contas demo sao desativadas por padrao. Para habilitar uma demonstracao hospedada, configure `DEMO_USERS_ENABLED=true` e senhas novas e fortes em `DEMO_MANAGER_PASSWORD` e `DEMO_EMPLOYEE_PASSWORD` no painel de segredos do host. O backend atualiza os hashes dessas contas no MongoDB na inicializacao. Nao reutilize as senhas publicadas no `.env.example`.

## Publicação

O workflow `.github/workflows/pages.yml` executa `pnpm build` e publica a pasta `out` no GitHub Pages ao enviar commits para `main`. O `basePath` é configurado automaticamente para o nome do repositório, permitindo servir o projeto em um subcaminho do Pages. Ative **Settings → Pages → Build and deployment → GitHub Actions** no repositório.

O frontend usa `NEXT_PUBLIC_API_BASE` durante o build. O workflow aponta para a API pública do Render. Esse endereço é público e não deve conter credenciais. O Pages hospeda somente os arquivos estáticos; recursos de servidor Next.js não rodam lá. A API e o banco permanecem serviços separados.

No Render, o `Dockerfile` existente constrói o export estático Next.js e executa a API Express, que serve o frontend e os endpoints `/api`. Configure no host:

- `MONGODB_URI`, `MONGODB_DB` e `JWT_SECRET` como variáveis de ambiente secretas.
- `WEB_ORIGIN` com a origem exata do Pages, por exemplo `https://guigoeduardo.github.io`, sem caminho nem barra final.
- `DEMO_USERS_ENABLED=true`, `DEMO_MANAGER_PASSWORD` e `DEMO_EMPLOYEE_PASSWORD` se for apresentar as contas demonstrativas hospedadas. Gere senhas novas; sem isso as duas contas demo ficam bloqueadas.
- Credenciais SMTP apenas se notificações por e-mail forem necessárias.

Nunca coloque segredos no repositório, no código do frontend ou no histórico Git. O endpoint público do Render também pode servir a aplicação Next.js compilada; no Pages, o caminho oficial do frontend inclui o nome do repositório.

## Fluxo de assinatura

1. O colaborador cria uma despesa e envia o recibo. A API calcula o hash SHA-256 do arquivo.
2. O gerente revisa o relatório e o marca como validado.
3. O colaborador cria/vincula a chave no dispositivo e assina os dados do relatório com ECDSA.
4. A API verifica a assinatura antes de marcar o relatório como assinado. O gerente pode verificar novamente a assinatura e o hash do recibo.

As chaves locais ficam no IndexedDB do mesmo navegador e perfil. Limpar os dados do navegador pode tornar a chave indisponível; gere e associe uma nova antes de novas assinaturas.

## Estrutura

- `app/`: App Router Next.js, layout, página inicial e estilos.
- `public/client-controller.js`: controlador de interações do navegador e chamadas à API.
- `public/`: arquivos estáticos copiados para o export do Next.js.
- `server.js`: API, autenticacao, validacao de fluxo, armazenamento e verificacao criptografica.
- `docker-compose.yml`: orquestracao de tres servicos para desenvolvimento local.
- `Dockerfile.api`, `Dockerfile.web`, `nginx.conf`: API, servidor web e proxy reverso no Compose.
- `docs/traceability.md`: matriz de atendimento ao enunciado e roteiro da demonstracao.
- `.github/workflows/pages.yml`: build e publicação no GitHub Pages.

## Limites do protótipo

Este projeto e um demonstrador academico, nao uma plataforma pronta para producao. A assinatura ECDSA prova que a chave privada correspondente assinou os bytes armazenados, e o hash ajuda a detectar alteracoes; a chave criada no navegador nao e uma identidade verificada nem um certificado ICP-Brasil. O codigo, sozinho, nao certifica conformidade juridica, autoria civil ou nao repudio conforme toda a legislacao brasileira. Um uso empresarial real precisa de revisao juridica, identidade e chaves geridas de forma segura, recuperacao e revogacao, logs protegidos, backups, monitoramento, politicas de retencao, TLS e avaliacao de privacidade. Nao coloque dados pessoais, documentos ou despesas reais nesta instancia de demonstracao.

# Alunos
ANDRE FELIPE DE BORBA BARBOSA
EDUARDO MAIK OLIVEIRA
ENZO GABRIEL LOPES OLIVEIRA
GUILHERME EDUARDO GONÇALVES
JOÃO PEDRO TEIXEIRA MONTEIRO
WESLEM FERREIRA DOS SANTOS