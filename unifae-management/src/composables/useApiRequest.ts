import { ref, type Ref } from 'vue'
import axios from 'axios'

/**
 * Padrão para dados dependentes da API:
 * - `loading` true até a primeira resposta;
 * - `failed` true em erro de rede/servidor (sem mensagem técnica obrigatória na UI);
 * - `execute` / `refresh` para (re)tentar.
 */
export function useApiRequest<T>(
  fetcher: () => Promise<T>,
  opts?: {
    onUnauthorized?: () => void
  },
) {
  const data: Ref<T | null> = ref(null)
  const loading = ref(true)
  const failed = ref(false)

  async function execute() {
    loading.value = true
    failed.value = false
    try {
      data.value = await fetcher()
    } catch (e: unknown) {
      if (opts?.onUnauthorized && axios.isAxiosError(e) && e.response?.status === 401) {
        opts.onUnauthorized()
        return
      }
      data.value = null
      failed.value = true
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    failed,
    execute,
    refresh: execute,
  }
}
