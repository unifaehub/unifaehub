# deploy-unifae.ps1
# Executar como Administrador
# Exemplo: powershell -ExecutionPolicy Bypass -File .\deploy-unifae.ps1

$ErrorActionPreference = "Stop"

function Ensure-Command($cmd, $installScript) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "[$cmd] não encontrado. Instalando..." -ForegroundColor Yellow
    Invoke-Expression $installScript
  } else {
    Write-Host "[$cmd] OK" -ForegroundColor Green
  }
}

function Ensure-FirewallRule($name, $port) {
  $rule = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
  if (-not $rule) {
    New-NetFirewallRule -DisplayName $name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port | Out-Null
    Write-Host "Firewall: regra criada $name ($port)" -ForegroundColor Green
  } else {
    Write-Host "Firewall: regra já existe $name ($port)" -ForegroundColor DarkGreen
  }
}

Write-Host "=== UNIFAE Deploy Windows (API + Front) ===" -ForegroundColor Cyan

# 1) Pré-requisitos (winget)
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw "winget não encontrado. Instale App Installer/Microsoft Store primeiro."
}

Ensure-Command "git"  "winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements"
Ensure-Command "node" "winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements"

# Recarrega PATH da sessão
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm não encontrado após instalar Node. Feche e abra o PowerShell e rode novamente."
}

# 2) PM2 global
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
  Write-Host "[pm2] instalando globalmente..." -ForegroundColor Yellow
  npm install -g pm2
} else {
  Write-Host "[pm2] OK" -ForegroundColor Green
}

Write-Host "Versões:" -ForegroundColor Cyan
git --version
node -v
npm -v
pm2 -v

# 3) Validar estrutura
$root = Get-Location
$apiDir = Join-Path $root "unifae-api"
$webDir = Join-Path $root "unifae-management"

if (-not (Test-Path $apiDir)) { throw "Pasta unifae-api não encontrada em $root" }
if (-not (Test-Path $webDir)) { throw "Pasta unifae-management não encontrada em $root" }

# 4) Instalar deps
Write-Host "Instalando dependências..." -ForegroundColor Cyan
npm install
npm install --prefix "unifae-api"
npm install --prefix "unifae-management"

# 5) Build
Write-Host "Buildando API e Front..." -ForegroundColor Cyan
npm run build --prefix "unifae-api"
npm run build --prefix "unifae-management"

# 6) Parar processos antigos PM2
Write-Host "Limpando processos PM2 antigos (se existirem)..." -ForegroundColor Cyan
pm2 delete unifae-api 2>$null
pm2 delete unifae-web 2>$null

# 7) Subir API (Node/Nest dist)
Write-Host "Subindo API no PM2..." -ForegroundColor Cyan
pm2 start ".\unifae-api\dist\main.js" --name "unifae-api" --time

# 8) Subir Front (Vite preview em 5173)
# Se preferir, substitua por IIS/Nginx em produção.
Write-Host "Subindo Front no PM2 (vite preview:5173)..." -ForegroundColor Cyan
pm2 start "npm" --name "unifae-web" -- run preview --prefix "unifae-management" -- --host 0.0.0.0 --port 5173

# 9) Salvar estado PM2
pm2 save

# 10) Firewall (API + Front)
Ensure-FirewallRule "UNIFAE API 3000" 3000
Ensure-FirewallRule "UNIFAE WEB 5173" 5173

Write-Host ""
Write-Host "=== Deploy finalizado ===" -ForegroundColor Green
Write-Host "PM2 status:" -ForegroundColor Cyan
pm2 status

Write-Host ""
Write-Host "Teste local:" -ForegroundColor Cyan
Write-Host "API:  http://localhost:3000/api/v1/health"
Write-Host "WEB:  http://localhost:5173"
Write-Host ""
Write-Host "Observação: para produção pública, ideal usar reverse proxy (IIS/Nginx/Caddy) + HTTPS e expor só 80/443."