/**
 * Abre cada projeto em uma janela de terminal separada.
 * Ao falhar, apenas o terminal daquele serviço fecha — os outros continuam.
 *
 * Windows : usa `start cmd /k` (sempre disponível)
 * macOS   : usa `osascript` para abrir Terminal.app
 * Linux   : tenta gnome-terminal, xterm ou konsole
 */

import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// npm run dev          → usa modo LAN (padrão, mesmo Wi-Fi)
// npm run dev:tunnel   → usa modo Tunnel (celular fora da LAN / rede externa)
const useTunnel = process.argv.includes('--tunnel') || process.env.EXPO_TUNNEL === '1';
const mobileScript = useTunnel ? 'start:tunnel' : 'start:lan';

const SERVICES = [
  {
    title: 'UNIFAE — API',
    cmd:   'npm run start:dev --prefix unifae-api',
  },
  {
    title: 'UNIFAE — Web',
    cmd:   'node scripts/wait-for-api.mjs web && npm run dev --prefix unifae-management -- --host 0.0.0.0 --port 5173',
  },
  {
    title: 'UNIFAE — Mobile',
    // Aguarda a API antes de iniciar o Metro para evitar erros de conexão iniciais.
    // Se a API não subir em 5 min, o Metro inicia mesmo assim (non-fatal).
    cmd:   `node scripts/wait-for-api.mjs mobile && npm run ${mobileScript} --prefix unifae-app-jorney-evidence`,
  },
  {
    title: 'UNIFAE — GitSync',
    cmd:   'node scripts/git-sync.mjs',
  },
];

function openTerminal(title, cmd) {
  const platform = process.platform;

  if (platform === 'win32') {
    // Abre nova janela CMD que fica aberta mesmo após erro no comando
    spawn(
      'cmd',
      ['/c', 'start', 'cmd', '/k', `title ${title} && ${cmd}`],
      { cwd: ROOT, shell: false, detached: true, stdio: 'ignore' },
    ).unref();

  } else if (platform === 'darwin') {
    const script = `tell application "Terminal" to do script "cd '${ROOT}' && ${cmd}"`;
    spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore' }).unref();

  } else {
    // Linux — tenta na ordem: gnome-terminal, xterm, konsole
    const terminals = [
      ['gnome-terminal', ['--title', title, '--', 'bash', '-c', `cd '${ROOT}' && ${cmd}; exec bash`]],
      ['xterm',          ['-title', title, '-e', `bash -c "cd '${ROOT}' && ${cmd}; exec bash"`]],
      ['konsole',        ['--new-tab', '-e', `bash -c "cd '${ROOT}' && ${cmd}; exec bash"`]],
    ];
    for (const [bin, args] of terminals) {
      try {
        spawn(bin, args, { detached: true, stdio: 'ignore' }).unref();
        break;
      } catch { /* tenta o próximo */ }
    }
  }
}

console.log('[dev] Abrindo terminais separados para cada serviço...\n');
for (const { title, cmd } of SERVICES) {
  console.log(`  ▸ ${title}`);
  openTerminal(title, cmd);
}
console.log('\n[dev] Todos os terminais abertos. Este terminal pode ser fechado.');
