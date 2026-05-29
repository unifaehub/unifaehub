<script setup lang="ts">
import client from '@/api/client'
import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'
import { useRouter } from 'vue-router'

const router = useRouter()
const toast  = useToastStore()

type ImportRow = { nome: string; ra: string; status: 'imported' | 'skipped' | 'error'; reason?: string }
type ImportResult = { imported: number; skipped: number; errors: string[]; rows: ImportRow[] }

const file        = ref<File | null>(null)
const result      = ref<ImportResult | null>(null)
const importing   = ref(false)

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
  result.value = null
}

async function downloadTemplate() {
  const res = await client.get('/evidence-journey/students/import/template', { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data]))
  const a   = document.createElement('a')
  a.href = url; a.download = 'template-importacao-alunos.xlsx'; a.click()
  URL.revokeObjectURL(url)
}

async function doImport() {
  if (!file.value) { toast.error('Selecione um arquivo XLSX.'); return }
  importing.value = true
  try {
    const form = new FormData()
    form.append('arquivo', file.value)
    const { data } = await client.post<ImportResult>('/evidence-journey/students/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    result.value = data
    if (data.imported > 0) toast.success(`${data.imported} aluno(s) importado(s) com sucesso.`)
    else toast.error('Nenhum aluno novo importado.')
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? 'Erro ao importar.')
  } finally { importing.value = false }
}
</script>

<template>
  <div class="import-view">
    <button class="btn-back" @click="router.push({ name: 'jornada-dashboard' })">← Voltar à Jornada</button>
    <h2 class="import-view__title">Importar Alunos</h2>

    <!-- ── Instruções ───────────────────────────────────────────────────── -->
    <section class="card">
      <h3 class="card__title">Como funciona</h3>
      <ol class="instructions">
        <li>Baixe o <button class="btn-link" @click="downloadTemplate">📥 template Excel</button></li>
        <li>Preencha as colunas: <strong>Nome *</strong>, <strong>RA *</strong>, Email (opcional), Curso (opcional)</li>
        <li>Salve o arquivo e faça o upload abaixo</li>
        <li>Alunos com RA já cadastrado são automaticamente ignorados</li>
      </ol>
      <p class="info-box">
        🔑 Senha padrão criada para todos os alunos importados: <strong>Estudante@123</strong><br>
        Oriente os alunos a alterarem a senha no primeiro acesso.
      </p>
    </section>

    <!-- ── Upload ─────────────────────────────────────────────────────── -->
    <section class="card">
      <h3 class="card__title">Upload do arquivo</h3>
      <div class="upload-area">
        <input
          type="file"
          accept=".xlsx,.xls"
          class="file-input"
          @change="onFileChange"
          id="xlsx-input"
        />
        <label for="xlsx-input" class="file-label">
          {{ file ? `📄 ${file.name}` : '📂 Clique para selecionar o arquivo .xlsx' }}
        </label>
      </div>
      <button class="btn btn--primary" :disabled="!file || importing" @click="doImport">
        {{ importing ? 'Importando…' : 'Importar alunos' }}
      </button>
    </section>

    <!-- ── Resultado ──────────────────────────────────────────────────── -->
    <section v-if="result" class="card">
      <h3 class="card__title">Resultado da importação</h3>
      <div class="result-summary">
        <div class="rs-chip rs-chip--ok">✅ {{ result.imported }} importado(s)</div>
        <div class="rs-chip rs-chip--skip">⏭ {{ result.skipped }} ignorado(s) (RA já existe)</div>
        <div v-if="result.errors.length" class="rs-chip rs-chip--err">❌ {{ result.errors.length }} erro(s)</div>
      </div>

      <div v-if="result.errors.length" class="error-list">
        <p class="error-list__title">Erros:</p>
        <p v-for="(e, i) in result.errors" :key="i" class="error-item">{{ e }}</p>
      </div>

      <table v-if="result.rows.length" class="data-table">
        <thead><tr><th>Nome</th><th>RA</th><th>Status</th><th>Detalhe</th></tr></thead>
        <tbody>
          <tr v-for="r in result.rows" :key="r.ra" :class="`row--${r.status}`">
            <td>{{ r.nome }}</td>
            <td>{{ r.ra }}</td>
            <td>
              <span v-if="r.status === 'imported'" class="badge-ok">✅ Importado</span>
              <span v-else-if="r.status === 'skipped'" class="badge-skip">⏭ Ignorado</span>
              <span v-else class="badge-err">❌ Erro</span>
            </td>
            <td>{{ r.reason ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.btn-back { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .85rem; font-weight: 600; padding: 0; margin-bottom: 1rem; display: inline-block; }
.btn-back:hover { text-decoration: underline; }
.import-view { padding: 1.5rem; max-width: 900px; }
.import-view__title { font-size: 1.4rem; font-weight: 700; margin: 0 0 1.5rem; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; }
.card__title { font-size: 1rem; font-weight: 600; margin: 0 0 .75rem; }
.instructions { padding-left: 1.25rem; margin: 0 0 .75rem; line-height: 2; font-size: .9rem; }
.btn-link { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .9rem; font-weight: 700; text-decoration: underline; padding: 0; }
.info-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: .75rem 1rem; font-size: .85rem; color: #92400e; margin-top: .5rem; }
.upload-area { margin-bottom: .75rem; }
.file-input  { display: none; }
.file-label  { display: block; border: 2px dashed #d1d5db; border-radius: 10px; padding: 1.5rem; text-align: center; cursor: pointer; font-size: .9rem; color: #6b7280; transition: border-color .15s; }
.file-label:hover { border-color: #0d631b; color: #0d631b; }
.btn { padding: .5rem 1.1rem; border: none; border-radius: 6px; cursor: pointer; font-size: .9rem; font-weight: 600; }
.btn--primary { background: var(--color-primary, #0d631b); color: #fff; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.result-summary { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1rem; }
.rs-chip       { padding: .35rem .85rem; border-radius: 20px; font-size: .85rem; font-weight: 700; }
.rs-chip--ok   { background: #dcfce7; color: #166534; }
.rs-chip--skip { background: #f3f4f6; color: #374151; }
.rs-chip--err  { background: #fee2e2; color: #991b1b; }
.error-list    { background: #fef2f2; border-radius: 8px; padding: .75rem 1rem; margin-bottom: 1rem; }
.error-list__title { font-weight: 700; font-size: .85rem; color: #991b1b; margin: 0 0 .5rem; }
.error-item    { font-size: .82rem; color: #991b1b; margin: 0; }
.data-table    { width: 100%; border-collapse: collapse; font-size: .87rem; margin-top: .5rem; }
.data-table th, .data-table td { padding: .5rem .6rem; border-bottom: 1px solid #f3f4f6; text-align: left; }
.data-table th { font-weight: 600; font-size: .78rem; text-transform: uppercase; color: #6b7280; }
.row--imported { background: #f0fdf4; }
.row--error    { background: #fef2f2; }
.badge-ok   { background: #dcfce7; color: #166534; padding: .15rem .5rem; border-radius: 6px; font-size: .78rem; font-weight: 700; }
.badge-skip { background: #f3f4f6; color: #6b7280; padding: .15rem .5rem; border-radius: 6px; font-size: .78rem; font-weight: 700; }
.badge-err  { background: #fee2e2; color: #991b1b; padding: .15rem .5rem; border-radius: 6px; font-size: .78rem; font-weight: 700; }
</style>
