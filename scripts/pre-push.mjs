/**
 * Verificação de build antes do git push.
 * Executado pelo hook .git/hooks/pre-push (instalado por ensure.mjs).
 *
 * Roda:
 *  • npm run build em unifae-api      (NestJS — compila TypeScript)
 *  • npm run build em unifae-management  (Vite — bundle de produção)
 *  • tsc --noEmit em unifae-app-jorney-evidence  (checa tipos sem build Expo)
 *
 * Se qualquer etapa falhar, o push é abortado.
 */

import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const STEPS = [
  {
    label: 'unifae-api       › npm run build',
    cmd: 'npm',
    args: ['run', 'build'],
    cwd: resolve(ROOT, 'unifae-api'),
  },
  {
    label: 'unifae-management › npm run build',
    cmd: 'npm',
    args: ['run', 'build'],
    cwd: resolve(ROOT, 'unifae-management'),
  },
  {
    label: 'unifae-app-jorney-evidence › tsc --noEmit',
    cmd: 'npx',
    args: ['tsc', '--noEmit'],
    cwd: resolve(ROOT, 'unifae-app-jorney-evidence'),
  },
];

let failed = false;

console.log('\n🔍 [pre-push] Verificando build antes de subir...\n');

for (const { label, cmd, args, cwd } of STEPS) {
  process.stdout.write(`  ▸ ${label} ... `);

  const result = spawnSync(cmd, args, { cwd, shell: true, encoding: 'utf8' });

  if (result.status === 0) {
    console.log('✅ OK');
  } else {
    console.log('❌ FALHOU\n');
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    failed = true;
  }
}

if (failed) {
  console.error('\n🚫 [pre-push] Build com erros — push cancelado. Corrija os problemas acima.\n');
  process.exit(1);
} else {
  console.log('\n✅ [pre-push] Todos os builds OK — prosseguindo com o push.\n');
  process.exit(0);
}
