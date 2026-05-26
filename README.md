# UNIFAE Platform

Monorepo único com:

| Pasta | Stack | URL local |
|--------|--------|-----------|
| `unifae-api` | NestJS, TypeORM, MySQL, JWT — prefixo `/api/v1` | http://localhost:3000 |
| `unifae-management` | Vue 3, Vite, Pinia — proxy `/api` → API | http://localhost:5173 |

Documentação do projeto está **somente neste arquivo**. Os `README.md` dentro de `unifae-api` e `unifae-management` são apenas remissões aos templates originais do framework.

---

## Pré-requisitos

- **Node.js 20+**
- **MySQL** acessível (ex.: `localhost:3306`), usuário e senha alinhados a `unifae-api/.env`

---

## Primeira vez (clone novo)

Na **raiz** do repositório:

```bash
npm run dev
```

Na primeira execução o script `predev`:

1. Instala dependências na **raiz** (ex.: `concurrently`), em **`unifae-api`** e em **`unifae-management`** se ainda não existir `node_modules`;
2. Cria **`unifae-api/.env`** a partir de **`unifae-api/.env.example`** se o `.env` não existir.

Em seguida sobem **API** e **painel** ao mesmo tempo.

Antes disso, crie o banco **uma vez** no MySQL:

```sql
CREATE DATABASE unifae_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Ajuste usuário/senha do MySQL em `unifae-api/.env` se necessário. Com `TYPEORM_SYNC=true` (só desenvolvimento), as tabelas são criadas automaticamente ao subir a API.

### Popular dados de demonstração

Na raiz:

```bash
npm run seed:full
```

Isso **apaga dados existentes** (`TRUNCATE`) e recarrega todas as tabelas com relacionamentos de exemplo (usuários por perfil, pacientes, prescrições, etc.). Senha dos usuários demo: `SEED_DEMO_PASSWORD` no `.env` (padrão igual a `SEED_ADMIN_PASSWORD`, tipicamente `Admin@123`).

Alternativa mínima (só admin + app + curso):

```bash
npm run seed
```

---

## Comandos na raiz

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Sobe API + web (com `ensure` automático antes) |
| `npm run setup` | `npm install` explícito nos três pacotes + copia `.env` da API se faltar |
| `npm run build` | Build de API e web |
| `npm run seed` | Seed mínimo (admin) |
| `npm run seed:full` | Seed completo de demonstração |
| `npm run dev:api` | Só API |
| `npm run dev:web` | Só painel |

---

## URLs úteis

- Health: http://localhost:3000/api/v1/health  
- Login do painel: http://localhost:5173  
- Apps públicos (login): http://localhost:3000/api/v1/auth/apps  

---

## Segurança

- Não versione `unifae-api/.env` em repositórios públicos.  
- Em produção: `TYPEORM_SYNC=false` e migrações versionadas.  
- `seed:full` é **apenas para ambiente local**.
