<script setup lang="ts">
import { ref, computed } from 'vue'
import client from '@/api/client'
import { useToastStore } from '@/stores/toast'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'

const props = defineProps<{
  patientId: number
  patientName: string
}>()

const emit = defineEmits(['close', 'saved'])
const toast = useToastStore()
const saving = ref(false)

const form = ref({
  functionDetails: '',
  symptomsDetails: '',
  safetyDetails: '',
  digitalLiteracyScore: 2, // 1: Baixo, 2: Médio, 3: Alto
  socialSupportDetails: '',
  riskLevel: 'PENDING' as 'RED' | 'YELLOW' | 'GREEN' | 'PENDING',
  justification: ''
})


async function submit() {
  if (form.value.riskLevel === 'PENDING') {
    toast.error('Selecione uma classificação de risco.')
    return
  }
  
  saving.value = true
  try {
    await client.post(`/patients/${props.patientId}/triage`, form.value)
    toast.success('Triagem realizada!')
    emit('saved')
  } catch (e) {
    toast.error('Erro ao salvar triagem.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="triage-form">
    <div class="triage-head">
      <h3 class="h3">Avaliação Inicial: {{ patientName }}</h3>
      <p class="muted-sm">Realize a triagem integral para definir a bandeira de acompanhamento.</p>
    </div>

    <form @submit.prevent="submit" class="form">
      <div class="triage-grid">
        <div class="field">
          <label class="lbl">Funcionalidade</label>
          <textarea v-model="form.functionDetails" class="in in--full in--area" placeholder="Capacidade funcional atual..."></textarea>
        </div>
        
        <div class="field">
          <label class="lbl">Sintomas & Queixas</label>
          <textarea v-model="form.symptomsDetails" class="in in--full in--area" placeholder="Dor, limitações, histórico..."></textarea>
        </div>

        <div class="field">
          <label class="lbl">Segurança do Paciente</label>
          <textarea v-model="form.safetyDetails" class="in in--full in--area" placeholder="Riscos de queda, comorbidades..."></textarea>
        </div>

        <div class="field">
          <label class="lbl">Suporte Social</label>
          <textarea v-model="form.socialSupportDetails" class="in in--full in--area" placeholder="Mora sozinho? Tem cuidador?"></textarea>
        </div>
      </div>

      <div class="assessment-section">
        <div class="field">
          <label class="lbl">Alfabetização Digital</label>
          <div class="option-group">
            <label class="opt-btn opt-btn--low" :class="{ 'opt-btn--active': form.digitalLiteracyScore === 1 }">
              <input type="radio" v-model="form.digitalLiteracyScore" :value="1" />
              <span>Baixa</span>
            </label>
            <label class="opt-btn opt-btn--mid" :class="{ 'opt-btn--active': form.digitalLiteracyScore === 2 }">
              <input type="radio" v-model="form.digitalLiteracyScore" :value="2" />
              <span>Média</span>
            </label>
            <label class="opt-btn opt-btn--high" :class="{ 'opt-btn--active': form.digitalLiteracyScore === 3 }">
              <input type="radio" v-model="form.digitalLiteracyScore" :value="3" />
              <span>Alta</span>
            </label>
          </div>
          <p class="field-hint">Capacidade de usar smartphone para exercícios em casa.</p>
        </div>

        <div class="risk-selection">
          <label class="lbl">Classificação de Risco (Bandeira)</label>
          <div class="risk-flags">
            <label class="flag-card flag-card--red" :class="{ 'flag-card--active': form.riskLevel === 'RED' }">
              <input type="radio" v-model="form.riskLevel" value="RED" />
              <div class="flag-content">
                <MaterialIcon name="flag" size="2rem" :color="form.riskLevel === 'RED' ? '#fff' : '#ba1a1a'" />
                <span class="flag-txt">Vermelha (Crítico)</span>
              </div>
            </label>
            <label class="flag-card flag-card--yellow" :class="{ 'flag-card--active': form.riskLevel === 'YELLOW' }">
              <input type="radio" v-model="form.riskLevel" value="YELLOW" />
              <div class="flag-content">
                <MaterialIcon name="flag" size="2rem" :color="form.riskLevel === 'YELLOW' ? '#fff' : '#f9a825'" />
                <span class="flag-txt">Amarela (Híbrido)</span>
              </div>
            </label>
            <label class="flag-card flag-card--green" :class="{ 'flag-card--active': form.riskLevel === 'GREEN' }">
              <input type="radio" v-model="form.riskLevel" value="GREEN" />
              <div class="flag-content">
                <MaterialIcon name="flag" size="2rem" :color="form.riskLevel === 'GREEN' ? '#fff' : '#0d631b'" />
                <span class="flag-txt">Verde (App/Home)</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div class="field">
        <label class="lbl">Justificativa técnica</label>
        <textarea v-model="form.justification" class="in in--full in--area" placeholder="Breve justificativa para a bandeira escolhida..."></textarea>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn--flat" @click="$emit('close')" :disabled="saving">Cancelar</button>
        <button type="submit" class="btn btn--pri" :disabled="saving">
          {{ saving ? 'Salvando...' : 'Finalizar Triagem' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style>
.triage-form { font-family: var(--uf-font); }
.triage-head { margin-bottom: 1.25rem; }
.triage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; }

/* Base Inputs - Copies from PatientsView */
.field { display: flex; flex-direction: column; gap: 0.25rem; }
.lbl { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--uf-on-surface-variant); }
.in {
  border-radius: var(--uf-radius-md);
  border: 1px solid rgba(191, 202, 186, 0.55);
  padding: 0.45rem 0.65rem;
  font-family: var(--uf-font);
  font-size: 0.88rem;
  background: var(--uf-surface-container-lowest);
  color: var(--uf-on-surface);
}
.in--full { width: 100%; box-sizing: border-box; }
.in--area { margin-top: 0.35rem; resize: vertical; min-height: 4rem; }
.field-hint { margin: 0.15rem 0 0; font-size: 0.78rem; color: var(--uf-on-surface-variant); line-height: 1.4; }

/* Buttons - Copies from PatientsView */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;
  padding: 0.55rem 1.1rem; border-radius: 999px; border: none;
  font-family: var(--uf-font); font-weight: 700; font-size: 0.8rem; cursor: pointer;
}
.btn--pri { background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container)); color: #fff; }
.btn--flat { background: rgba(0, 0, 0, 0.05); color: var(--uf-on-surface); }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }

.btn-mini {
  border: none; border-radius: 999px; padding: 0.35rem 0.75rem;
  font-size: 0.72rem; font-weight: 700; cursor: pointer;
  background: rgba(13, 99, 27, 0.1); color: var(--uf-primary); font-family: var(--uf-font);
}

/* Specific Triage Styles */
.assessment-section { 
  padding: 1.25rem; border-radius: var(--uf-radius-xl); margin-bottom: 1.25rem;
  background: rgba(191, 202, 186, 0.08); border: 1px solid rgba(191, 202, 186, 0.2);
}
.option-group { display: flex; gap: 0.5rem; margin: 0.5rem 0; }
.opt-btn {
  flex: 1; text-align: center; padding: 0.65rem; border-radius: var(--uf-radius-md);
  border: 1px solid rgba(191, 202, 186, 0.4); cursor: pointer; font-size: 0.82rem;
  transition: all 0.2s; background: var(--uf-surface-container-lowest);
  font-weight: 650;
}
.opt-btn input { display: none; }

.opt-btn--low.opt-btn--active { background: #ba1a1a; color: #fff; border-color: #ba1a1a; }
.opt-btn--mid.opt-btn--active { background: #f9a825; color: #fff; border-color: #f9a825; }
.opt-btn--high.opt-btn--active { background: #0d631b; color: #fff; border-color: #0d631b; }

.risk-selection { margin-top: 1.5rem; }
.risk-flags { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin: 0.75rem 0; }
.flag-card {
  cursor: pointer; padding: 1.2rem 0.5rem; border-radius: var(--uf-radius-lg);
  border: 2px solid transparent; background: var(--uf-surface-container-lowest);
  transition: all 0.2s; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.flag-card input { display: none; }
.flag-content { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.flag-txt { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; }

.flag-card--red.flag-card--active { border-color: #ba1a1a; background: #ba1a1a; color: #fff; }
.flag-card--yellow.flag-card--active { border-color: #f9a825; background: #f9a825; color: #fff; }
.flag-card--green.flag-card--active { border-color: #0d631b; background: #0d631b; color: #fff; }

.btn-suggest { margin-top: 0.5rem; }
</style>
