<script setup lang="ts">
import axios from 'axios'
import { ref, watch } from 'vue'
import client from '@/api/client'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import { useToastStore } from '@/stores/toast'
import { buildTaxonomyReportGroups } from '@/utils/exerciseTaxonomyReport'

type PrescriptionDetail = {
  id: number
  patientId: number
  patientName: string
  courseId: number
  courseName: string
  appId: number
  studentId: number
  studentName: string
  professorId: number | null
  professorName: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  justification: string | null
  nextVisitDate: string | null
  createdAt: string
  items: {
    id: number
    exerciseName: string
    exerciseDescription?: string | null
    exerciseCatalogInstructions?: string | null
    instructions: string | null
    repetitions: string | null
    notes: string | null
    exerciseTaxonomy?: {
      clinicalCaseName: string | null
      typeLabel: string
      typeKey: string
      categoryName: string
    }[]
  }[]
  patientEmail?: string | null
  studentEmail?: string | null
  professorEmail?: string | null
  appName?: string | null
  courseCoordinators?: string[]
}

const props = defineProps<{
  open: boolean
  prescriptionId: number | null
}>()

const emit = defineEmits<{ close: [] }>()

const toast = useToastStore()

function apiErrorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback
  const m = err.response?.data as { message?: string | string[] } | undefined
  const raw = m?.message
  if (Array.isArray(raw)) return raw.join(' ')
  if (typeof raw === 'string' && raw.trim()) return raw
  return fallback
}

const loading = ref(false)
const reportData = ref<PrescriptionDetail | null>(null)

function statusLabel(s: string) {
  if (s === 'PENDING') return 'Pendente'
  if (s === 'APPROVED') return 'Aprovada'
  return 'Rejeitada'
}

function formatDateLong(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function closeReport() {
  emit('close')
}

function printReport() {
  window.print()
}

watch(
  () => [props.open, props.prescriptionId] as const,
  async ([isOpen, id]) => {
    if (!isOpen) {
      reportData.value = null
      loading.value = false
      return
    }
    if (id == null || !Number.isFinite(id)) {
      reportData.value = null
      return
    }
    loading.value = true
    reportData.value = null
    try {
      const { data } = await client.get<PrescriptionDetail>(`/prescriptions/${id}`)
      reportData.value = data
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível carregar o documento.'))
      emit('close')
    } finally {
      loading.value = false
    }
  },
)
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop report-backdrop"
    @click.self="closeReport"
  >
    <div class="modal modal--report rx-report print-root">
      <div class="report-toolbar no-print">
        <h3 class="mh mh--report">Prescrição — documento</h3>
        <div class="report-toolbar__btns">
          <button type="button" class="mbtn mbtn--ghost" @click="closeReport">Fechar</button>
          <button type="button" class="mbtn mbtn--pri" @click="printReport">
            <MaterialIcon name="print" size="1rem" />
            Imprimir
          </button>
        </div>
      </div>
      <p v-if="loading" class="muted pad">Carregando…</p>
      <div v-else-if="reportData" class="report-body">
        <header class="report-header">
          <div class="report-brand-wrap">
            <img src="/unifae_hub_transparent.png" alt="Unifae Hub" class="report-logo" />
            <span class="report-brand-text">Prescrição terapêutica</span>
          </div>
          <h1 class="report-title">Prescrição nº {{ reportData.id }}</h1>
          <p class="report-meta">
            <strong>Status:</strong> {{ statusLabel(reportData.status) }}
            · <strong>Emitida em:</strong> {{ formatDateLong(reportData.createdAt) }}
          </p>
        </header>

        <section class="report-section">
          <h2 class="report-h2">Aplicativo e curso</h2>
          <dl class="report-dl">
            <div><dt>App</dt><dd>{{ reportData.appName ?? `#${reportData.appId}` }}</dd></div>
            <div><dt>Curso</dt><dd>{{ reportData.courseName }}</dd></div>
            <div v-if="reportData.courseCoordinators?.length">
              <dt>Coordenação (cadastro)</dt>
              <dd>{{ reportData.courseCoordinators.join(', ') }}</dd>
            </div>
          </dl>
        </section>

        <section class="report-section">
          <h2 class="report-h2">Paciente (usuário do app)</h2>
          <dl class="report-dl">
            <div><dt>Nome</dt><dd>{{ reportData.patientName }}</dd></div>
            <div><dt>E-mail (login)</dt><dd>{{ reportData.patientEmail ?? '—' }}</dd></div>
            <div><dt>ID paciente</dt><dd>#{{ reportData.patientId }}</dd></div>
          </dl>
        </section>

        <section class="report-section">
          <h2 class="report-h2">Responsáveis acadêmicos</h2>
          <dl class="report-dl">
            <div>
              <dt>Estagiário</dt>
              <dd>
                {{ reportData.studentName }}
                <template v-if="reportData.studentEmail"> — {{ reportData.studentEmail }}</template>
              </dd>
            </div>
            <div>
              <dt>Professor orientador</dt>
              <dd>
                <template v-if="reportData.professorName">
                  {{ reportData.professorName }}
                  <template v-if="reportData.professorEmail"> — {{ reportData.professorEmail }}</template>
                </template>
                <template v-else>—</template>
              </dd>
            </div>
          </dl>
        </section>

        <section class="report-section">
          <h2 class="report-h2">Justificativa e planejamento</h2>
          <p class="report-block">{{ reportData.justification?.trim() || '—' }}</p>
          <dl class="report-dl report-dl--inline">
            <div>
              <dt>Próxima visita sugerida</dt>
              <dd>{{ reportData.nextVisitDate ? formatDateLong(reportData.nextVisitDate) : '—' }}</dd>
            </div>
          </dl>
        </section>

        <section class="report-section">
          <h2 class="report-h2">Exercícios prescritos ({{ reportData.items.length }})</h2>
          <div class="report-ex-list">
            <div v-for="(it, idx) in reportData.items" :key="it.id" class="report-ex">
              <h3 class="report-ex__title">{{ idx + 1 }}. {{ it.exerciseName }}</h3>
              <p v-if="it.exerciseDescription" class="report-ex__desc">{{ it.exerciseDescription }}</p>
              <p v-if="it.exerciseCatalogInstructions" class="report-ex__hint">
                <em>Instruções do catálogo:</em> {{ it.exerciseCatalogInstructions }}
              </p>
              <dl class="report-dl report-dl--tight">
                <div v-if="it.instructions">
                  <dt>Instruções na prescrição</dt>
                  <dd>{{ it.instructions }}</dd>
                </div>
                <div v-if="it.repetitions">
                  <dt>Repetições / tempo</dt>
                  <dd>{{ it.repetitions }}</dd>
                </div>
                <div v-if="it.notes">
                  <dt>Observações</dt>
                  <dd>{{ it.notes }}</dd>
                </div>
              </dl>
              <div v-if="it.exerciseTaxonomy?.length" class="report-tax">
                <p class="report-tax__title">Classificação no catálogo</p>
                <div class="report-tax__blocks">
                  <div
                    v-for="(blk, bi) in buildTaxonomyReportGroups(it.exerciseTaxonomy)"
                    :key="bi"
                    class="report-tax__block"
                  >
                    <p class="report-tax__case">
                      {{ blk.clinicalCaseName ?? 'Sem caso clínico' }}
                    </p>
                    <ul class="report-tax__lines">
                      <li v-for="(ln, li) in blk.lines" :key="li" class="report-tax__line">
                        <span class="report-tax__type">{{ ln.typeLabel }}:</span>
                        <span class="report-tax__val">{{ ln.categoriesText }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer class="report-footer">
          <p>Documento gerado pelo sistema para conferência. Validade sujeita ao fluxo de aprovação vigente.</p>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.modal {
  width: 100%;
  max-width: 26rem;
  max-height: 90vh;
  overflow: auto;
  background: var(--uf-surface-container-lowest);
  border-radius: var(--uf-radius-xl);
  padding: 1.35rem;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}
.modal--report {
  max-width: 42rem;
  max-height: 92vh;
}
.report-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(191, 202, 186, 0.35);
}
.report-toolbar__btns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.mh--report {
  margin: 0;
}
.report-body {
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--uf-on-surface);
}
.rx-report {
  text-align: left;
}
.report-header {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--uf-outline-variant);
}
.report-brand-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.report-logo {
  height: 4rem;
  width: auto;
  object-fit: contain;
}
.report-brand-text {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}
.report-title {
  margin: 0.35rem 0 0.25rem;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.report-meta {
  margin: 0;
  font-size: 0.82rem;
  color: var(--uf-on-surface-variant);
}
.report-section {
  margin: 1.1rem 0;
  page-break-inside: avoid;
}
.report-h2 {
  margin: 0 0 0.5rem;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--uf-primary);
  border-bottom: 1px solid rgba(13, 99, 27, 0.2);
  padding-bottom: 0.25rem;
}
.report-dl {
  margin: 0;
  display: grid;
  gap: 0.45rem 1rem;
}
.report-dl > div {
  display: grid;
  grid-template-columns: 8.5rem 1fr;
  gap: 0.5rem;
  align-items: start;
}
.report-dl--inline > div {
  grid-template-columns: 12rem 1fr;
}
.report-dl--tight > div {
  grid-template-columns: 1fr;
}
@media (max-width: 520px) {
  .report-dl > div {
    grid-template-columns: 1fr;
  }
}
.report-dl dt {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--uf-on-surface-variant);
}
.report-dl dd {
  margin: 0;
  font-weight: 600;
}
.report-block {
  margin: 0 0 0.65rem;
  padding: 0.65rem 0.85rem;
  background: var(--uf-surface-container-low);
  border-radius: var(--uf-radius-md);
  white-space: pre-wrap;
  font-size: 0.88rem;
}
.report-ex-list {
  margin: 0;
  padding: 0;
}
.report-ex {
  margin: 0.85rem 0;
  padding-bottom: 0.85rem;
  border-bottom: 1px dashed rgba(191, 202, 186, 0.5);
}
.report-ex:last-child {
  border-bottom: none;
}
.report-ex__title {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 800;
}
.report-ex__desc {
  margin: 0 0 0.35rem;
  font-size: 0.82rem;
  color: var(--uf-on-surface-variant);
}
.report-ex__hint {
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  color: var(--uf-on-surface-variant);
}
.report-tax {
  margin: 0.5rem 0 0;
  padding: 0.5rem 0.65rem;
  background: var(--uf-surface-container-lowest);
  border-radius: var(--uf-radius-sm);
  border: 1px solid rgba(191, 202, 186, 0.35);
}
.report-tax__title {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--uf-on-surface-variant);
}
.report-tax__blocks {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.report-tax__block {
  padding: 0.35rem 0 0;
  border-top: 1px dashed rgba(191, 202, 186, 0.45);
}
.report-tax__block:first-child {
  border-top: none;
  padding-top: 0;
}
.report-tax__case {
  margin: 0 0 0.25rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--uf-primary);
}
.report-tax__lines {
  margin: 0;
  padding: 0;
  list-style: none;
}
.report-tax__line {
  display: grid;
  grid-template-columns: minmax(5rem, 42%) 1fr;
  gap: 0.35rem 0.65rem;
  align-items: baseline;
  font-size: 0.78rem;
  padding: 0.15rem 0;
}
@media print {
  .report-tax__line {
    grid-template-columns: minmax(5rem, 38%) 1fr;
  }
}
.report-tax__type {
  color: var(--uf-on-surface-variant);
  font-weight: 600;
}
.report-tax__val {
  font-weight: 600;
  color: var(--uf-on-surface);
}
.report-footer {
  margin-top: 1.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--uf-outline-variant);
  font-size: 0.72rem;
  color: var(--uf-on-surface-variant);
}
.report-footer p {
  margin: 0;
}
.muted {
  color: var(--uf-on-surface-variant);
}
.pad {
  padding: 1rem 0;
}
.mbtn {
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1.1rem;
  font-family: var(--uf-font);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
.mbtn--ghost {
  background: transparent;
  border: 1px solid rgba(191, 202, 186, 0.45);
  color: var(--uf-on-surface-variant);
}
.mbtn--pri {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container));
  color: #fff;
}
</style>

<style>
@media print {
  body * {
    visibility: hidden !important;
  }
  .print-root,
  .print-root * {
    visibility: visible !important;
  }
  .print-root .no-print {
    display: none !important;
    visibility: hidden !important;
  }
  .print-root {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: none !important;
    box-shadow: none !important;
    background: #fff !important;
    padding: 0.6cm !important;
  }
}
</style>
