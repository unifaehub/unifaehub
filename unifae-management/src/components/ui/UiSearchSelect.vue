<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

export type SearchSelectOption = {
  id: number | string
  label: string
  hint?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: number | string | ''
    options: SearchSelectOption[]
    loading?: boolean
    disabled?: boolean
    label?: string
    placeholder?: string
    emptyText?: string
    required?: boolean
    id?: string
  }>(),
  {
    loading: false,
    disabled: false,
    placeholder: 'Digite para buscar…',
    emptyText: 'Nenhum resultado.',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | string | '']
  search: [query: string]
}>()

const query = ref('')
const open = ref(false)
let blurTimer: ReturnType<typeof setTimeout> | null = null

const selectedOption = computed(() =>
  props.options.find((o) => String(o.id) === String(props.modelValue)),
)

const selectedLabel = computed(() => selectedOption.value?.label ?? '')

function syncQueryFromValue() {
  if (props.modelValue !== '' && selectedLabel.value) {
    query.value = selectedLabel.value
  }
}

watch(
  () => props.modelValue,
  () => {
    if (props.modelValue !== '' && selectedLabel.value) {
      query.value = selectedLabel.value
    } else if (props.modelValue === '' && !open.value) {
      query.value = ''
    }
  },
)

watch(selectedLabel, (lbl) => {
  if (props.modelValue !== '' && lbl && !open.value) query.value = lbl
})

function cancelBlur() {
  if (blurTimer != null) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
}

function onFocus(e: FocusEvent) {
  cancelBlur()
  open.value = true
  const el = e.target as HTMLInputElement
  void nextTick(() => {
    try {
      el.select()
    } catch {
      /* ignore */
    }
  })
  emit('search', query.value)
}

function onInput(e: Event) {
  cancelBlur()
  const v = (e.target as HTMLInputElement).value
  open.value = true
  query.value = v
  if (props.modelValue !== '' && v.trim() !== selectedLabel.value.trim()) {
    emit('update:modelValue', '')
  }
  emit('search', v)
}

function onBlur() {
  cancelBlur()
  blurTimer = window.setTimeout(() => {
    blurTimer = null
    open.value = false
    if (props.modelValue !== '' && selectedLabel.value) {
      query.value = selectedLabel.value
    }
  }, 180)
}

function pick(opt: SearchSelectOption) {
  cancelBlur()
  emit('update:modelValue', opt.id)
  query.value = opt.label
  open.value = false
}

function clear() {
  cancelBlur()
  emit('update:modelValue', '')
  query.value = ''
  open.value = false
  emit('search', '')
}

defineExpose({ clear, syncQueryFromValue })
</script>

<template>
  <div class="search-select">
    <label v-if="label" class="search-select__lbl" :for="id">{{ label }}</label>
    <div class="search-select__combo">
      <input
        :id="id"
        v-model="query"
        class="search-select__inp"
        type="search"
        :placeholder="placeholder"
        :disabled="disabled"
        autocomplete="off"
        @focus="onFocus"
        @input="onInput"
        @blur="onBlur"
      />
      <button
        v-if="modelValue !== '' || query"
        type="button"
        class="search-select__clear"
        title="Limpar"
        :disabled="disabled"
        @mousedown.prevent="clear"
      >
        ×
      </button>
      <p v-if="loading" class="search-select__hint">Buscando…</p>
      <ul
        v-else-if="open && (options.length || query.trim())"
        class="search-select__list"
      >
        <li v-if="!options.length">
          <span class="search-select__empty">{{ emptyText }}</span>
        </li>
        <li v-for="opt in options" :key="String(opt.id)">
          <button type="button" class="search-select__opt" @mousedown.prevent="pick(opt)">
            {{ opt.label }}
            <span v-if="opt.hint" class="search-select__sub">{{ opt.hint }}</span>
          </button>
        </li>
      </ul>
    </div>
    <p v-if="modelValue !== '' && selectedLabel" class="search-select__hint search-select__hint--ok">
      Selecionado: {{ selectedLabel }}
    </p>
  </div>
</template>

<style scoped>
.search-select {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.search-select__lbl {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}
.search-select__combo {
  position: relative;
}
.search-select__inp {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(191, 202, 186, 0.55);
  border-radius: var(--uf-radius-md);
  padding: 0.45rem 1.6rem 0.45rem 0.6rem;
  font-family: var(--uf-font);
  font-size: 0.88rem;
}
.search-select__inp:disabled {
  opacity: 0.65;
}
.search-select__clear {
  position: absolute;
  right: 0.35rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  color: var(--uf-on-surface-variant);
  padding: 0 0.25rem;
}
.search-select__list {
  position: absolute;
  z-index: 30;
  left: 0;
  right: 0;
  top: calc(100% + 2px);
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;
  max-height: 14rem;
  overflow-y: auto;
  background: var(--uf-surface);
  border: 1px solid rgba(191, 202, 186, 0.55);
  border-radius: var(--uf-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.search-select__opt {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.45rem 0.65rem;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: var(--uf-font);
}
.search-select__opt:hover {
  background: rgba(13, 99, 27, 0.08);
}
.search-select__sub {
  display: block;
  font-size: 0.72rem;
  color: var(--uf-on-surface-variant);
  margin-top: 0.1rem;
}
.search-select__empty {
  display: block;
  padding: 0.45rem 0.65rem;
  font-size: 0.82rem;
  color: var(--uf-on-surface-variant);
}
.search-select__hint {
  font-size: 0.78rem;
  margin: 0;
  color: var(--uf-on-surface-variant);
}
.search-select__hint--ok {
  color: var(--uf-primary);
  font-weight: 600;
}
</style>
