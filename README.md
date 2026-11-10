# MascotDex API — Back-End

> **MascotDex** é uma plataforma desenvolvida para os membros da **Include Jr.** catalogarem, colecionarem e visualizarem os mascotes das Empresas Juniores (EJs) durante grandes eventos do Movimento Empresa Júnior (MEJ), como ENEJ e ECEJ.

API REST desenvolvida em Node.js com TypeScript, Fastify, Prisma ORM, PostgreSQL (Neon/Docker), Supabase Storage e Swagger.

---

## Sumário

- [Visão Geral e Arquitetura](#visão-geral-e-arquitetura)
- [Tech Stack & Tecnologias](#tech-stack--tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Instalação e Execução Local](#instalação-e-execução-local)
- [Testes Automatizados](#testes-automatizados)
- [Rotas da API & Documentação](#rotas-da-api--documentação)
- [Regras de Negócio & Segurança](#regras-de-negócio--segurança)
- [Deploy](#deploy)
- [Contribuição e Convenções](#contribuição-e-convenções)

---

## Visão Geral e Arquitetura

O MascotDex resolve a dispersão de fotos e informações sobre mascotes em eventos do MEJ. A aplicação permite:
1. **Membros:** Cadastrar novos mascotes (com foto, nome, EJ, federação/região e universidade), registrar capturas por evento, navegar na galeria com filtros avançados e consultar o perfil do mascote e o ranking global/por evento.
2. **Direx (Diretoria Executiva):** Criar e gerenciar eventos no painel administrativo.
3. **Suporte Offline/Idempotência:** Tratamento de capturas offline via respostas de conflito padronizadas (`409 CAPTURA_DUPLICADA` / `MASCOTE_JA_CADASTRADO`).

### Padrão Arquitetural
A API adota uma **arquitetura em camadas por módulo vertical (Feature-based)**:
`Routes (HTTP/Schema) → Service (Regras de Negócio) → Repository (Persistência via Prisma)`

- **Routes:** Responsáveis por parsing, validação via Zod (`fastify-type-provider-zod`) e registro no Swagger.
- **Service:** Concentra a lógica de domínio sem dependência direta do Fastify. Lança exceções padronizadas (`AppError`).
- **Repository:** Camada isolada que dialoga com o Prisma Client e o PostgreSQL.
- **StorageProvider:** Interface desacoplada com implementação do Supabase Storage e tratamento de rollback em transações (RN015).

---

## Tech Stack & Tecnologias

- **Runtime & Linguagem:** Node.js (LTS) + TypeScript (strict mode, ESNext, target ES2022)
- **Framework HTTP:** [Fastify](https://fastify.dev/)
- **ORM & Banco de Dados:** [Prisma ORM](https://www.prisma.io/) + PostgreSQL ([Neon](https://neon.tech/) em Produção / Docker local)
- **Armazenamento de Imagens:** [Supabase Storage](https://supabase.com/storage) (`@supabase/supabase-js`)
- **Validação & Tipagem:** [Zod](https://zod.dev/) + `fastify-type-provider-zod`
- **Autenticação & Criptografia:** JWT (`@fastify/jwt`) + Argon2id (`@node-rs/argon2`)
- **Documentação:** Swagger / OpenAPI 3.0 (`@fastify/swagger` + `@fastify/swagger-ui`) em `/docs`
- **Testes:** [Vitest](https://vitest.dev/) (Unitários e de Integração com banco PostgreSQL dedicado)
- **Segurança & Hardening:** `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/multipart`, `file-type`, `sanitize-html`
- **Build & Dev:** `tsup`, `tsx`, `eslint`, `prettier`

---

## Estrutura do Projeto

A nomenclatura de pastas e arquivos segue o padrão **PascalCase** definido para o projeto:

```
mascotdex-api/
├── prisma/
│   ├── schema.prisma                 # Schema do modelo relacional
│   ├── Seed.ts                       # Orquestrador de seeds
│   ├── Data/Federacoes.json          # Carga inicial de federações brasileiras
│   └── migrations/                   # Historico de migrations PostgreSQL
├── src/
│   ├── Server.ts                     # Ponto de entrada (HTTP Server Listen)
│   ├── App.ts                        # Configuração principal do Fastify (App Builder)
│   ├── Config/
│   │   ├── EnvSchema.ts              # Validação de variáveis de ambiente via Zod
│   │   └── Env.ts                    # Configurações do ambiente carregadas
│   ├── Infra/
│   │   ├── Database/                 # Prisma Client e Seeds (FederacaoSeed, DirexSeed)
│   │   └── Storage/                  # StorageProvider (SupabaseStorage, StorageFactory)
│   ├── Shared/
│   │   ├── Container.ts              # Injeção de dependências manual
│   │   ├── Errors/                   # AppError, ErrorCodes, Global ErrorHandler
│   │   ├── Plugins/                  # AuthPlugin, SecurityPlugin, SwaggerPlugin, MultipartPlugin
│   │   ├── Schemas/                  # Schemas Zod reutilizáveis (Pagination, Common)
│   │   └── Utils/                    # Normalize, Sanitize, ImageValidation, Password, Pagination
│   └── Modules/
│       ├── Auth/                     # Cadastros, Login, Perfil do Usuário
│       ├── Eventos/                  # Criação e Listagem de Eventos (Direx/Membro)
│       ├── Federacoes/               # Consulta de Federações
│       ├── EmpresasJuniores/         # Consulta de EJs
│       ├── Mascotes/                 # Cadastro de Mascote, Galeria, Filtros e Perfil
│       ├── Capturas/                 # Registro de Capturas (Fotos por evento)
│       ├── Ranking/                  # Placar de pontuação dos membros
│       └── Health/                   # Liveness Check (/health)
├── tests/
│   ├── Unit/                         # Testes unitários com mocks (*.spec.ts)
│   ├── Integration/                  # Testes de integração (*.int.spec.ts)
│   ├── Setup/                        # Migrations e Reset de banco para testes
│   └── Helpers/                      # Factories (Mascote, Captura, Usuário, Evento)
├── docker-compose.yml                # Containers do PostgreSQL (Dev na porta 5432 / Test na 5433)
├── Dockerfile                        # Build multistage para produção
├── vitest.unit.config.ts             # Configuração Vitest Unit
├── vitest.integration.config.ts      # Configuração Vitest Integration
├── .env.example                      # Modelo de variáveis de ambiente
└── README.md                         # Documentação do projeto
```

---

## Pré-requisitos

Antes de iniciar, certifique-se de ter instalado na sua máquina:
- **Node.js** v20.x ou superior
- **npm** v10.x ou superior
- **Docker** e **Docker Compose** (para rodar o PostgreSQL localmente)

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto copiando o conteúdo de `.env.example`:

```bash
cp .env.example .env
```

Campos necessários no `.env`:

```env
NODE_ENV=development
PORT=3333
LOG_LEVEL=info

# Banco de Dados (PostgreSQL / Neon)
DATABASE_URL="postgresql://mascotdex:mascotdex@localhost:5432/mascotdex?schema=public"
DIRECT_URL="postgresql://mascotdex:mascotdex@localhost:5432/mascotdex?schema=public"

# Autenticação JWT
JWT_SECRET="sua-chave-secreta-jwt-super-segura-e-longa"
JWT_EXPIRES_IN="7d"

# Segurança
CORS_ORIGINS="http://localhost:5173"
RATE_LIMIT_AUTH_MAX=5

# Supabase Storage (Opcional no boot local, necessário para uploads)
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
SUPABASE_BUCKET="mascotdex"

# Dados para Seed do Administrador (Perfil DIREX)
SEED_DIREX_NOME="Direx Include"
SEED_DIREX_EMAIL="direx@includejr.com.br"
SEED_DIREX_SENHA="senha-forte-direx"
```

---

## Instalação e Execução Local

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie os containers do banco de dados (PostgreSQL Dev + Test):**
   ```bash
   npm run db:up
   ```

3. **Execute as migrations do Prisma:**
   ```bash
   npm run db:migrate
   ```

4. **Execute o Seed para popular as Federações e o usuário DIREX:**
   ```bash
   npm run db:seed
   ```

5. **Inicie a aplicação em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
   A API estará disponível em `http://localhost:3333`.

---

## Testes Automatizados

O projeto conta com suítes de testes unitários e de integração utilizando **Vitest**.

### Executando os testes:

```bash
# Rodar todos os testes (Unitários + Integração)
npm test

# Rodar apenas testes unitários
npm run test:unit

# Iniciar container de teste e rodar testes de integração
npm run test:db:up
npm run test:int

# Rodar testes em modo Watch
npm run test:watch
```

> **Nota:** Os testes de integração utilizam um banco isolado na porta `5433` (`mascotdex_test`), garantindo que o banco de desenvolvimento nunca seja afetado.

---

## Rotas da API & Documentação

Com a aplicação rodando, acesse a documentação interativa Swagger em:
**`http://localhost:3333/docs`**

### Resumo dos Principais Endpoints:

| Método | Rota | Autenticação | Perfil | Descrição |
|---|---|---|---|---|
| `GET` | `/health` | Público | - | Healthcheck da API (Liveness) |
| `POST` | `/auth/register` | Público | - | Registro de novo membro |
| `POST` | `/auth/login` | Público | - | Login e emissão de JWT |
| `GET` | `/auth/me` | Bearer JWT | Todos | Dados do usuário logado |
| `POST` | `/eventos` | Bearer JWT | **DIREX** | Cadastro de novos eventos MEJ |
| `GET` | `/eventos` | Bearer JWT | Todos | Listagem paginada de eventos |
| `GET` | `/federacoes` | Bearer JWT | Todos | Consulta de federações com busca e filtro por UF |
| `GET` | `/empresas-juniores` | Bearer JWT | Todos | Consulta de EJs com busca parcial por nome/universidade |
| `POST` | `/mascotes` | Bearer JWT | Todos | Cadastro de mascote, EJ nova/existente + 1ª captura (Multipart) |
| `GET` | `/mascotes` | Bearer JWT | Todos | Galeria paginada com marcação de `capturado` e filtros combinados |
| `GET` | `/mascotes/:id` | Bearer JWT | Todos | Perfil detalhado do mascote e histórico de capturas |
| `POST` | `/mascotes/:id/capturas` | Bearer JWT | Todos | Registro de nova captura para o mascote no evento (Multipart) |
| `GET` | `/ranking` | Bearer JWT | Todos | Placar dos membros que mais capturaram (Geral ou por Evento) |
| `GET` | `/docs` | Público | - | Documentação interativa (Swagger UI) |

---

## Regras de Negócio & Segurança

- **RN002 / RN003 (Acesso e Credenciais):** Todo cadastro recebe o perfil `MEMBRO`. Apenas a DIREX pode criar eventos. Senhas são criptografadas via **Argon2id**.
- **RN005 / RN006 (Unicidade de Mascote e EJ):** Não é permitido cadastrar dois mascotes idênticos para a mesma EJ, nem duas EJs idênticas na mesma federação. As buscas e unicidades utilizam normalização de string (`nomeNormalizado` sem acentos/caixa alta).
- **RN008 / RN015 (Validação e Rollback de Imagens):** Uploads de imagens passam por validação de tamanho (máx 10MB) e inspecionam *magic bytes* (JPEG, PNG, WebP). Caso a inserção no banco de dados falhe após o upload no Supabase, o arquivo enviado é deletado para manter a consistência.
- **RN010 / RN014 (Idempotência e Captura Única):** Um membro só pode capturar um determinado mascote **uma vez por evento**. Reenvios de capturas sincronizadas offline retornam status `409 CAPTURA_DUPLICADA`, permitindo ao aplicativo atualizar a fila local de sincronização sem duplicar dados.
- **RN012 (Pontuação do Ranking):** O ranking pontua os membros pelo **número de mascotes distintos** capturados. Em caso de empate, o critério de desempate beneficia quem realizou a última captura primeiro.
- **Hardening:** Limitação de taxa de requisições por IP (*Rate Limiting* estrito em autenticação), proteção de cabeçalhos via Helmet, tratamento global de sanitização contra XSS e SQL Injection parametrizado via Prisma.

---

## Deploy

O deploy de produção é configurado para a plataforma **Railway** integrada com **Neon PostgreSQL** e **Supabase Storage**.

1. **Build de Produção:**
   ```bash
   npm run build
   ```
2. **Execução em Produção:**
   ```bash
   npm run start:prod
   ```
   *(Executa automaticamente as migrations do Prisma em ambiente de produção `prisma migrate deploy` antes de subir o servidor Node.js).*

---

## Contribuição e Convenções

As contribuições devem seguir as regras e fluxos de trabalho definidos pelo projeto:

- **Convenção de Branches:**
  - `main` — Ambiente de Produção
  - `stage` — Ambiente de Homologação / Staging
  - `feat/nome-da-feature` — Adição de novas funcionalidades
  - `fix/nome-da-correcao` — Correção de bugs
- **Convenção de Commits:**
  - `feat:` adição de nova funcionalidade
  - `fix:` correção de problema/bug
  - `docs:` alterações na documentação
  - `refactor:` refatoração de código sem alterar regra de negócio
  - `test:` adição ou ajuste de testes

---
