<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiSkeletonBlock from '@/components/ui/UiSkeletonBlock.vue'
import { useAuthStore, type LoginContext } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const email = ref('admin@unifae.local')
const password = ref('')
/** '' = não escolhido | 'global' | app id string */
const contextChoice = ref<string>('')

const contextForSubmit = computed((): LoginContext | null => {
  if (contextChoice.value === 'global') return { mode: 'GLOBAL' }
  if (contextChoice.value === '') return null
  const id = Number(contextChoice.value)
  if (!Number.isFinite(id) || id < 1) return null
  return { mode: 'APP', appId: id }
})

const contextError = ref<string | null>(null)

// Efeito de Campo Magnético
let cleanupMagnetic: (() => void) | null = null
onMounted(() => {
  void auth.fetchPublicAppsForLogin()
  cleanupMagnetic = initMagneticField() as any
})

onUnmounted(() => {
  if (cleanupMagnetic) cleanupMagnetic()
})

function initMagneticField() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let animationId = 0

  let w = window.innerWidth
  let h = window.innerHeight
  canvas.width = w
  canvas.height = h

  const mouse = { x: -1000, y: -1000 }
  const points: { x: number; y: number; ox: number; oy: number }[] = []
  const spacing = 45

  function createPoints() {
    points.length = 0
    for (let x = spacing; x < w; x += spacing) {
      for (let y = spacing; y < h; y += spacing) {
        points.push({ x, y, ox: x, oy: y })
      }
    }
  }

  createPoints()

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX
    mouse.y = e.clientY
  })

  window.addEventListener('resize', () => {
    w = window.innerWidth
    h = window.innerHeight
    canvas.width = w
    canvas.height = h
    createPoints()
  })

  function animate() {
    ctx.clearRect(0, 0, w, h)
    
    // Configuração das linhas (Constelação)
    ctx.lineWidth = 0.5
    const lineDist = spacing * 1.4

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i]
      
      // Desenha conexões com pontos próximos
      for (let j = i + 1; j < points.length; j++) {
        const p2 = points[j]
        const dx = p1.x - p2.x
        const dy = p1.y - p2.y
        const distSq = dx * dx + dy * dy
        
        if (distSq < lineDist * lineDist) {
          const dist = Math.sqrt(distSq)
          const opacity = (1 - dist / lineDist) * 0.3
          ctx.strokeStyle = `rgba(100, 255, 120, ${opacity})`
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        }
      }

      // Lógica magnética dos pontos
      const mdx = mouse.x - p1.ox
      const mdy = mouse.y - p1.oy
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy) || 0.001
      const force = Math.max(0, 200 - mdist) / 200

      const tx = p1.ox + (mdx / mdist) * force * 30
      const ty = p1.oy + (mdy / mdist) * force * 30

      p1.x += (tx - p1.x) * 0.1
      p1.y += (ty - p1.y) * 0.1

      // Desenha o ponto
      ctx.fillStyle = `rgba(120, 255, 150, ${0.2 + force * 0.5})`
      ctx.beginPath()
      ctx.arc(p1.x, p1.y, 1 + force, 0, Math.PI * 2)
      ctx.fill()
    }

    animationId = requestAnimationFrame(animate)
  }

  const onMouseMove = (e: MouseEvent) => {
    mouse.x = e.clientX
    mouse.y = e.clientY
  }

  const onResize = () => {
    w = window.innerWidth
    h = window.innerHeight
    canvas.width = w
    canvas.height = h
    createPoints()
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('resize', onResize)
  animate()

  return () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('resize', onResize)
    cancelAnimationFrame(animationId)
  }
}

function retryLoginApps() {
  void auth.fetchPublicAppsForLogin()
}

function goDashboard() {
  void router.push({ name: 'dashboard' })
}

function logoutAndStay() {
  auth.logout()
}

async function onSubmit() {
  contextError.value = null
  const ctx = contextForSubmit.value
  if (!ctx) {
    contextError.value = 'Selecione o aplicativo ou a opção de administrador.'
    return
  }
  const ok = await auth.login(email.value, password.value, ctx)
  if (ok) await router.replace({ name: 'dashboard' })
}
</script>

<template>
  <div class="login">
    <canvas ref="canvasRef" class="magnetic-canvas" />
    <div class="card tonal-elevation">
      <template v-if="auth.isAuthenticated">
        <div class="brand">
          <img src="/unifae_hub_transparent.png" alt="Unifae Hub" class="brand-logo" />
        </div>

        <p class="muted">
          Você já está logado. Para entrar com outra conta, primeiro faça logout.
        </p>

        <div class="btn-row">
          <button type="button" class="btn-primary" @click="goDashboard">Ir para o dashboard</button>
          <button type="button" class="btn-secondary" @click="logoutAndStay">Logout</button>
        </div>
      </template>

      <template v-else>
      <div class="brand">
        <img src="/unifae_hub_transparent.png" alt="Unifae Hub" class="brand-logo" />
      </div>
      <p class="muted">Painel administrativo — escolha o contexto de acesso e entre com suas credenciais.</p>

      <form @submit.prevent="onSubmit">
        <div class="field">
          <label for="login-email">E-mail</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            autocomplete="username"
            required
            class="input"
          />
        </div>
        <div class="field">
          <label for="login-password">Senha</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="input"
          />
        </div>
        <div class="field">
          <label for="login-context">Aplicativo / contexto</label>
          <div v-if="auth.loginAppsLoading" class="skel-wrap" aria-busy="true" aria-label="Carregando opções">
            <UiSkeletonBlock width="100%" height="2.75rem" radius="var(--uf-radius-md)" />
          </div>
          <template v-else>
            <UiConnectionRetry v-if="auth.loginAppsFailed" class="apps-retry" @retry="retryLoginApps" />
            <select
              id="login-context"
              v-model="contextChoice"
              class="input select"
              :class="{ 'select--after-retry': auth.loginAppsFailed }"
              required
            >
              <option disabled value="">Selecione…</option>
              <option value="global">Todos os aplicativos (somente administrador)</option>
              <option v-for="a in auth.loginApps" :key="a.id" :value="String(a.id)">
                {{ a.name }}
              </option>
            </select>
          </template>
          <p class="hint-inline">
            Usuários de curso escolhem o app ao qual pertencem. Administradores podem usar a primeira opção para visão global.
          </p>
        </div>

        <p v-if="contextError" class="error">{{ contextError }}</p>
        <p v-if="auth.error" class="error">{{ auth.error }}</p>

        <button type="submit" class="btn-primary" :disabled="auth.loading || auth.loginAppsLoading">
          {{ auth.loading ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: #0a0c0a; /* Fundo bem escuro */
  position: relative;
  overflow: hidden;
}

.magnetic-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.card {
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: var(--uf-surface-container-lowest);
  border-radius: var(--uf-radius-xl);
  padding: 2rem 2rem 1.75rem;
  outline: 1px solid var(--uf-outline-variant);
  outline-offset: 0;
}

.tonal-elevation {
  box-shadow: var(--uf-tonal-shadow);
}

.brand {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.brand-logo {
  height: 8rem;
  width: auto;
  object-fit: contain;
}

h1 {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.tagline {
  margin: 0.1rem 0 0;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}

.muted {
  margin: 1rem 0 1.25rem;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--uf-on-surface-variant);
}

.skel-wrap {
  display: block;
}

.apps-retry {
  margin-bottom: 0.75rem;
}

.select--after-retry {
  margin-top: 0;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.field label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--uf-on-surface-variant);
  margin-bottom: 0.35rem;
}

.input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.65rem 0.75rem;
  font-family: var(--uf-font);
  font-size: 0.9375rem;
  color: var(--uf-on-surface);
  background: var(--uf-surface-container-highest);
  border: none;
  border-radius: var(--uf-radius-md);
  outline: 1px solid var(--uf-outline-variant);
  outline-offset: 0;
}

.input:focus {
  outline-color: rgba(13, 99, 27, 0.45);
}

.select {
  cursor: pointer;
  appearance: auto;
}

.hint-inline {
  margin: 0.4rem 0 0;
  font-size: 0.6875rem;
  line-height: 1.4;
  color: var(--uf-on-surface-variant);
}

.btn-primary {
  margin-top: 0.25rem;
  padding: 0.8rem 1rem;
  border: none;
  border-radius: var(--uf-radius-md);
  font-family: var(--uf-font);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--uf-on-primary);
  cursor: pointer;
  background: linear-gradient(135deg, var(--uf-primary), var(--uf-primary-container));
  box-shadow: 0 8px 24px rgba(13, 99, 27, 0.18);
}

.btn-row {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn-secondary {
  flex: 1;
  padding: 0.8rem 1rem;
  border: none;
  border-radius: var(--uf-radius-md);
  font-family: var(--uf-font);
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--uf-primary);
  cursor: pointer;
  background: rgba(13, 99, 27, 0.08);
}

.btn-secondary:hover {
  background: rgba(13, 99, 27, 0.14);
}

.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.error {
  color: var(--uf-error);
  font-size: 0.8125rem;
  margin: 0;
}

.hint-footer {
  margin-top: 1.35rem;
  font-size: 0.6875rem;
  color: var(--uf-on-surface-variant);
  line-height: 1.45;
}

code {
  font-size: 0.65rem;
  background: var(--uf-surface-container-low);
  padding: 0.12rem 0.35rem;
  border-radius: 0.25rem;
}
</style>
