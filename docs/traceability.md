# Matriz do enunciado e apresentacao

## Atendimento aos requisitos do PDF

| Requisito | Implementacao | Evidencia durante a apresentacao |
|---|---|---|
| Frontend interativo e responsivo em React/Next.js | Next.js App Router e React; componentes Material UI e classes/utilitarios Tailwind; a interface e adaptavel a telas menores. | Acessar a pagina, entrar e mostrar o painel; reduzir a largura da janela. |
| Backend Node.js/Express e regras de negocio | `server.js` fornece API REST, autentica usuarios, aplica papeis e conduz os estados do relatorio. | Mostrar login, cadastro de despesa, validacao e assinatura. |
| Banco de dados em nuvem | MongoDB persiste colaboradores, chaves publicas, despesas e metadados de recibos. Compose local executa Mongo autenticado. | Mostrar os dados pelos fluxos da aplicacao; nao expor credenciais ou dados reais. |
| Senhas protegidas e JWT | Senhas com scrypt, JWT HMAC com validade de 8 horas, limitacao de tentativas e contas demo bloqueadas em producao por padrao. | Fazer login e demonstrar perfis; apontar a configuracao segura no README. |
| Criptografia e integridade | SHA-256 do recibo e do conteudo; chave ECDSA P-256 criada pela Web Crypto no navegador; Node verifica a assinatura. | Assinar um relatorio validado e clicar em verificar como gerente. |
| Defesas contra riscos web | Helmet, CSP na API, validacao de campos/arquivos, limite de tamanho, consultas Mongo estruturadas e restricao por papel. | Explicar as protecoes no codigo/README, sem tentar explorar a aplicacao em aula. |
| Docker e isolamento em tres containers | `docker-compose.yml` sobe `web` (Nginx), `api` (Node) e `mongo`; Mongo e API nao publicam portas no host. | Mostrar o Compose e os tres servicos, se Docker estiver disponivel. |
| Cadastro/edicao de colaboradores | Tela Funcionarios para gerente. | Criar ou editar um colaborador de teste. |
| Relatorio e recibo | Tela Nova despesa aceita PDF/JPG/PNG ate 8 MB e calcula hash SHA-256. | Enviar um arquivo ficticio. |
| Revisao e notificacao | Gerente valida; Nodemailer envia e-mail se SMTP estiver configurado. Sem SMTP, a funcao de e-mail nao envia notificacoes. | Validar como gerente. Se SMTP estiver habilitado, confirmar a mensagem recebida. |
| Lista, assinatura e verificacao | Lista por perfil; colaborador assina; gerente revalida assinatura e hash do recibo. | Demonstrar a trilha completa, incluindo resultado valido. |
| HTTPS | GitHub Pages serve o frontend em HTTPS; Render serve a API em HTTPS. | Abrir os links publicados. |

## Pontos que exigem explicacao honesta

- A assinatura do prototipo usa chave criada localmente no navegador; ela nao verifica a identidade civil do titular e nao e um certificado ICP-Brasil. Portanto, apresentar como assinatura criptografica demonstrativa, sem afirmar que ela por si so comprova nao repudio ou validade juridica em qualquer situacao.
- O envio de e-mails depende de configuracao SMTP no ambiente de hospedagem.
- O Compose demonstra os tres servicos localmente. Na publicacao academica atual, o frontend esta no GitHub Pages e a API/MongoDB sao servicos hospedados separadamente.
- A API hospedada precisa ter as variaveis `DEMO_USERS_ENABLED=true`, `DEMO_MANAGER_PASSWORD` e `DEMO_EMPLOYEE_PASSWORD` configuradas para liberar as contas demo. Sem as senhas, o login demo esta intencionalmente bloqueado.

## Roteiro de 5 minutos

1. Apresente o objetivo: registrar despesas, aprovar recibos e detectar alteracoes com hashes e assinatura digital.
2. Entre como colaborador com uma conta de demonstracao configurada e gere/vincule a chave na area Seguranca. Explique que a chave privada fica no navegador.
3. Crie uma despesa ficticia e envie um recibo sem dados pessoais.
4. Entre como gerente em outra sessao/perfil do navegador, abra Relatorios, confira o recibo e valide a despesa.
5. Volte ao colaborador, assine o relatorio e mostre que o estado muda para Assinado.
6. Volte ao gerente, use Verificar e mostre que a assinatura e o hash do recibo estao validos.
7. Feche explicando scrypt/JWT, MongoDB, Docker, Helmet/CSP, HTTPS e as limitacoes juridicas da identidade/chave demonstrativa.

Use dados ficticios e prepare previamente uma despesa simples. Se houver apenas um navegador, saia e entre com o outro perfil entre cada etapa. Nao mostre valores de segredos, senhas administrativas ou informacoes reais.
