/**
 * Espera a API responder antes de iniciar o serviço dependente.
 * Se o timeout for atingido, inicia mesmo assim (non-fatal) para não bloquear o dev.
 */
import http  from 'node:http'
import https from 'node:https'

const base       = process.env.UNIFAE_API_BASE_URL || 'http://localhost:3000/api/v1'
const healthUrl  = `${base.replace(/\/$/, '')}/health`
const timeoutMs  = Number(process.env.WAIT_FOR_API_TIMEOUT_MS  || 300_000)  // 5 min padrão
const intervalMs = Number(process.env.WAIT_FOR_API_INTERVAL_MS || 1_500)    // tenta a cada 1,5 s
const startedAt  = Date.now()

function requestOnce(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https:') ? https : http
    const req = lib.request(url, { method: 'GET', timeout: 3000 }, (res) => {
      res.resume()
      resolve(res.statusCode >= 200 && res.statusCode < 500)
    })
    req.on('error',   () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
    req.end()
  })
}

const label = process.argv[2] ?? process.env.WAIT_LABEL ?? 'serviço'
process.stdout.write(`[wait-for-api] Aguardando API subir para iniciar ${label}…`)

let attempt = 0
while (Date.now() - startedAt < timeoutMs) {
  attempt++
  const ok = await requestOnce(healthUrl)
  if (ok) {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
    process.stdout.write(`\n[wait-for-api] ✅ API OK após ${elapsed}s (tentativa ${attempt}). Iniciando ${label}.\n`)
    process.exit(0)
  }
  // Mostrar progresso a cada 10 tentativas
  if (attempt % 10 === 0) {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0)
    process.stdout.write(` ${elapsed}s`)
  } else {
    process.stdout.write('.')
  }
  await new Promise((r) => setTimeout(r, intervalMs))
}

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0)
process.stdout.write(`\n[wait-for-api] ⚠️  Timeout após ${elapsed}s — iniciando ${label} mesmo assim.\n`)
process.exit(0)  // Non-fatal: inicia o serviço mesmo sem API
