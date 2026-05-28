import { execSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const POLL_INTERVAL = 15_000;

const PKG_DIRS = [
  { label: 'root',                        cwd: ROOT,                                         file: 'package.json' },
  { label: 'unifae-api',                  cwd: resolve(ROOT, 'unifae-api'),                  file: 'unifae-api/package.json' },
  { label: 'unifae-management',           cwd: resolve(ROOT, 'unifae-management'),           file: 'unifae-management/package.json' },
  { label: 'unifae-app-jorney-evidence',  cwd: resolve(ROOT, 'unifae-app-jorney-evidence'),  file: 'unifae-app-jorney-evidence/package.json' },
];

function run(cmd, cwd = ROOT) {
  return execSync(cmd, { encoding: 'utf8', cwd, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function log(msg) {
  process.stdout.write(`[git-sync] ${new Date().toLocaleTimeString()} — ${msg}\n`);
}

function check() {
  try {
    run('git fetch origin main');

    const local  = run('git rev-parse HEAD');
    const remote = run('git rev-parse origin/main');
    if (local === remote) return;

    const dirty = run('git status --porcelain');
    if (dirty) {
      log('Alterações locais não commitadas detectadas — pull ignorado. Commit ou stash primeiro.');
      return;
    }

    const changed = run('git diff HEAD origin/main --name-only').split('\n').filter(Boolean);
    log(`${changed.length} arquivo(s) alterado(s) — executando pull...`);

    run('git pull origin main');
    log('Pull concluído. Os watchers vão recarregar automaticamente.');

    for (const { label, cwd, file } of PKG_DIRS) {
      if (changed.includes(file)) {
        log(`package.json alterado em ${label} — rodando npm install...`);
        run('npm install', cwd);
        log(`npm install concluído em ${label}.`);
      }
    }
  } catch (e) {
    log(`Erro: ${e.message.split('\n')[0]}`);
  }
}

log('Monitorando origin/main por novos commits (intervalo: 15s)...');
check();
setInterval(check, POLL_INTERVAL);
