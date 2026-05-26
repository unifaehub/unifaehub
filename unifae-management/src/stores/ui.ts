import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/** Só mostra o spinner após este tempo — evita flash em navegações rápidas. */
const SPINNER_DELAY_MS = 200

export const useUiStore = defineStore('ui', () => {
  /** Quantas navegações estão em voo (redirects encadeados podem empilhar). */
  const routeNavDepth = ref(0)
  /** Overlay visual (spinner) só após debounce — sem bloquear a interface. */
  const routeSpinnerVisible = ref(false)

  let spinnerTimer: ReturnType<typeof setTimeout> | null = null

  const routeNavigationBlocking = computed(() => routeNavDepth.value > 0)

  function clearSpinnerTimer() {
    if (spinnerTimer != null) {
      clearTimeout(spinnerTimer)
      spinnerTimer = null
    }
  }

  function beginRouteNavigation() {
    routeNavDepth.value += 1
    if (routeNavDepth.value === 1) {
      clearSpinnerTimer()
      spinnerTimer = setTimeout(() => {
        if (routeNavDepth.value > 0) routeSpinnerVisible.value = true
      }, SPINNER_DELAY_MS)
    }
  }

  function endRouteNavigation() {
    routeNavDepth.value = Math.max(0, routeNavDepth.value - 1)
    if (routeNavDepth.value === 0) {
      clearSpinnerTimer()
      routeSpinnerVisible.value = false
    }
  }

  /** Recuperação se algo desincronizar (ex.: erro raro antes de afterEach). */
  function resetRouteNavigation() {
    routeNavDepth.value = 0
    routeSpinnerVisible.value = false
    clearSpinnerTimer()
  }

  return {
    routeNavDepth,
    routeSpinnerVisible,
    routeNavigationBlocking,
    beginRouteNavigation,
    endRouteNavigation,
    resetRouteNavigation,
  }
})
