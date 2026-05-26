/**
 * Setup explícito: sempre roda `npm install` em api e web (útil após atualizar package.json).
 */
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const apiEnv = join(root, 'unifae-api', '.env')
const apiExample = join(root, 'unifae-api', '.env.example')
if (!existsSync(apiEnv) && existsSync(apiExample)) {
  copyFileSync(apiExample, apiEnv)
  console.log('Criado unifae-api/.env a partir de .env.example')
}

for (const name of ['unifae-api', 'unifae-management']) {
  const dir = join(root, name)
  console.log(`npm install em ${name}…`)
  const r = spawnSync('npm', ['install'], { cwd: dir, stdio: 'inherit', shell: true })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
console.log('Setup concluído.')
