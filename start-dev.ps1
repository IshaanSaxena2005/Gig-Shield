<#
PowerShell helper script to start the full Gig-Shield local stack.

Usage:
  ./start-dev.ps1

What it starts:
1) Express backend on port 5001
2) React frontend on port 5173
3) Flask AI engine on port 5002

Logs are written to:
- backend-dev.log
- frontend-dev.log
- ai-engine-dev.log
#>

param(
  [switch]$InstallDependencies
)

function Test-CommandAvailable {
  param([string]$CommandName, [string]$Message)

  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    Write-Error $Message
    exit 1
  }
}

function Start-ServiceWindow {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command,
    [string]$LogFile
  )

  Write-Host "`n==> Starting $Name" -ForegroundColor Cyan
  Start-Process powershell -ArgumentList @(
    '-NoProfile',
    '-Command',
    "Set-Location '$WorkingDirectory'; $Command *> '$LogFile'"
  ) | Out-Null
}

$root = $PSScriptRoot
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'
$aiPath = Join-Path $root 'ai-engine'

Test-CommandAvailable -CommandName 'node' -Message 'Node.js is not installed or not in PATH.'
Test-CommandAvailable -CommandName 'npm' -Message 'npm is not installed or not in PATH.'
Test-CommandAvailable -CommandName 'python' -Message 'Python is not installed or not in PATH.'

if ($InstallDependencies) {
  Write-Host "`nInstalling backend dependencies..." -ForegroundColor Yellow
  Push-Location $backendPath
  npm install
  Pop-Location

  Write-Host "`nInstalling frontend dependencies..." -ForegroundColor Yellow
  Push-Location $frontendPath
  npm install
  Pop-Location

  Write-Host "`nInstalling AI engine dependencies..." -ForegroundColor Yellow
  Push-Location $aiPath
  python -m pip install -r requirements.txt
  Pop-Location
}

Start-ServiceWindow -Name 'ai-engine' -WorkingDirectory $aiPath -Command 'python app.py' -LogFile (Join-Path $root 'ai-engine-dev.log')

# Wait for AI engine to be healthy before starting backend (up to 20s)
Write-Host "`nWaiting for AI engine on port 5002..." -ForegroundColor Yellow
$aiReady = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 1
  try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:5002/health' -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
    if ($resp.StatusCode -eq 200) { $aiReady = $true; break }
  } catch {}
}
if ($aiReady) {
  Write-Host "AI engine ready." -ForegroundColor Green
} else {
  Write-Host "AI engine did not start in time — backend will use JS fallback." -ForegroundColor Yellow
}

Start-ServiceWindow -Name 'backend' -WorkingDirectory $backendPath -Command 'npm run dev' -LogFile (Join-Path $root 'backend-dev.log')
Start-ServiceWindow -Name 'frontend' -WorkingDirectory $frontendPath -Command 'npm run dev' -LogFile (Join-Path $root 'frontend-dev.log')

Write-Host "`nGig-Shield services are starting." -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "Backend:  http://localhost:5001/api/health" -ForegroundColor Gray
Write-Host "AI Engine: http://localhost:5002/health" -ForegroundColor Gray
Write-Host "`nUse Get-Content backend-dev.log -Wait (or frontend/ai log) to follow output." -ForegroundColor Gray
