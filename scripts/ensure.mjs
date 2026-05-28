/**
 * Garante ambiente pronto para `npm run dev`:
 * - copia `.env` a partir de `.env.example` em cada sub-projeto, se ainda não existir;
 * - executa `npm install` em todos os sub-projetos quando package.json foi
 *   modificado após o último install (detectado via .install-stamp em node_modules);
 * - exibe lembrete sobre migrations (executadas automaticamente pela API ao subir).
 */
import { copyFileSync, existsSync, writeFileSync, chmodSync, statSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = join(__dirname, '..')

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  console.log(`\n[ensure] 📦 Instalando dependências em ${name}…`)
  const r = spawnSync('npm', ['install'], { cwd: dir, stdio: 'inherit', shell: true })
  if (r.status !== 0) {
    console.error(`[ensure] ❌ Falha ao instalar ${name}. Verifique os erros acima.`)
    process.exit(r.status ?? 1)
  }
  writeFileSync(join(dir, 'node_modules', '.install-stamp'), new Date().toISOString())
  console.log(`[ensure] ✅ ${name}: dependências atualizadas.`)
}

/**
 * Copia .env.example → .env se o .env ainda não existir.
 * Retorna true se foi criado agora.
 */
function ensureEnv(dir, name) {
  const envFile    = join(dir, '.env')
  const envExample = join(dir, '.env.example')

  if (existsSync(envFile)) {
    console.log(`[ensure] ✅ ${name}/.env: OK`)
    return false
  }
  if (existsSync(envExample)) {
    copyFileSync(envExample, envFile)
    console.log(`[ensure] 📄 Criado ${name}/.env a partir de .env.example`)
    return true
  }
  console.warn(`[ensure] ⚠️  ${name}: sem .env.example — configure .env manualmente.`)
  return false
}

// ── 1. Root (concurrently) ────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════')
console.log('  UNIFAE — Verificação de ambiente (ensure.mjs)')
console.log('════════════════════════════════════════════════════\n')

if (needsInstall(root)) install(root, 'root (concurrently)')
else console.log('[ensure] ✅ root: node_modules OK')

// ── 2. Sub-projetos ───────────────────────────────────────────────────────────
const apiDir    = join(root, 'unifae-api')
const webDir    = join(root, 'unifae-management')
const mobileDir = join(root, 'unifae-app-jorney-evidence')

const projects = [
  { dir: apiDir,    name: 'unifae-api'                  },
  { dir: webDir,    name: 'unifae-management'            },
  { dir: mobileDir, name: 'unifae-app-jorney-evidence'   },
]

for (const { dir, name } of projects) {
  ensureEnv(dir, name)
}

// Aviso extra se a API não tiver DB_PASSWORD configurado
const apiEnvPath = join(apiDir, '.env')
if (existsSync(apiEnvPath)) {
  const apiEnvContent = readFileSync(apiEnvPath, 'utf8')
  if (!apiEnvContent.includes('DB_PASSWORD') || apiEnvContent.includes('DB_PASSWORD=\n') || apiEnvContent.includes('DB_PASSWORD=\r')) {
    console.warn('\n[ensure] ⚠️  unifae-api/.env: DB_PASSWORD parece vazio.')
    console.warn('          Edite unifae-api/.env e configure DB_USER e DB_PASSWORD.\n')
  }
}

for (const { dir, name } of projects) {
  if (needsInstall(dir)) install(dir, name)
  else console.log(`[ensure] ✅ ${name}: node_modules OK`)
}

// ── 3. Migrations ─────────────────────────────────────────────────────────────
console.log(`
[ensure] 📋 Migrations TypeORM:
         As migrations são executadas AUTOMATICAMENTE quando a API sobe
         (migrationsRun: true no database.module.ts).
         Não é necessário nenhum comando manual.

         Se quiser verificar o estado das migrations antes de subir:
           cd unifae-api && npx ts-node -e "require('./src/database/data-source').AppDataSource.initialize().then(ds => ds.showMigrations()).then(() => process.exit())"
`)

// ── 4. Git hook: pre-push ─────────────────────────────────────────────────────
const hookPath    = join(root, '.git', 'hooks', 'pre-push')
const hookContent = `#!/bin/sh\nnode "$(git rev-parse --show-toplevel)/scripts/pre-push.mjs"\n`

if (!existsSync(hookPath)) {
  try {
    writeFileSync(hookPath, hookContent, { encoding: 'utf8' })
    try { chmodSync(hookPath, 0o755) } catch { /* Windows: chmod não necessário */ }
    console.log('[ensure] ✅ Git hook pre-push instalado.')
  } catch (e) {
    console.warn(`[ensure] ⚠️  Não foi possível instalar o hook pre-push: ${e.message}`)
  }
} else {
  console.log('[ensure] ✅ Git hook pre-push: OK')
}

console.log('\n[ensure] ✅ Ambiente pronto. Iniciando serviços…\n')
