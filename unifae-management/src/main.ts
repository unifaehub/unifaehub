import './assets/design-tokens.css'
import './assets/shell.css'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Suprime mensagens de devtools do Pinia (ex.: "🍍 store installed 🆕")
// em ambiente de desenvolvimento — sem impactar funcionalidade.
if (import.meta.env.DEV) {
  const _warn = console.warn.bind(console)
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('🍍')) return
    _warn(...args)
  }
  const _log = console.log.bind(console)
  console.log = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('🍍')) return
    _log(...args)
  }
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
