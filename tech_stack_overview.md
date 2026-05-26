# Guia Técnico de Desenvolvimento - Projeto UCE UNIFAE

Este documento detalha as definições técnicas, tecnologias e padrões arquiteturais adotados no desenvolvimento do sistema UNIFAE (Gestão de Fisioterapia), servindo de base para futuros desenvolvimentos e manutenções assistidas por IA.

---

## 🏗️ Arquitetura Geral
O projeto segue uma estrutura de monorepo simplificado, dividido em dois núcleos principais:
1.  **`unifae-api`**: Backend (API REST).
2.  **`unifae-management`**: Frontend Web (Sistema de Gestão).

---

## 🛠️ Stack Tecnológica

### Backend (API)
-   **Runtime**: Node.js (v20+ ou v22+).
-   **Framework**: [NestJS](https://nestjs.com/) (v11).
-   **Linguagem**: TypeScript.
-   **Banco de Dados**: MySQL (Driver `mysql2`).
-   **ORM**: [TypeORM](https://typeorm.io/) (utilizando o padrão Data Mapper).
-   **Autenticação**: Passport.js com estratégia JWT.
-   **Validação**: `class-validator` e `class-transformer`.
-   **Envio de E-mail**: Nodemailer.
-   **Padronização**: ESLint e Prettier.

### Frontend (Web Management)
-   **Build Tool**: [Vite](https://vitejs.dev/) (v8).
-   **Framework**: [Vue.js 3](https://vuejs.org/) (Composition API).
-   **Linguagem**: TypeScript.
-   **Gerenciamento de Estado**: [Pinia](https://pinia.vuejs.org/).
-   **Roteamento**: [Vue Router](https://router.vuejs.org/).
-   **Cliente HTTP**: [Axios](https://axios-http.com/).
-   **Estilização**: Vanilla CSS com Sistema de **Design Tokens** (CSS Variables).
-   **Tipografia**: 'Manrope' (foco em legibilidade clínica).

---

## 🗄️ Banco de Dados & Modelagem
-   **Banco**: MySQL (v8 recomendado).
-   **Sincronização**: O projeto utiliza `TYPEORM_SYNC=true` em ambiente de desenvolvimento para gerar as tabelas a partir das entidades.
-   **Seed**: Existem scripts de carga inicial de dados:
    -   `npm run seed`: Cria usuários administrativos básicos.
    -   `npm run seed:full`: Popula o banco com dados de demonstração (Pacientes, Exercícios, etc).

---

## 📡 Integração & Padrões de Comunicação
-   **API REST**: O frontend consome a API através de um cliente Axios centralizado em `src/api/client.ts`.
-   **Autenticação**:
    -   Token JWT armazenado no `localStorage` (`unifae_token`).
    -   Enviado via header `Authorization: Bearer <token>`.
-   **Auditoria**: Todas as requisições do frontend enviam headers customizados para rastreio:
    -   `X-Device-Id`: Identificador único do dispositivo.
    -   `X-Device-Name`: Nome legível do dispositivo/navegador.
-   **Uploads**: Multipart/form-data para envio de arquivos/mídias.

---

## 🎨 Padrões de Design & UX
-   **Design System**: Localizado em `src/assets/design-tokens.css`.
-   **Estética**: "Clinical Clarity" - Cores sóbrias (Verde `#0d631b` como primária), superfícies bem definidas (elevation/shadows leves) e foco em acessibilidade.
-   **Estrutura Vue**:
    -   `src/views/`: Páginas completas.
    -   `src/components/`: Componentes reutilizáveis (UI atomizada).
    -   `src/composables/`: Lógica de negócio e estado local reutilizável.
    -   `src/stores/`: Lógica de estado global (Auth, UI global).

---

## 🚀 Fluxo de Desenvolvimento
1.  **API**: Criar módulos (Entity -> DTO -> Service -> Controller).
2.  **Web**: Criar rotas -> Views -> Integração com Pinia/Axios.
3.  **App (Futuro)**: Seguirá as mesmas regras de integração da API e padrões de auditoria.
