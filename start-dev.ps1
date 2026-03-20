<#
PowerShell helper script to start Gig-Shield backend + frontend simultaneously.

Usage:
  ./start-dev.ps1

Prerequisites:
- Node.js + npm must be installed and in PATH
- MySQL Server must be running and database 'gig_shield' created

This script will:
1) Install dependencies (if not already installed)
2) Start the backend server (Express)
3) Start the frontend dev server (Vite)

Both servers will run in separate PowerShell jobs so you can stop them using Ctrl+C.
#>

function Test-NodeInstalled {
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
Write-Error "Node.js is not installed or not in PATH."
exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
Write-Error "npm is not installed or not in PATH."
exit 1
}
}

function Start-Project {
param(
[string]$Path,
[string]$InstallCmd = "npm install",
[string]$StartCmd = "npm run dev"
)

```
Write-Host "`n==> Preparing $Path..." -ForegroundColor Cyan
Push-Location $Path

Write-Host "Installing dependencies..." -ForegroundColor Yellow
Invoke-Expression $InstallCmd

Write-Host "Starting dev server..." -ForegroundColor Green
Start-Job -Name "$(Split-Path $Path -Leaf)" -ScriptBlock {
    param($cmd, $workingDir)
    Set-Location $workingDir
    Invoke-Expression $cmd
} -ArgumentList $StartCmd, $Path | Out-Null

Pop-Location
```

}

# Check Node.js

Test-NodeInstalled

# Start backend and frontend

Start-Project -Path "$PSScriptRoot\backend"
Start-Project -Path "$PSScriptRoot\frontend"

Write-Host "`nBoth backend and frontend have been started!" -ForegroundColor Green
Write-Host "Use 'Get-Job' to view jobs" -ForegroundColor Gray
Write-Host "Use 'Receive-Job -Name backend -Keep' to see backend logs" -ForegroundColor Gray
Write-Host "Stop using: Stop-Job -Name backend,frontend" -ForegroundColor Gray
