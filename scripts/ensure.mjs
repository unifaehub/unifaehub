/**
 * Garante ambiente pronto para `npm run dev`:
 * - copia `unifae-api/.env` a partir de `.env.example` se ainda não existir;
 * - executa `npm install` em todos os sub-projetos quando package.json foi
 *   modificado após o último install (detectado via .install-stamp em node_modules).
 */
import { copyFileSync, existsSync, writeFileSync, chmodSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

/**
 * Retorna true se node_modules não existe OU se package.json foi modificado
 * depois do último `npm install` (comparando com o arquivo sentinela .install-stamp).
 */
function needsInstall(dir) {
  const nm    = join(dir, 'node_modules')
  const stamp = join(nm, '.install-stamp')
  const pkg   = join(dir, 'package.json')
  if (!existsSync(nm))    return true
  if (!existsSync(stamp)) return true
  return statSync(pkg).mtimeMs > statSync(stamp).mtimeMs
}

function install(dir, name) {
  console.log(`[ensure] package.json alterado — instalando dependências em ${name}…`)
  const r = spawnSync('npm', ['install'], { cwd: dir, stdio: 'inherit', shell: true })
  if (r.status !== 0) process.exit(r.status ?? 1)
  // Grava sentinela para evitar reinstall desnecessário na próxima execução
  writeFileSync(join(dir, 'node_modules', '.install-stamp'), new Date().toISOString())
  console.log(`[ensure] ${name}: dependências atualizadas.`)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

if (needsInstall(root)) {
  install(root, 'root (concurrently)')
} else {
  console.log('[ensure] root: node_modules OK')
}

const apiDir = join(root, 'unifae-api')
const webDir = join(root, 'unifae-management')
const apiEnv = join(apiDir, '.env')
const apiExample = join(apiDir, '.env.example')

if (!existsSync(apiEnv) && existsSync(apiExample)) {
  copyFileSync(apiExample, apiEnv)
  console.log('[ensure] Criado unifae-api/.env a partir de .env.example')
} else if (existsSync(apiEnv)) {
  console.log('[ensure] unifae-api/.env já existe.')
} else {
  console.warn('[ensure] Sem .env.example na API — configure unifae-api/.env manualmente.')
}

const mobileDir = join(root, 'unifae-app-jorney-evidence')

for (const { dir, name } of [
  { dir: apiDir,    name: 'unifae-api' },
  { dir: webDir,    name: 'unifae-management' },
  { dir: mobileDir, name: 'unifae-app-jorney-evidence' },
]) {
  if (needsInstall(dir)) {
    install(dir, name)
  } else {
    console.log(`[ensure] ${name}: node_modules OK`)
  }
}

// ── Git hook: pre-push ────────────────────────────────────────────────────────
// Instala automaticamente em qualquer máquina que rodar npm run dev.
// O hook chama scripts/pre-push.mjs que verifica o build antes de cada push.
const hookPath = join(root, '.git', 'hooks', 'pre-push')
const hookContent = `#!/bin/sh\nnode "$(git rev-parse --show-toplevel)/scripts/pre-push.mjs"\n`

if (!existsSync(hookPath)) {
  try {
    writeFileSync(hookPath, hookContent, { encoding: 'utf8' })
    try { chmodSync(hookPath, 0o755) } catch { /* Windows: chmod não necessário */ }
    console.log('[ensure] Git hook pre-push instalado em .git/hooks/pre-push')
  } catch (e) {
    console.warn(`[ensure] Não foi possível instalar o hook pre-push: ${e.message}`)
  }
} else {
  console.log('[ensure] Git hook pre-push: OK')
}
