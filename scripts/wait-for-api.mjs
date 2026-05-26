/**
 * Espera a API responder antes de iniciar o web.
 * Motivo: evitar que o web "suba" antes da API e gere erros/logo de rede.
 */
import http from 'node:http'
import https from 'node:https'

const base = process.env.UNIFAE_API_BASE_URL || 'http://localhost:3000/api/v1'
const healthUrl = `${base.replace(/\/$/, '')}/health`

const timeoutMs = Number(process.env.WAIT_FOR_API_TIMEOUT_MS || 120_000)
const intervalMs = Number(process.env.WAIT_FOR_API_INTERVAL_MS || 750)
const startedAt = Date.now()

function requestOnce(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https:') ? https : http
    const req = lib.request(url, { method: 'GET' }, (res) => {
      res.resume()
      resolve(res.statusCode >= 200 && res.statusCode < 500)
    })
    req.on('error', () => resolve(false))
    req.end()
  })
}

process.stdout.write(`[wait-for-api] Aguardando API em ${healthUrl}`)

while (Date.now() - startedAt < timeoutMs) {
  // eslint-disable-next-line no-await-in-loop
  const ok = await requestOnce(healthUrl)
  if (ok) {
    process.stdout.write('\n[wait-for-api] API OK. Iniciando web.\n')
    process.exit(0)
  }
  process.stdout.write('.')
  // eslint-disable-next-line no-await-in-loop
  await new Promise((r) => setTimeout(r, intervalMs))
}

process.stdout.write('\n[wait-for-api] Timeout aguardando API.\n')
process.exit(1)

