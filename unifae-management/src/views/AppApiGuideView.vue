<script setup lang="ts">
type EndpointDoc = {
  method: 'GET' | 'POST'
  path: string
  summary: string
  auth: string
  body?: string
  response: string
}

const endpoints: EndpointDoc[] = [
  {
    method: 'POST',
    path: '/auth/login',
    summary: 'Autentica usuário e retorna token JWT.',
    auth: 'Público',
    body: `{
  "email": "paciente1@unifae.local",
  "password": "SUA_SENHA",
  "accessMode": "APP",
  "appId": 1
}`,
    response: `{
  "access_token": "jwt...",
  "user": {
    "id": 123,
    "name": "Paciente",
    "role": "PATIENT",
    "appId": 1,
    "courseId": 2,
    "nextVisitDate": "2026-05-22T14:00:00.000Z",
    "upcomingAppointments": [
      {
        "id": 1,
        "scheduledAt": "2026-05-22T14:00:00.000Z",
        "modality": "IN_PERSON",
        "location": {
          "mode": "IN_PERSON",
          "name": "Clínica UNIFAE",
          "address": "Campus UNIFAE, Av. Exemplo, 100 — Sala 12",
          "url": null
        }
      }
    ]
  }
}`,
  },
  {
    method: 'GET',
    path: '/app/home/profile',
    summary:
      'Retorna dados do perfil no app: paciente logado, aluno/fisioterapeuta responsável, coordenador e progresso semanal.',
    auth: 'Bearer token (PATIENT)',
    response: `{
  "profile": {
    "id": 123,
    "name": "Paciente",
    "email": "paciente@unifae.local",
    "role": "PATIENT",
    "photoUrl": null
  },
  "app": { "id": 1, "name": "Unifae Care - Fisioterapia" },
  "course": { "id": 2, "name": "Fisioterapia" },
  "responsibleStudent": {
    "id": 88,
    "name": "Aluno Responsável",
    "email": "aluno@unifae.local",
    "photoUrl": null
  },
  "coordinator": {
    "id": 12,
    "name": "Coordenador",
    "email": "coord@unifae.local",
    "photoUrl": null,
    "primarySpecialty": "Ortopedia",
    "specialties": [
      { "id": 1, "name": "Ortopedia", "isPrimary": true },
      { "id": 2, "name": "Fisioterapia esportiva", "isPrimary": false }
    ]
  },
  "weeklyProgress": {
    "from": "2026-04-20",
    "to": "2026-04-26",
    "prescribedExercises": 6,
    "completedExercises": 4,
    "percentCompleted": 67
  }
}`,
  },
  {
    method: 'POST',
    path: '/app/home/profile/photo',
    summary: 'Atualiza foto do perfil do paciente logado (multipart/form-data, campo "file").',
    auth: 'Bearer token (PATIENT)',
    body: `form-data:
  file: <imagem jpg|png|webp até 8MB>`,
    response: `{
  "message": "Foto de perfil atualizada com sucesso.",
  "photoUrl": "/api/v1/app/home/profile/photo/5"
}`,
  },
  {
    method: 'GET',
    path: '/app/home/profile/photo/:userId',
    summary: 'Lê foto de perfil (paciente, aluno responsável ou coordenador do mesmo contexto).',
    auth: 'Bearer token (PATIENT)',
    response: 'Binary image stream (image/jpeg, image/png ou image/webp).',
  },
  {
    method: 'GET',
    path: '/app/home',
    summary: 'Carrega dados da Home do app do paciente.',
    auth: 'Bearer token (PATIENT)',
    response: `{
  "painToday": { "recorded": true, "level": "MILD", "recordedAt": "2026-04-26T12:45:00.000Z" },
  "plan": { "totalExercises": 4, "completedExercises": 1, "percentCompleted": 25 },
  "nextExercise": {
    "prescriptionId": 19,
    "prescriptionItemId": 57,
    "exerciseId": 302,
    "exerciseName": "Mobilidade cervical",
    "axis": "Mobilidade",
    "problem": "Dor cervical",
    "objective": "Reduzir dor"
  },
  "motivation": { "id": 3, "message": "Respire. Ajuste a postura. Continue." }
}`,
  },
  {
    method: 'GET',
    path: '/app/home/plan/exercises',
    summary:
      'Lista todos os exercícios da prescrição ativa: eixo/problema/objetivo e se já foi concluído hoje. Não retorna tags/chips auxiliares.',
    auth: 'Bearer token (PATIENT)',
    response: `{
  "prescriptionId": 19,
  "items": [
    {
      "prescriptionItemId": 57,
      "exerciseId": 302,
      "title": "Rotação externa de ombro",
      "taxonomy": {
        "axis": "Membros superiores",
        "problem": "Mobilidade",
        "objective": null
      },
      "completedToday": false
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/app/home/plan/today',
    summary:
      'Plano do dia: todos os exercícios com detalhes completos (vídeo, steps, métricas) e status de execução/feedback de hoje.',
    auth: 'Bearer token (PATIENT)',
    response: `{
  "date": "2026-05-19",
  "prescriptionId": 2,
  "summary": { "total": 3, "completed": 1, "pendingFeedback": 1, "percentCompleted": 33 },
  "exercises": [
    {
      "prescriptionItemId": 3,
      "title": "Alongamento posterior de coxa",
      "steps": [{ "order": 1, "text": "…" }],
      "execution": {
        "completed": true,
        "executionId": 10,
        "feedbackSubmitted": false,
        "feedbackPending": true
      }
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/app/home/plan/week',
    summary:
      'Plano da semana corrente (segunda a domingo), sempre calculado a partir da data de hoje. Exercícios com o mesmo detalhe do plano de hoje; agendas do período em `appointments` por dia.',
    auth: 'Bearer token (PATIENT)',
    response: `{
  "today": "2026-05-26",
  "weekStart": "2026-05-25",
  "weekEnd": "2026-05-31",
  "prescriptionId": 2,
  "days": [
    {
      "date": "2026-05-26",
      "label": "Terça-feira",
      "isToday": true,
      "summary": { "total": 3, "completed": 1, "pendingFeedback": 0, "percentCompleted": 33 },
      "exercises": [],
      "appointments": [
        {
          "id": 1,
          "scheduledAt": "2026-05-26T14:00:00.000Z",
          "modality": "IN_PERSON",
          "location": {
            "mode": "IN_PERSON",
            "name": "Clínica UNIFAE",
            "address": "Av. Exemplo, 100 — Sala 12",
            "url": null
          }
        }
      ]
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/app/home/appointments',
    summary: 'Agendas futuras. O campo `location` indica presencial (endereço) ou remoto (url).',
    auth: 'Bearer token (PATIENT)',
    response: `{
  "items": [
    {
      "id": 1,
      "scheduledAt": "2026-05-22T14:00:00.000Z",
      "modality": "IN_PERSON",
      "location": {
        "mode": "IN_PERSON",
        "name": "Clínica UNIFAE",
        "address": "Campus UNIFAE, Av. Exemplo, 100 — Sala 12, São José dos Campos/SP",
        "url": null
      }
    },
    {
      "id": 2,
      "scheduledAt": "2026-05-24T10:00:00.000Z",
      "modality": "ONLINE",
      "location": {
        "mode": "REMOTE",
        "name": null,
        "address": null,
        "url": "https://meet.google.com/abc-defg-hij"
      }
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/app/home/plan/exercises/:prescriptionItemId',
    summary:
      'Detalhe do exercício no plano (tela única): vídeo, passo a passo em etapas (`steps`, 1 a N), texto legado `instructions`, dicas do profissional (notes), métricas (repetitions em formato 3x15 vira series/volume) e taxonomia sem tags auxiliares.',
    auth: 'Bearer token (PATIENT)',
    response: `{
  "prescriptionId": 19,
  "prescriptionItemId": 57,
  "exerciseId": 302,
  "title": "Rotação externa de ombro",
  "videoUrl": "https://www.youtube.com/watch?v=…",
  "description": "…",
  "taxonomy": {
    "axis": "Membros superiores",
    "problem": "Mobilidade",
    "objective": null
  },
  "metrics": {
    "repetitionsRaw": "3x15",
    "series": "3",
    "volume": "15"
  },
  "steps": [
    { "order": 1, "text": "Posicione-se conforme o vídeo." },
    { "order": 2, "text": "Execute o movimento com controle." },
    { "order": 3, "text": "Mantenha a respiração ritmada." }
  ],
  "instructions": "1. Posicione-se conforme o vídeo.\\n2. Execute o movimento com controle.\\n3. Mantenha a respiração ritmada.",
  "physiotherapistNotes": "Foque na qualidade do movimento…"
}`,
  },
  {
    method: 'POST',
    path: '/app/home/plan/exercises/:prescriptionItemId/complete',
    summary:
      'Confirma conclusão do exercício; cria linha em patient_executions e devolve executionId para a tela de feedback.',
    auth: 'Bearer token (PATIENT)',
    response: `{
  "executionId": 901,
  "prescriptionId": 19,
  "prescriptionItemId": 57,
  "exerciseId": 302,
  "performedAt": "2026-05-12T14:30:00.000Z",
  "message": "Execução registrada. Envie o feedback desta sessão em seguida."
}`,
  },
  {
    method: 'POST',
    path: '/app/home/plan/executions/:executionId/feedback',
    summary:
      'Feedback pós-exercício: score obrigatório 0, 2, 5, 8 ou 10 (dor/esforço); notes opcional. Um feedback por executionId.',
    auth: 'Bearer token (PATIENT)',
    body: `{
  "score": 5,
  "notes": "Leve desconforto no ombro ao final."
}`,
    response: `{
  "executionId": 901,
  "prescriptionItemId": 57,
  "score": 5,
  "notes": "Leve desconforto no ombro ao final.",
  "feedbackRecordedAt": "2026-05-12T14:31:05.000Z"
}`,
  },
  {
    method: 'POST',
    path: '/app/home/pain',
    summary: 'Registra sensação de dor do dia (somente 1x/dia).',
    auth: 'Bearer token (PATIENT)',
    body: `{
  "level": "NONE"
}`,
    response: `{
  "recorded": false,
  "message": "Você já registrou sua sensação de dor hoje.",
  "painToday": {
    "recorded": true,
    "level": "NONE",
    "recordedAt": "2026-04-26T13:00:00.000Z"
  }
}`,
  },
  {
    method: 'GET',
    path: '/app/home/motivation',
    summary: 'Retorna mensagem motivacional aleatória ativa.',
    auth: 'Bearer token (PATIENT)',
    response: `{
  "id": 2,
  "message": "Seu esforço de hoje é a sua melhora de amanhã."
}`,
  },
]
</script>

<template>
  <div class="page">
    <header class="head">
      <h1 class="title">Guia interno de APIs do App</h1>
      <p class="sub">
        Referência operacional para o time administrativo acompanhar endpoints usados pelo aplicativo.
      </p>
    </header>

    <section class="panel tonal">
      <h2 class="h2">Diretriz de documentação interna</h2>
      <p class="policy">
        Toda API criada para o aplicativo deve ser adicionada e mantida nesta tela para garantir
        visibilidade ao usuário administrador.
      </p>
    </section>

    <section class="grid">
      <details v-for="ep in endpoints" :key="`${ep.method}-${ep.path}`" class="panel tonal endpoint">
        <summary class="ep-summary">
          <div class="ep-head">
            <span :class="['method', `method--${ep.method.toLowerCase()}`]">{{ ep.method }}</span>
            <code class="path">{{ ep.path }}</code>
          </div>
          <p class="summary">{{ ep.summary }}</p>
        </summary>

        <div class="ep-body">
          <p class="meta"><strong>Autenticação:</strong> {{ ep.auth }}</p>
          <div v-if="ep.body" class="block">
            <h3>Body (JSON)</h3>
            <pre><code>{{ ep.body }}</code></pre>
          </div>
          <div class="block">
            <h3>Retorno esperado</h3>
            <pre><code>{{ ep.response }}</code></pre>
          </div>
        </div>
      </details>
    </section>
  </div>
</template>

<style scoped>
.page { font-family: var(--uf-font); color: var(--uf-on-surface); max-width: 74rem; }
.head { margin-bottom: 1.25rem; }
.title { margin: 0; font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; }
.sub { margin: 0.35rem 0 0; color: var(--uf-on-surface-variant); font-size: 0.9rem; }
.panel { border-radius: var(--uf-radius-xl); background: var(--uf-surface-container-lowest); padding: 1.2rem 1.3rem; }
.tonal { box-shadow: var(--uf-tonal-shadow); }
.h2 { margin: 0 0 0.6rem; font-size: 1rem; }
.policy { margin: 0; color: var(--uf-on-surface-variant); font-size: 0.88rem; line-height: 1.5; }
.grid { margin-top: 1rem; display: grid; gap: 1rem; }
.endpoint { border: 1px solid rgba(191, 202, 186, 0.35); }
.ep-summary { cursor: pointer; list-style: none; }
.ep-summary::-webkit-details-marker { display: none; }
.ep-body { margin-top: 0.75rem; border-top: 1px dashed rgba(191, 202, 186, 0.45); padding-top: 0.75rem; }
.ep-head { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.method { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em; border-radius: 999px; padding: 0.2rem 0.55rem; }
.method--get { background: rgba(25, 118, 210, 0.14); color: #0d47a1; }
.method--post { background: rgba(46, 125, 50, 0.16); color: #1b5e20; }
.path { font-size: 0.84rem; background: var(--uf-surface-container-low); padding: 0.18rem 0.42rem; border-radius: 0.3rem; }
.summary { margin: 0.7rem 0 0.35rem; font-size: 0.9rem; }
.meta { margin: 0; font-size: 0.8rem; color: var(--uf-on-surface-variant); }
.block { margin-top: 0.8rem; }
.block h3 { margin: 0 0 0.35rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--uf-on-surface-variant); }
pre { margin: 0; padding: 0.65rem 0.7rem; border-radius: var(--uf-radius-md); background: var(--uf-surface-container-high); overflow: auto; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.78rem; }
</style>

