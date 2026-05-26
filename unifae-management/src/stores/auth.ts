import { defineStore } from 'pinia'
import axios from 'axios'
import { computed, ref } from 'vue'
import client from '@/api/client'

const TOKEN_KEY = 'unifae_token'
const CONTEXT_KEY = 'unifae_login_context'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: string
  appId: number | null
  courseId: number | null
}

/** Contexto escolhido no login (filtro do painel; JWT segue o cadastro do usuário). */
export type LoginContext =
  | { mode: 'GLOBAL' }
  | { mode: 'APP'; appId: number }

export type PublicAppOption = { id: number; name: string }

function parseContext(raw: string | null): LoginContext | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as LoginContext
    if (v?.mode === 'GLOBAL') return { mode: 'GLOBAL' }
    if (v?.mode === 'APP' && typeof v.appId === 'number') return { mode: 'APP', appId: v.appId }
    return null
  } catch {
    return null
  }
}

function messageFromAxios(e: unknown): string {
  if (!axios.isAxiosError(e)) return 'Falha no login. Verifique e-mail e senha.'
  const data = e.response?.data as { message?: string | string[] } | undefined
  const m = data?.message
  if (typeof m === 'string') return m
  if (Array.isArray(m) && m[0]) return String(m[0])
  return 'Falha no login. Verifique e-mail e senha.'
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<AuthUser | null>(null)
  const loginContext = ref<LoginContext | null>(parseContext(localStorage.getItem(CONTEXT_KEY)))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loginAppsLoading = ref(false)
  const loginApps = ref<PublicAppOption[]>([])
  /** Falha de rede/servidor ao listar apps — UI usa skeleton + retry, sem mensagem técnica. */
  const loginAppsFailed = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  const scopedAppId = computed(() =>
    loginContext.value?.mode === 'APP' ? loginContext.value.appId : null,
  )

  function persistContext(ctx: LoginContext) {
    loginContext.value = ctx
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx))
  }

  function setSession(accessToken: string, profile: AuthUser, context: LoginContext) {
    token.value = accessToken
    localStorage.setItem(TOKEN_KEY, accessToken)
    user.value = profile
    persistContext(context)
  }

  function clearSession() {
    token.value = null
    user.value = null
    loginContext.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(CONTEXT_KEY)
  }

  async function fetchPublicAppsForLogin() {
    loginAppsLoading.value = true
    loginAppsFailed.value = false
    try {
      const { data } = await client.get<PublicAppOption[]>('/auth/apps')
      loginApps.value = data
    } catch {
      loginApps.value = []
      loginAppsFailed.value = true
    } finally {
      loginAppsLoading.value = false
    }
  }

  async function login(
    email: string,
    password: string,
    context: LoginContext,
  ) {
    loading.value = true
    error.value = null
    try {
      const body =
        context.mode === 'GLOBAL'
          ? { email, password, accessMode: 'GLOBAL' as const }
          : {
              email,
              password,
              accessMode: 'APP' as const,
              appId: context.appId,
            }
      const { data } = await client.post<{ access_token: string; user: AuthUser }>(
        '/auth/login',
        body,
      )
      setSession(data.access_token, data.user, context)
      return true
    } catch (e: unknown) {
      error.value = messageFromAxios(e)
      clearSession()
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const { data } = await client.get<AuthUser>('/auth/me')
      user.value = data
      if (!loginContext.value) {
        const inferred: LoginContext =
          data.role === 'ADMIN'
            ? { mode: 'GLOBAL' }
            : data.appId != null
              ? { mode: 'APP', appId: data.appId }
              : { mode: 'GLOBAL' }
        persistContext(inferred)
      }
    } catch {
      clearSession()
    }
  }

  function logout() {
    clearSession()
  }

  return {
    token,
    user,
    loginContext,
    loading,
    error,
    loginApps,
    loginAppsLoading,
    loginAppsFailed,
    isAuthenticated,
    scopedAppId,
    fetchPublicAppsForLogin,
    login,
    fetchMe,
    logout,
    setSession,
    clearSession,
  }
})
